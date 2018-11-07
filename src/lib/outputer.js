let hash = require("./../util/md5");
let gzipSize = require('gzip-size');
let AdaBundler = require("./bundler/ada");
let EntryBundler = require("./bundler/entry");
let File = require("./../util/file");
let Path = require("path");
let util = require("./../util/helper");
let BinaryEntity = require("./entity/binary");

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
			let entity = this.sourceMap._map[key];
			return {
				name: entity.mapName,
				error: entity.errorLog
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

	outputIniter() {
		let config = this.config;
		if (!this._initerBundler.ready) {
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

	outputWorker() {
		let config = this.config;
		if (!this._workerBundler.ready && config.worker.path) {
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
		let config = this.config, file = new File(config.staticPath);
		if (file.isExists()) {
			return file.scan().reduce((a, path) => {
				return a.then(() => {
					return new File(path).copyTo(config.distPath + path.substring(config.sourcePath.length));
				});
			}, Promise.resolve());
		} else {
			return Promise.resolve();
		}
	}

	outputFiles() {
		let config = this.config;
		return Reflect.ownKeys(this.sourceMap._map).filter(key => this.sourceMap._map[key].output !== true).reduce((a, key) => {
			return a.then(() => {
				let entity = this.sourceMap._map[key];
				return config.hooker.excute("outputFile", entity).then(() => {
					entity.output = true;
					if (entity instanceof BinaryEntity) {
						return new File(entity.path).copyTo(entity.getDistPath());
					} else {
						return new File(entity.getDistPath()).write(entity.getContent());
					}
				});
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

	outputIndex() {
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
			root: config.mainEntryPath.substring(config.sourcePath.length)
		};
		let manifest = {};
		Reflect.ownKeys(baseInfo).forEach(key => {
			if (["keywords","meta","link","style","script"].indexOf(key) === -1) {
				manifest[key] = baseInfo[key];
			}
		});
		let hookInfo = {
			map: bootMap,
			manifest
		};
		let ps = Promise.resolve();
		if (config.worker.path) {
			ps = ps.then(() => this.outputWorker());
		}
		if (config.initerPath) {
			ps = ps.then(() => this.outputIniter());
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
					let content = `<!DOCTYPE html><html><head><link rel="manifest" href="manifest.json"><meta charset="${manifest.charset}"><title>${config.manifest.name}</title>${metaContent}${iconsContent}${styleContent}${linkContent}${scriptContent}<script src="${this._adaURL}"></script><script>${initer ? "Ada.init(" + initer + ");" : ""}Ada.boot(${JSON.stringify(hookInfo.map)});</script>${workerCode ? workerCode : ''}</head><body></body></html>`;
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

	output() {
		return this.config.hooker.excute("beforeOutput").then(() => {
			return this.outputAda().then(() => {
				return this.outputFiles();
			}).then(() => {
				return this.outputPackFiles();
			}).then(() => {
				return this.outputIndex();
			}).then(() => {
				return this.outputStatic();
			}).then(() => {
				return this.config.hooker.excute("afterOutput");
			});
		});
	}
}

module.exports = Outputer;