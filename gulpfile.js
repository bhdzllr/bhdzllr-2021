const { series, parallel, src, dest, watch } = require('gulp');

const del = require('del');
const fs = require('fs');
var path = require('path');

const data = require('gulp-data');
const fm = require('@github-docs/frontmatter');
const hljs = require('highlight.js');
const md = require('markdown-it')({
	html: true,
	xhtmlOut: true,
	typographer: true,
	quotes: '""\'\'', // '„“‚‘', // German quotes
	highlight: function (str, lang) {
		if (lang && hljs.getLanguage(lang)) {
			try {
				return `<pre class="hljs hljs--${lang}"><code>${hljs.highlight(str, { language: lang, ignore_illegals: true }).value}</code></pre>`;
			} catch (__) {}
		}

		return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
	},
});
const HTMLParser = require('node-html-parser');
const glob = require('glob');
const sharp = require('sharp');
const handlebars = require('gulp-compile-handlebars');
const layouts = require('handlebars-layouts');
const mergeStream = require('merge-stream');
const webpack = require('webpack-stream');
const sass = require('gulp-sass')(require('sass'));
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const tar = require('gulp-tar');
const GulpSSH = require('gulp-ssh');

const distFolder = 'dist';
const srcFolder = 'src';
const sshConfig = require('./ssh.json');
const ssh = new GulpSSH({
	ignoreErrors: false,
	sshConfig: {
		host: sshConfig.host,
		port: sshConfig.port,
		username: sshConfig.username,
		// privateKey: fs.readFileSync(sshConfig.privateKey),
	}
});

const images = [];
const entries = {};

handlebars.Handlebars.registerHelper(layouts(handlebars.Handlebars));
handlebars.Handlebars.registerHelper({
	html: function (value) {
		return new handlebars.Handlebars.SafeString(value);
	},
	ifEquals: function (a, b, options) {
		return (a == b) ? options.fn(this) : options.inverse(this);
	},
	ifNotEquals: function (a, b, options) {
		return (a != b) ? options.fn(this) : options.inverse(this);
	},
	ifIsParentActive: function (parent, options) {
		return (this.data.url.startsWith(parent)) ? options.fn(this) : options.inverse(this);
	},
	link: function (name) {
		switch (name) {
			case 'blog':
				return '/blog';
			case 'blog-feed':
				return '/blog/index.xml';
			case 'work':
				return '/projects';
			case 'mail':
				return '/contact';
			case 'imprint':
				return '/imprint';
			case 'impressum':
				return '/impressum';
			case 'legal':
				return '/legal';
			case 'rechtliches':
				return '/rechtliches';
		}
	},
	image: function (src, alt, classList) {
		const image = images.find(image => image.original == src);

		if (!image) return;

		let width = image.originalWidth;
		let height = image.originalHeight;

		if (width > 1200) {
			height = height / (image.originalWidth / 1200);
			width = 1200;
		}

		return new handlebars.Handlebars.SafeString(`
			<img
				src="${image.preview}"
				alt="${alt}"
				data-src="${image.large}"
				data-srcset="${image.medium} 480w, ${image.large} 960w, ${image.xlarge} 1200w"
				sizes="(max-width: 480px) 100vw, 960px"			
				width="${width}"
				height="${height}"
				decoding="async"
				class="js-lazy-image${(typeof classList === 'string') ? ' ' + classList : ''}"
				hidden
			/>
			<noscript>
				<img
					src="${image.large}"
					alt="${alt}"
					srcset="${image.medium} 480w, ${image.large} 960w, ${image.xlarge} 1200w"
					sizes="(max-width: 480px) 100vw, 960px"			
					width="${width}"
					height="${height}"
					decoding="async"
					${(typeof classList === 'string') ? 'class="' + classList + '"' : ''}
				/>
			</noscript>
		`);
	},
	imageWidth: function (src) {
		const image = images.find(image => image.original == src);

		if (!image) return;

		return image.originalWidth;
	},
	imageHeight: function (src) {
		const image = images.find(image => image.original == src);

		if (!image) return;

		return image.originalHeight;
	},
	galleryImage: function (src, alt) {
		const image = images.find(image => image.original == src);

		if (!image) return;

		let width = image.originalWidth;
		let height = image.originalHeight;

		if (width > 1200) {
			height = height / (image.originalWidth / 1200);
			width = 1200;
		}

		const factor = image.originalWidth / image.originalHeight;

		return new handlebars.Handlebars.SafeString(`
			<a
				href="${image.large}"
				data-alt="${alt}"
				data-srcset="${image.medium} 480w, ${image.large} 960w, ${image.xlarge} 1200w"
				data-sizes="(max-width: 480px) 100vw, 960px"
				data-width="${width}"
				data-height="${height}"
				data-preview="${image.preview}"
			>
				<img
					src="${image.preview}"
					alt="${alt}"
					data-src="${image.thumbnail}"
					width="200"
					height="${200 / factor}"
					decoding="async"
					class="js-lazy-image"
					hidden
				/>
				<noscript>
					<img
						src="${image.thumbnail}"
						alt="${alt}"
						width="200"
						height="${200 / factor}"
						decoding="async"
					/>
				</noscript>
			</a>
		`);
	},
	gallery: function (options) {
		return new handlebars.Handlebars.SafeString(`<div class="gallery js-gallery">${options.fn(this)}</div>`);
	},
	formatDate: function (date) {
		return date.toISOString().split('T')[0];
	},
	formatPubDate: function (date) {
		return date.toUTCString();
	},
	currentYear: function (options) {
		return new Date().getFullYear();
	},
	yearCopyright: function (from) {
		const currentYear = new Date().getFullYear();

		if (currentYear == from) return currentYear;
		if (currentYear > from) return from + '-' + currentYear;
	}
});

