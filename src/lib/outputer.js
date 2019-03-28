let hash = require("ada-util/src/md5");
let gzipSize = require('gzip-size');
let AdaBundler = require("./bundler/ada");
let EntryBundler = require("./bundler/entry");
let SingleBundler = require("./bundler/single");
let {File, clone} = require("ada-util");
let Path = require("path");
let util = require("./../util/helper");
let BinaryEntity = require("./entity/binary");
let ExcutorEntity = require("./entity/excutor");
let serializeError = require('serialize-error');
let Anser = require("anser");

class Pack {
	constructor(sourceMap, name, files) {
		this._sourceMap = sourceMap;
		this._files = files;
		this._name = name;
		this._packName = "package-" + this._name.substring(this._sourceMap.config.sourcePath.length).replace(/\//g, "-").replace(/\\/g, "-");
		this._result = "";
		this.getContent();
	}

	get packName() {
		return this._packName;
	}

	getContent() {
		if (!this._result) {
			this._content = {};
			this._files.map(file => {
				let entity = this._sourceMap.getEntity(file);
				if (!(entity instanceof BinaryEntity)) {
					this._content[entity.getMapName()] = {
						hash: entity.getHash(),
						code: entity.getContent()
					}
				}
			});
			this._result = `Ada.unpack(${JSON.stringify(this._content)})`;
		}
		return this._result;
	}

	getMapName() {
		return util.getMappedPath(this.packName);
	}

	getHash() {
		return hash.md5(this.getContent()).substring(0, 8);
	}

	getDependencHash() {
		return Reflect.ownKeys(this._content).map(key => this._content[key].hash);
	}

	getGzipSize() {
		return util.getFileSizeAuto(gzipSize.sync(this.getContent()));
	}

	getFileSize() {
		return util.getFileSizeAuto(util.getByteLen(this.getContent()));
	}
}

class Outputer {
	constructor(config, sourceMap) {
		this._sourceMap = sourceMap;
		this._initerBundler = new EntryBundler(config, this._sourceMap.maker);
		this._workerBundler = new EntryBundler(config, this._sourceMap.maker);
		this._adaBunlder = new AdaBundler(config, this._sourceMap.maker);
		this._packs = {};
		this._adaURL = "";
		this._workerURL = "";
	}

	get config() {
		return this._sourceMap.config;
	}

	get sourceMap() {
		return this._sourceMap;
	}

	getSourceMap() {
		let map = {packages: {}};
		Reflect.ownKeys(this.sourceMap._map).forEach(key => {
			let entity = this.sourceMap._map[key];
			map[entity.getMapName()] = entity.getHash();
		});
		Reflect.ownKeys(this._packs).forEach(key => {
			let pack = this._packs[key];
			let name = pack.getMapName();
			map[pack.getMapName()] = pack.getHash();
			map.packages[name] = pack.getDependencHash().join("|")
		});
		return map;
	}

	getLogInfo() {
		return Reflect.ownKeys(this.sourceMap._map).filter(key => !!this.sourceMap._map[key].errorLog).map(key => {
			let entity = this.sourceMap._map[key], errorInfo = serializeError(entity.errorLog);
			errorInfo.message = Anser.ansiToHtml(errorInfo.message);
			errorInfo.stack = Anser.ansiToHtml(errorInfo.stack);
			return {
				name: entity.mapName,
				error: entity.errorLog,
				info: errorInfo
			};
		});
	}

	outputAda() {
		let config = this.config;
		if (!this._adaBunlder.ready) {
			return this.config.hooker.excute("beforeAda").then(() => {
				if (config.develop) {
					return this._adaBunlder.getBundleCode(Path.resolve(config.nmodulePath, "./adajs/develop.js")).then(code => {
						let url = config.siteURL + "ada.js";
						let path = Path.resolve(config.distPath, "./ada.js");
						return this.config.hooker.excute("afterAda", this._adaBunlder).then(() => {
							this._adaURL = url;
							return new File(path).write(this._adaBunlder.getContent());
						});
					});
				} else {
					return this._adaBunlder.getBundleCode(Path.resolve(config.nmodulePath, "./adajs/index.js")).then(code => {
						let h = hash.md5(code).substring(0, 8);
						let url = config.siteURL + `ada.${h}.js`;
						let path = Path.resolve(config.distPath, `./ada.${h}.js`);
						return this.config.hooker.excute("afterAda", this._adaBunlder).then(() => {
							this._adaURL = url;
							return new File(path).write(this._adaBunlder.getContent());
						});
					});
				}
			});
		} else {
			return Promise.resolve();
		}
	}

