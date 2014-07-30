/**
 * Утилиты для работы с файлами
 */
var fs = require('graceful-fs');
var path = require('path');
var glob = require('glob-all');
var async = require('async');
var mkdirp = require('mkdirp');

var utils = require('./common');

/**
 * Читает содержимое файлов, переданных в списке
 * @param  {Array}    list     Список путей к файлам, которые нужно прочитать
 * @param  {Function} callback
 */
function readList(list, callback) {
	async.map(list, function(file, callback) {
		fs.readFile(file.absPath, {encoding: 'utf8'}, function(err, content) {
			callback(err, utils.extend({}, file, {
				content: content
			}));
		});
	}, callback);
}

function isAbsolute(p) {
	return p[0] === '/';
}

function absPathList(list, options) {
	var cwd = (options && options.cwd) || process.cwd();
	return list.map(function(p) {
		return {
			cwd: cwd,
			file: p,
			absPath: path.normalize(isAbsolute(p) ? p : path.join(cwd, p))
		};
	});
}

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
	 * Читает указанный набор файлов.
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
				output.push({
					content: file.toString()
				});
				return false;
			}

			return true;
		});

		if (!files.length) {
			return callback(null, output);
		}

		async.waterfall([
			function(callback) {
				glob(files, fileObj.options, callback);
			},
			function(result, callback) {
				callback(null, absPathList(result, fileObj.options));
			},
			readList,
			function(content, callback) {
				callback(null, output = output.concat(content));
			}
		], function(err) {
			callback(err, output);
		});
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