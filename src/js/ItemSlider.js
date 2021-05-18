/**
 * Improvements:
 * Indicators
 * Grouping
 * Spacing to show indication of prev and next element
 * No Indicators when not grouped
 * Free Scroll (no nativ scroll, for native scroll just use CSS)
 * Setter for Options Array
 */
const options = {
	transitionDuration: 500, // Milliseconds
	touchDeltaTime: 300, // Milliseconds
	touchDeltaFactor: 3, // Percentages
	scrollFactor: 25, // Percentages
	scrollWidth: 15, // Pixels
	undraggableElementsSelector: 'img', // CSS Selector
};

const template = document.createElement('template');
template.innerHTML = `
	<style>
		:host {
			position: relative;

			display: block;
			overflow: hidden;

			--col-width: 100%;
		}

		:host([hidden]) {
			display: none;
		}

		.panel {
			display: flex;
			flex-wrap: nowrap;

			cursor: grab;
			transform: translateX(0);
			transition: transform ${options.transitionDuration / 1000}s ease;
		}

		.panel--is-moving {
			cursor: grabbing;
			transition: none;
		}

		::slotted(*) {
			width: var(--cell-width);
			flex: 0 0 var(--cell-width);
		}

		button {
			position: absolute;
			top: 50%;
			left: 8px;

			width: 30px;
			height: 30px;

			background: rgba(0, 0, 0, 0.6);
			border: none;
			border-radius: 50%;
			cursor: pointer;
			transform: translateY(-50%);

			color: #ffffff;
			font-weight: bold;
			font-size: 1.5rem;
		}

		button:last-child {
			right: 8px;
			left: auto;
		}

		button svg {
			position: absolute;
			top: 50%;
			left: 50%;

			width: calc(100% - 10px);
			height: calc(100% - 10px);

			transform: translate(-50%, -50%);
		}

		button:first-child svg {
			left: calc(50% - 1px);
		}		

		button:focus {
			outline: var(--bhdzllr-outline);
			outline-offset: var(--bhdzllr-outline-offset);
		}

		@media only screen and (min-width: 480px) {
			button {
				width: 50px;
				height: 50px;
			}
		}
	</style>
	<div class="panel js-panel">
		<slot></slot>
	</div>
	<button tabindex="1" aria-label="Next">
		<svg width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
			<polyline points="15 6 9 12 15 18"/>
		</svg>
	</button>
	<button tabindex="1" aria-label="Previous">
		<svg width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
			<polyline points="9 6 15 12 9 18"/>
		</svg>
	</button>
`;

export class ItemSlider extends HTMLElement {

	static get observedAttributes() {
		return ['cells', 'pos'];
	}

	constructor() {
		super();

		this.attachShadow({ mode: 'open' });
		this.shadowRoot.appendChild(template.content.cloneNode(true));

		this.panel = this.shadowRoot.querySelector('.js-panel');
		this.btnLeft = this.shadowRoot.querySelector('button');
		this.btnRight = this.shadowRoot.querySelector('button:last-child');
		this.posX = 0;
		this.count = this.children.length;
		this.isTouchMoving = false;
		this.isTicking = false;
		this.touchStartX = 0;
		this.touchStartTime = 0;
		this.lastDistancePercentages = 0;
		this.lastDirection = null;
		this.slideAdjusted = false;

		this.text = {
			previous: 'Previous',
			next: 'Next',
		};

		this.updateButtons();
	}

	connectedCallback() {
		if (!this.hasAttribute('cells') || isNaN(this.hasAttribute('cells'))) this.cells = 1;
		if (!this.hasAttribute('pos') || isNaN(this.hasAttribute('pos'))) this.pos = 0;
		if (this.hasAttribute('data-text-previous')) this.text.previous = this.getAttribute('data-text-previous');
		if (this.hasAttribute('data-text-next')) this.text.next = this.getAttribute('data-text-next');

		this.btnLeft.setAttribute('aria-label', this.text.previous);
		this.btnRight.setAttribute('aria-label', this.text.next);

		this.slideLeftHandler = this.slideLeft.bind(this);
		this.slideRightHandler = this.slideRight.bind(this);

		this.btnLeft.addEventListener('click', this.slideLeftHandler);
		this.btnRight.addEventListener('click', this.slideRightHandler);

		const undraggableElements = this.querySelectorAll(options.undraggableElementsSelector);
		for (let i = 0; i < undraggableElements.length; i++) {
			undraggableElements[i].addEventListener('mousedown', (e) => {
				e.preventDefault();
			});
		}

		// @todo Handler

		this.panel.addEventListener('touchstart', (e) => this.touchStart(e));
		this.panel.addEventListener('touchmove', (e) => this.touchScrolling(e), { passive: false });
		window.addEventListener('touchend', (e) => this.touchEnd(e));
		window.addEventListener('touchmove', (e) => this.touchMove(e));

		this.panel.addEventListener('mousedown', (e) => this.touchStart(e));
		window.addEventListener('mouseup', (e) => this.touchEnd(e));
		window.addEventListener('mousemove', (e) => this.touchMove(e));
	}

