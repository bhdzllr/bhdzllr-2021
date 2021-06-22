import 'regenerator-runtime/runtime';
import 'core-js/es/object/assign';
import 'whatwg-fetch';

import { isElementInViewport } from './lib/utils/checks';

export class Terminal {

	constructor(element, options = {}) {
		const defaultOptions = {
			typer: true,
			typerSpeed: 25,
			blankable: false,
			messages: {
				flowRestart: 'Aborting current command and restarting ...',
				blank: 'Invalid data. Please enter a value.',
			},
			classNameInput: 'terminal__screen-input',
			classNameOutput: 'terminal__screen-output',
			classNameWarning: 'terminal__screen-warning',
			classNameError: 'terminal__screen-error',
			classNameLoader: 'terminal__loader',
		};

		this.element = element;
		this.options = Object.assign({}, defaultOptions, options);

		this.form;
		this.output;
		this.inputWrapper;
		this.input;
		this.inputCustom;
		this.inputCaretHelper;
		this.inputCaretHelperSpan;
		this.inputCaretHelperSpace;
		this.inputLastKeydownTime;
		this.inputCaret;
		this.loader;
		this.availableCommands = Object.keys(commands);
		this.flow = null;
		this.flowIndex = -1;
		this.flowData = {};
		this.flowCb;

		this.initDom();
		this.initListeners();
	}

	initDom() {
		this.element.hidden = false;

		this.form = document.createElement('form');
		this.form.classList.add('terminal');

		this.output = document.createElement('div');
		this.output.classList.add('terminal__output');
		this.output.setAttribute('role', 'region');
		this.output.setAttribute('aria-live', 'polite');

		this.inputWrapper = document.createElement('div');
		this.inputWrapper.classList.add('terminal__input');

		this.input = document.createElement('input');
		this.input.classList.add('terminal__input-field');

		this.inputCustom = document.createElement('div');
		this.inputCustom.classList.add('terminal__input-custom');
		this.inputCustom.setAttribute('aria-hidden', 'true');
		this.inputCustom.hidden = true;

		this.inputCaretHelper = document.createElement('span');
		this.inputCaretHelper.classList.add('terminal__input-helper');
		this.inputCaretHelper.setAttribute('aria-hidden', 'true');
		this.inputCaretHelper.hidden = true;

		this.inputCaretHelperSpan = document.createElement('span');
		this.inputCaretHelperSpan.innerHTML = '&nbsp;';

		this.inputCaret = document.createElement('span');
		this.inputCaret.classList.add('terminal__input-caret');
		this.inputCaret.setAttribute('aria-hidden', 'true');

		this.loader = document.createElement('span');
		this.loader.classList.add(this.options.classNameLoader);
		this.loader.setAttribute('aria-hidden', 'true');
		this.loader.hidden = true;

		this.inputWrapper.appendChild(this.input);
		this.inputWrapper.appendChild(this.inputCustom);
		this.inputWrapper.appendChild(this.inputCaretHelper);
		this.inputWrapper.appendChild(this.inputCaret);
		this.inputWrapper.appendChild(this.loader);

		this.form.appendChild(this.output);
		this.form.appendChild(this.inputWrapper);

		this.element.appendChild(this.form);

		this.inputCaretHelper.innerHTML = '&nbsp;';
		this.inputCaretHelperSpace = this.inputCaretHelper.offsetWidth;

		this.inputCaretHelper.appendChild(this.inputCaretHelperSpan);
		this.updateCaretPosition(0);
	}

