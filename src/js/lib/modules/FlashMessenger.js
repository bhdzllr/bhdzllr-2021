export class FlashMessenger {

	constructor(i18n, time = 7000) {
		this.i18n = i18n;
		this.time = time;

		this.messages = 0;
		this.messageContainer;
	}

	initDom() {
		const messageContainer = document.createElement('div');
		messageContainer.classList.add('message-container');

		this.messageContainer = messageContainer;

		document.body.append(messageContainer);
	}

	hasMessages() {
		return Boolean(this.messages);
	}

	sendInfo(message) {
		this.sendMessage('info', message);
	}

	sendWarning(message) {
		this.sendMessage('warning', message);
	}

	sendError(message) {
		this.sendMessage('error', message);
	}

	sendSuccess(message) {
		this.sendMessage('success', message);
	}

	sendMessage(level, message) {
		if (!this.hasMessages()) this.initDom();

		this.messages++;

		const messageElement = document.createElement('div');
		messageElement.classList.add('message');
		messageElement.classList.add(`message--${level}`);
		messageElement.classList.add('js-message');
		messageElement.setAttribute('id', 'message-' + Math.random().toString(36).substring(5));

		const messageBody = document.createElement('p');
		messageBody.textContent = message;

		const btnClose = document.createElement('button');
		btnClose.classList.add('message__btn-close');
		btnClose.setAttribute('aria-label', this.i18n.get('general.close', 'Close'));
		btnClose.innerHTML = `<span aria-hidden="true">&times;</span>`;
		btnClose.addEventListener('click', (e) => {
			e.preventDefault();

			const messageElement = e.currentTarget.parentNode;

			this.removeMessage(messageElement);
		});

		messageElement.appendChild(messageBody);
		messageElement.appendChild(btnClose);

		this.messageContainer.appendChild(messageElement);

		setTimeout(() => {
			this.removeMessage(messageElement);
		}, this.time);
	}

	removeMessage(messageElement) {
		const id = messageElement.id;

		if (this.messageContainer.querySelector(`#${id}`)) {
			this.messageContainer.removeChild(messageElement);
			this.messages--;

			if (!this.hasMessages()) this.messageContainer.parentNode.removeChild(this.messageContainer);
		}
	}
	
}

export function addFlashMessengerDefaultStyles() {
	if (document.querySelector('#js-message-styles')) return;

	const style = document.createElement('style');
	style.id = 'js-message-styles';

	style.innerHTML = `
		.message-container {
			position: fixed;
			top: 0;
			right: 0;

			padding: 1em;
		}

		.message {
			position: relative;

			margin-bottom: 0.75em;
			padding: 1em;
			box-sizing: border-box;

			background: #333333;
			border-radius: 0.2em;
			box-shadow: 0 7px 20px rgba(0, 0, 0, 0.5);

			color: #ffffff;
		}

		.message p {
			margin: 0;
			margin-right: 3em;
		}

		.message__btn-close {
			position: absolute;
			top: 0;
			right: 0;

			background: none;
			border: none;
			cursor: pointer;

			color: inherit;
			font-weight: bold;
		}

		.message__btn-close:focus,
		.message__btn-close:hover,
		.message__btn-close:active {
			background: none;
			box-shadow: none;
		}
	`;

	document.head.appendChild(style);
}
