let util = require("./../../util/helper");
let {File} = require("ada-util");
let Path = require("path");
let queue = require("../../util/queue");
let gzipSize = require('gzip-size');

class EntryPacker {
	constructor(config, maker) {
		this.resultmap = ["nothing"];
		this.resultmapcode = {"nothing": "module.exports={}"};
		this.contentCache = {};
		this.config = config;
		this.maker = maker;
		this.content = "";
		this.ready = false;
		this.time = 0;
		this.rebuild = false;
	}

	getFileCode(path) {
		if (!this.contentCache[path]) {
			return new Promise((resolve, reject) => {
				let file = new File(path), suffix = file.suffix.substring(1);
				file.read().then(content => {
					if (suffix === "html") {
						resolve(`module.exports=${JSON.stringify(content.replace(/\n/g, '').replace(/\r/g, '').replace(/\n\r/g, ''))}`);
					} else if (suffix === "less") {
						this.maker.lessCode(content).then(code => {
							resolve(`module.exports={active:function(){var _a = document.createElement("style");_a.setAttribute("media", "screen");_a.setAttribute("type", "text/css");_a.appendChild(document.createTextNode(${JSON.stringify(code)}));document.head.appendChild(_a);}};`);
						});
					} else if (suffix === "icon") {
						this.maker.minifyIcon(content).then(({name, code}) => {
							let result = `var active=function(){var c=document.getElementById("ada-icon-container");if(!c){var c=document.createElement("div");c.setAttribute("id","ada-icon-container");c.style.cssText="width:0;height:0;";document.body.appendChild(c);}if(!document.getElementById("${name}")){var a=document.createElement("div");a.innerHTML=${JSON.stringify(code)};c.appendChild(a.childNodes[0]);}};module.exports={active:function(){if(/complete|loaded|interactive/.test(window.document.readyState)){active();}else{window.addEventListener("DOMContentLoaded",function(){active();});}},getIconId:function(){return "${name}";}};`;
							resolve(result);
						});
					} else {
						let __code = content;
						if (__code.trim().length === 0) {
							resolve("module.exports={};");
						} else {
							if (this.config.develop === false && path.indexOf("node_modules/adajs/") !== -1) {
								__code = __code.replace(/this\.context\.logger\./g, () => {
									return "//this.content.logger.";
								}).replace(/context\.logger\./g, () => {
									return "//content.logger.";
								});
							}
							resolve(this.maker.babelCode(__code, path));
						}
					}
				});
			}).then((content) => {
				this.contentCache[path] = content;
				return content;
			});
		} else {
			return Promise.resolve(this.contentCache[path]);
		}
	}

	getDependenceInfo(path, code) {
		let config = this.config;
		if (!this.resultmapcode[path]) {
			let paths = [];
			code = code.replace(/require\(.*?\)/g, (one) => {
				if (one.indexOf("${") === -1 && one.indexOf("+") === -1 && one.indexOf(".concat(") === -1) {
					if (["fs", "path", "request"].indexOf(one) === -1 && path.indexOf("/context/server") === -1) {
						let a = one.substring(8, one.length - 1).replace(/['|"|`]/g, "").trim();
						let _path = util.getFilePath(config, Path.resolve(path, "./../"), a);
						let index = this.resultmap.indexOf(_path);
						if (index === -1) {
							paths.push(_path);
							this.resultmap.push(_path);
							index = this.resultmap.length - 1;
						}
						return `require(${index})`;
					} else {
						return "require(0)";
					}
				} else {
					return one;
				}
			});
			if (path.indexOf("/context/server") !== -1) {
				this.resultmapcode[path] = "module.exports={}";
			} else {
				this.resultmapcode[path] = code;
			}
			return paths;
		} else {
			return [];
		}
	}

	getCodeMap(path) {
		return this.getFileCode(path).then(code => {
			let tasks = this.getDependenceInfo(path, code).map(path => () => {
				return this.getCodeMap(path);
			});
			return queue(tasks);
		});
	}

	getContent() {
		return this.content;
	}

	setContent(str) {
		this.content = str;
		this.ready = true;
	}

	getGzipSize() {
		return util.getFileSizeAuto(gzipSize.sync(this.getContent()));
	}

	getFileSize() {
		return util.getFileSizeAuto(util.getByteLen(this.getContent()));
	}

	getBundleCode(path) {
		path = path.replace(/\\/g, "/");
		this.time = new Date().getTime();
		return this.getCodeMap(path).then(() => {
			this.resultmap.push(path);
			let result = this.resultmap.map(path => {
				return `function(module,exports,require){${this.resultmapcode[path]}}`;
			});
			this.content = `(function(p){var a={};var r=function(i){if(a[i]){return a[i].exports;}var m=a[i]={exports:{}};p[i].call(m.exports,m,m.exports,r);return m.exports;};return r(p.length-1);})([${result.join(",")}])`;
			this.ready = true;
			this.time = new Date().getTime() - this.time;
			return this.content;
		});
	}

	check(files) {
		if (this.ready) {
			let rebuild = files.some(file => this.resultmapcode[file] !== undefined);
			this.rebuild = rebuild;
			return !rebuild;
		}
		return false;
	}
}

module.exports = EntryPacker;