	outputSingles() {
		let config = this.config;
		if (config.singleFiles) {
			return this.config.hooker.excute("beforeSingle").then(() => {
				return config.singleFiles(config).reduce((a, {path, dist}) => {
					return a.then(() => {
						return new SingleBundler(config, this._sourceMap.maker).getBundleCode(path).then(code => {
							return new File(dist).write(code);
						});
					});
				}, Promise.resolve());
			}).then(() => {
				return this.config.hooker.excute("afterSingle", this._adaBunlder);
			});
		}
		return Promise.resolve();
	}

	outputIniter(files) {
		let config = this.config;
		if (!this._initerBundler.check(files)) {
			return config.hooker.excute("beforeIniter").then(() => {
				return this._initerBundler.getBundleCode(config.initerPath).then(() => {
					return config.hooker.excute("afterIniter", this._initerBundler).then(() => {
						return this._initerBundler.getContent();
					});
				});
			});
		} else {
			return Promise.resolve(this._initerBundler.getContent());
		}
	}

	outputWorker(files) {
		let config = this.config;
		if (!this._workerBundler.check(files)) {
			return config.hooker.excute("beforeWorker").then(() => {
				return this._workerBundler.getBundleCode(config.workerPath).then(code => {
					let h = hash.md5(code).substring(0, 8);
					let url = config.siteURL + config.develop ? "service.worker.js" : `service.worker.${h}.js`;
					let path = Path.resolve(config.distPath, config.develop ? "./service.worker.js" : `./service.worker.${h}.js`);
					return config.hooker.excute("afterWorker", this._workerBundler).then(() => {
						this._workerURL = url;
					}).then(() => {
						return new File(path).write(this._workerBundler.getContent());
					});
				});
			});
		} else {
			return Promise.resolve();
		}
	}

	outputStatic() {
		let paths = [], config = this.config, ps = Promise.resolve();
		Reflect.ownKeys(this.sourceMap._map).forEach(key => {
			let entity = this.sourceMap._map[key];
			if (entity instanceof ExcutorEntity) {
				entity.getAssetPaths().forEach(info => {
					if (!paths.find(a => a.path === info.path)) {
						paths.push(info);
					}
				});
			}
		});
		if (config.staticPath) {
			ps = ps.then(() => {
				let file = new File(config.staticPath);
				if (file.exist) {
					return file.getAllSubFilePaths().then(paths => paths.reduce((a, path) => {
						return a.then(() => {
							let r = Path.resolve(config.distPath, './', './' + path.substring(config.staticPath.length));
							return new File(path).copyTo(r);
						});
					}, Promise.resolve()));
				} else {
					return Promise.resolve();
				}
			});
		}
		return ps.then(() => {
			return paths.reduce((a, info) => {
				return a.then(() => {
					let file = new File(info.path);
					if (file.exist) {
						return file.getAllSubFilePaths().then(paths => paths.reduce((a, path) => {
							return a.then(() => {
								let r = (info.distPath + "/" + path.substring(info.path.length)).replace(/[\/]+/g, "/");
								return new File(path).copyTo(r);
							});
						}, Promise.resolve()));
					} else {
						return Promise.resolve();
					}
				});
			}, Promise.resolve());
		});
	}

	outputFiles() {
		let config = this.config;
		return Reflect.ownKeys(this.sourceMap._map).filter(key => this.sourceMap._map[key].output !== true).reduce((a, key) => {
			return a.then(() => {
				if (key) {
					let entity = this.sourceMap._map[key];
					return config.hooker.excute("outputFile", entity).then(() => {
						entity.output = true;
						if (entity instanceof BinaryEntity) {
							return new File(entity.path).copyTo(entity.getDistPath());
						} else {
							return new File(entity.getDistPath()).make().then(file => file.write(entity.getContent()));
						}
					});
				} else {
					return Promise.resolve();
				}
			});
		}, Promise.resolve());
	}

	outputPackFiles() {
		let config = this.config, entryDependenceMap = this.sourceMap._entryDependenceMap;
		Reflect.ownKeys(entryDependenceMap).forEach(key => {
			this._packs[key] = new Pack(this.sourceMap, key, entryDependenceMap[key]);
		});
		return Reflect.ownKeys(this._packs).reduce((a, key) => {
			return a.then(() => {
				let pack = this._packs[key];
				return this.config.hooker.excute("outputPack", pack).then(() => {
					if (config.develop) {
						return new File(Path.resolve(config.distPath, `./${pack.getMapName()}.js`)).write(pack.getContent());
					} else {
						return new File(Path.resolve(config.distPath, `./${pack.getHash()}.js`)).write(pack.getContent());
					}
				});
			});
		}, Promise.resolve());
	}

