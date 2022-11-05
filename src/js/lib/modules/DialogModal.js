import { isFocusable } from '../utils/accessibility';

/**
 * Dialog Modal
 * Maybe this would work well as a web component too.
 */
export class DialogModal {

	constructor({
		contentAsHtml,
		title = null,
		ariaLabelledBy = null,
		showOnCreation = false,
		showCallback = null,
		hideCallback = null,
		hideRootScrollbars = true,
	}) {
		this.contentAsHtml = contentAsHtml;
		this.title = title;
		this.showOnCreation = showOnCreation;
		this.showCallback = showCallback;
		this.hideCallback = hideCallback;
		this.ariaLabelledBy = ariaLabelledBy;
		this.hideRootScrollbars = hideRootScrollbars;

		this.overlay;
		this.dialog;
		this.btnClose;
		this.headerBar;
		this.titleElement;
		this.firstFocusableElement;
		this.lastFocusableElement;
		this.lastElement;
		this.isOpen = false;
		this.initialStyles = {
			documentElement: {
				overflow: null,
				scrollbarGutter: null,
			},
			body: {
				overflow: null,
			}
		}

		this.initDom();
		this.initListeners();

		this.setContentAsHtml(this.contentAsHtml);

		if (this.showOnCreation) setTimeout(() => this.show());
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
		if (this.ariaLabelledBy) this.dialog.setAttribute('aria-labelledby', this.ariaLabelledBy); // Tell screenreaders the ID of the title element
	
		this.btnClose = document.createElement('button');
		this.btnClose.classList.add('dm-btn-close');
		this.btnClose.classList.add('js-dm-btn-close');
		this.btnClose.setAttribute('aria-label', 'Close');
		this.btnClose.innerHTML = `<span aria-hidden="true">&times;</span>`;

		this.headerBar = document.createElement('div');
		this.headerBar.classList.add('dm-header-bar');
		this.headerBar.classList.add('js-dm-header-bar');

		if (this.title) {
			this.titleElement = document.createElement('strong');
			this.titleElement.classList.add('dm-title');
			this.titleElement.classList.add('js-dm-title');
			this.titleElement.textContent = this.title;
			this.titleElement.id = 'dm-title-' + Math.random().toString(36).substring(2, 9);
			this.headerBar.appendChild(this.titleElement);
			this.headerBar.classList.add('dm-header-bar--title');

			if (!this.ariaLabelledBy) this.dialog.setAttribute('aria-labelledby', this.titleElement.id);
		}

		this.headerBar.appendChild(this.btnClose);
		this.overlay.appendChild(this.headerBar);
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
			if (overlayMouseDownTarget
				&& (
					overlayMouseDownTarget.classList.contains('js-dm-overlay')
					|| overlayMouseDownTarget.classList.contains('js-dm-header-bar')
				)
			) {
				this.hide();
			}
		});

		document.addEventListener('keyup', (e) => {
			const keyCode = e.which || e.keyCode;

			if (keyCode != 27) return;

			let overlay = document.querySelector('.js-dm-overlay');
			if (overlay) this.hide();
		});
	}

	setContentAsHtml(contentAsHtml) {
		this.contentAsHtml = contentAsHtml;
		this.dialog.innerHTML = contentAsHtml;

		const childNodes = this.getFocusableChildNodes();

		if (!Boolean(childNodes.length)) return;

		this.firstFocusableElement = childNodes[0];
		this.lastFocusableElement = childNodes[childNodes.length - 1];

		this.handleFirstFocusableElementHandler = this.handleFirstFocusableElement.bind(this);
		this.handleLastFocusableElementHandler = this.handleLastFocusableElement.bind(this);

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
		const keyCode = e.which || e.keyCode;

		if (e.shiftKey && keyCode == 9) {
			e.preventDefault();
			this.focusLastFocusableElement();
		}
	}

	handleLastFocusableElement(e) {
		const keyCode = e.which || e.keyCode;

		if (keyCode == 9 && !(e.shiftKey && keyCode == 9)) {
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

	deactivateBodyScroll() {
		this.initialStyles.documentElement.overflow = document.documentElement.style.overflow;
		this.initialStyles.documentElement.scrollbarGutter = document.documentElement.style.scrollbarGutter;
		this.initialStyles.body.overflow = document.body.style.overflow;

		document.documentElement.style.overflow = 'hidden';
		document.body.style.overflow = 'hidden';

		const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
		const hasScrollbar = document.body.scrollHeight > viewportHeight;
		if (hasScrollbar) document.documentElement.style.scrollbarGutter = 'stable';
	}

	activateBodyScroll() {
		document.documentElement.style.overflow = this.initialStyles.documentElement.overflow || 'auto';
		document.documentElement.style.scrollbarGutter = this.initialStyles.documentElement.scrollbarGutter || 'auto';
		document.body.style.overflow = this.initialStyles.body.overflow || 'auto';
	}

	show() {
		this.lastElement = document.activeElement;

		if (this.hideRootScrollbars) this.deactivateBodyScroll();

		this.overlay.classList.remove('hidden');
		this.overlay.hidden = false;
		this.isOpen = true;

		this.focusFirstFocusableElement();

		if (this.showCallback) this.showCallback();
	}

	hide() {
		if (this.hideRootScrollbars) this.activateBodyScroll();

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
	const dialogsModal = [];

	if (document.querySelector('[data-dm]')) {
		const dialogModalTriggers = document.querySelectorAll('[data-dm]');

		for (let i = 0; i < dialogModalTriggers.length; i++) {
			const target = dialogModalTriggers[i].dataset.dm;

			if (document.querySelector(target)) {
				const template = document.querySelector(target);
				const templateClone = template.content.cloneNode(true);
				const ariaLabelledBy = template.dataset.ariaLabelledby
				const tempDiv = document.createElement('div');
				tempDiv.appendChild(templateClone);

				const dialogModal = new DialogModal({
					contentAsHtml: tempDiv.innerHTML,
					ariaLabelledBy: ariaLabelledBy,
				});

				dialogsModal.push(dialogModal);

				dialogModalTriggers[i].addEventListener('click', function (e) {
					e.preventDefault();
					dialogModal.show();
				});
			}
		}
	}

	return dialogsModal;
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
			padding: 0 1.5em 1.5em;
			overflow-y: auto;

			background-color: rgba(0, 0, 0, 0.75);
		}

		.dm-overlay.hidden {
			display: none;
		}

		.dm-header-bar {
			position: relative;

			display: flex;
			flex-direction: row;
			justify-content: flex-end;
			align-items: center;
			height: 3.5em;
			margin-left: -1.5em;
			margin-right: -1.5em;
			margin-bottom: 1.5em;
			padding: 0 1.5em;
			box-sizing: border-box;
		}

		.dm-header-bar--title {
			justify-content: space-between;
		}

		.dm-title {
			display: inline-block;
			margin-right: 1em;
			overflow: hidden;

			color: #ffffff;
			font-size: 1.25em;
			font-weight: bold;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.dm-btn-close {
			display: inline-flex;
			justify-content: flex-end;

			height: 50px;
			padding: 0 0.5em;

			background: transparent;
			border: none;
			cursor: pointer;
			transform: translateX(0.5em);

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
