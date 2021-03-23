const path = require('path');

module.exports = {
	entry: {
		main: './src/js/main.js',
	},
	mode: 'production', // 'development'
	output: {
		filename: 'js/[name].min.js',
		chunkFilename: 'js/[name].min.js',
		path: path.resolve(__dirname, 'dist'),
		publicPath: '/',
	},
	stats: 'minimal',
	devtool: 'sourcemap',
	// watch: true,
	module: {
		rules: [{
			test: /\.m?js$/,
			exclude: /(node_modules|bower_components)/,
			use: {
				loader: 'babel-loader',
				options: {
					presets: [
						['@babel/env', {
							// 'useBuiltIns': 'usage', // Needed to add polyfills automatically
							// 'corejs': 3,            // Needed to add polyfills automatically
							// 'debug': true,
						}]
					]
				}
			}
		}]
	}
};