function getHandlebarsDefaultData(file) {
	let path;

	if (file.path.includes('/pages')) {
		path = file.path.split('/pages')[1];
	} else if (file.path.includes('/blog')) {
		path = file.path.split('/' + srcFolder)[1];
	} else if (file.path.includes('/projects')) {
		path = file.path.split('/' + srcFolder)[1];
	}

	let url = path
		.replace('index.html', '')
		.replace('index.md', '');

	return {
		data: {
			baseUrl: 'https://www.bhdzllr.com',
			path: path,
			url: url,
		},
	}; 
};

function getHandlebarsBatch() {
	return [
		srcFolder + '/templates/',
		srcFolder + '/templates/modules/',
		srcFolder + '/templates/partials/',
	];
}

function getPageTypes() {
	// Revalidator types: https://github.com/flatiron/revalidator
	const propertiesDefault = {
		'id': {
			type: 'string',
			required: true,
			pattern: '^[a-zA-Z0-9_-]+$',
		},
		'lang': {
			type: 'string',
			required: false,
		},
		'title': {
			type: 'string',
			required: true,
		},
		'titleOverride': {
			type: 'string',
			required: false,
		},
		'tagline': {
			type: 'string',
			required: true,
		},
		// `format: 'date'` only for Date Objects
		'date': {
			required: true,
			pattern: /\d{4}-\d{2}-\d{2}/,
		},
		'image': {
			type: 'string',
			required: false,
		},
		'imageAlt': {
			type: 'string',
			required: false,
		},
		'categories': {
			type: 'array',
			required: true,
			items: {
				type: 'string',
				enum: [
					'Web Development',
					'Design',
					'Usability',
					'Accessibility',
					'Side Projects',
					'Freelance',
					'Business',
					'Net Politics',
					'Privacy',
					'Photo',
					'Video',
					'Tech',
					'Productivity',
				],
			},
		},
		'tags': {
			type: 'array',
			required: true,
		},
		'meta': {
			type: 'object',
			required: false,
			properties: {
				description: {
					type: 'string',
					required: false,
				},
				author: {
					type: 'string',
					required: false,
					default: 'Bernhard Zeller',
				},
			},
		},
	};

	return [
		{
			name: 'blog',
			src: srcFolder + '/blog',
			layout: 'layouts/article',
			dist: distFolder + '/blog/',
			schema: Object.assign(Object.assign({}, propertiesDefault), {}),
		},
		{
			name: 'project',
			src: srcFolder + '/projects',
			layout: 'layouts/article',
			dist: distFolder + '/projects/',
			schema: Object.assign(Object.assign({}, propertiesDefault), {
				'year': {
					type: 'number',
					required: true,
				},
			}),
		},
	];
}