	initListeners() {
		let typingTimeout;

		this.form.addEventListener('click', () => this.input.focus());

		this.input.addEventListener('keydown', (e) => {
			const keyCode = e.which || e.keyCode;

			this.inputLastKeydownTime = Date.now();
			this.inputCaret.classList.add('terminal__input-caret--typing');
			if (typingTimeout) clearTimeout(typingTimeout);

			if (keyCode === 13 && e.shiftKey) {
				e.preventDefault(); // Do not fire submit event on form
				return;
			}

			this.inputCustom.textContent = this.input.value;
		});

		this.input.addEventListener('keyup', (e) => {
			let currentPosition = e.target.selectionStart;

			typingTimeout = setTimeout(() => {
				if ((Date.now() - this.inputLastKeydownTime) > 750) this.inputCaret.classList.remove('terminal__input-caret--typing');
			}, 750);

			this.updateCaretPosition(currentPosition);
		});

		this.form.addEventListener('submit', (e) => {
			e.preventDefault();

			if (this.flowIndex > -1) {
				this.interpreteFlowInput(this.input.value);
			} else {
				this.interpreteInput(this.input.value);
			}
		});
	}

	updateCaretPosition(currentPosition) {
		this.inputCustom.textContent = this.input.value;
		this.inputCaretHelper.textContent = this.inputCustom.textContent.substring(0, currentPosition);

		this.inputCaretHelper.appendChild(this.inputCaretHelperSpan);

		let offsetX = this.inputCaretHelperSpan.offsetLeft;
		let offsetY = this.inputCaretHelperSpan.offsetTop >= 0 ? this.inputCaretHelperSpan.offsetTop : 0;

		if (this.inputCustom.textContent.substring(currentPosition-1, currentPosition) == ' ') {
			offsetX += this.inputCaretHelperSpace;
		}

		this.inputCaret.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
	}

	showLoader() {
		this.hideCaret();
		this.loader.hidden = false;
	}

	hideLoader() {
		this.showCaret();
		this.loader.hidden = true;
	}

	hideCaret() {
		this.inputCaret.style.display = 'none';
	}

	showCaret() {
		this.inputCaret.style.display = 'inline-block';
	}

	disableInput() {
		this.input.disabled = true;
	}

	enableInput() {
		this.input.disabled = false;
		this.input.focus();
		this.inputCaret.classList.remove('terminal__input-caret--typing');
	}

	resetInput() {
		this.form.reset();
		this.inputCustom.innerHTML = '';
		this.inputCaretHelper.innerHTML = '';
		this.updateCaretPosition(0);
	}

	setFlow(flow, cb) {
		this.flow = flow;
		this.flowCb = cb;
	}

	startFlow(flow, cb) {
		this.flow = flow;
		this.flowIndex = -1;
		this.flowData = {};
		this.flowCb = cb;

		this.nextFlowState();
	}

	stopFlow() {
		if (this.flowCb) this.flowCb(this.flowData, (this.flowIndex == this.flow.length) ? true : false);

		this.flowIndex = -1;
		this.flowData = {};
	}

	clearFlow() {
		this.flow = null;
		this.flowIndex = -1;
		this.flowData = {};
	}

	isFlowRunning() {
		return this.flowIndex > -1;
	}

	setFlowIndex(i) {
		if (i > this.flow.length || i < -1) throw new Error('Flow index out of bounds.');
		this.flowIndex == i;
	}

	setFlowState(name) {
		for (let i = 0; i < this.flow.length; i++) {
			if (this.flow[i].name && this.flow[i].name == name) {
				this.flowIndex = i;
				break;
			}
		}
	}

	getFlowState() {
		return this.flow[this.flowIndex];
	}

	getFlowStateText() {
		return this.getFlowState().prompt ? this.getFlowState().prompt : this.getFlowState().message;
	}

	getFlowStateType() {
		return this.getFlowState().prompt ? 'prompt' : 'message';
	}

	async nextFlowState() {
		this.flowIndex++;

		if (this.flowIndex == this.flow.length) return this.stopFlow();

		const promptOrMessage = this.getFlowStateText();
		if (typeof promptOrMessage === 'function') {
			await this.addOutput(promptOrMessage(this.flowData, this));
		} else {
			await this.addOutput(promptOrMessage);
		}

		if (this.getFlowStateType() == 'message') this.nextFlowState();
	}

	getCommand(data) {
		const args = data.split(' ');
		const possibleCmd = args.shift().toLowerCase();

		return {
			cmd: possibleCmd,
			args: args,
		};
	}

