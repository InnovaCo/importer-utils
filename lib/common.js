module.exports = {
	extend: function(dest) {
		for (var i = 1, il = arguments.length, src; i < il; i++) {
			src = arguments[i];
			if (!src) {
				continue;
			}

			for (var p in src) {
				dest[p] = src[p];
			}
		}

		return dest;
	}
};