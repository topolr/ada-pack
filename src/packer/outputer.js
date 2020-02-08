let hash = require("ada-util/src/md5");
let gzipSize = require('gzip-size');
let EntryBundler = require("../bundler/entry");
let SingleBundler = require("../bundler/single");
let WorkerBundler = require("../bundler/worker");
let { File } = require("ada-util");
let Path = require("path");
let util = require("../util/helper");
let BinaryEntity = require("./entity/binary");
let ExcutorEntity = require("./entity/excutor");
let serializeError = require('serialize-error');
let Anser = require("anser");

class Pack {
	constructor({ sourceMap, name, files, appName }) {
		this._sourceMap = sourceMap;
		this._files = files;
		this._name = name;
		this._appName = appName;
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
			this._result = `Ada.unpack("${this._appName}",${JSON.stringify(this._content)})`;
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
		this._hookerBundler = new EntryBundler(config, this._sourceMap.maker);
		this._workerBundler = new WorkerBundler(config, this._sourceMap.maker);
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
		let map = { packages: {} };
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
				app: this.config.name,
				name: entity.mapName,
				error: entity.errorLog,
				info: errorInfo
			};
		});
	}

	outputHooker(files) {
		let config = this.config;
		if (!this._hookerBundler.check(files)) {
			return config.hooker.excute("beforeHooker").then(() => {
				return this._hookerBundler.getBundleCode(config.hookerPath).then(() => {
					return config.hooker.excute("afterHooker", this._hookerBundler).then(() => {
						return this._hookerBundler.getContent();
					});
				});
			});
		} else {
			return Promise.resolve(this._hookerBundler.getContent());
		}
	}

	outputSingles() {
		let config = this.config;
		if (config.singleFiles) {
			return this.config.hooker.excute("beforeSingle").then(() => {
				return config.singleFiles(config).reduce((a, { path, dist }) => {
					return a.then(() => {
						return new SingleBundler(config, this._sourceMap.maker).getBundleCode(path).then(code => {
							return new File(dist).write(code);
						});
					});
				}, Promise.resolve());
			}).then(() => {
				return this.config.hooker.excute("afterSingle");
			});
		}
		return Promise.resolve();
	}

	outputWorker(files) {
		let config = this.config;
		if (!this._workerBundler.check(files)) {
			return config.hooker.excute("beforeWorker").then(() => {
				return this._workerBundler.getBundleCode(config.workerPath).then(code => {
					let h = hash.md5(code).substring(0, 8);
					let url = config.siteURL + (config.develop ? "service.worker.js" : `service.worker.${h}.js`);
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
			this._packs[key] = new Pack({
				sourceMap: this.sourceMap,
				name: key,
				files: entryDependenceMap[key],
				appName: this.config.name
			});
		});
		return this.config.hooker.excute("beforeoutputPack", this._packs).then(() => {
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
		});
	}

	outputManifest(files) {
		let config = this.config;
		let bootMap = {
			siteURL: config.siteURL,
			develop: config.develop,
			map: this.getSourceMap(),
			name: config.name,
			root: config.mainEntryPath.substring(config.sourcePath.length)
		};
		let ps = Promise.resolve();
		if (config.workerPath) {
			ps = ps.then(() => this.outputWorker(files));
		}
		if (config.hookerPath) {
			ps = ps.then(() => this.outputHooker(files));
		}
		return ps.then(() => {
			if (config.workerPath) {
				bootMap.worker = {
					url: this._workerURL,
					scope: config.worker.scope
				};
			}
			if (config.hookerPath) {
				bootMap.hooker = this._hookerBundler.getContent();
			}
			return new File(Path.resolve(config.distPath, './manifest.json')).write(JSON.stringify(bootMap, null, 4));
		});
	}

	output(files = []) {
		let outputMap = this.config.output;
		return this.config.hooker.excute("beforeOutput").then(() => {
			let ps = Promise.resolve();
			if (outputMap.files) {
				ps = ps.then(() => this.outputFiles());
			}
			if (outputMap.packFiles) {
				ps = ps.then(() => this.outputPackFiles());
			}
			if (outputMap.staticFiles) {
				ps = ps.then(() => this.outputStatic());
			}
			ps = ps.then(() => this.outputManifest(files));
			ps = ps.then(() => this.outputSingles());
			return ps.then(() => {
				return this.config.hooker.excute("afterOutput");
			}).then(() => {
				this.rebuild = this._hookerBundler.rebuild || this._workerBundler.rebuild;
				if (this._hookerBundler.rebuild) {
					this._hookerBundler.rebuild = false;
				}
				if (this._workerBundler.rebuild) {
					this._workerBundler.rebuild = false;
				}
			});
		});
	}
}

module.exports = Outputer;