	async interpreteFlowInput(data) {
		this.resetInput();

		let blankable = this.options.blankable;
		if (typeof this.getFlowState().blankable === 'boolean') blankable = this.getFlowState().blankable;

		if (!blankable) {
			if (data.trim() == '') {
				this.flowIndex--;

				await this.addOutput(this.options.messages.blank, {
					className: this.options.classNameWarning,
				});

				this.nextFlowState();

				return;
			}
		} else if (data.trim() == '') {
			data = '_';
		}

		if (this.getFlowState().name) {
			this.flowData[this.flow[this.flowIndex].name] = data;
		} else {
			this.flowData[this.flowIndex] = data;
		}

		await this.addOutput(data, {
			typer: false,
			className: this.options.classNameInput,
		});

		const { cmd, args } = this.getCommand(data);

		if (cmd == 'start') {
			await this.addOutput(this.options.messages.flowRestart);
			this.startFlow(this.flow, this.flowCb);
			return;
		} else if (cmd == 'stop') {
			return commands.stop(this, args);
		} else if (cmd == 'exit') {
			return commands.exit(this, args);
		}

		if (this.getFlowState().validator) {
			const validation = this.getFlowState().validator(this.flowData, this);

			if (!validation || typeof validation === 'string') { 
				this.flowIndex--;

				if (typeof validation === 'string') {
					await this.addOutput(validation, {
						className: this.options.classNameWarning,
					});
				}
				
				this.nextFlowState();

				return;
			}
		}

		this.nextFlowState();		
	}

	async interpreteInput(data) {
		this.resetInput();

		if (data.trim() == '') return;

		await this.addOutput(data, {
			typer: false,
			className: this.options.classNameInput,
		});

		const { cmd, args } = this.getCommand(data);
		let found = false;
		for (const availableCommand of this.availableCommands) {
			if (cmd == availableCommand) {
				commands[availableCommand](this, args);
				found = true;
				break;
			}
		}

		if (!found) this.addOutput('Command not found.');
	}

	async addOutput(data, options = {}) {
		options = Object.assign({}, {
			typer: null,
			className: this.options.classNameOutput,
			loader: false,
		}, options);

		let text = (Array.isArray(data)) ? data : [data];
		let typer = (options.typer === true || options.typer === false) ? options.typer : this.options.typer;

		if (!typer) {
			for (const t of text) {
				const outputElement = document.createElement('output');
				outputElement.textContent = t;
			
				if (options.className) outputElement.classList.add(options.className);

				this.output.appendChild(outputElement);
			}

			this.scrollToInput();

			return;
		}

		this.disableInput();

		for (const t of text) {
			await this.typeOutput(t, options.className);
			this.scrollToInput();
		}

		this.enableInput();

		// let i = 0;
		// const queue = (text) => {
		// 	this.typeOutput(text[i], () => {
		// 		i++;

		// 		if (i < text.length) {
		// 			queue(text);
		// 		} else {
		// 			this.enableInput();
		// 			this.scrollToInput();
		// 			if (cb) cb();
		// 		}
		// 	}, options.className);
		// };

		// queue(text);
	}

	async typeOutput(text, className) {
		let pos = 0;
		const outputElement = document.createElement('output');
		if (className) outputElement.classList.add(className);

		this.output.appendChild(outputElement);

		return new Promise((resolve) => {
			const i = setInterval(() => {
				outputElement.textContent += text.charAt(pos);

				if (pos == text.length) {
					clearInterval(i);
					resolve();
				}

				pos++;
			}, this.options.typerSpeed);
		});
	}

	getLastOutputElement() {
		return this.output.lastChild;
	}

	scrollToInput() {
		// if (isElementInViewport(this.inputCustom)) return; // Problem on iOS with keyboard

		this.form.scrollIntoView({
			behavior: 'smooth',
			block: 'end',
		});
	}

	addCommand(name, cb) {
		commands[name] = cb;
		this.availableCommands = Object.keys(commands);
	}

