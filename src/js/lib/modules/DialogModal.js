import { isFocusable } from '../utils/accessibility';

export class DialogModal {

	constructor({
		contentAsHtml,
		showOnCreation = false,
		showCallback = null,
		hideCallback = null,
		ariaLabelledBy = '',
	}) {
		this.contentAsHtml = contentAsHtml;
		this.showOnCreation = showOnCreation;
		this.showCallback = showCallback;
		this.hideCallback = hideCallback;
		this.ariaLabelledBy = ariaLabelledBy;

		this.overlay;
		this.dialog;
		this.btnClose;
		this.lastElement;
		this.isOpen = false;

		this.initDom();
		this.initAriaAttributes();
		this.initListeners();

		if (this.showOnCreation) {
			this.show();
		}
	}

	initDom() {
		this.overlay = document.createElement('div');
		this.overlay.classList.add('dm-overlay');
		this.overlay.classList.add('js-dm-overlay');
		this.overlay.classList.add('hidden');

		this.dialog = document.createElement('div');
		this.dialog.classList.add('dm-dialog');
		this.dialog.classList.add('js-dm-dialog');
		this.dialog.innerHTML = this.contentAsHtml;

		this.btnClose = document.createElement('button');
		this.btnClose.classList.add('dm-btn-close');
		this.btnClose.classList.add('js-dm-btn-close');
		this.btnClose.innerHTML = `<span aria-label="Close">&times;</span>`;

		this.overlay.appendChild(this.btnClose);
		this.overlay.appendChild(this.dialog);
		document.body.appendChild(this.overlay);
	}

	initAriaAttributes() {
		this.dialog.setAttribute('role', 'dialog');
		this.dialog.setAttribute('aria-modal', 'true'); // Tell screenreaders that content behind the modal is not interactive
		this.dialog.setAttribute('aria-labelledby', this.ariaLabelledBy); // Tell screenreaders the ID of the title element
	}

	initListeners() {
		this.btnClose.addEventListener('click', () => {
			this.hide();
		});

		this.overlay.addEventListener('click', (e) => {
			if ((e.target).classList.contains('js-dm-overlay')) {
				this.hide();
			}
		});

		document.addEventListener('keyup', (e) => {
			if (e.keyCode != 27) return;

			let overlay = document.querySelector('.js-dm-overlay');
			if (overlay) this.hide();
		});
	}

	show() {
		this.lastElement = document.activeElement;

		document.documentElement.style.overflow = 'hidden';
		document.body.style.overflow = 'hidden';

		this.overlay.classList.remove('hidden');
		this.isOpen = true;

		this.focusFirstFocusableElement();
		this.addListenerOnFirstFocusableElement();
		this.addListenerOnLastFocusableElement();

		if (this.showCallback) this.showCallback();
	}

	hide() {
		document.documentElement.style.overflow = 'auto';
		document.body.style.overflow = 'auto';

		this.overlay.classList.add('hidden');
		this.isOpen = false;

		this.focusLastDocumentElement();

		if (this.hideCallback) this.hideCallback();
	}

	isActive() {
		return this.isOpen;
	}

	remove() {
		this.overlay.parentNode.removeChild(this.overlay);
	}

	getFocusableChildNodes() {
		const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
		const childNodesOverlay = Array.prototype.slice.call(this.overlay.querySelectorAll(focusableSelector));
		const childNodesDialog = Array.prototype.slice.call(this.dialog.querySelectorAll(focusableSelector));

		return childNodesOverlay.concat(childNodesDialog).filter(function (node) {
			return isFocusable(node);
		})
	}

	getFirstFocusableElement() {
		const childNodes = this.getFocusableChildNodes();

		if (Boolean(childNodes.length)) return childNodes[0];
	}

	getLastFocusableElement() {
		const childNodes = this.getFocusableChildNodes();

		if (Boolean(childNodes.length)) return childNodes[childNodes.length - 1];
	}

	addListenerOnFirstFocusableElement() {
		const firstFocusableElement = this.getFirstFocusableElement();

		if (firstFocusableElement) {
			firstFocusableElement.addEventListener('keydown', (e) => {
				if (e.shiftKey && e.keyCode == 9) {
					e.preventDefault();
					this.focusLastFocusableElement();
				}
			});
		}
	}

	addListenerOnLastFocusableElement() {
		const lastFocusableElement = this.getLastFocusableElement();

		if (lastFocusableElement) {
			lastFocusableElement.addEventListener('keydown', (e) => {
				if (e.keyCode == 9 && !(e.shiftKey && e.keyCode == 9)) {
					e.preventDefault();
					this.focusFirstFocusableElement();
				}
			});
		}
	}

	focusFirstFocusableElement() {
		this.getFirstFocusableElement().focus();
	}

	focusLastFocusableElement() {
		this.getLastFocusableElement().focus();
	}

	focusLastDocumentElement() {
		if (this.lastElement) this.lastElement.focus();
	}

}

export function initDialogsModalWithTemplate() {
	if (document.querySelector('[data-dm]')) {
		const dialogModalTriggers = document.querySelectorAll('[data-dm]');

		for (let i = 0; i < dialogModalTriggers.length; i++) {
			const target = dialogModalTriggers[i].dataset.dm;

			if (document.querySelector(target)) {
				const template = document.querySelector(target);
				const templateClone = document.importNode(template.content, true);
				const tempDiv = document.createElement('div');
				tempDiv.appendChild(templateClone);

				const dialogModal = new DialogModal({ contentAsHtml: tempDiv.innerHTML });

				dialogModalTriggers[i].addEventListener('click', function (e) {
					e.preventDefault();
					dialogModal.show();
				});
			}
		}
	}
}

export function addDialogModalDefaultStyles() {
	if (document.querySelector('#js-dm-styles')) return;

	const style = document.createElement('style');
	style.id = 'js-dm-styles';

	style.innerHTML = `
		.dm-overlay {
			position: fixed;
			top: 0;
			right: 0;
			bottom: 0;
			left: 0;
			z-index: 100;

			display: block;
			padding: 3.5em 1em 1.5em;
			overflow-y: auto;

			background-color: rgba(0, 0, 0, 0.75);
		}

		.dm-overlay.hidden {
			display: none;
		}

		.dm-btn-close {
			position: absolute;
			top: 5px;
			right: 5px;

			display: inline-block;
			width: 35px;
			height: 35px;

			background: transparent;
			border: none;
			cursor: pointer;

			color: #ffffff;
			font-size: 35px;
		}

		.dm-dialog {
			position: relative;

			display: block;
			width: 100%;
			max-width: 900px;
			margin: 0 auto 3em;

			background-color: #ffffff;
		}

		.dm-dialog__container {
			padding: 1em;
		}

		.dm-template {
			display: none;
		}
	`;

	document.head.appendChild(style);
}