function clean() {
	return del([
		distFolder,
	], { force: true });
}

function pages(cb) {
	src(srcFolder + '/pages/**/*.html')
		.pipe(data(getHandlebarsDefaultData))
		.pipe(handlebars({
			entries: entries,
		}, {
			batch: getHandlebarsBatch(),
		}))
		.pipe(dest(distFolder));

	// Res
	// src([
	// 		srcFolder + '/pages/**/*',
	// 		'!' + srcFolder + '/pages/**/*.html',
	// 	])
	// 	.pipe(dest(distFolder));

	cb();
}

async function types(cb) {
	const pageTypes = getPageTypes();

	for (const type of pageTypes) {
		await typesSubtask(type);
	}

	cb();
}

async function typesSubtask(type) {
	async function createType() {
		return new Promise(function (resolve, reject) {
			const entriesType = [];
			const entriesFirst = [];
			const entriesRest = [];
			const entriesHtml = [];

			src(type.src + '/**/*.md')
				.pipe(data(function (file) {
					const { data, content, errors } = fm(String(file.contents), {
						'schema': {
							'properties': type.schema
						},
						'filepath': file.path,
					});
					
					if (errors.length) {
						for (error of errors) {
							console.error(`Front Matter Warning with Property "${error.property}": ${error.message} in file "${error.filepath}"`);
						}
					}

					if (!data.meta) data.meta = {};
					if (!data.meta.author) data.meta.author = type.schema.meta.properties.author.default;
					if (!data.meta.description) data.meta.description = data.tagline;

					const layoutStart = `{{#extend "${type.layout}"
						${ data.titleOverride ? `title-override="${data.titleOverride}"` : data.title ? `title="${data.title}"` : '' }	
						description="${data?.meta?.description ?? ''}"
						author="${data?.meta?.author ?? ''}"
					}}{{#content "content"}}`;
					const layoutEnd = `{{/content}}{{/extend}}`;
					const templateData = {};
					const hbsContent = md.render(content)
						.replace(/<hbs>/g, '')
						.replace(/<\/hbs>/g, '');
					const body = layoutStart + hbsContent + layoutEnd;

					file.contents = new Buffer.from(body);
					
					templateData.article = data;
					templateData.article.type = type.name;
					templateData.article.url = file.path.split('/' + srcFolder)[1].replace('index.md', '');
					templateData.article.createdAt = file.stat.birthtime;
					templateData.article.updatedAt = file.stat.mtime;

					entriesType.push(templateData.article);

					templateData.data = getHandlebarsDefaultData(file).data;

					return templateData;
				}))
				.pipe(handlebars({}, {
					batch: getHandlebarsBatch(),
				}))
				.pipe(data(function (file) {
					const doc = HTMLParser.parse(String(file.contents));
					entriesHtml.push(doc.querySelector('.article__content').innerHTML);
				}))
				.pipe(rename({ extname: '.html' }))
				.pipe(dest(type.dist))
				.on('end', function () {
					entriesType.forEach(function (entry, i) {
						// @todo If used, make images available (path, lazy loading)
						entriesType[i]['contentAsHtml'] = entriesHtml[i];
					});

					entriesType.sort(function(a, b) {
						return b.date - a.date;
					});

					entriesType.forEach(function (element, index) {
						if (index < 3) {
							entriesFirst.push(element);
						} else {
							entriesRest.push(element);
						}
					});

					entries[type.name] = {};
					entries[type.name] = {
						all: entriesType,
						first: entriesFirst,
						rest: entriesRest,
					};

					resolve({
						entries: entriesType,
						entriesFirst: entriesFirst,
						entriesRest: entriesRest,
					});
				});
		});
	}

	function createIndex(value) {
		src(type.src + '/index.html')
			.pipe(data(getHandlebarsDefaultData))
			.pipe(handlebars(value, {
				batch: getHandlebarsBatch(),
			}))
			.pipe(dest(type.dist));

		return value;
	}

	function createRss(value) {
		const xmlFile = type.src + '/index.xml';

		if (!fs.existsSync(xmlFile)) return;

		src(xmlFile)
			.pipe(data(getHandlebarsDefaultData))
			.pipe(handlebars(value, {
				batch: getHandlebarsBatch(),
			}))
			.pipe(dest(type.dist));
	}

	// Res
	// function copyResources() {
	// 	src([
	// 		type.src + '/**/*',
	// 		'!' + type.src + '/index.html',
	// 		'!' + type.src + '/**/*.md'
	// 	]).pipe(dest(type.dist));
	// }

	// function finishTask() {
	// 	cb();
	// }

	await createType()
		.then(createIndex)
		.then(createRss)
		// .then(copyResources)
		// .then(finishTask);
}

