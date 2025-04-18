import 'regenerator-runtime/runtime';

import { default as de } from './lang/de.json';

import { I18n } from './lib/modules/I18n';
import { AnalyticsOptOut, addAnalyticsCode } from './lib/modules/Analytics';
import { DialogModal, addDialogModalDefaultStyles } from './lib/modules/DialogModal';
import { lazyLoadImages } from './lib/utils/loading-images';
import { loadScript } from './lib/utils/loading-files';
import { addOutlineHandler } from './lib/utils/accessibility';
import { beautifyFileInputs } from './lib/utils/beautification';

import { Cube, addCubeDefaultStyles } from './Cube';
import { Terminal, addTerminalDefaultStyles } from './Terminal';
import { Reaction } from './Reaction';
import { ItemSlider } from './ItemSlider';

document.addEventListener('DOMContentLoaded', async function (e) {
	const currentLang = document.documentElement.getAttribute('lang') ? document.documentElement.getAttribute('lang') : 'en';
	const i18n = new I18n(currentLang, de);

	// addServiceWorker('/sw.js');
	lazyLoadImages();
	addOutlineHandler();
	beautifyFileInputs(i18n);

	// Minilytics takes care of this, but do it to prevent loading the file and save some time
	// if (document.querySelector('.js-analytics-opt-out')) {
	// 	new AnalyticsOptOut(document.querySelector('.js-analytics-opt-out'), i18n);	
	// }
	addAnalyticsCode(function () {
		loadScript('/js/main-analytics.js?t=202407172202', 'js-minilytics', () => {
			Minilytics.initOptOutButton();
		}, {
			async: false,
			defer: false,
			'data-url': '/server/api.php',
			'data-id': 'bhdzllr',
		});
	});

	if (document.querySelector('.js-typer-animation')) {
		const typerElements = document.querySelectorAll('.js-typer-animation');

		typerElements.forEach(async function (element) {
			// element.style.position = 'relative';
			// element.innerHTML = `<span style="opacity: 0;">${element.textContent}</span>`;

			// const span = document.createElement('span');
			// span.style.position = 'absolute';
			// span.style.top = '0';
			// span.style.left = '0';
			// element.appendChild(span);

			await typer(element);
		});
	}

	if (document.querySelector('.js-cube')) {
		/* let cube = await import(
			/* webpackChunkName: 'cube' * /
			/* webpackExports: ["addCubeDefaultStyles", "Cube"] * /
			'./Terminal'
		); */

		const options = {
			responsive: false,
		};

		addCubeDefaultStyles(options);

		new Cube(document.querySelector('.js-cube'), options);

		if (document.querySelector('.js-hologram-image')) {
			document.querySelector('.js-hologram-image').hidden = false;
		}

		if (document.querySelector('.js-cube-data')) {
			const dataHeadingAndElements = document.querySelectorAll('.js-cube-data-heading, .js-cube-data > *');
			liner(dataHeadingAndElements);
		}

		if (document.querySelector('.js-cube-tools')) {
			const toolsHeadingAndElements = document.querySelectorAll('.js-cube-tools-heading,.js-cube-tools li');
			const toolElements = document.querySelectorAll('.js-cube-tools li');

			liner(toolsHeadingAndElements);

			setInterval(function () {
				let ri = Math.floor(Math.random() * toolElements.length);
				if (ri == toolElements.length) ri = toolElements.length - 1;
				
				toolElements[ri].classList.add('flick');

				setTimeout(() => toolElements[ri].classList.remove('flick'), 3000);
			}, 3000);


		}
	}

	if (document.querySelector('.js-mail-terminal')) {
		/* let terminal = await import(
			/* webpackChunkName: 'terminal' * /
			/* webpackExports: ["addTerminalDefaultStyles", "Terminal"] * /
			'./Terminal'
		); */

		if (document.querySelector('.js-title-bar')) {
			document.querySelector('.js-title-bar').hidden = false;
		}

		addTerminalDefaultStyles();

		const mailTerminal = new Terminal(document.querySelector('.js-mail-terminal'));
		const contactFlow = [
			{
				message: 'Hello. Contacting Bernhard ...',
			},
			{
				message: 'Type "stop" to only get Bernhards email address or "start" to reset.',
			},
			{
				prompt: 'Please tell your name:',
				name: 'name',
			},
			{
				prompt: function (data) {
					return `Thank you, ${data.name}. Please type your email address so Bernhard can reach you:`
				},
				name: 'email',
				validator: function (data) {
					if (!/.+@.+\..+/.test(data.email)) return 'Please enter a valid email address.';

					return true;
				}
			},
			{
				prompt: function () {
					return `Now please enter your message:`;
				},
				name: 'message',
			},
			{
				prompt: function () {
					return `Your message will be sent immediately, please press any key to confirm or "no" to cancel.`
				},
				name: 'confirmation',
				blankable: true,
			},
		];
		const contactFlowCb = async function (data, finished) {
			if (!finished || ['no', 'n', 'nope', 'nein', 'na'].indexOf(data.confirmation.trim().toLowerCase()) > -1) {
				return mailTerminal.addOutput([
					'Mail command stopped. No message transmitted.',
					'You can reach Bernhard via email "website.contact@bhdzllr.com".',
					'Type "start" to restart mail command.',
					'Bye.',
					'Type "help" for more.',
				]);
			}

			mailTerminal.disableInput();
			await mailTerminal.addOutput('Please wait ...');
			mailTerminal.showLoader();

			setTimeout(() => {
				fetch('/server/api.php?action=mail', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				})
				.then(response => response.json())
				.then(responseData => {
					if (responseData.message && responseData.message == 'OK') {
						mailTerminal.addOutput([
							'Mail command finished.',
							'Thank you for your message.',
							'Bye.',
							'Type "help" for more.',
						]);
					} else {
						throw new Error(responseData.message);
					}

					mailTerminal.hideLoader();
					mailTerminal.enableInput();
				})
				.catch(async function (err) {
					await mailTerminal.addOutput([
						'There was an error sending the message. No message transmitted.',
						'You can reach Bernhard via email "website.contact@bhdzllr.com".',
					], { className: 'terminal__screen-error' });

					mailTerminal.addOutput([
						'Bye.',
						'Type "help" for more.',
					]);

					console.error('Error from mail terminal send command.', err);

					mailTerminal.hideLoader();
					mailTerminal.enableInput();
				});
			}, 1000);
		};

		setTimeout(() => {
			mailTerminal.setFlow(contactFlow, contactFlowCb);
			mailTerminal.runCommand('start');
		}, 500);
	}

	if (document.querySelector('.js-gallery')) {
		addDialogModalDefaultStyles();

		const galleries = document.querySelectorAll('.js-gallery');

		for (const gallery of galleries) {
			const galleryImages = gallery.querySelectorAll('a');
			const galleryDialog = new DialogModal({
				contentAsHtml: '',
				showCallback: () => {
					lazyLoadImages({
						loadCallback: (image) => {
							image.parentElement.classList.remove('image-loader');
						},
					});
				},
			});
			const gallerySliderContent = '<bhdzllr-item-slider>';
			let sliderIndex = 0;
			let sliderX = 0;

			for (let i = 0; i < galleryImages.length; i++) {
				const galleryImage = galleryImages[i];
				const landscape = parseInt(galleryImage.dataset.width) > parseInt(galleryImage.dataset.height);

				gallerySliderContent += `
					<div class="gallery-detail-image image-loader" data-text="Loading ...">
						<img
							src="${galleryImage.dataset.preview}"
							alt="${galleryImage.dataset.alt}"
							data-src="${galleryImage.href}"
							data-srcset="${galleryImage.dataset.srcset}"
							sizes="${galleryImage.dataset.sizes}"
							width="${galleryImage.dataset.width}"
							height="${galleryImage.dataset.height}"
							style="${landscape ? `width: ${galleryImage.dataset.width}px;` : `height: ${galleryImage.dataset.height}px`}"
							decoding="async"
							class="js-lazy-image"
						/>
					</div>
				`;

				const showDialog = function () {
					galleryDialog.dialog.querySelector('bhdzllr-item-slider').setAttribute('pos', i);
					galleryDialog.show();
				}

				galleryImage.addEventListener('click', function (e) {
					// CSS is disabled, but JS is active, just follow image path
					if (window.getComputedStyle(gallery).getPropertyValue('display') != 'flex') {
						return;
					}

					e.preventDefault();
					showDialog();
				});

				galleryImage.addEventListener('keydown', function (e) {
					if (e.keyCode !== 32) return;
					e.preventDefault();
				});

				galleryImage.addEventListener('keyup', function (e) {
					if (e.keyCode !== 32) return;
					e.preventDefault();
					showDialog();
				})
			}

			gallerySliderContent += '</bhdzllr-item-slider>';

			galleryDialog.overlay.classList.add('gallery-overlay');
			galleryDialog.setContentAsHtml(gallerySliderContent);

			const itemSlider = galleryDialog.dialog.querySelector('bhdzllr-item-slider');

			itemSlider.addEventListener('onButtonRightHidden', () => {
				galleryDialog.setLastFocusableElement(itemSlider.shadowRoot.querySelectorAll('button')[0]);
				galleryDialog.focusLastFocusableElement();
			});

			itemSlider.addEventListener('onButtonRightVisible', () => {
				galleryDialog.setLastFocusableElement(itemSlider.shadowRoot.querySelectorAll('button')[1]);
			});

			itemSlider.addEventListener('onButtonLeftHidden', () => {
				galleryDialog.focusLastFocusableElement();
			});
		}
	}
});

