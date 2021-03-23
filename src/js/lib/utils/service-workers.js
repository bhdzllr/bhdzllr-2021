export function addServiceWorker(file) {
	if ('serviceWorker' in navigator) {
		window.addEventListener('load', function () {
			navigator.serviceWorker.register(file);
		});
	}
}
