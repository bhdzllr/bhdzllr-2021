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
				let html = hljs
					.highlight(str, { language: lang, ignore_illegals: true })
					.value
					.replaceAll(/\/\*\*\*/g, '</mark>')
					.replaceAll(/\*\*\*/g, '<mark>');

				return `<pre class="hljs hljs--${lang}"><code>${html}</code></pre>`;
			} catch (__) {}
		}

		return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
	},
});
const HTMLParser = require('node-html-parser');
const glob = require('glob');
const sharp = require('sharp');
const nodeHtmlToImage = require('node-html-to-image');
const handlebars = require('gulp-compile-handlebars');
const layouts = require('handlebars-layouts');
const mergeStream = require('merge-stream');
const webpack = require('webpack-stream');
const sass = require('gulp-sass')(require('sass'));
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');

const distFolder = 'dist';
const srcFolder = 'src';

const imagesVariations = [];
const imagesTeasers = [];
const entries = {};

handlebars.Handlebars.registerHelper(layouts(handlebars.Handlebars));
handlebars.Handlebars.registerHelper({
	html: function (value) {
		return new handlebars.Handlebars.SafeString(value);
	},
	ogImage: function (baseUrl, defaultImage, article) {
		if (article && (article.imageSocial || article.image)) {
			const imageSrc = article.imageSocial ?? article.image;
			let image = imagesTeasers.find(image => image.original == imageSrc);

			if (!image) image = imagesVariations.find(image => image.original == imageSrc);

			if (image && (image.src || image.xlarge)) {
				return baseUrl + (image.src ?? image.xlarge);
			}
		}

		if (article && article.imageSocialGeneric) {
			const genericImage = article.url + article.id + '-teaser.jpg';
			let image = imagesTeasers.find(image => image.original == genericImage);

			if (image) return baseUrl + image.src;
		}

		return baseUrl + defaultImage;
	},
	ogImageAlt: function (defaultAlt, article) {
		if (article && (article.imageSocialAlt || article.imageAlt)) {
			return article.imageSocialAlt ?? article.imageAlt;
		}

		return defaultAlt;
	},
	ogImageWidth: function (defaultWidth, article) {
		if (article && (article.imageSocial || article.image)) {
			const imageSrc = article.imageSocial ?? article.image;
			let image = imagesTeasers.find(image => image.original == imageSrc);

			if (!image) image = imagesVariations.find(image => image.original == imageSrc);

			if (!image) {
				console.warn('[OG Image Width]: Image not found, returning default width.');
				return defaultWidth;
			}

			return image.width ?? image.originalWidth;
		}

		return defaultWidth;
	},
	ogImageHeight: function (defaultHeight, article) {
		if (article && (article.imageSocial || article.image)) {
			const imageSrc = article.imageSocial ?? article.image;
			let image = imagesTeasers.find(image => image.original == imageSrc);

			if (!image) image = imagesVariations.find(image => image.original == imageSrc);

			if (!image) {
				console.warn('[OG Image Height]: Image not found, returning default height.');
				return defaultHeight;
			}

			return image.height ?? image.originalHeight;
		}

		return defaultHeight;
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
			case 'impressum':
				return '/impressum';
			case 'legal':
				return '/legal';
		}
	},
	image: function (src, alt, classList) {
		const image = imagesVariations.find(image => image.original == src);

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
				data-sizes="(max-width: 480px) 100vw, 960px"			
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
		const image = imagesVariations.find(image => image.original == src);

		if (!image) return;

		return image.originalWidth;
	},
	imageHeight: function (src) {
		const image = imagesVariations.find(image => image.original == src);

		if (!image) return;

		return image.originalHeight;
	},
	galleryImage: function (src, alt) {
		const image = imagesVariations.find(image => image.original == src);

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
	gallery: function (className, options) {
		if (typeof className === 'object') options = className;

		return new handlebars.Handlebars.SafeString(`<div class="gallery${className ? ' ' + className : ''} js-gallery">${options.fn(this)}</div>`);
	},
	gallery43: function (options) {
		return new handlebars.Handlebars.SafeString(`<div class="gallery gallery--4-3 js-gallery">${options.fn(this)}</div>`);
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
		'imageSocial': {
			type: 'string',
			required: false,
		},
		'imageSocialAlt': {
			type: 'string',
			required: false,
		},
		'imageSocialGeneric': {
			type: 'boolean',
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
					'TIL',
					'Fun',
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
				'action': {
					type: 'string',
					required: false,
					format: 'url',
				},
			}),
		},
	];
}

