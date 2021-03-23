export default class Elevator {

	constructor(element) {
		this.element = element

		this.initListeners();
	}

	initListeners() {
		this.element.addEventListener('click', (e) => this.scrollTop(e), false);
	}

	scrollTop(e) {
		e.preventDefault();
		window.scrollTo(0, 0);
	}

}
