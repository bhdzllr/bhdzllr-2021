export function lazyLoadImages({
	className = 'js-lazy-image',
	rootMargin = '100px',
	threshold = [0.0],
	loadCallback = null,
} = {}) {
	const images = document.querySelectorAll('.' + className);

	// Fallback for loading all images
	const fallback = function (images) {
		for (let i = 0; i < images.length; i++) {
			const image = images[i];

			if (image.dataset.src) image.src = image.dataset.src;
			if (image.dataset.srcset) image.srcset = image.dataset.srcset;
			if (image.dataset.sizes) image.sizes = image.dataset.sizes;

			image.classList.remove(options.className);

			if (options.loadCallback) options.loadCallback(image);
		}
	};

	// Loading if printing
	let isPrinting = false;
	const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
	if (!isSafari) {
		window.onbeforeprint = function() {
			isPrinting = true;
			fallback(images);
		};
	} else {
		window.matchMedia('print').addListener(function () {
			isPrinting = true;
			fallback(images);
		});
	}
	if (isPrinting) return;

	// Lazy Loading
	if (
		'IntersectionObserver' in window
		&& 'IntersectionObserverEntry' in window
		&& 'intersectionRatio' in (window).IntersectionObserverEntry.prototype
		&& 'isIntersecting' in (window).IntersectionObserverEntry.prototype
	) {
		const intersectionObserver = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					const image = entry.target;

					intersectionObserver.unobserve(image);

					if (image.dataset.src) image.src = image.dataset.src;
					if (image.dataset.srcset) image.srcset = image.dataset.srcset;
					if (image.dataset.sizes) image.sizes = image.dataset.sizes;

					image.classList.remove(className);

					if (loadCallback) loadCallback(image);
				}
			});
		}, {
			rootMargin: rootMargin,
			threshold: threshold,
		});

		for (let i = 0; i < images.length; i++) {
			images[i].hidden = false;
			intersectionObserver.observe(images[i]);
		}
	} else {
		// Fallback, just load all images
		fallback(images);
	}
}