function styles() {
	return src(srcFolder + '/css/main.scss')
		.pipe(sourcemaps.init())
		.pipe(sass({
			errorLogToConsole: true,
			outputStyle: 'compressed',
		}))
		.pipe(postcss([
			require('postcss-preset-env')({
				autoprefixer: {
					grid: true,
				},
			}),
			require('postcss-encode-background-svgs')(),
		]))
		.on('error', (error) => { console.error(error.toString()); })
		.pipe(rename({
			basename: 'style',
			suffix: '.min',
			extname: '.css',
		}))
		.pipe(sourcemaps.write('./'))
		.pipe(dest(distFolder + '/css/'));
}

function scripts() {
	if (fs.existsSync(srcFolder + '/sw.js')) {
		src(srcFolder + '/sw.js')
			.pipe(dest(distFolder));
	}	

	src(srcFolder + '/js/lib/files/check.js')
		.pipe(dest(distFolder + '/js/lib/files/'));

	src(srcFolder + '/js/main-legacy.js')
		.pipe(dest(distFolder + '/js/'));

	return src(srcFolder + '/js/main.js')
		.pipe(webpack(require('./webpack.config.js')))
		.pipe(dest(distFolder + '/'));
}

function server() {
	return src([
			'server/app.php',
			'server/api.php',
			'server/env.php',
			'!composer.json',
			'!composer.lock',
		])
		.pipe(dest(distFolder + '/server/'));
}

function res(cb) {
	// Pages
	src([
			srcFolder + '/pages/**/*',
			'!' + srcFolder + '/pages/**/*.html',
		])
		.pipe(dest(distFolder));

	// PageTypes
	const pageTypes = getPageTypes();
	for (const type of pageTypes) { 
		src([
				type.src + '/**/*',
				'!' + type.src + '/index.html',
				'!' + type.src + '/index.xml',
				'!' + type.src + '/**/*.md',
			])
			.pipe(dest(type.dist));
	}

	src(srcFolder + '/img/**/*')
		.pipe(dest(distFolder + '/img/'));

	src(srcFolder + '/fonts/**/*')
		.pipe(dest(distFolder + '/fonts/'));

	src(srcFolder + '/docs/**/*')
		.pipe(dest(distFolder + '/docs/'));

	src([
			srcFolder + '/browserconfig.xml',
			srcFolder + '/favicon.ico',
			srcFolder + '/icon.png',
			srcFolder + '/site.webmanifest',
			srcFolder + '/tile.png',
			srcFolder + '/tile-wide.png',
		])
		.pipe(dest(distFolder + '/'));

	cb();
}

