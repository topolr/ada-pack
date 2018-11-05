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
	}

	getContent() {
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
		return `Ada.unpack(${JSON.stringify(this._content)})`;
	}

	getMapName() {
		return util.getMappedPath("package-" + this._name.substring(this._sourceMap.config.sourcePath.length).replace(/\//g, "-").replace(/\\/g, "-"));
	}

	getHash() {
		return hash.md5(this.getContent()).substring(0, 8);
	}

	getDependencHash() {
		return Reflect.ownKeys(this._content).map(key => this._content[key].hash);
	}

	getGzipSize() {
		return gzipSize(this.getContent());
	}

	getFileSize() {
		return util.getFileSizeAuto(this.getContent());
	}
}

class Outputer {
	constructor(config, sourceMap) {
		this._config = config;
		this._sourceMap = sourceMap;
		this._entryBunlder = new EntryBundler(config, this._sourceMap.maker);
		this._adaBunlder = new AdaBundler(config, this._sourceMap.maker);
		this._packs = {};
		this._adaURL = "";
		this._workerURL = "";
		this._adaDone = false;
		this._initerCode = "";
		this._workerDone = false;
	}

	get config() {
		return this._config;
	}

	getSourceMap() {
		let map = {packages: {}};
		Reflect.ownKeys(this._sourceMap._map).forEach(key => {
			let entity = this._sourceMap._map[key];
			let name = entity.getMapName();
			let hash = entity.getHash();
			map[name] = hash;
		});
		Reflect.ownKeys(this._packs).forEach(key => {
			let pack = this._packs[key];
			let name = pack.getMapName(), hash = pack.getHash();
			map[name] = hash;
			map.packages[name] = pack.getDependencHash().join("|")
		});
		return map;
	}

	getLogInfo() {
		return Reflect.ownKeys(this._sourceMap._map).filter(key => !!this._sourceMap._map[key].errorLog).map(key => {
			let entity = this._sourceMap._map[key];
			return {
				name: entity.mapName,
				error: entity.errorLog
			};
		});
	}

	outputAda() {
		if (!this._adaDone) {
			return this.config.hooker.excute("beforeAda").then(() => {
				if (this._sourceMap.config.develop) {
					return this._adaBunlder.getBundleCode(Path.resolve(this._sourceMap.config.nmodulePath, "./adajs/develop.js")).then(code => {
						let info = {
							code,
							url: this._sourceMap.config.siteURL + "ada.js",
							path: Path.resolve(this._sourceMap.config.distPath, "./ada.js")
						};
						return this.config.hooker.excute("afterAda", info).then(() => {
							this._adaURL = info.url;
							this._adaDone = true;
							return new File(info.path).write(info.code);
						});
					});
				} else {
					return this._adaBunlder.getBundleCode(Path.resolve(this._sourceMap.config.nmodulePath, "./adajs/index.js")).then(code => {
						let h = hash.md5(code).substring(0, 8);
						let info = {
							code,
							hash: h,
							url: this._sourceMap.config.siteURL + `ada.${h}.js`,
							path: Path.resolve(this._sourceMap.config.distPath, `./ada.${h}.js`)
						};
						return this.config.hooker.excute("afterAda", info).then(() => {
							this._adaURL = info.url;
							this._adaDone = true;
							return new File(info.path).write(info.code);
						});
					});
				}
			});
		} else {
			return Promise.resolve();
		}
	}

	outputIniter() {
		if (!this._initerCode) {
			return this.config.hooker.excute("beforeIniter").then(() => {
				return this._entryBunlder.getBundleCode(this._sourceMap.config.initerPath).then(code => {
					let info = {code};
					return this.config.hooker.excute("afterIniter", info).then(() => {
						this._initerCode = info.code;
						return info.code;
					});
				});
			});
		} else {
			return Promise.resolve();
		}
	}

	outputWorker() {
		let config = this._sourceMap.config;
		if (!this._workerDone && config.worker.path) {
			return config.hooker.excute("beforeWorker").then(() => {
				return this._entryBunlder.getBundleCode(config.workerPath).then(code => {
					let h = hash.md5(code).substring(0, 8);
					let info = {
						code,
						hash: h,
						url: config.siteURL + config.develop ? "service.worker.js" : `service.worker.${h}.js`,
						path: Path.resolve(config.distPath, config.develop ? "./service.worker.js" : `./service.worker.${h}.js`)
					};
					return config.hooker.excute("afterWorker", info).then(() => {
						this._workerDone = true;
						this._workerURL = info.url;
					}).then(() => {
						return new File(info.path).write(info.code);
					});
				});
			});
		} else {
			return Promise.resolve();
		}
	}

	outputStatic() {
		let config = this._sourceMap.config, file = new File(config.staticPath);
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
		return Reflect.ownKeys(this._sourceMap._map).filter(key => this._sourceMap._map[key].output !== true).reduce((a, key) => {
			return a.then(() => {
				let entity = this._sourceMap._map[key];
				return this.config.hooker.excute("outputFile", entity).then(() => {
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
		Reflect.ownKeys(this._sourceMap._entryDependenceMap).forEach(key => {
			this._packs[key] = new Pack(this._sourceMap, key, this._sourceMap._entryDependenceMap[key]);
		});
		return Reflect.ownKeys(this._packs).reduce((a, key) => {
			return a.then(() => {
				let pack = this._packs[key];
				return this.config.hooker.excute("outputPack", pack).then(() => {
					return new File(Path.resolve(this._sourceMap.config.distPath, `./${pack.getMapName()}.js`)).write(pack.getContent());
				});
			});
		}, Promise.resolve());
	}

	outputIndex() {
		let config = this._sourceMap.config;
		let manifest = config.manifest, page = config.page;
		let metaContent = page.meta.map(item => {
			let props = Reflect.ownKeys(item).map(key => `${key}="${item[key]}"`).join(" ");
			return `<meta ${props}>`;
		}).join("");
		let iconsContent = config.icons.map(info => {
			return `<link rel="apple-touch-icon-precomposed" sizes="${info.sizes}" href="${config.siteURL + info.src}">`;
		}).join("");
		if (config.icons.length > 0) {
			iconsContent += `<link rel="shortcut icon" href="${config.siteURL + config.icons[0].src}">`;
		}
		let linkContent = page.link.map(path => {
			let props = Reflect.ownKeys(path).map(key => `${key}="${path[key]}"`).join(" ");
			return `<link ${props}>`;
		}).join("");
		let styleContent = page.style.map(path => {
			if (util.isObject(path)) {
				path.rel = "stylesheet";
				let props = Reflect.ownKeys(path).map(key => `${key}="${path[key]}"`).join(" ");
				return `<link ${props}>`;
			} else {
				return `<link rel="stylesheet" href="${path}">`;
			}
		}).join("");
		let scriptContent = page.script.map(path => {
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
		let hookInfo = {
			map: bootMap,
			manifest
		};
		return this.config.hooker.excute("outputIndex", hookInfo).then(() => {
			return Promise.all(config.icons.map(icon => {
				return new File(Path.resolve(config.sourcePath, icon.src)).copyTo(Path.resolve(config.distPath, icon.src));
			})).then(() => {
				if (config.worker.path) {
					return this.outputWorker();
				}
			}).then(() => {
				if (config.initerPath) {
					return this.outputIniter();
				}
			}).then((initer) => {
				let workerCode = "";
				if (config.worker && config.worker.path) {
					workerCode = `<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('${this._workerURL}', { scope: '${config.worker.scope}' }).then(function(reg) {console.log('Registration succeeded. Scope is ' + reg.scope);}).catch(function(error) {console.log('Registration failed with ' + error);});}</script>`
				}
				let content = `<!DOCTYPE html><html><head><link rel="manifest" href="manifest.json"><meta charset="${page.charset}"><title>${config.manifest.name}</title>${metaContent}${iconsContent}${styleContent}${linkContent}${scriptContent}<script src="${this._adaURL}"></script><script>${initer ? "Ada.init(" + initer + ");" : ""}Ada.boot(${JSON.stringify(hookInfo.map)});</script>${workerCode ? workerCode : ''}</head><body></body></html>`;
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