let File = require("./../lib/file");
let queue = require("./../lib/queue");
let Path = require("path");
let colors = require("colors");
let ora = require('ora');

const Mapped = {
	js: {
		dependence: {
			"uglify-es": "^3.3.8",
			"@babel/cli": "^7.1.0",
			"@babel/core": "^7.1.0",
			"@babel/runtime-corejs2": "^7.1.2",
			"@babel/plugin-external-helpers": "^7.0.0",
			"@babel/plugin-proposal-class-properties": "^7.1.0",
			"@babel/plugin-proposal-decorators": "^7.0.0-beta.52",
			"@babel/plugin-proposal-do-expressions": "^7.0.0",
			"@babel/plugin-proposal-function-bind": "^7.0.0",
			"@babel/plugin-proposal-object-rest-spread": "^7.0.0",
			"@babel/plugin-syntax-dynamic-import": "^7.0.0",
			"@babel/plugin-syntax-export-extensions": "^7.0.0-beta.32",
			"@babel/plugin-transform-async-to-generator": "^7.1.0",
			"@babel/plugin-transform-runtime": "^7.1.0",
			"@babel/polyfill": "^7.0.0",
			"@babel/preset-env": "^7.1.0",
			"@babel/preset-typescript": "^7.1.0",
			"@babel/register": "^7.0.0",
			"@babel/runtime": "^7.0.0",
		},
		maker: "./jsmaker"
	},
	css: {
		dependence: {
			"autoprefixer": "^7.1.6",
			"postcss": "^5.2.5",
			"uglifycss": "^0.0.25",
			"html-minifier": "^3.5.6"
		},
		maker: "./cssmaker"
	},
	scss: {
		dependence: {
			"autoprefixer": "^7.1.6",
			"postcss": "^5.2.5",
			"uglifycss": "^0.0.25",
			"node-sass": "^3.10.1",
			"html-minifier": "^3.5.6"
		},
		maker: "./sassmaker"
	},
	less: {
		dependence: {
			"autoprefixer": "^7.1.6",
			"postcss": "^5.2.5",
			"uglifycss": "^0.0.25",
			"less": "^2.7.1",
			"html-minifier": "^3.5.6"
		},
		maker: "./lessmaker"
	},
	json: {
		dependence: {},
		maker: "./jsonmaker"
	},
	html: {
		dependence: {
			"html-minifier": "^3.5.6"
		},
		maker: "./htmlmaker"
	},
	icon: {
		dependence: {
			"html-minifier": "^3.5.6"
		},
		maker: "./iconmaker"
	},
	ts: {
		dependence: {
			"typescript": "^2.6.2",
			"uglify-es": "^3.3.8",
			"@babel/cli": "^7.1.0",
			"@babel/core": "^7.1.0",
			"@babel/runtime-corejs2": "^7.1.2",
			"@babel/plugin-external-helpers": "^7.0.0",
			"@babel/plugin-proposal-class-properties": "^7.1.0",
			"@babel/plugin-proposal-decorators": "^7.0.0-beta.52",
			"@babel/plugin-proposal-do-expressions": "^7.0.0",
			"@babel/plugin-proposal-function-bind": "^7.0.0",
			"@babel/plugin-proposal-object-rest-spread": "^7.0.0",
			"@babel/plugin-syntax-dynamic-import": "^7.0.0",
			"@babel/plugin-syntax-export-extensions": "^7.0.0-beta.32",
			"@babel/plugin-transform-async-to-generator": "^7.1.0",
			"@babel/plugin-transform-runtime": "^7.1.0",
			"@babel/polyfill": "^7.0.0",
			"@babel/preset-env": "^7.1.0",
			"@babel/preset-typescript": "^7.1.0",
			"@babel/register": "^7.0.0",
			"@babel/runtime": "^7.0.0",
		},
		maker: "./tsmaker"
	}
};

