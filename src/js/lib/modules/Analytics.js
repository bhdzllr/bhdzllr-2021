export class AnalyticsOptOut {

	constructor(button, i18n, disableString = 'disable-analytics') {
		this.button = button;
		this.i18n = i18n;
		this.disableString = disableString;

		this.init();
	}

	init() {
		const doNotTrack = (navigator.doNotTrack && (navigator.doNotTrack == '1' || navigator.doNotTrack == 'yes')) || (window.doNotTrack && (window.doNotTrack == '1')) || (navigator.msDoNotTrack && (navigator.msDoNotTrack == '1'));

		if (doNotTrack || document.cookie.indexOf(this.disableString + '=true') > -1) {
			window[this.disableString] = true;

			this.button.disabled = true;
			this.button.textContent = this.i18n.get('analyticsOptOut.alreadyDeactivated', 'Analysis already disabled');
		} else {
			this.button.addEventListener('click', () => {
				disableAnalytics(this.disableString);

				this.button.disabled = true;
				this.button.textContent = this.i18n.get('analyticsOptOut.alreadyDeactivated', 'Analysis already disabled');

				alert(this.i18n.get('analyticsOptOut.deactivated', 'Tracking has been disabled in this browser for this site.'));
			}, false);
		}
	}

}

export function addAnalyticsCode(codeCallback, disableString = 'disable-analytics') {
	const doNotTrack = (navigator.doNotTrack && (navigator.doNotTrack == '1' || navigator.doNotTrack == 'yes')) || (window.doNotTrack && (window.doNotTrack == '1')) || (navigator.msDoNotTrack && (navigator.msDoNotTrack == '1'));

	if (doNotTrack || document.cookie.indexOf(disableString + '=true') > -1) {
		window[disableString] = true;
	} else {
		codeCallback();
	}
}

export function disableAnalytics(disableString = 'disable-analytics') {
	document.cookie = disableString + '=true; expires=Thu, 31 Dec 2099 23:59:59 UTC; path=/';
	window[disableString] = true;
}
