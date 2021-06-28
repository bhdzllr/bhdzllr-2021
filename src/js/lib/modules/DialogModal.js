import { isFocusable } from '../utils/accessibility';

export class DialogModal {

	constructor({
		contentAsHtml,
		showOnCreation = false,
		showCallback = null,
		hideCallback = null,
		ariaLabelledBy = '',
		hideRootScrollbars = true,
	}) {
		this.contentAsHtml = contentAsHtml;
		this.showOnCreation = showOnCreation;
		this.showCallback = showCallback;
		this.hideCallback = hideCallback;
		this.ariaLabelledBy = ariaLabelledBy;
		this.hideRootScrollbars = hideRootScrollbars;

		this.overlay;
		this.dialog;
		this.btnClose;
		this.firstFocusableElement;
		this.lastFocusableElement;
		this.lastElement;
		this.isOpen = false;

		this.initDom();
		this.initListeners();

		if (this.showOnCreation) this.show();
	}

	initDom() {
		this.overlay = document.createElement('div');
		this.overlay.classList.add('dm-overlay');
		this.overlay.classList.add('js-dm-overlay');
		this.overlay.classList.add('hidden');
		this.overlay.hidden = true;

		this.dialog = document.createElement('div');
		this.dialog.classList.add('dm-dialog');
		this.dialog.classList.add('js-dm-dialog');
		this.dialog.setAttribute('role', 'dialog');
		this.dialog.setAttribute('aria-modal', 'true'); // Tell screenreaders that content behind the modal is not interactive
		this.dialog.setAttribute('aria-labelledby', this.ariaLabelledBy); // Tell screenreaders the ID of the title element
	
		this.setContentAsHtml(this.contentAsHtml);

		this.btnClose = document.createElement('button');
		this.btnClose.classList.add('dm-btn-close');
		this.btnClose.classList.add('js-dm-btn-close');
		this.btnClose.setAttribute('aria-label', 'Close');
		this.btnClose.innerHTML = `<span aria-hidden="true">&times;</span>`;

		this.overlay.appendChild(this.btnClose);
		this.overlay.appendChild(this.dialog);
		document.body.appendChild(this.overlay);
	}

	initListeners() {
		let overlayMouseDownTarget;

		this.btnClose.addEventListener('click', () => {
			this.hide();
		});

		this.overlay.addEventListener('mousedown', (e) => {
			overlayMouseDownTarget = e.target;
		});

		this.overlay.addEventListener('mouseup', (e) => {
			if (overlayMouseDownTarget && overlayMouseDownTarget.classList.contains('js-dm-overlay')) {
				this.hide();
			}
		});

		document.addEventListener('keyup', (e) => {
			if (e.keyCode != 27) return;

			let overlay = document.querySelector('.js-dm-overlay');
			if (overlay) this.hide();
		});

		this.handleFirstFocusableElementHandler = this.handleFirstFocusableElement.bind(this);
		this.handleLastFocusableElementHandler = this.handleLastFocusableElement.bind(this);
	}

	setContentAsHtml(contentAsHtml) {
		this.contentAsHtml = contentAsHtml;
		this.dialog.innerHTML = contentAsHtml;

		const childNodes = this.getFocusableChildNodes();

		if (!Boolean(childNodes.length)) return;

		this.firstFocusableElement = childNodes[0];
		this.lastFocusableElement = childNodes[childNodes.length - 1];

		this.setFirstFocusableElement(this.firstFocusableElement);
		this.setLastFocusableElement(this.lastFocusableElement);
	}

	setFirstFocusableElement(firstFocusableElement) {
		if (this.firstFocusableElement) this.firstFocusableElement.removeEventListener('keydown', this.handleFirstFocusableElementHandler);
		this.firstFocusableElement = firstFocusableElement;
		this.firstFocusableElement.addEventListener('keydown', this.handleFirstFocusableElementHandler);
	}

	setLastFocusableElement(lastFocusableElement) {
		if (this.lastFocusableElement) this.lastFocusableElement.removeEventListener('keydown', this.handleLastFocusableElementHandler);
		this.lastFocusableElement = lastFocusableElement;
		this.lastFocusableElement.addEventListener('keydown', this.handleLastFocusableElementHandler);
	}

	handleFirstFocusableElement(e) {
		if (e.shiftKey && e.keyCode == 9) {
			e.preventDefault();
			this.focusLastFocusableElement();
		}
	}

	handleLastFocusableElement(e) {
		if (e.keyCode == 9 && !(e.shiftKey && e.keyCode == 9)) {
			e.preventDefault();
			this.focusFirstFocusableElement();
		}
	}

	focusFirstFocusableElement() {
		if (this.firstFocusableElement) this.firstFocusableElement.focus();
	}

	focusLastFocusableElement() {
		if (this.lastFocusableElement) this.lastFocusableElement.focus();
	}

	focusLastDocumentElement() {
		if (this.lastElement) this.lastElement.focus();
	}

	show() {
		this.lastElement = document.activeElement;

		if (this.hideRootScrollbars) {
			document.documentElement.style.overflow = 'hidden';
			document.body.style.overflow = 'hidden';
		}

		this.overlay.classList.remove('hidden');
		this.overlay.hidden = false;
		this.isOpen = true;

		this.focusFirstFocusableElement();

		if (this.showCallback) this.showCallback();
	}

	hide() {
		if (this.hideRootScrollbars) {
			document.documentElement.style.overflow = 'auto';
			document.body.style.overflow = 'auto';
		}

		this.overlay.classList.add('hidden');
		this.overlay.hidden = true;
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
		let childNodesComponents = [];

		const components = Array.prototype.slice.call(this.dialog.querySelectorAll('*')).filter((element) => {
			if (element.tagName.includes('-')) return element; 
		});

		for (const component of components) {
			if (!!component.shadowRoot) {
				childNodesComponents = childNodesComponents.concat(Array.prototype.slice.call(component.shadowRoot.querySelectorAll(focusableSelector)));
			}
		}

		return childNodesOverlay.concat(childNodesDialog).concat(childNodesComponents).filter(function (node) {
			return isFocusable(node);
		})
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
			padding: 3.5em 1.5em 1.5em;
			overflow-y: auto;

			background-color: rgba(0, 0, 0, 0.75);
		}

		.dm-overlay.hidden {
			display: none;
		}

		.dm-btn-close {
			position: absolute;
			top: 5px;
			right: 0.45em;

			display: inline-block;
			width: 35px;
			height: 50px;

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
