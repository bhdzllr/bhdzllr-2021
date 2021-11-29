export class I18n {
	
	constructor(currentLang = 'en', langStrings) {
		this.currentLang = currentLang;
		this.langStrings = {};
		this.langStrings[currentLang] = langStrings;
	}

	setLang(lang) {
		this.currentLang = lang;
	}

	add(lang, langStrings) {
		if (!this.langStrings[lang]) this.langStrings[lang] = {};

		Object.assign(this.langStrings[lang], langStrings);
	}

	get(langString, fallbackString = null) {
		if (!this.langStrings[this.currentLang]) return this.getFallbackString(langString, fallbackString);
		if (!this.langStrings[this.currentLang][langString]) return this.getFallbackString(langString, fallbackString);

		return this.langStrings[this.currentLang][langString];
	}

	getFallbackString(langString, fallbackString) {
		if (!fallbackString) return langString;
		return fallbackString;
	}

}

export function findLocale(element, fallbackLocale = 'en') {
	const closestElement = element.closest('[lang]');
	if (closestElement) return closestElement.lang
	if (document.body.lang) return document.body.lang;
	if (document.documentElement.lang) return document.documentElement.lang;

	return fallbackLocale;
}