async function typer(element) {
	let text = element.textContent;
	let pos = 0;
	let charactersPerDuration = element.dataset.characters ?? 1;
	let durationPerCharacter = element.dataset.duration ?? 0;

	element.style.position = 'relative';
	element.innerHTML = `<span style="opacity: 0;">${element.innerHTML}</span>`;

	const span = document.createElement('span');
	span.style.position = 'absolute';
	span.style.top = '0';
	span.style.left = '0';
	element.appendChild(span);

	return new Promise((resolve) => {
		const i = setInterval(() => {
			span.textContent += text.substr(pos, charactersPerDuration);

			if (pos == text.length) {
				span.parentNode.removeChild(span);
				element.querySelector('span').style.opacity = '1';

				clearInterval(i);
				resolve();
			}

			pos = pos + charactersPerDuration;
		}, durationPerCharacter);
	});
}

async function liner(elements) {
	let i = 0;

	elements.forEach(async function (element) {
		element.style.opacity = '0';
	});

	const interval = setInterval(() => {
		elements[i].style.transition = 'opacity 0.5s ease';
		elements[i].style.opacity = '1';

		const currentElement = elements[i];
		setTimeout(() => {
			currentElement.style.transition = '';
			currentElement.style.opacity = '';
		}, 500);

		if (i == (elements.length - 1)) clearInterval(interval);

		i++;
	}, 200);
}
