const defaultOptions = {
	degrees: 65, // Degrees
	spacing: 10, // Pixels
	responsive: true, // Boolean
	perspective: 1000, // Pixels
	rotationFactor: 12, // Pixels
	transitionDuration: 500, // Milliseconds
	scrollWidth: 15, // Pixels
	interactiveElements: [
		'a',
		'button',
	],
};

export class Cube {

	constructor(element, options = {}) {
		this.element = element;
		this.options = Object.assign({}, defaultOptions, options);

		this.scene = this.element.parentNode;
		this.isTouchMoving = false;
		this.isTicking = false;
		this.viewportWidth = (window.innerWidth || document.documentElement.clientWidth);
		this.touchStartX = 0;
		this.lastRotation = 0;
		this.lastDirection = null;
		this.rotation = 0;
		this.tz = 0;

		this.initDom();
		this.initListeners();
	}

	initDom() {
		this.updateViewportAndTranslateZ();
	}

	initListeners() {
		const cubeNavLeftButtons = this.element.querySelectorAll('.js-cube-nav-left');
		for (let i = 0; i < cubeNavLeftButtons.length; i++) {
			cubeNavLeftButtons[i].addEventListener('click', (e) => this.rotateLeft());
		}

		const cubeNavRightButtons = this.element.querySelectorAll('.js-cube-nav-right');
		for (let i = 0; i < cubeNavRightButtons.length; i++) {
			cubeNavRightButtons[i].addEventListener('click', (e) => this.rotateRight());
		}

		this.element.addEventListener('touchstart', (e) => this.touchStart(e), false);
		this.element.addEventListener('touchend', (e) => this.touchEnd(e), false);
		this.element.addEventListener('touchmove', (e) => this.touchMove(e), false);
		this.element.addEventListener('touchmove', (e) => this.touchScrolling(e), { passive: false });

		this.element.addEventListener('mousedown', (e) => this.touchStart(e), false);
		this.element.addEventListener('mouseup', (e) => this.touchEnd(e), false);
		this.element.addEventListener('mousemove', (e) => this.touchMove(e), false);

		window.addEventListener('resize', () => this.updateViewportAndTranslateZ(), false);
	}

	getTouchX(e) {
		if (e.type.indexOf('touch') > -1) return e.touches[0].clientX;

		return e.clientX;
	}

	touchStart(e) {
		if (this.options.interactiveElements.indexOf(e.target.nodeName.toLowerCase()) > -1) return;

		this.isTouchMoving = true;
		this.touchStartX = this.getTouchX(e);
	}

	touchEnd(e) {
		if (this.options.interactiveElements.indexOf(e.target.nodeName.toLowerCase()) > -1) return;

		e.preventDefault();

		this.isTouchMoving = false;

		let snapRotation = 0;

		if (this.lastDirection == 'left') {
			if (this.lastRotation > (this.options.degrees / this.options.rotationFactor)) { // < 0
				snapRotation = this.options.degrees;
			} else {
				snapRotation = 0;
			}
		} else {
			if (this.lastRotation < -(this.options.degrees / this.options.rotationFactor)) { // < 0
				snapRotation = -this.options.degrees;
			} else {
				snapRotation = 0;
			}
		}

		if (snapRotation > this.options.degrees) {
			snapRotation = this.options.degrees;
		} else if (snapRotation < -this.options.degrees) {
			snapRotation = -this.options.degrees;
		}

		setTimeout(() => {
			this.element.classList.add('cube--transition');
			this.rotate(snapRotation);
			this.rotation = this.lastRotation;

			setTimeout(() => {
				this.element.classList.remove('cube--transition');
			}, this.options.transitionDuration);
		});
	}

	touchMove(e) {
		if (!this.isTouchMoving) return;

		if (!this.isTicking) {
			requestAnimationFrame(() => {
				this.isTicking = false;

				if (!this.isTouchMoving) return;

				let touchX = this.getTouchX(e);
				let distance = touchX - this.touchStartX;
				let distancePercentFromViewport = (distance * 100) / this.viewportWidth;
				let deg = this.rotation + parseInt((this.options.degrees / 100) * distancePercentFromViewport);

				this.lastDirection = distance > 0 ? 'left' : 'right';

				this.rotate(deg);
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

		if (Math.abs(x) > this.options.scrollWidth) {
			e.preventDefault();
			e.returnValue = false;
			return false;
		}
	}

	rotateLeft() {
		this.rotateStep(this.lastRotation + this.options.degrees)
	}

	rotateRight() {
		this.rotateStep(this.lastRotation - this.options.degrees)
	}

	rotateStep(degrees) {
		this.element.classList.add('cube--transition');

		this.rotate(degrees);
		this.rotation = this.lastRotation;

		setTimeout(() => {
			this.element.classList.remove('cube--transition');
		}, this.options.transitionDuration);
	}

	rotate(deg) {
		this.element.style.transform = `translateZ(${this.tz}px) rotateY(${deg}deg)`;
		this.lastRotation = deg;
	}

	/**
	 * Calculate and set translateZ
	 * Property translateZ keeps layers at their position and text rendering intact.
	 * Calculation: ($sceneWidth / 2) / tan($degrees / 2) = 240 / tan(32.5) = 240 / 0.6370702 = 376.72
	 */
	updateViewportAndTranslateZ() {
		this.tz = ((-this.element.offsetWidth - this.options.spacing) / 2) / getTangent(this.options.degrees);
		this.viewportWidth = window.innerWidth || document.documentElement.clientWidth;

		if (this.options.responsive && this.viewportWidth > this.options.perspective) this.scene.style.perspective = this.viewportWidth + 'px';

		this.rotate(this.lastRotation);
	}

}

function getTangent(degrees) {
	return Math.tan((degrees / 2) * Math.PI / 180);
}

export function addCubeDefaultStyles(options = {}) {
	if (document.querySelector('#js-cube-styles')) return;

	options = Object.assign({}, defaultOptions, options);

	const style = document.createElement('style');
	style.id = 'js-cube-styles';

	style.innerHTML = `
		.cube-scene {
			width: 85vw;
			margin: 0 auto;

			perspective: ${options.perspective}px;
			perspective-origin: 50% 50%;
		}
 
		.cube {
			transform-style: preserve-3d;
			transition: transform 0.1s ease-out;
		}

		.cube--transition {
			transition: transform 0.5s ease-out;
		}

		.cube__section {
			position: absolute;

			width: 100%;
		}

		.cube__section:nth-child(1) {
			transform: rotateY(0deg) translateZ(calc((85vw + ${options.spacing}px) / 2 / ${getTangent(options.degrees)}));
		}

		.cube__section:nth-child(2) {
			transform: rotateY(-${options.degrees}deg) translateZ(calc((85vw + ${options.spacing}px) / 2 / ${getTangent(options.degrees)}));
		}

		.cube__section:nth-child(3) {
			transform: rotateY(${options.degrees}deg) translateZ(calc((85vw + ${options.spacing}px) / 2 / ${getTangent(options.degrees)}));
		}
	`;

	document.head.appendChild(style);
}
