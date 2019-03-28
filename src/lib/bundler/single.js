let EntryPacker = require("./entry");

class SingleFilePacker extends EntryPacker {
	getBundleCode(path) {
		if (!this.content) {
			path = path.replace(/\\/g, "/");
			this.time = new Date().getTime();
			return this.getCodeMap(path).then(() => {
				this.resultmap.push(path);
				let result = this.resultmap.map(path => {
					return `function(module,exports,require){${this.resultmapcode[path]}}`;
				});
				let code = `(function (map) {var Installed={};var requireModule = function (index) {if (Installed[index]) {return Installed[index].exports;}var module = Installed[index] = {exports: {}};map[index].call(module.exports, module, module.exports, requireModule);return module.exports;};})([${result.join(",")}]);`;
				this.content = `${code}`;
				this.ready = true;
				this.time = new Date().getTime() - this.time;
				return this.content;
			});
		} else {
			return this.content;
		}
	}
}

module.exports = SingleFilePacker;