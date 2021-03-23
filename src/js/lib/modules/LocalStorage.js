export default class LocalStorage {

	set(key, value) {
		if (value !== null && typeof value === 'object') {
			value = JSON.stringify(value);
		}

		localStorage.setItem(key, value);
	}


	get(key) {
		if (!localStorage.getItem(key)) return false;

		let item = localStorage.getItem(key);

		try {
			JSON.parse(item);
		} catch (e) {
			return item;
		}

		return JSON.parse(item);
	}

	remove(key) {
		if (!localStorage.getItem(key)) return false;

		localStorage.removeItem(key);
	}

	push(key, object) {
		let value = this.get(key);

		if (!value) {
			value = [];
			this.set(key, value);
		} else if (typeof value !== 'object') {
			throw new Error('The value does not appear to be an object.');
		}

		value.push(object);

		this.set(key, value);
	}

	splice(key, index, splice = 1) {
		let value = this.get(key);

		if (value === null || typeof value !== 'object') {
			throw new Error('The value does not appear to be an object.');
		}

		value.splice(index, splice);

		this.set(key, value);
	}

}
