/**
 * Class to handle visibility change of page for objects.
 * 
 * @see {@link https://developer.mozilla.org/de/docs/Web/API/Page_Visibility_API|MDN}
 */
export class VisibilityObserver {

	constructor(hiddenCallback = null, visibleCallback = null) {
		this.hiddenCallback = hiddenCallback;
		this.visibleCallback = visibleCallback;

		this.hidden;
		this.visibilityChange;

		if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support 
			this.hidden = 'hidden';
			this.visibilityChange = 'visibilitychange';
		} else if (typeof document.msHidden !== 'undefined') {
			this.hidden = 'msHidden';
			this.visibilityChange = 'msvisibilitychange';
		} else if (typeof document.webkitHidden !== 'undefined') {
			this.hidden = 'webkitHidden';
			this.visibilityChange = 'webkitvisibilitychange';
		}

		if (typeof document[this.hidden] !== 'undefined') {
			document.addEventListener(this.visibilityChange, () => {
				this.handleVisibilityChange();
			}, false);
		} else {
			console.warn('[VisibilityObserver] Browser does not support Page Visibility API.');
		}
	}

	setHiddenCallback(hiddenCallback) {
		this.hiddenCallback = hiddenCallback;
	}

	setVisibleCallback(visibleCallback) {
		this.visibleCallback = visibleCallback;
	}

	handleVisibilityChange() {
		if (document[this.hidden]) {
			this.handleHiddenState();
		} else {
			this.handleVisibleState();
		}
	}

	handleHiddenState() {
		if (this.hiddenCallback) this.hiddenCallback();
	}

	handleVisibleState() {
		if (this.visibleCallback) this.visibleCallback();
	}

}