	runCommand(cmd) {
		this.interpreteInput(cmd);
	}

	clearScreen() {
		this.output.innerHTML = '';
	}

	exit() {
		this.input.blur();
		this.disableInput();
		this.inputWrapper.hidden = true;
	}

}

export function addTerminalDefaultStyles() {
	if (document.querySelector('#js-terminal-styles')) return;

	const style = document.createElement('style');
	style.id = 'js-terminal-styles';

	style.innerHTML = `
		.terminal {
			display: block;
			margin: 0;
			padding: 8px;

			background: #ffffff;
		}

		.terminal__screen-input {
			color: #222222;
			font-weight: bold;
		}

		output,
		.terminal__screen-output {
			display: block;

			color: #666666;
		}

		.terminal__input {
			position: relative;
		}

		.terminal__input-field {
			position: absolute;

			width: 100%;
			height: 0.0001px;
			padding: 0;

			opacity: 0.00001;
		}	

		.terminal__input-custom {
			position: relative;

			display: block;
			width: 100%;
			min-height: 1.75em;

			color: #222222;
		}

		.terminal__input-helper {
			position: absolute;

			display: inline-block;
			overflow: hidden;

			background: transparent;
			border: none;
			opacity: 0;
		}

		.terminal__input-caret {
			position: absolute;
			top: 0;

			display: inline-block;

			width: 0.625em;
			height: 1.25em;

			border-bottom: 4px solid #666666;
			transition: transform 0.1s ease;
		}	

		.terminal__input-field:focus ~ .terminal__input-caret {
			border-color: #222222;
		}

		.terminal__input-field:focus ~ .terminal__input-helper ~ .terminal__input-caret {
			opacity: 1;
			animation: 1s cursor infinite;
		}

		.terminal__input-field:disabled ~ .terminal__input-helper ~ .terminal__input-caret {
			border-color: #999999;
			opacity: 1;
			animation: none;
		}

		.terminal__input-field:focus ~ .terminal__input-helper ~ .terminal__input-caret--typing {
			opacity: 1;
			animation: none;
		}

		@keyframes cursor {
			from, to {
				opacity: 1;
			}
			50% {
				opacity: 0;
			}
		}

		.terminal__loader {
			position: absolute;
			top: 0;

			height: 1.5em;
			overflow: hidden;

			font-size: 1em;
			text-align: center;
		}

		.terminal__loader::after {
			display: inline-table;
			white-space: pre;

			content: '\\005C\\A|\\A/\\A\\2014';
			animation: loader 1s steps(4) infinite;
		}

		@keyframes loader {
			to {
				transform: translateY(-7em);
			}
		}
	`;

	document.head.appendChild(style);
}