const base = {
	tasks: [],
	checkDependence(type, config) {
		if (this.tasks.indexOf(type) === -1) {
			this.tasks.push(type);
			let a = Mapped[type];
			if (a) {
				return queue(Reflect.ownKeys(a.dependence).map(name => () => {
					let path = Path.resolve(config.projectPath, "./node_modules/", name);
					if (!new File(path).isExists()) {
						let spinner = ora({
							color: "yellow",
							text: `INSTALL MODULE [ ${name} ]`
						}).start();
						return new Promise((resolve, reject) => {
							let args = ["install", name, "--save-dev"];
							require("child_process").exec(`npm ${args.join(" ")}`, {
								encoding: "utf-8",
								cwd: config.projectPath
							}, (error, stdout, stderr) => {
								if (error) {
									spinner.fail(`INSTALL MODULE [ ${name} ]`);
									console.log(`Please run > npm install`.red, `${name}`.white, `to install the module`.red);
									reject(name);
								} else {
									spinner.succeed(`INSTALL MODULE [ ${name} ]`);
									resolve(name);
								}
							});
						});
					} else {
						return Promise.resolve();
					}
				}));
			} else {
				return Promise.resolve();
			}
		} else {
			return Promise.resolve();
		}
	},
	checkAllDependence(sourcePath, config) {
		let types = [];
		new File(sourcePath).scan().map(path => {
			let suffix = new File(path).suffix();
			if (types.indexOf(suffix) === -1) {
				types.push(suffix);
			}
		});
		if (this.checkNotInstalled(types)) {
			console.log(` INSTALL MODULES PROJECT REQUIRED`.yellow);
			return queue(types.map(type => () => {
				return this.checkDependence(type, config);
			}));
		} else {
			return Promise.resolve();
		}
	},
	checkNotInstalled(types) {
		let projectPath = Path.resolve(__dirname, "./../../../../"), result = false;
		for (let i = 0; i < types.length; i++) {
			let type = types[i];
			if (Mapped[type]) {
				for (let name in Mapped[type].dependence) {
					let path = Path.resolve(projectPath, "./node_modules/", name);
					if (!new File(path).isExists()) {
						result = true;
						break;
					}
				}
			}
			if (result) {
				break;
			}
		}
		return result;
	}
};

let Maker = {
	parse(type, path, content, option) {
		if (!option.ignore.ignores("./" + path.substring(option.source_path.length))) {
			if (Mapped[type]) {
				return base.checkDependence(type, option).then(() => {
					return require(Mapped[type].maker)(content, path, option);
				});
			}
		}
		return Promise.resolve(content);
	},
	appCode(appPath) {
		return base.checkDependence("js", {
			projectPath: Path.resolve(__dirname, "./../../../../")
		}).then(() => {
			let content = new File(appPath).readSync();
			content = require("@babel/core").transform(content, {
				filename: appPath,
				presets: [
					"@babel/typescript", ["@babel/env", {"targets": {"browsers": "last 2 Chrome versions"}}]
				],
				plugins: [
					["@babel/plugin-proposal-decorators", {"legacy": true}],
					["@babel/plugin-proposal-class-properties", {"loose": true}],
					"@babel/transform-async-to-generator",
					"@babel/syntax-dynamic-import"
				]
			}).code;
			try {
				content = require("uglify-es").minify(content).code;
			} catch (e) {
			}
			return content;
		});

	},
	babelCode(config, code, path) {
		return base.checkDependence("js", config).then(() => {
			let ops = Object.assign({}, config.compiler.babel);
			ops.filename = path;
			let content = require("@babel/core").transform(code, ops).code;
			try {
				content = require("uglify-es").minify(content, Object.assign({}, config.compiler.uglify)).code;
			} catch (e) {
			}
			return content;
		});
	},
	minifyCode(config, code) {
		return base.checkDependence("js", config).then(() => {
			let content = code;
			try {
				content = require("uglify-es").minify(content, Object.assign({}, config.compiler.uglify)).code;
			} catch (e) {
			}
			return content;
		});
	},
	minifyIcon(content) {
		return base.checkDependence("less", {
			projectPath: Path.resolve(__dirname, "./../../../../")
		}).then(() => {
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
	},
	lessCode(content) {
		return base.checkDependence("less", {
			projectPath: Path.resolve(__dirname, "./../../../../")
		}).then(() => {
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
	},
	installAllDependence(sourcePath, config) {
		return base.checkAllDependence(sourcePath, config);
	},
	installAdapackDependence() {
		let types = ["js", "less"];
		if (base.checkNotInstalled(types)) {
			console.log(` INSTALL BASE MODULES`.yellow);
			return queue(types.map(type => () => {
				return base.checkDependence(type, {
					projectPath: Path.resolve(__dirname, "./../../../../")
				});
			}));
		} else {
			return Promise.resolve();
		}
	}
};

module.exports = Maker;