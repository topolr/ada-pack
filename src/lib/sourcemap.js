let {File, SyncFile} = require("ada-util");
let Path = require("path");
let ignore = require('ignore');
let Outputer = require("./outputer");
let Maker = require("./maker");
let ExcutorEntity = require("./entity/excutor");
let StyleEntity = require("./entity/style");
let HtmlEntity = require("./entity/html");
let BinaryEntity = require("./entity/binary");
let TextEntity = require("./entity/text");
let isbinaryfile = require("isbinaryfile");

class SourceMap {
	constructor(config) {
		config.ignore = ignore().add(config.ignore);
		this._config = config;
		this._map = {};
		this._entries = [];
		this._entryDependenceMap = {};
		this._maker = new Maker(config);
		this._outputer = new Outputer(config, this);
	}

	get config() {
		return this._config;
	}

	get maker() {
		return this._maker;
	}

	get entries() {
		return this._entries;
	}

	get outputer() {
		return this._outputer;
	}

	static getDependencesOf(entry) {
		let entity = this.getEntity(entry), result = new Set();
		if (entity && entity instanceof TextEntity) {
			entity.dependence.forEach(path => {
				result.add(path);
				SourceMap.getDependencesOf.call(this, path).forEach(k => result.add(k));
			});
		}
		return [...result];
	}

	static mapEntity(path) {
		let entity = this.setEntity(path);
		if (entity instanceof TextEntity) {
			return entity.getDependenceInfo().then(dependences => {
				return dependences.reduce((a, dependence) => {
					return a.then(() => {
						return SourceMap.mapEntity.call(this, dependence);
					});
				}, Promise.resolve());
			});
		} else {
			return Promise.resolve();
		}
	}

	getMapName(path) {
		let str = "", config = this.config;
		if (path.indexOf("node_modules/") === -1) {
			str = path.substring(config.sourcePath.length);
		} else {
			str = "node_modules" + path.substring(config.nmodulePath.length);
		}
		return str;
	}

	setEntity(path) {
		if (!this.hasEntity(path)) {
			let entity = null;
			if (!isbinaryfile.sync(path)) {
				let suffix = Path.extname(path);
				if ([".js", ".ts"].indexOf(suffix) !== -1) {
					entity = new ExcutorEntity(this, path);
				} else if ([".css", ".less", ".scss"].indexOf(suffix) !== -1) {
					entity = new StyleEntity(this, path);
				} else if ([".html"].indexOf(suffix) !== -1) {
					entity = new HtmlEntity(this, path);
				} else {
					entity = new TextEntity(this, path);
				}
			} else {
				entity = new BinaryEntity(this, path);
			}
			this._map[this.getMapName(path)] = entity;
			return entity;
		} else {
			return this.getEntity(path);
		}
	}

	getEntity(path) {
		return this._map[this.getMapName(path)];
	}

	hasEntity(path) {
		return !!this._map[this.getMapName(path)];
	}

	getTargetPath(filePath, path) {
		let checkPath = function (current) {
			let file = new SyncFile(current);
			if (file.exist) {
				if (file.isFolder()) {
					let checkPaths = [current + ".js", Path.resolve(current, "./index.js"), Path.resolve(current, "./index.ts"), Path.resolve(current, "./package.json")];
					let pathIndex = checkPaths.findIndex(path => new SyncFile(path).exist);
					if (pathIndex !== -1) {
						if (pathIndex !== 3) {
							return checkPaths[pathIndex];
						} else {
							return Path.resolve(checkPaths[3], "./../", require(checkPaths[3]).main);
						}
					}
				} else {
					return current;
				}
			} else {
				let ext = Path.extname(current);
				if (ext && (ext === ".js" || ext === ".ts")) {
					return current;
				} else {
					let checkPaths = [current + ".js", current + ".ts"];
					let pathIndex = checkPaths.findIndex(path => new SyncFile(path).exist);
					if (pathIndex !== -1) {
						return checkPaths[pathIndex];
					} else {
						return checkPaths[0];
					}
				}
			}
		};
		let result = "";
		if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
			result = checkPath(Path.resolve(filePath, path)).replace(/\\/g, "/");
		} else {
			result = checkPath(Path.resolve(this.config.nmodulePath, path)).replace(/\\/g, "/");
		}
		return result;
	}

	editFiles(files) {
		files.forEach(file => {
			let et = this.getEntity(file);
			if (et) {
				et.reset();
			}
		});
		return this.config.hooker.excute("fileEdit", files).then(() => {
			return this.map();
		});
	}

	addFiles(files) {
		return this.config.hooker.excute("fileAdd", files).then(() => {
			return this.map();
		});
	}

	removeFiles(files) {
		files.forEach(file => {
			delete this._map[this.getMapName(file)];
		});
		return this.config.hooker.excute("fileRemove", files).then(() => {
			return this.map();
		});
	}

	cleanUnuseSource() {
		let all = [...this._entries];
		Reflect.ownKeys(this._entryDependenceMap).forEach(entry => {
			all = all.concat(this._entryDependenceMap[entry]);
		});
		all = all.map(path => this.getMapName(path));
		Reflect.ownKeys(this._map).filter(key => all.indexOf(key) === -1).forEach(key => {
			delete this._map[key];
		});
	}

	map() {
		return this.config.hooker.excute("beforeMap").then(() => {
			return this.maker.installer.readyProjectModules().then(() => {
				let entries = [], entry = new File(this.config.entryPath);
				let ps = Promise.resolve();
				if (new File(this.config.mainEntryPath).exist) {
					entries.push(this.config.mainEntryPath);
				}
				if (entry.exist) {
					ps = ps.then(() => {
						return new File(this.config.entryPath).getAllSubFilePaths().filter(paths => paths.filter(path => {
							let suffix = Path.extname(path);
							return suffix === ".js" || suffix === ".ts";
						}).map(path => path.replace(/\\/g, "/").replace(/[\/]+/g, "/"))).then(a => {
							entries = entries.concat(a);
							this._entries = entries;
						});
					});
				}
				ps = ps.then(() => {
					return entries.reduce((a, entry) => {
						return a.then(() => {
							return SourceMap.mapEntity.call(this, entry);
						});
					}, Promise.resolve()).then(() => {
						this.entries.forEach(entry => {
							this._entryDependenceMap[entry] = [entry, ...SourceMap.getDependencesOf.call(this, entry)];
						});
						this.cleanUnuseSource();
					}).then(() => {
						return this.config.hooker.excute("afterMap", {
							map: this._map,
							entry: this._entries,
							entryDependenceMap: this._entryDependenceMap
						}).then(() => {
							return this._outputer.output();
						});
					});
				});
				return ps;
			});
		});
	}
}

module.exports = SourceMap;