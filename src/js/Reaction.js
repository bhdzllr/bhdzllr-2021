import 'whatwg-fetch';

const template = document.createElement('template');
template.innerHTML = `
	<style>
		:host {
			display: inline-flex;
			align-items: center;
			height: 25px;
			margin: 0 0 1rem 0;
			padding: 4px 0;
			box-sizing: content-box;
			background: none;
			border: none;
			cursor: pointer;
		}

		:host([hidden]) {
			display: none;
		}

		:host([pressed]),
		:host([disabled]) {
			cursor: default;
		}

		svg {
			fill: transparent;
			storke: currentColor;

			transform: scale(1) rotate3d(0, 1, 0, 0deg);
			transition: transform 0.5s ease, fill 0.5s ease, stroke 0.5s ease;
		}

		:host(:hover) svg {
			transform: scale(1.15);
		}

		:host([pressed]:hover) svg,
		:host([disabled]:hover) svg {
			transform: scale(1) rotate3d(0, 1, 0, 180deg);;
		}

		:host([pressed]) svg {
			transform: rotate3d(0, 1, 0, 180deg);

			fill: var(--bhdzllr-reaction-fill, currentColor);
			stroke: var(--bhdzllr-reaction-stroke, currentColor);
		}

		output {
			display: inline-block;
			margin-left: 0.5rem;
			font-size: 1rem;
		}
	</style>
	<slot></slot>
	<output></output>
`;

const ICONS = [
	{
		name: 'like',
		label: 'Like',
		html: `
			<svg width="25" height="25" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<title>Like</title>
				<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
				<path d="M19.5 13.572l-7.5 7.428l-7.5 -7.428m0 0a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/>
			</svg>
		`,
	},
	{ 
		name: 'star',
		label: 'Rate positive',
		html: `
			<svg width="25" height="25" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
				<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>
			</svg>
		`,
	},
];

const KEYCODES = {
	SPACE: 32,
	ENTER: 13,
};

export class Reaction extends HTMLElement {

	static get observedAttributes() {
		return ['value', 'pressed', 'disabled'];
	}

	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
		this.shadowRoot.appendChild(template.content.cloneNode(true));

		this.icon;
		this.output = this.shadowRoot.querySelector('output');

		this.loadValue();
	}

	connectedCallback() {
		if (!this.hasAttribute('id')) console.warn('[Reaction] No id set.');
		// if (!this.hasAttribute('value')) this.setAttribute('value', 0);
		if (!this.hasAttribute('icon') && !this.innerHTML) this.setAttribute('icon', 'like');
		if (!this.hasAttribute('url')) console.warn('[Reaction] No URL set.');
		if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
		if (!this.hasAttribute('tabindex')) this.setAttribute('tabindex', 0);
		if (!this.hasAttribute('aria-pressed')) this.setAttribute('aria-pressed', 'false');

		if (this.hasAttribute('icon') && !this.innerHTML) {
			if (this.isPredefinedIcon(this.getAttribute('icon'))) {
				this.icon = this.getIcon(this.getAttribute('icon'));
				this.output.insertAdjacentHTML('beforebegin', this.icon.html);

				if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', this.icon.label);
			} else {
				this.icon = this.getAttribute('icon');
				this.output.insertAdjacentHTML('beforebegin', this.icon);

				if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', this.icon);
			}
		}

		if (this.hasAttribute('id')) {
			const localReactions = JSON.parse(localStorage.getItem('reactions')) ?? [];

			if (localReactions.indexOf(this.getAttribute('id')) > -1) {
				this.pressed = true;
			}
		}

		this.addEventListener('click', this.increase);
		this.addEventListener('keydown', this.handleKeyDown);
	}

	disconnectedCallback() {
		this.removeEventListener('click', this.increase);
		this.removeEventListener('keydown', this.handleKeyDown);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'value':
				this.output.textContent = this.value;
				break;
			case 'pressed':
				this.setAttribute('aria-pressed', newValue !== null);
				break;
			case 'disabled':
				this.setAttribute('aria-disabled', newValue !== null);
				break;
		}
	}

	get value() {
		if (isNaN(this.getAttribute('value'))) return;

		return parseInt(this.getAttribute('value'));
	}

	set value(value) {
		this.setAttribute('value', value);
	}

	get pressed() {
		return this.hasAttribute('pressed');
	}

	set pressed(value) {
		if (value) {
			this.setAttribute('pressed', '');
		} else {
			this.removeAttribute('pressed');
		}
	}

	get disabled() {
		return this.hasAttribute('disabled');
	}

	set disabled(value) {
		if (value) {
			this.setAttribute('disabled', '');
		} else {
			this.removeAttribute('disabled');
		}
	}

	loadValue() {
		const url = this.getAttribute('url');
		if (!url) return;

		fetch(encodeURI(url))
			.then(response => response.json())
			.then(async responseData => {
				this.value = responseData.likes ?? 0;
			});
	}

	saveValue() {
		const url = this.getAttribute('url');
		if (!url) return;

		fetch(encodeURI(url), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
			});
	}

	rememberValue() {
		const localReactions = JSON.parse(localStorage.getItem('reactions')) ?? [];

		localReactions.push(this.getAttribute('id'));

		localStorage.setItem('reactions', JSON.stringify(localReactions));
	}

	handleKeyDown(e) {
		if (e.altKey) return;

		switch (e.keyCode) {
			case KEYCODES.SPACE:
			case KEYCODES.ENTER:
				e.preventDefault();
				this.increase();
				break;
			default:
				return;
		}
	}

	increase() {
		if (this.pressed) return;
		if (this.disabled) return;

		this.pressed = true;
		this.value++

		this.saveValue();
		this.rememberValue();
	}

	isPredefinedIcon(iconName) {
		return ICONS.some(icon => icon.name === iconName);
	}

	getIcon(iconName) {
		return ICONS.find(icon => icon.name == iconName);
	}

}

customElements.define('bhdzllr-reaction', Reaction);
