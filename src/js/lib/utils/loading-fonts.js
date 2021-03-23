import 'es6-promise/auto';
import FontFaceObserver from 'fontfaceobserver-es';

export function loadFonts(fonts) {
	fonts.forEach(function (font, i) {
		const family = Object.keys(font)[0];
		const fontObserver = new FontFaceObserver(family, font[family]);

		fontObserver.load().then(function () {
			if (i == (fonts.length - 1)) document.documentElement.className += ` fonts-loaded`;
		});
	});
}
