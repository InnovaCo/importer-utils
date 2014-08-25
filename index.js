var file = require('./lib/file');
var common = require('./lib/common');
var Resource = require('./lib/resource');

common.extend(module.exports, common);
module.exports.file = file;
module.exports.Resource = Resource;