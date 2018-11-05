let Installer = require("./installer");
let Path = require("path");
let File = require("../util/file");

class Maker {
	constructor(config) {
		this._config = config;
		this._installer = new Installer(config);
	}

	get config() {
		return this._config;
	}

	get installer() {
		return this._installer;
	}

	make(path) {
		let type = Path.extname(path).substring(1), content = new File(path).readSync();
		let info = {path, content};
		return this.config.hooker.excute("beforeMake", info).then(() => {
			if (this.config.dependence[type]) {
				return this.installer.readyTypeModules(type).then(() => {
					return this.config.dependence[type].maker(info.content, path, this.config);
				}).then(content => {
					let endInfo = {path, content};
					return this.config.hooker.excute("afterMake", endInfo).then(() => endInfo.content);
				});
			} else {
				return Promise.resolve(info.content);
			}
		});
	}

	babelCode(code, path) {
		let config = this.config;
		let ops = Object.assign({}, config.compiler.babel, {filename: path});
		let content = require("@babel/core").transform(code, ops).code;
		try {
			content = require("uglify-es").minify(content, Object.assign({}, config.compiler.uglify)).code;
		} catch (e) {
		}
		return content;
	}

	minifyCode(code) {
		let config = this.config;
		return this.installer.readyTypeModules("js").then(() => {
			let content = code;
			try {
				content = require("uglify-es").minify(content, Object.assign({}, config.compiler.uglify)).code;
			} catch (e) {
			}
			return content;
		});
	}

	minifyIcon(content) {
		return this.installer.readyTypeModules("less").then(() => {
			content = require('html-minifier').minify(content, {
				removeComments: true,
				collapseWhitespace: true,
				minifyJS: true,
				minifyCSS: true
			});
			let titleTag = content.match(/<title>[\s\S]*?>/);
			let name = "";
			if (titleTag) {
				name = titleTag[0].substring(7, titleTag[0].length - 8).trim();
			}
			let et = content.replace(/svg/g, "symbol").replace(/xmlns\=".*?"/, "").replace(/version\=".*?"/, "").replace(/viewBox\=".*?"/, (str) => {
				return `${str} id="${name}"`;
			});
			let code = `<svg style="width:0;height:0;overflow:hidden;" version="1.1" xmlns="http://www.w3.org/2000/svg">${et}</svg>`;
			return {name, code};
		});
	}

	lessCode(content) {
		return this.installer.readyTypeModules("less").then(() => {
			return new Promise((resolve, reject) => {
				require("less").render(content, function (e, output) {
					if (!e) {
						let code = require('html-minifier').minify(output.css, {
							removeComments: true,
							collapseWhitespace: true,
							minifyJS: true,
							minifyCSS: true
						});
						resolve(code);
					} else {
						console.log(e)
						resolve("");
					}
				});
			});
		});
	}
}

module.exports = Maker;