	outputIndex(files) {
		let config = this.config;
		let baseInfo = config.baseInfo;
		let metaContent = baseInfo.meta.map(item => {
			let props = Reflect.ownKeys(item).map(key => `${key}="${item[key]}"`).join(" ");
			return `<meta ${props}>`;
		}).join("");
		let iconsContent = baseInfo.icons.map(info => {
			return `<link rel="apple-touch-icon-precomposed" sizes="${info.sizes}" href="${config.siteURL + info.src}">`;
		}).join("");
		if (baseInfo.icons.length > 0) {
			iconsContent += `<link rel="shortcut icon" href="${config.siteURL + baseInfo.icons[0].src}">`;
		}
		let linkContent = baseInfo.link.map(path => {
			let props = Reflect.ownKeys(path).map(key => `${key}="${path[key]}"`).join(" ");
			return `<link ${props}>`;
		}).join("");
		let styleContent = baseInfo.style.map(path => {
			if (util.isObject(path)) {
				path.rel = "stylesheet";
				let props = Reflect.ownKeys(path).map(key => `${key}="${path[key]}"`).join(" ");
				return `<link ${props}>`;
			} else {
				return `<link rel="stylesheet" href="${path}">`;
			}
		}).join("");
		let scriptContent = baseInfo.script.map(path => {
			if (util.isObject(path)) {
				let props = Reflect.ownKeys(path).map(key => `${key}="${path[key]}"`).join(" ");
				return `<script ${props}></script>`;
			} else {
				return `<script src="${path}"></script>`;
			}
		}).join("");
		let bootMap = {
			basePath: config.siteURL,
			develop: config.develop,
			map: this.getSourceMap(),
			name: config.name,
			root: config.mainEntryPath.substring(config.sourcePath.length)
		};
		let manifest = {};
		Reflect.ownKeys(baseInfo).forEach(key => {
			if (["keywords", "meta", "link", "style", "script"].indexOf(key) === -1) {
				manifest[key] = clone(baseInfo[key]);
			}
		});
		let hookInfo = {
			map: bootMap,
			manifest
		};
		let ps = Promise.resolve();
		if (config.workerPath) {
			ps = ps.then(() => this.outputWorker(files));
		}
		if (config.initerPath) {
			ps = ps.then(() => this.outputIniter(files));
		}
		return ps.then(() => {
			return this.config.hooker.excute("outputIndex", hookInfo).then(() => {
				return Promise.all(baseInfo.icons.map(icon => {
					return new File(Path.resolve(config.sourcePath, icon.src)).copyTo(Path.resolve(config.distPath, icon.src));
				})).then(() => {
					let workerCode = "", initer = this._initerBundler.getContent();
					if (config.worker && config.worker.path) {
						workerCode = `<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('${this._workerURL}', { scope: '${config.worker.scope}' }).then(function(reg) {console.log('Registration succeeded. Scope is ' + reg.scope);}).catch(function(error) {console.log('Registration failed with ' + error);});}</script>`
					}
					let content = `<!DOCTYPE html><html><head><link rel="manifest" href="manifest.json"><meta charset="${baseInfo.charset}"><title>${baseInfo.name}</title>${metaContent}${iconsContent}${styleContent}${linkContent}${scriptContent}<script src="${this._adaURL}"></script><script>${initer ? "Ada.init(" + initer + ");" : ""}Ada.boot(${JSON.stringify(hookInfo.map)});</script>${workerCode ? workerCode : ''}</head><body></body></html>`;
					if (hookInfo.manifest.icons) {
						hookInfo.manifest.icons.forEach(icon => {
							icon.src = config.siteURL + icon.src;
						});
					}
					return Promise.all([
						new File(Path.resolve(config.indexPath, "./manifest.json")).write(JSON.stringify(hookInfo.manifest)),
						new File(Path.resolve(config.indexPath, "./index.html")).write(content)
					]);
				});
			});
		});
	}

	output(files = []) {
		let outputMap = this.config.output;
		return this.config.hooker.excute("beforeOutput").then(() => {
			let ps = Promise.resolve();
			if (outputMap.ada) {
				ps = ps.then(() => this.outputAda());
			}
			if (outputMap.files) {
				ps = ps.then(() => this.outputFiles());
			}
			if (outputMap.packFiles) {
				ps = ps.then(() => this.outputPackFiles());
			}
			if (outputMap.indexPage) {
				ps = ps.then(() => this.outputIndex(files));
			}
			if (outputMap.staticFiles) {
				ps = ps.then(() => this.outputStatic());
			}
			ps = ps.then(() => this.outputSingles());
			return ps.then(() => {
				return this.config.hooker.excute("afterOutput");
			}).then(() => {
				if (this._initerBundler.rebuild || this._workerBundler.rebuild) {
					this.rebuild = true;
				} else {
					this.rebuild = false;
				}
			});
		});
	}
}

module.exports = Outputer;