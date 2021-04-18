const template = document.createElement('template');
template.innerHTML = `
	<style>
		:host {
			display: inline-block;

			margin-bottom: 1rem;
		}

		button {
			display: flex;
			align-items: center;
			height: 25px;
			margin: 0;
			padding: 4px 0;
			box-sizing: content-box;

			background: none;
			border: none;
			cursor: pointer;
		}

		svg {
			transform: scale(1);
			transition: transform 0.2s ease;
		}

		button:hover svg {
			transform: scale(1.15);
		}

		span {
			display: inline-block;
			margin-left: 0.5rem;

			font-size: 1rem;
		}
	</style>
	<button>
		<svg width="25" height="25" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<title>Like</title>
			<path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
			<path d="M19.5 13.572l-7.5 7.428l-7.5 -7.428m0 0a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"></path>
		</svg>
		<span></span>
	</button>
`;

export class Like extends HTMLElement {

	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
		this.shadowRoot.appendChild(template.content.cloneNode(true));

		this.valueElement = this.shadowRoot.querySelector('span');
	}

	connectedCallback() {
		if (!this.hasAttribute('value')) this.setAttribute('value', 0);

		this.addEventListener('click', this.like);
	}

	disconnectedCallback() {
      this.removeEventListener('click', this.like);
    }

	attributeChangedCallback(name, oldValue, newValue) {
		this.valueElement.textContent = this.value;
	}

	get value() {
		return parseInt(this.getAttribute('value'));
	}

	set value(value) {
		this.setAttribute('value', value);
	}

	static get observedAttributes() {
		return ['value'];
	}

	like() {
		this.value++
	}

}

customElements.define('bhdzllr-like', Like);