	disconnectedCallback() {
		// @todo
		// this.btnLeft.removeEventListener('click', this.slideLeftHandler);
		// this.btnRight.removeEventListener('click', this.slideRightHandler);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case 'cells':
				this.updateCells();
				break;
			case 'pos':
				this.slide();
				break;
		}
	}

	get cells() {
		if (isNaN(this.getAttribute('cells'))) return;

		return parseInt(this.getAttribute('cells'));
	}

	set cells(value) {
		this.setAttribute('cells', value);
		this.updateCells();
	}

	get pos() {
		if (isNaN(this.getAttribute('pos'))) return;

		return parseInt(this.getAttribute('pos'));
	}

	set pos(value) {
		this.setAttribute('pos', value);
	}

	updateCells() {
		if (isNaN(this.cells)) return;

		this.posX = 0;
		this.pos = 0;
		this.style.setProperty('--cell-width', (100 / this.cells) + '%');
	}

	slideRight() {
		this.slideAdjusted = true;
		this.pos++;
	}

	slideLeft() {
		this.slideAdjusted = true;
		this.pos--;
	}

	slide() {
		if (isNaN(this.pos)) return;

		if (!this.slideAdjusted) {
			if (this.pos > (this.count - this.cells)) {
				// Remove empty space at end, triggers function again
				this.slideAdjusted = true;
				this.pos = this.count - this.cells;
				return;
			}
			else if (this.cells > 2 && this.pos > 0) {
				// Adjust slide to center
				this.slideAdjusted = true;
				this.pos = this.pos - Math.floor(3 / 2);
				return;
			}
		}

		this.posX = -Math.abs((100 / this.cells) * this.pos);
		this.panel.style.transform = `translateX(${this.posX}%)`;
		this.slideAdjusted = false;

		this.updateButtons();
	}

	updateButtons() {
		if (this.pos == 0) {
			if (!this.btnLeft.hidden) {
				this.btnLeft.hidden = true;
				this.dispatchEvent(new CustomEvent('onButtonLeftHidden'));
			}
		} else {
			if (this.btnLeft.hidden) {
				this.btnLeft.hidden = false;
				this.dispatchEvent(new CustomEvent('onButtonLeftVisible'));
			}
		}

		if (this.pos >= this.count - this.cells) {
			if (!this.btnRight.hidden) {
				this.btnRight.hidden = true;
				this.dispatchEvent(new CustomEvent('onButtonRightHidden'));
			}
		} else {
			if (this.btnRight.hidden) {
				this.btnRight.hidden = false;
				this.dispatchEvent(new CustomEvent('onButtonRightVisible'));
			}
		}
	}

	getTouchX(e) {
		if (e.type.indexOf('touch') > -1) return e.touches[0].clientX;

		return e.clientX;
	}

	touchStart(e) {
		this.isTouchMoving = true;
		this.touchStartX = this.getTouchX(e);
		this.touchStartTime = Date.now();
		this.panel.classList.add('panel--is-moving');
	}

	touchEnd(e) {
		if (!this.isTouchMoving) return;

		e.preventDefault();

		this.isTouchMoving = false;
		this.panel.classList.remove('panel--is-moving');

		const touchDeltaTime = Date.now() - this.touchStartTime;
		let posDiff = this.cells > 1
			? Math.abs(Math.round((this.lastDistancePercentages * this.cells) / 100))
			: 1;

		if (touchDeltaTime < options.touchDeltaTime) posDiff = 1;

		this.slideAdjusted = true;

		if (Math.abs(this.lastDistancePercentages) > (options.scrollFactor / this.cells)
			|| (touchDeltaTime < options.touchDeltaTime && Math.abs(this.lastDistancePercentages) > options.touchDeltaFactor)
		) {
			if (this.lastDirection == 'left') {
				if (this.pos == 0) {
					// Snap back
					this.slide();
				} else if (this.pos - posDiff < 0) {
					this.pos = 0;
				} else {
					this.pos = this.pos - posDiff;
				}
			} else {
				if (this.pos == this.count - this.cells) {
					// Snap back
					this.slide();
				} else if (this.pos + posDiff > this.count - this.cells) {
					this.pos = this.count - this.cells;
				} else {
					this.pos = this.pos + posDiff;
				}
			}
		} else {
			// Snap back to last position
			this.slide();
			return;
		}

		this.lastDistancePercentages = 0;
	}

	touchMove(e) {
		if (!this.isTouchMoving) return;

		if (!this.isTicking) {
			requestAnimationFrame(() => {
				this.isTicking = false;

				if (!this.isTouchMoving) return;

				let touchX = this.getTouchX(e);
				let distance = touchX - this.touchStartX;

				const distancePercentages = (distance * 100) / this.panel.offsetWidth
				const pos = this.posX + distancePercentages;

				this.lastDistancePercentages = distancePercentages;
				this.lastDirection = distance > 0 ? 'left' : 'right';
				this.panel.style.transform = `translateX(${pos}%)`;
			});
		}

		this.isTicking = true;
	}

	/**
	 * Prevent vertical scrolling when swiping left/right
	 */
	touchScrolling(e) {
		if (!this.isTouchMoving) return;

		let x = this.getTouchX(e) - this.touchStartX;

		if (Math.abs(x) > options.scrollWidth) {
			e.preventDefault();
			e.returnValue = false;
			return false;
		}
	}

}

customElements.define('bhdzllr-item-slider', ItemSlider);
