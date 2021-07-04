document.addEventListener('DOMContentLoaded', function () {

	lazyLoadImages();

});

function lazyLoadImages(options) {
	if (!options) options = {};

	options.className    = options.className     || 'js-lazy-image';
	options.rootMargin   = options.rootMargin    || '100px';
	options.threshold    = options.threshold     || [0.0];
	options.loadCallback = options.loadCallback  || null;

	var images = document.querySelectorAll('.' + options.className);

	// Fallback for loading all images
	var fallback = function (images) {
		for (var i = 0; i < images.length; i++) {
			var image = images[i];

			if (image.dataset.src) image.src = image.dataset.src;
			if (image.dataset.srcset) image.srcset = image.dataset.srcset;

			image.classList.remove(options.className);

			if (options.loadCallback) options.loadCallback(image);
		}
	};

	// Loading if printing
	var isPrinting = false;
	var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
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
		var intersectionObserver = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					var image = entry.target;

					intersectionObserver.unobserve(image);

					if (image.dataset.src) image.src = image.dataset.src;
					if (image.dataset.srcset) image.srcset = image.dataset.srcset;

					image.classList.remove(options.className);

					if (options.loadCallback) options.loadCallback(image);
				}
			});
		}, {
			rootMargin: options.rootMargin,
			threshold: options.threshold,
		});

		for (var i = 0; i < images.length; i++) {
			images[i].hidden = false;
			intersectionObserver.observe(images[i]);
		}
	} else {
		// Fallback, just load all images
		fallback(images);
	}
}
