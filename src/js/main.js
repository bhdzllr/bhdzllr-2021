import 'regenerator-runtime/runtime';
import 'whatwg-fetch';

import { default as de } from './lang/de.json';

import I18n from './lib/modules/I18n';
import { AnalyticsOptOut, addAnalyticsCode } from './lib/modules/Analytics';
import { loadFonts } from './lib/utils/loading-fonts';
import { lazyLoadImages } from './lib/utils/loading-images';
import { addOutlineHandler, addRoleButtonListener } from './lib/utils/accessibility';
import { beautifyFileInputs } from './lib/utils/beautification';

import { Cube, addCubeDefaultStyles } from './Cube';
import { Terminal, addTerminalDefaultStyles } from './Terminal';

document.addEventListener('DOMContentLoaded', async function (e) {

	const currentLang = document.documentElement.getAttribute('lang') ? document.documentElement.getAttribute('lang') : 'en';
	const i18n = new I18n(currentLang, de);

	// addServiceWorker('/sw.js');
	loadFonts([
		{ 'Open Sans': { weight: 300 } },
		{ 'Open Sans': { weight: 400 } },
		{ 'Open Sans': { weight: 700 } },
	]);
	lazyLoadImages();
	addOutlineHandler();
	addRoleButtonListener();
	beautifyFileInputs(i18n);

	if (document.querySelector('.js-analytics-opt-out')) {
		new AnalyticsOptOut(document.querySelector('.js-analytics-opt-out'), i18n);	
	}

	addAnalyticsCode(function () {
		// Analytics Code to inject
		// Don't forget to make global variables available because of uglify, e. g. with:
		// window['_paq'] = _paq;
	});

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

		if (document.querySelector('.js-cube-tools')) {
			const toolElements = document.querySelectorAll('.js-cube-tools li');

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
				fetch('/server/mail.php', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(data),
				})
				.then(response => response.json())
				.then(responseData => {
					if (responseData.status == 200) {
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

});