async function responsiveImages(cb) {
	const resize = function (imagePath, distFolder, width, suffix) {
		const imageExtension = path.extname(imagePath);
		const imageName = path.basename(imagePath).replace(imageExtension, '');
		const imageNameResized = distFolder + imageName + suffix + imageExtension;

		let sharpImage = sharp(imagePath)
			.resize({
				width: width,
				withoutEnlargement: true,
			});

		if (['.jpg', '.jpeg'].includes(imageExtension)) {
			sharpImage.jpeg({
				quality: 60,
			});
		}

		if (suffix == '-preview') {
			sharpImage.blur();
		}

		sharpImage
			.toFile(imageNameResized)
			.catch(function (err) {
				console.log('Sharp ' + err);
			});

		return imageNameResized;
	};

	const imageNames = glob.sync(srcFolder + '/**/*.{jpg,jpeg}');

	for (imageName of imageNames) {
		const imageDistFolder = imageName.replace(path.basename(imageName), '').replace(srcFolder, distFolder);

		if (!fs.existsSync(imageDistFolder)) {
			fs.mkdirSync(imageDistFolder, { recursive: true }, (err) => {
				if (err) throw err;
			});
		}

		const imageOriginalMetadata = await sharp(imageName).metadata();
		const imagePreview = resize(imageName, imageDistFolder, 25, '-preview');
		const imageThumbnail = resize(imageName, imageDistFolder, 200, '-thumbnail');
		const imageMedium = resize(imageName, imageDistFolder, 480, '-480');
		const imageLarge = resize(imageName, imageDistFolder, 960, '-960');
		const imageXLarge = resize(imageName, imageDistFolder, 1200, '-1200');

		images.push({
			original: imageName.replace(srcFolder, ''),
			originalWidth: imageOriginalMetadata.width,
			originalHeight: imageOriginalMetadata.height,
			preview: imagePreview.replace(distFolder, ''),
			thumbnail: imageThumbnail.replace(distFolder, ''),
			medium: imageMedium.replace(distFolder, ''),
			large: imageLarge.replace(distFolder, ''),
			xlarge: imageXLarge.replace(distFolder, ''),
		});
	}

	cb();
}

function dev() {
	watch([
		srcFolder + '/index.html',
		srcFolder + '/pages/**/*.html',
		srcFolder + '/templates/**/*.html',
	], series(pages));

	watch([
		srcFolder + '/blog/**/*.{html,md,xml}',
		srcFolder + '/projects/**/*.{html,md}',
		srcFolder + '/templates/**/*.html',
	], series(types));

	watch([,
		srcFolder + '/css/**/*.scss',
	], series(styles));

	watch([,
		srcFolder + '/js/**/*.js',
	], series(scripts));

	watch([
		'server/**/*.php'
	], series(server));
}

function deployUp() {
	if (sshConfig.host === '0.0.0.0')
		return console.error('Unable to deploy, SSH config in file "ssh.json" needed, see "ssh.exmaple.json".');

	return src(distFolder + '/**/*', { base: '.' }) // base '.' to use whole dist folder
		.pipe(tar('package.tar'))
		.pipe(dest(distFolder))
		.pipe(ssh.dest('/home/user/dist'));
}

function deployRemote() {
	return ssh.shell([
			'tar -xvf package.tar',
			'rsync -av --delete /home/user/dist/ /var/www/html/',
			'rm package.tar',
			'rm -r /home/user/dist',
		], { filePath: 'deploy-shell.log' });
}

function deployDown() {
	return del([distFolder + '/package.tar']);
}

exports.default = series(clean, responsiveImages, types, parallel(pages, styles, scripts, server, res), dev);
exports.dev = exports.default;
exports.dist = series(clean, responsiveImages, types, parallel(pages, styles, scripts, server, res));
exports.deploy = series(deployUp, deployRemote, deployDown);