async function generateImageVariation(imagePath, width, suffix, dryRun, text = null, create = false) {
	try {
		const imageExtension = path.extname(imagePath);
		const imageName = path.basename(imagePath).replace(imageExtension, '');
		const imageDistFolder = imagePath.replace(path.basename(imageName) + imageExtension, '');
		const imageNameResized = imageDistFolder + imageName + suffix + imageExtension;

		if (!dryRun) {
			// PNG to JPG
			// if (imageName.includes(' (jpg)')) {
			// 	imageExtension = '.jpg';
			// 	imageName = imageName.replace(' (jpg)', '');
			// }

			const options = {
				width: width,
				withoutEnlargement: true,
			};
			let sharpImage;

			if (suffix == '-teaser' && text) {
				options.height = 620;

				if (create) {
					sharpImage = sharp({
						create: {
							width: options.width,
							height: options.height,
							channels: 4,
							background: '#222222',
						},
					});
				} else {
					sharpImage = sharp(imagePath).resize(options);
				}

				const image = await nodeHtmlToImage({
					html: `
						<html>
							<head>
								<style>
									body {
										display: flex;
										align-items: flex-end;
										justify-content: flex-start;
										width: ${options.width}px;
										height: ${options.height}px;
										margin: 0;
										padding: 2rem;
										box-sizing: border-box;

										background: linear-gradient(0deg, rgba(23, 37, 37, 0.8) 0%, rgba(0, 101, 78, 0.6) 100%); 

										color: #00ddaa;
										font-family: 'Open Sans', 'Open Sans Local', Helvetica, Arial, sans-serif;
										font-size: 5rem;
										font-weight: 700;
										line-height: 1.5;
									}

									span {
										padding: 0 1.5rem;
										box-decoration-break: clone;
										-webkit-box-decoration-break: clone;

										background-color: #222222;
									}
								</style>
							</head>
							<body>
								<div>
									<span>${text}</span>
								</div>
							</body>
						</html>
					`,
					transparent: true,
				});
				const imageBuffer = Buffer.from(image);

				sharpImage
					.composite([
						{
							input: imageBuffer,
						}
					]);
			} else {
				sharpImage = sharp(imagePath).resize(options);
			}

			if (['.jpg', '.jpeg'].includes(imageExtension)) {
				sharpImage.jpeg({
					quality: 60,
					force: true,
				});
			} else if (['.png'].includes(imageExtension)) {
				sharpImage.png({
					palette: true,
					quality: 80,
				});
			}

			if (suffix == '-preview') {
				sharpImage.blur();
			}

			sharpImage
				.toFile(imageNameResized)
				.catch(function (err) {
					throw new Error('Sharp ' + err);
				});
		}

		return imageNameResized;
	} catch (e) {
		console.log('Error while generating image variation: ', e);
	}
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
				.pipe(data(async function (file) {
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

					const url = file.path.split('/' + srcFolder)[1].replace('index.md', '');

					if (data.imageSocialGeneric) {
						const imageNames = glob.sync(srcFolder + '/!(img)/**/*-teaser.{jpg,jpeg,png}');
						const genericImage = url + data.id + '-teaser.jpg';
						let dryRun = false;
						if (imageNames.includes(srcFolder + genericImage)) dryRun = true;

						const imageTeaser = await generateImageVariation(srcFolder + genericImage.replace('-teaser.jpg', '.jpg'), 1200, '-teaser', dryRun, data.title, true);

						imagesTeasers.push({
							original: genericImage,
							src: imageTeaser.replace(srcFolder, ''),
							width: 1200,
							height: 620,
						});
					} else if (data.imageSocial) {
						const imageNames = glob.sync(srcFolder + '/!(img)/**/*-teaser.{jpg,jpeg,png}');
						const imageCheckExtension = path.extname(data.imageSocial);
						const imageCheckName = path.basename(data.imageSocial).replace(imageCheckExtension, '');
						const imageCheck = data.imageSocial.replace(imageCheckName + imageCheckExtension, imageCheckName + '-teaser' + imageCheckExtension);

						let dryRun = false;
						if (imageNames.includes(imageCheck)) dryRun = true;

						const imageTeaser = await generateImageVariation(srcFolder + data.imageSocial, 1200, '-teaser', dryRun, data.title);

						imagesTeasers.push({
							original: data.imageSocial.replace(srcFolder, ''),
							src: imageTeaser.replace(srcFolder, ''),
							width: 1200,
							height: 620,
						});
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
					templateData.article.url = url;
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

	src(srcFolder + '/js/main-analytics.js')
		.pipe(dest(distFolder + '/js/'));

	return src(srcFolder + '/js/main.js')
		.pipe(webpack(require('./webpack.config.js')))
		.pipe(dest(distFolder + '/'));
}

function server() {
	return src([
			'server/**/*.php',
			'server/**/*.js',
			'!server/env-production.php',
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

async function imageVariations(cb) {
	const imageNames = glob.sync(srcFolder + '/!(img)/**/*.{jpg,jpeg,png}');

	for (imageName of imageNames) {
		const imageCheckExtension = path.extname(imageName);
		const imageCheckName = path.basename(imageName).replace(imageCheckExtension, '');
		const imageCheck = imageName.replace(imageCheckName + imageCheckExtension, imageCheckName + '-preview' + imageCheckExtension);

		// Skip already generated image variations
		if (
			imageName.includes('-preview.')
			|| imageName.includes('-thumbnail.')
			|| imageName.includes('-teaser.')
			|| imageName.includes('-480.')
			|| imageName.includes('-960.')
			|| imageName.includes('-1200.')
		) {
			continue;
		}

		// Skip image if image with suffix '-preview' exists
		let dryRun = false;
		if (imageNames.includes(imageCheck)) dryRun = true;

		const imageOriginalMetadata = await sharp(imageName).metadata();
		const imagePreview = await generateImageVariation(imageName, 25, '-preview', dryRun);
		const imageThumbnail = await generateImageVariation(imageName, 200, '-thumbnail', dryRun);
		const imageMedium = await generateImageVariation(imageName, 480, '-480', dryRun);
		const imageLarge = await generateImageVariation(imageName, 960, '-960', dryRun);
		const imageXLarge = await generateImageVariation(imageName, 1200, '-1200', dryRun);

		imagesVariations.push({
			original: imageName.replace(srcFolder, ''),
			originalWidth: imageOriginalMetadata.width,
			originalHeight: imageOriginalMetadata.height,
			preview: imagePreview.replace(srcFolder, ''),
			thumbnail: imageThumbnail.replace(srcFolder, ''),
			medium: imageMedium.replace(srcFolder, ''),
			large: imageLarge.replace(srcFolder, ''),
			xlarge: imageXLarge.replace(srcFolder, ''),
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
		'server/**/*.php',
		'server/**/*.js',
	], series(server));
}

exports.default = series(clean, imageVariations, types, parallel(pages, styles, scripts, server, res), dev);
exports.dev = exports.default;
exports.dist = series(clean, imageVariations, types, parallel(pages, styles, scripts, server, res));
exports.imageVariations = imageVariations;