export const commands = {
	'help': function (terminal) {
		terminal.addOutput([
			'Available commands: ' + Object.keys(commands).join(', '),
		]);
	},
	'start': function (terminal) {
		if (terminal.flow) return terminal.startFlow(terminal.flow, terminal.flowCb);

		terminal.addOutput('Nothing to start. No command running. Type "help" for more.');
	},
	'stop': function (terminal) {
		if (terminal.isFlowRunning()) return terminal.stopFlow();

		terminal.addOutput('Nothing to stop. No command running. Type "help" for more.');
	},
	'clear': function (terminal) {
		if (terminal.isFlowRunning()) {
			return terminal.addOutput('Command is currently running. Stop command with "stop" before clearing screen.');
		}

		terminal.clearScreen();
	},
	'exit': function (terminal) {
		if (terminal.isFlowRunning()) {
			return terminal.addOutput('Command is currently running. Stop command with "stop" before exit.');
		}

		terminal.addOutput('Bye.');
		terminal.exit();
	},
	'search': async function (terminal, args) {
		if (args.length == 0) return terminal.addOutput('Please add an argument after the command "search", e. g. "search foobar"');
		args = args.join('+');

		terminal.disableInput();
		await terminal.addOutput('Looking for information ...');
		terminal.showLoader();

		setTimeout(() => {
			fetch(encodeURI(`https://api.duckduckgo.com/?q=${args}&format=json&t=bhdzllr.com`))
				.then(response => response.json())
				.then(async responseData => {
					terminal.hideLoader();

					if (responseData.AbstractText) {
						const sentences = responseData.AbstractText.split('. ');
						let output = [];;
						let i = 0;
						for (let i = 0; i < sentences.length; i++) {
							output.push(sentences[i]);
							if (output.length == 3 && (sentences[i].length > 15 || sentences[i+1].length > 15)) break;
						}

						await terminal.addOutput(output.join('. ') + ' ...', { typer: false });
						await terminal.addOutput(`Results from DuckDuckGo, Source: ${responseData.AbstractURL}`, { typer: false });
					} else if (responseData.RelatedTopics.length > 0) {
						let randomIndex = Math.floor(Math.random() * Math.floor(responseData.RelatedTopics.length));
						if (randomIndex == responseData.RelatedTopics.length) randomIndex = responseData.RelatedTopics.length - 1;

						await terminal.addOutput(responseData.RelatedTopics[randomIndex].Text, { typer: false });
						await terminal.addOutput(`Results from DuckDuckGo, Source: ${responseData.AbstractURL}`, { typer: false });
					} else {
						await terminal.addOutput('Sorry, no information found, you can use DuckDuckGo directly.', { typer: false });
					}

					terminal.getLastOutputElement().innerHTML = '<small>' + terminal.getLastOutputElement().innerHTML.replace('DuckDuckGo', '<a href="https://duckduckgo.com/?q=' + args + '">DuckDuckGo</a>') + '</small>';
					terminal.enableInput();
				})
				.catch(function (err) {
					terminal.addOutput([
						'Sorry, can not connect to the internet to find an answer, maybe it is better to use real books.',
					], { className: 'terminal__screen-error' });

					console.error('Error from mail terminal search command.', err);

					terminal.hideLoader();
					terminal.enableInput();
				});
		}, 1000);
	},
	'date': function (terminal) {
		const today = new Date();
		const date = today.getFullYear()
			+ '-'
			+ ('0' + (today.getMonth() + 1)).slice(-2)
			+ '-'
			+ ('0' + today.getDate()).slice(-2);

		terminal.addOutput(date.toString());		
	},
	'time': function (terminal) {
		const today = new Date();
		terminal.addOutput(
			(
				('0' + today.getHours()).slice(-2)
				+ ':'
				+ ('0' + today.getMinutes()).slice(-2)
				+ ':'
				+ today.getSeconds()
			).toString()
		);
	},
	'datetime': function (terminal) {
		terminal.addOutput(new Date().toString());
	},
	'timestamp': function (terminal) {
		terminal.addOutput(Date.now().toString());
	},
	'hcf': function (terminal) {
		let result = '';

		for (var i = 0; i < 100000; i++ ) {
			result += String.fromCharCode(Math.random() * 128);
		}

		terminal.addOutput(result);
	},
	'joke': async function (terminal) {
		const jokes = [
			{
				a: 'What\'s the object-oriented way of become wealthy?',
				b: 'Inheritance'
			},
			{
				a: 'Why did the programmer quit his job?',
				b: 'Because he didn\'t get arrays.'
			},
			{
				a: 'Chuck Norris can take a screenshot ...',
				b: '... of his blue screen.'
			},
			{
				a: 'Three SQL databases walked into a NoSQL bar. A little while later they walked out ...',
				b: '... because they couldn\'t find a table.',
			},
		];

		let randomIndex = Math.floor(Math.random() * Math.floor(jokes.length));
		if (randomIndex == jokes.length) randomIndex = jokes.length - 1;

		const joke = jokes[randomIndex];

		await terminal.addOutput(joke.a);

		if (joke.b) {
			terminal.disableInput();
			setTimeout(() => terminal.addOutput(joke.b), 1500);
		}		
	}
};
