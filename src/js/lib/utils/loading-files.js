/**
 * Style loading
 */
export function loadStyle(href, media = 'all', id, onLoadCallback) {
	if (id && document.querySelector(`#${id}`)) return;

	const style = document.createElement('link');

	style.rel = 'stylesheet';
	style.href = href;
	style.media = media;

	document.getElementByTagNAme('head')[0].appendChild(style);

	if (onLoadCallback) {
		style.addEventListener('load', function () {
			onLoadCallback();
		});
	}
}

/**
 * Load a JavaScript file
 *
 * The callback stack is used to collect all callback functions
 * and call it at the same time to avoid callbacks too early.
 * Example: Creating three PoiMap Objects on the same page. Every Object tries to load Leaflet
 * but because of the used ID Leaflet is included only once (multiple Leaflet scripts would not make sense).
 * But every PoiMap needs to know when Leaflet is ready, therefore all callbacks are collected and called after
 * the load event of the script.
 *
 * @param {string} src Path to script
 * @param {string} id (Optional) ID for the script to prevent multiple scripts.
 * @param {Function} onLoadCallback (Optional) Required "id" parameter. Callack when script is loaded.
 * @param {Object} attributes (Optional) Key/value object for attributes to be appended to the script tag.
 */
export function loadScript(src, id, onLoadCallback, attributes) {
	if (!window.lazyScripts) {
		/**
		 * Script loading global object with "lazyScripts" namespace.
		 */
		window.lazyScripts = {
			/**
			 * Script loading callback Stack.
			 * Object with "id" and "callback".
			 *
			 * @type {{ id: string, callback: Function }[]}
			 */
			scriptCallbackStack: [],
			/**
			 * List to know which callback stack has been executed.
			 * If the script is already on the page and a class needs it later
			 * the callback should be executed therefore we need to know if the
			 * callbacks from the stack have been executed.
			 *
			 * @type {string[]}
			 */
			executedCallbacksById: [],
		};
	}

	const lazyScripts = window.lazyScripts;
	const defaultAttributes = { async: true, defer: true };
	attributes = Object.assign({}, defaultAttributes, attributes);

	if (id && document.querySelector(`#${id}`)) {
		if (onLoadCallback && !lazyScripts.executedCallbacksById.indexOf(id) == -1) {
			lazyScripts.scriptCallbackStack.push({
				id: id,
				callback: onLoadCallback
			});
		} else if (onLoadCallback) {
            if (lazyScripts.executedCallbacksById.indexOf(id) == -1) lazyScripts.executedCallbacksById.push(id);

			onLoadCallback();
		}

		return;
	}

	const script = document.createElement('script');

	script.src = src;
	if (id) script.id = id;
	if (id && onLoadCallback) {
		lazyScripts.scriptCallbackStack.push({
			id: id,
			callback: onLoadCallback
		});
	}

	for (const [key, value] of Object.entries(attributes)) {
		script.setAttribute(key, value);
	}

	script.addEventListener('load', function () {
		if (lazyScripts.scriptCallbackStack.length) {
			for (const callbackObject of lazyScripts.scriptCallbackStack) {
				if (callbackObject.id == this.id) {
					callbackObject.callback();
				}
			}

            if (lazyScripts.executedCallbacksById.indexOf(id) == -1) lazyScripts.executedCallbacksById.push(id);
		} else {
			if (onLoadCallback) onLoadCallback();
		}
	});

	document.body.appendChild(script);
}
