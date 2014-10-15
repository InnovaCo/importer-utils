/**
 * Утилиты для работы с файлами
 */
var fs = require('graceful-fs');
var path = require('path');
var glob = require('glob-all');
var async = require('async');
var mkdirp = require('mkdirp');
var merge = require('merge');

var utils = require('./common');
var Resource = require('./resource');

module.exports = {
	/**
	 * Нормализация указанного файлового объекта
	 * @param  {Object} fileObj
	 * @return {Object}
	 */
	normalize: function(fileObj) {
		if (Array.isArray(fileObj)) {
			return {
				files: fileObj,
				options: {}
			};
		}

		if (typeof fileObj === 'object' && !Buffer.isBuffer(fileObj)) {
			if ('files' in fileObj && 'options' in fileObj) {
				// already normalized
				return fileObj;
			}


			var options = utils.extend({}, fileObj);
			if ('src' in options) {
				delete options.src;
			}

			return {
				files: Array.isArray(fileObj.src) ? fileObj.src : [fileObj.src],
				options: options
			};
		}

		return {
			files: [fileObj],
			options: {}
		};
	},

	/**
	 * Читает указанный набор файлов: возвращает массив объектов класса
	 * `Resource`, у которых 
	 * @param  {Object}   fileObj  Объект, указывающий, какие файлы нужно преобразовать
	 * (см. `this.normalize()`)
	 * @param  {Function} callback
	 */
	read: function(fileObj, callback) {
		fileObj = this.normalize(fileObj);

		var output = [];

		// сначала прочитаем буфферы, если есть
		var files = fileObj.files.filter(function(file) {
			if (file instanceof Buffer) {
				output.push(new Resource({content: file.toString()}));
				return false;
			}

			return true;
		});

		if (!files.length) {
			return callback(null, output);
		}

		async.waterfall([
			function(callback) {
				glob(files, merge(true, fileObj.options, {mark: true}), callback);
			},
			function(files, callback) {
				// оставляем только файлы
				callback(null, files.filter(function(f) {
					return !/\/$/.test(f);
				}))
			},
			function(result, callback) {
				result.map(function(file) {
					output.push(new Resource(utils.extend({}, fileObj.options, {file: file})));
				});

				callback(null, output);
			}
		], callback);
	},

	/**
	 * Сохраняет содержимое файла
	 * @param  {String}   dest     Абсолютный путь, куда нужно сохранить файл
	 * @param  {String}   content  Содержимое файла
	 * @param  {Function} callback 
	 */
	save: function(dest, content, callback) {
		async.waterfall([
			function(callback) {
				mkdirp(path.dirname(dest), callback);
			},
			function(result, callback) {
				fs.writeFile(dest, content, callback);
			}
		], callback);
	},

	/**
	 * Быстрое копирование файлов
	 * @param  {String}   source Откуда копировать файл
	 * @param  {String}   target Куда копировать файл
	 * @param  {Function} callback
	 */
	copy: function(source, target, callback) {
		async.waterfall([
			function(callback) {
				mkdirp(path.dirname(target), callback);
			},
			function(result, callback) {
				var cbCalled = false;
				var done = function(err) {
					if (!cbCalled) {
						callback(err);
						cbCalled = true;
					}
				};

				var rd = fs.createReadStream(source);
				rd.on('error', done);

				var wr = fs.createWriteStream(target);
				wr.on('error', done);
				wr.on('close', function(ex) {
					done();
				});
				rd.pipe(wr);
			}
		], callback);
	}
};
