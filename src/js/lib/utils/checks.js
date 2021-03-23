export function checkJS() {
	document.documentElement.className = document.documentElement.className.replace(/\bno-js\b/, 'js');
}

/**
 * @see {@link https://stackoverflow.com/a/7557433/6458288}
 * @see {@link https://stackoverflow.com/users/139361/dan}
 */
export function isElementInViewport(el, viewport) {
	const rect = el.getBoundingClientRect();

	if (viewport) {
		return (
			rect.top >= 0
			&& rect.right <= (viewport.innerWidth || viewport.clientWidth)
			&& rect.bottom <= (viewport.innerHeight || viewport.clientHeight)
			&& rect.left >= 0
		);
	}

	return (
		rect.top >= 0
		&& rect.right <= (window.innerWidth || document.documentElement.clientWidth)
		&& rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
		&& rect.left >= 0
	);
}
