export class Form {
	
	constructor(formElement, submittedCallback) {
		this.formElement = formElement;
		this.submittedCallback = submittedCallback;
		this.initialClassList = formElement.classList;

		this.initListeners();
	}

	initListeners() {
		this.formElement.addEventListener('submit', (e) => {
			e.preventDefault();

			if (this.isValid()) {
				this.submittedCallback();
			}
		});
	}

	setValues(values) {
		for (let key in values) {
			if (this.formElement.querySelector(`[name="${key}"]`)) {
				this.formElement.querySelector(`[name="${key}"]`).value = values[key];
			}
		}
	}

	getValues() {
		const formControls = this.formElement.querySelectorAll('input, textarea, select');
		const values = [];

		for (let i = 0; i < formControls.length; i++) {
			const control = formControls[i];

			switch (control.getAttribute('type')) {
				case 'checkbox':
				case 'radio':
					if (control.checked) values.push({ name: encodeURIComponent(control.name), value: encodeURIComponent(control.value) });
					break;
				case 'file':
					break;
				default:
					if (control.nodeName == 'SELECT' && control.type == 'select-multiple') {
						for (let j = 0; j < control.options.length; j++) {
							if (control.options[j].selected) {
								values.push({ name: encodeURIComponent(control.name), value: encodeURIComponent(control.options[j].value) });
							}
						}
					} else {
						values.push({ name: encodeURIComponent(control.name), value: encodeURIComponent(control.value) });
					}
			}
		}

		return values;
	}

	serialize() {
		const values = [];

		this.getValues().forEach(function (c) {
			if (c.name.trim()) {
				values.push(c.name + '=' + c.value);
			}
		})

		return values.join('&');
	}

	isValid() {
		return isFormValid(this.formElement);
	}

	reset(classesToRemove = []) {
		this.formElement.reset();
		this.formElement.classList.remove(...classesToRemove);
	}

}

// Don't forget using "novalidate" attribute on form that is validated manually
export function isFormValid(formElement, classNameValidated = 'form--validated') {
	if (typeof document.createElement('input').checkValidity == 'function') {
		formElement.classList.add(classNameValidated);
		return formElement.checkValidity() === true;
	}

	return true; // Return true if browser doesn't support `checkValidty()`, we need to check on server anyway. 
}
