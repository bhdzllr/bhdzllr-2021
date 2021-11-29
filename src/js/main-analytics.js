/**
 * Minilytics Client Script
 */
var Minilytics = (function () {
	'use strict';

	var scriptElement;
	var url;
	var id;
	var isHashRouting = false;
	var visitGuid;
	var timeOnPage = {
		duration: 0,
		start: Date.now(),
		end: 0,
	};
	var disableString = 'disable-analytics';
	var lastPath;

	var hash = Math.random();

	function initListeners() {
		var pushState = history.pushState;
		history.pushState = function (state) {
			if (typeof history.onpushstate == 'function') {
				history.onpushstate({ state: state });
			}
		
			if (lastPath != location.pathname) Minilytics.visit();
			lastPath = location.pathname;

			return pushState.apply(history, arguments);
		};

		if (isHashRouting) {
			window.addEventListener('hashchange', function () {
				Minilytics.visit();
			});
		}

		document.addEventListener('visibilitychange', function () {
			if (document.visibilityState === 'hidden') {
				timeOnPage.duration += Date.now() - timeOnPage.start;
			} else {
				timeOnPage.start = Date.now();
			}
		});

		window.addEventListener('pagehide', function () {
			timeOnPage.duration += Date.now() - timeOnPage.start;

			if (!visitGuid) return;

			sendBeacon(
				JSON.stringify({
					siteId: id,
					guid: visitGuid,
					duration: timeOnPage.duration, 
				})
			);
		});
	}

	function isPageReloadedOrBackForward() {
		if (performance && performance.getEntriesByType && performance.getEntriesByType[0]) {
			// Modern API
			return ['reload', 'back_forward'].indexOf(performance.getEntriesByType('navigation')[0].type) > -1;
		} else if (performance) {
			// Deprecated but well supported API
			return (
				performance.navigation.type == performance.navigation.TYPE_RELOAD
				|| performance.navigation.type == performance.navigation.TYPE_BACK_FORWARD
			);
		}

		return false;
	}

	function isDoNotTrackActive() {
		return (
			navigator.doNotTrack && (navigator.doNotTrack == '1' || navigator.doNotTrack == 'yes')
		) || (
			window.doNotTrack && (window.doNotTrack == '1')
		) || (
			navigator.msDoNotTrack && (navigator.msDoNotTrack == '1')
		);
	}

	function isOptOutActive() {
		if (isDoNotTrackActive() || document.cookie.indexOf(disableString + '=true') > -1) {
			window[disableString] = true;
			return true;
		}

		return false;
	}

	function isLocalhost() {
		return (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
	}

	function isBot() {
		return /bot|crawl|spider/i.test(navigator.userAgent);
	}

	function getUrlParameter(name) {
		name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');

		var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
		var results = regex.exec(location.search);

		if (!results) return null;
		if (!results[1]) return '';

		return decodeURIComponent(results[1].replace(/\+/g, ' '));
	}

	function getBrowser() {
		var userAgent = navigator.userAgent;
		var match = userAgent.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
		var found = null;

		if (/trident/i.test(match[1])) {
			found = /\brv[ :]+(\d+)/g.exec(userAgent) || [];

			return {
				name: 'IE',
				version: found[1] || '',
			};
		}

		if (match[1] === 'Chrome') {
			found = userAgent.match(/\b(OPR|Edge)\/(\d+)/);

			if (found !== null) {
				return {
					name: found.slice(1)[0].replace('OPR', 'Opera'),
					version: found.slice(1)[1],
				};
			}

			found = userAgent.match(/\b(Edg)\/(\d+)/)

			if (found !== null) {
				return {
					name: found.slice(1)[0].replace('Edg', 'Edge (Chromium)'),
					version: found.slice(1)[1],
				};
			}
		}

		match = match[2] ? [match[1], match[2]] : [ navigator.appName, navigator.appVersion, '-?' ];
		found = userAgent.match(/version\/(\d+)/i);

		if (found !== null) {
			match.splice(1, 1, found[1]);
		}

		if (match[2] === '-?') {
			return {
				name: null,
				version: null,
			};
		}

		return {
			name: match[0],
			version: match[1],
		};
	}

	function hasTouchScreen() {
		var hasTouchScreen = false;

		if ('maxTouchPoints' in navigator) {
			hasTouchScreen = navigator.maxTouchPoints > 0;
		} else if ('msMaxTouchPoints' in navigator) {
			hasTouchScreen = navigator.msMaxTouchPoints > 0;
		} else {
			var mQ = window.matchMedia && matchMedia('(pointer:coarse)');
			
			if (mQ && mQ.media === '(pointer:coarse)') {
				hasTouchScreen = !!mQ.matches;
			} else if ('orientation' in window) {
				hasTouchScreen = true;
			} else {
				var UA = navigator.userAgent;
				hasTouchScreen = (
					/\b(BlackBerry|webOS|iPhone|IEMobile)\b/i.test(UA)
					|| /\b(Android|Windows Phone|iPad|iPod)\b/i.test(UA)
				);
			}
		}

		return hasTouchScreen;
	}

	function send(data, action) {
		var action = action || '?action=minilytics-visit';
		var xhr = new XMLHttpRequest();

		xhr.open('POST', encodeURI(url + action));
		xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
		xhr.setRequestHeader('Accept', 'application/json');
		xhr.onreadystatechange = function () {
			if (xhr.readyState === XMLHttpRequest.DONE && xhr.status !== 200) {
				console.warn('[Minilytics] Sending did not worked.');
			}

			if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
				var jsonResponse = JSON.parse(xhr.response);

				if (jsonResponse['guid']) {
					visitGuid = jsonResponse['guid'];
				}
			}
		};

		xhr.send(JSON.stringify(data));
	}

	function sendBeacon(data, action) {
		var action = action || '?action=minilytics-visit-update';

		if (navigator.sendBeacon) {
			navigator.sendBeacon(encodeURI(url + action), data);
		}
	}

	return {
		init: function () {
			try {
				scriptElement = document.querySelector('#js-minilytics');
				url = scriptElement.dataset.url;
				id = scriptElement.dataset.id;
				isHashRouting = scriptElement.dataset.hashRouting ? true : false;
				timeOnPage.start = Date.now();
				lastPath = location.pathname;

				if (!url || !id) throw 'Missing script attributes.';
			} catch (e) {
				console.error('[Minilytics] Script initialization failed.');
				return;
			}

			initListeners();

			this.visit();
		},
		visit: function () {
			if (isPageReloadedOrBackForward()) return;
			if (isDoNotTrackActive()) return;
			if (isOptOutActive()) return;
			// if (isLocalhost()) return;
			if (isBot()) return;

			var timestamp = Date.now();

			var path = location.pathname;

			var referrer = document.referrer.split('/')[2];
			var referrerPath = '/' + document.referrer.
				split('?')[0]
				.split('#')[0]
				.split('/')
				.splice(3)
				.join('/');

			var unique = (!referrer || referrer != location.hostname) ? true : false;

			var timezone;
			try {
				timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			} catch (e) {
				timezone = null;
			}

			// var viewportWidth = (window.innerWidth || document.documentElement.clientWidth);
			// var viewportHeight = (window.innerHeight || document.documentElement.clientHeight);

			var deviceWidth = screen.width;
			var deviceHeight = screen.height;

			var browser = getBrowser();

			var touch = hasTouchScreen();

			var utm = {
				source: null,
				medium: null,
				campaign: null,
				term: null,
				content: null,
			};
			utm.source = getUrlParameter('utm_source') || getUrlParameter('source') || getUrlParameter('ref');
			utm.medium = getUrlParameter('utm_medium');
			utm.campaign = getUrlParameter('utm_campaign');
			utm.term = getUrlParameter('utm_term');
			utm.content = getUrlParameter('utm_content');

			send({
				siteId: id,
				path: path,
				unique: unique,
				referrer: referrer,
				referrerPath: referrerPath,
				timezone: timezone,
				browserName: browser.name,
				browserVersion: browser.version,
				touch: touch,
				deviceWidth: deviceWidth,
				deviceHeight: deviceHeight,
				utm: utm,
			});
		},
		event: function (data) {
  			send(data, '?action=minilytics-event');

  			return;
		},
		initOptOutButton: function (selector) {
			selector = selector || '.js-analytics-opt-out';

			if (!document.querySelector(selector)) return;

			var button = document.querySelector(selector);

			if (isOptOutActive()) {
				button.disabled = true;
				button.textContent = button.dataset.textDisabled;
			} else {
				button.disabled = false;
				button.addEventListener('click', function () {
					document.cookie = disableString + '=true; expires=Thu, 31 Dec 2099 23:59:59 UTC; path=/';
					window[disableString] = true;
					button.disabled = true;
					button.textContent = button.dataset.textDisabled;
					alert(button.dataset.textDisabledAlert);
				});
			}
		},
	}
})();

Minilytics.init();

document.addEventListener('DOMContentLoaded', function () {

	Minilytics.initOptOutButton();

});
