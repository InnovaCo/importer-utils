var file = require('./lib/file');
var common = require('./lib/common');

common.extend(module.exports, common);
module.exports.file = file;