export function addOutlineHandler(className = 'is-tabbing') {
	document.addEventListener('mousedown', function () {
		document.documentElement.classList.remove(className);
	});

	document.addEventListener('keydown', function (e) {
		if (e.keyCode !== 9) return;

		document.documentElement.classList.add(className);
	});
}

export function addRoleButtonListener(exceptions = []) {
	let buttons = document.querySelectorAll('[role="button"]');

	for (let i = 0; i < buttons.length; i++) {
		if (exceptions.indexOf(buttons[i].nodeName.toLowerCase()) > -1) {
			console.log(buttons[i].nodeName);
			continue;
		}

		buttons[i].addEventListener('keydown', function (e) {
			if (e.keyCode === 13 || e.keyCode === 32) {
				e.preventDefault();
				buttons[i].click();
			}
		});
	}
}

export function isFocusable(element) {
	if (element.tabIndex > 0 || (element.tabIndex === 0 && element.getAttribute('tabIndex') !== null)) return true;

	if (element.disabled) return false;

	switch (element.nodeName) {
		case 'A':
			return !!element.href && element.rel != 'ignore';
		case 'INPUT':
			return element.type != 'hidden' && element.type != 'file';
		case 'BUTTON':
		case 'SELECT':
		case 'TEXTAREA':
			return true;
		default:
			return false;
	}
}
