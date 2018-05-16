let maker = require("./../maker/maker");
let util = require("./util");
let ora = require('ora');
let File = require("./../lib/file");
let Path = require("path");
let queue = require("./../lib/queue");
let hash = require("./../lib/md5");
let gzipSize = require('gzip-size');

class AdaBundler {
	constructor(config) {
		this.resultmap = [];
		this.resultmapcode = {};
		this.contentCache = {};
		this.config = config;
	}

	getFileCode(path) {
		let config = this.config;
		if (!this.contentCache[path]) {
			return new Promise((resolve, reject) => {
				let file = new File(path), suffix = file.suffix();
				if (suffix === "html") {
					resolve(`module.exports=${JSON.stringify(file.readSync().replace(/\n/g, '').replace(/\r/g, '').replace(/\n\r/g, ''))}`);
				} else if (suffix === "less") {
					maker.lessCode(file.readSync()).then(code => {
						resolve(`module.exports={active:function(){var _a = document.createElement("style");_a.setAttribute("media", "screen");_a.setAttribute("type", "text/css");_a.appendChild(document.createTextNode(${JSON.stringify(code)}));document.head.appendChild(_a);}};`);
					});
				} else if (suffix === "icon") {
					maker.minifyIcon(file.readSync()).then(({name, code}) => {
						let result = `var active=function(){var c=document.getElementById("ada-icon-container");if(!c){var c=document.createElement("div");c.setAttribute("id","ada-icon-container");c.style.cssText="width:0;height:0;";document.body.appendChild(c);}if(!document.getElementById("${name}")){var a=document.createElement("div");a.innerHTML=${JSON.stringify(code)};c.appendChild(a.childNodes[0]);}};module.exports={active:function(){if(/complete|loaded|interactive/.test(window.document.readyState)){active();}else{window.addEventListener("DOMContentLoaded",function(){active();});}},getIconId:function(){return "${name}";}};`;
						resolve(result);
					});
				} else {
					let __code = file.readSync();
					if (__code.trim().length === 0) {
						resolve("module.exports={};");
					} else {
						if (path.indexOf("node_modules") === -1) {
							resolve(__code);
						} else {
							maker.babelCode(config, __code).then(content => {
								resolve(content);
							});
						}
					}
				}
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
					return one;
				}
			});
			this.resultmapcode[path] = code;
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

	getBabelHelperCode(command) {
		return new Promise((resolve, reject) => {
			let exec = require('child_process').exec;
			exec(command, function (error, stdout, stderr) {
				if (error) {
					reject(error);
				} else {
					resolve(stdout);
				}
			});
		});
	}

	bundle(path, output, develop) {
		let config = this.config;
		path = path.replace(/\\/g, "/");
		console.log("");
		if (!config.ada_autobundle) {
			console.log(` [ada_autobundle:false] ALWAYS BUNDLE ADA CORE`.grey);
		}
		let spinner = ora({
			color: "yellow",
			text: `NOW BUNDLING ADA CORE [${develop ? "DEVELOP" : "PUBLIC"} MODE]`
		}).start();
		return new File(`${config.projectPath}/node_modules/adajs/index.d.ts`).copyTo(`${config.projectPath}/node_modules/@types/adajs/index.d.ts`).then(() => {
			return this.getBabelHelperCode(`node ${config.projectPath}/node_modules/.bin/babel-external-helpers -t var`).then(code => {
				return maker.minifyCode(config, code);
			}).then(_code => {
				let babelcode = `(function(global){${_code}global.babelHelpers=babelHelpers;})(window);`;
				return this.getCodeMap(path).then(() => {
					let veison = require(Path.resolve(path, "./../package.json")).version;
					this.resultmap.push(path);
					let result = this.resultmap.map(path => {
						return `function(module,exports,require,babelHelpers){${this.resultmapcode[path]}}`;
					});
					let commet = `/*! adajs[${develop ? "Develop" : "Publish"}] ${veison} https://github.com/topolr/ada | https://github.com/topolr/ada/blob/master/LICENSE */\n`;
					let code = `${commet}${babelcode}(function (map,moduleName) {var Installed={};var requireModule = function (index) {if (Installed[index]) {return Installed[index].exports;}var module = Installed[index] = {exports: {}};map[index].call(module.exports, module, module.exports, requireModule,window.babelHelpers);return module.exports;};var mod=requireModule(map.length-1);window&&window.Ada.installModule(moduleName,mod);})([${result.join(",")}],"adajs");`;
					config.adaHash = hash.md5(code).substring(0, 10);
					code = code.replace(/\/ada\/sse/, `${config.server.protocol}://${config.server.host}${(config.server.port != 80 ? ":" + config.server.port : '')}/ada/sse`);
					return new File(output).write(code).then(() => {
						spinner.stop();
						process.stderr.clearLine();
						process.stderr.cursorTo(0);
						console.log(` BUNDLE ADA CORE DONE [${develop ? "DEVELOP" : "PUBLIC"} MODE GZIP:${util.getFileSizeAuto(gzipSize.sync(code))}]`.yellow);
					});
				});
			});
		});
	}
}

module.exports = AdaBundler;