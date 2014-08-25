var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var utils = require('./common');

/**
 * Класс, описывающий ресурс, с которым ведётся работа.
 * Содержит содержимое ресурса, а также подсказки с указанием
 * на путь, откуда файл прочитан и куда его нужно сохранить
 */
function Resource(data) {
	if (!(this instanceof Resource)) {
		return new Resource(data);
	}

	this.cwd = data.cwd; // рабочая папка, с которой нужно прочитать ресурс
	this.file = data.file; // путь к файлу относительно папки `cwd`
	this.prefix = data.prefix || ''; // префикс, который нужно добавить в путь к ресурсу при сохранении

	// содержимое ресурса
	this._content = null;
	if ('content' in data) {
		this.content = data.content;
	}
}

Resource.prototype = {
	/**
	 * Сохраняет текущий файл в указанную рабочую папку
	 * @param  {String} dest Путь к рабочей папке
	 */
	save: function(dest) {
		dest = path.join(dest || process.cwd(), this.dest);
		mkdirp.sync(path.dirname(dest));
		fs.writeFileSync(dest, this.content, 'utf8');
	},

	/**
	 * Делает копию текущего ресурса с опциональным перекрытием
	 * некоторых свойств
	 * @param {Object} data Свойства, которые нужно перекрыть в копии
	 * @return {Resource}
	 */
	copy: function(data) {
		var copy = new Resource(this);
		copy.content = this.content;
		return utils.extend(copy, data);
	}
};

Object.defineProperties(Resource.prototype, {
	/**
	 * Путь к источнику файла
	 */
	origin: {
		enumerable: true,
		get: function() {
			if (this.file) {
				return path.join(this.cwd || '', this.file);
			}
		}
	},

	/**
	 * Относительный путь итогового файла. К этому пути нужно 
	 * добавть путь к целевой папке, в которую должны попадать 
	 * все импортируемые файлы
	 */
	dest: {
		enumerable: true,
		get: function() {
			if (this.file) {
				return this.prefix ? path.join(this.prefix, this.file) : this.file;
			}
		}
	},

	content: {
		get: function() {
			if (this._content === null) {
				this._content = fs.readFileSync(this.origin, 'utf8');
			}
			return this._content;
		},
		set: function(value) {
			this._content = value;
		}
	}
});

module.exports = Resource;