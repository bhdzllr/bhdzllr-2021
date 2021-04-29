const { series, parallel, src, dest, watch } = require('gulp');

const del = require('del');
const fs = require('fs');

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
				return `<pre class="hljs hljs--${lang}"><code>${hljs.highlight(lang, str, true).value}</code></pre>`;
			} catch (__) {}
		}

		return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
	},
});
const handlebars = require('gulp-compile-handlebars');
const layouts = require('handlebars-layouts');
const mergeStream = require('merge-stream');
const webpack = require('webpack-stream');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const tar = require('gulp-tar');
const GulpSSH = require('gulp-ssh');

const distFolder = 'dist';
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

const handlebarsBatch = [
	'src/templates/',
	'src/templates/modules/',
	'src/templates/partials/',
];
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
			case 'work':
				return '/projects';
			case 'mail':
				return '/contact';
			case 'imprint':
				return '/imprint.html';
			case 'legal':
				return '/legal.html';
		}
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

const handlebarsDefaultData = function (file) {
	let url;

	if (file.path.includes('/pages')) {
		url = file.path.split('/pages')[1];
	} else if (file.path.includes('/blog')) {
		url = file.path.split('/src')[1];
	} else if (file.path.includes('/projects')) {
		url = file.path.split('/src')[1];
	}

	return {
		data: {
			url: url,
		},
	}; 
};

function clean() {
	return del([
		distFolder,
	], { force: true });
}

function pages(cb) {
	src('src/pages/**/*.html')
		.pipe(data(handlebarsDefaultData))
		.pipe(handlebars({}, {
			batch: handlebarsBatch,
		}))
		.pipe(rename({ extname: '.html' }))
		.pipe(dest(distFolder));

	src([
		'src/pages/**/*',
		'!src/pages/**/*.html'
	]).pipe(dest(distFolder));

	cb();
}

function types(cb) {
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
	const types = [
		{
			name: 'blog',
			src: 'src/blog',
			layout: 'layouts/article',
			dist: distFolder + '/blog/',
			schema: Object.assign(Object.assign({}, propertiesDefault), {}),
		},
		{
			name: 'project',
			src: 'src/projects',
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

	for (const type of types) {
		typesSubtask(type);
	}

	cb();
}

function typesSubtask(type) {
	function createType() {
		return new Promise(function (resolve, reject) {
			const entries = [];

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
					const templateData = { content: {} };
					const body = layoutStart
						+ md
							.render(content)
							.replace(/<hbs>/g, '')
							.replace(/<\/hbs>/g, '')
							.replace(/({{)&gt;\s[“|„|"]?(.*?)[”|“|"]?(}})/g, '$1> "$2"$3')
							.replace(/({{)>\s"?&quot;(.*?)&quot;"?(}})/g, '$1> "$2"$3')
						+ layoutEnd;

					file.contents = new Buffer.from(body);
					
					templateData.article = data;
					templateData.article.type = type.name;
					templateData.article.url = file.path.split('/src')[1].replace('index.md', '');
					templateData.article.createdAt = file.stat.birthtime;
					templateData.article.updatedAt = file.stat.mtime;

					entries.push(templateData.article);

					templateData.data = handlebarsDefaultData(file).data;

					return templateData;
				}))
				.pipe(handlebars({}, {
					batch: handlebarsBatch,
				}))
				.pipe(rename({
					extname: '.html',
				}))
				.pipe(dest(type.dist))
				.on('end', function () {
					resolve(entries);
				});
		});
	}

	function createIndex(entries) {
		src(type.src + '/index.html')
			.pipe(data(handlebarsDefaultData))
			.pipe(handlebars({
				entries: entries,
			}, {
				batch: handlebarsBatch,
			}))
			.pipe(rename({ extname: '.html' }))
			.pipe(dest(type.dist));
	}

	function copyResources() {
		src([
			type.src + '/**/*',
			'!' + type.src + '/index.html',
			'!' + type.src + '/**/*.md'
		]).pipe(dest(type.dist));
	}

	// function finishTask() {
	// 	cb();
	// }

	createType()
		.then(createIndex)
		.then(copyResources)
		// .then(finishTask);
}

function styles() {
	return src('src/css/main.scss')
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
	if (fs.existsSync('src/sw.js')) {
		src('src/sw.js')
			.pipe(dest(distFolder));
	}	

	src('src/js/lib/files/check.js')
		.pipe(dest(distFolder + '/js/lib/files/'));

	return src('src/js/main.js')
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
	src('src/img/**/*')
		.pipe(dest(distFolder + '/img/'));

	src('src/fonts/**/*')
		.pipe(dest(distFolder + '/fonts/'));

	src('src/docs/**/*')
		.pipe(dest(distFolder + '/docs/'));

	src([
			'src/browserconfig.xml',
			'src/favicon.ico',
			'src/icon.png',
			'src/site.webmanifest',
			'src/tile.png',
			'src/tile-wide.png',
		])
		.pipe(dest(distFolder + '/'));

	cb();
}

function dev() {
	watch([
		'src/index.html',
		'src/pages/**/*.html',
		'src/templates/**/*.html',
	], series(pages));

	watch([
		'src/blog/**/*.{html,md}',
		'src/projects/**/*.{html,md}',
		'src/templates/**/*.html',
	], series(types));

	watch([,
		'src/css/**/*.scss',
	], series(styles));

	watch([,
		'src/js/**/*.js',
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

exports.default = series(clean, parallel(pages, types, styles, scripts, server, res), dev);
exports.dev = exports.default;
exports.dist = series(clean, parallel(pages, types, styles, scripts, server, res));
exports.deploy = series(deployUp, deployRemote, deployDown);
