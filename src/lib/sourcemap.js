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

    static mapEntity(path, info) {
        let entity = this.setEntity(path, info);
        if (entity instanceof TextEntity) {
            return entity.getDependenceInfo().then(dependences => {
                return dependences.reduce((a, dependence) => {
                    return a.then(() => {
                        return SourceMap.mapEntity.call(this, dependence.path, dependence);
                    });
                }, Promise.resolve());
            });
        } else {
            return Promise.resolve();
        }
    }

    getMapName(path) {
        if (path.path) {
            path = path.path;
        }
        let str = "", config = this.config;
        path = path.replace(/\\/g, "/");
        if (path.indexOf("node_modules/") === -1) {
            str = path.substring(config.sourcePath.length);
        } else {
            str = "node_modules" + path.substring(config.nmodulePath.length);
        }
        return str;
    }

    setEntity(path, info) {
        if (!this.hasEntity(path)) {
            let entity = null;
            try {
                if (!isbinaryfile.sync(path)) {
                    let suffix = Path.extname(path);
                    if ([".js", ".ts"].indexOf(suffix) !== -1) {
                        entity = new ExcutorEntity(this, path, info);
                    } else if ([".css", ".less", ".scss"].indexOf(suffix) !== -1) {
                        entity = new StyleEntity(this, path, info);
                    } else if ([".html"].indexOf(suffix) !== -1) {
                        entity = new HtmlEntity(this, path, info);
                    } else {
                        entity = new TextEntity(this, path, info);
                    }
                } else {
                    entity = new BinaryEntity(this, path, info);
                }
            } catch (e) {
                entity = new TextEntity(this, path, info);
                entity.errorLog = e;
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

    getTargetPath(filePath, path, info) {
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
        let result = "",
            type = "",
            moduleName = "",
            distPath = "",
            required = "";
        if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
            type = "local";
            result = checkPath(Path.resolve(filePath, path)).replace(/\\/g, "/");
            required = result.substring(this.config.sourcePath.length);
        } else {
            let name = path.split("/").shift(), target = this.config.moduleMap[name];
            if (target) {
                type = "module";
                result = checkPath(Path.resolve(this.config.sourcePath, target)).replace(/\\/g, "/");
                let k = result.substring(this.config.sourcePath.length).split("/");
                k[0] = name;
                moduleName = name;
                required = k.join("/");
            } else {
                type = "nodeModule";
                result = checkPath(Path.resolve(this.config.nmodulePath, path)).replace(/\\/g, "/");
                required = name + "/" + result.substring(this.config.sourcePath.length);
                moduleName = "node_modules/" + name;
            }
        }
        if (info.type === "module" && result.indexOf(filePath) === 0) {
            type = "module";
            moduleName = info.name;
            let k = required.split("/");
            k[0] = moduleName;
            required = k.join("/");
            distPath = this.config.distPath + required;
        }
        distPath = Path.resolve(this.config.distPath, required);
        return {path: result, type, required, distPath, name: moduleName};
    }

    editFiles(files) {
        files.forEach(file => {
            let et = this.getEntity(file);
            if (et) {
                et.reset();
            }
        });
        return this.config.hooker.excute("fileEdit", files).then(() => {
            return this.map(files);
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
            return this.map(files);
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

    map(files) {
        return this.maker.installer.readyProjectModules().then(() => {
            return this.config.hooker.excute("beforeMap").then(() => {
                let entries = [], entry = new File(this.config.entryPath);
                let ps = Promise.resolve();
                if (new File(this.config.mainEntryPath).exist) {
                    entries.push(this.config.mainEntryPath);
                }
                if (entry.exist) {
                    ps = ps.then(() => {
                        return new File(this.config.entryPath).getAllSubFilePaths().then(paths => paths.filter(path => {
                            let suffix = Path.extname(path);
                            return suffix === ".js" || suffix === ".ts";
                        }));
                    });
                }
                if (this.config.entryFiles) {
                    ps = ps.then(a => {
                        let result = a || [];
                        return Promise.resolve().then(() => this.config.entryFiles(this.config)).then(names => {
                            if (Array.isArray(names)) {
                                names.forEach(name => {
                                    if (result.indexOf(name) === -1) {
                                        result.push(name);
                                    }
                                });
                            } else {
                                console.log(`[ADA-PACK]`.grey, `config.entryModules() must return an array`.yellow);
                            }
                            return result;
                        });
                    });
                }
                ps = ps.then(a => {
                    if (a) {
                        a.map(path => path.replace(/\\/g, "/").replace(/[\/]+/g, "/")).forEach(path => {
                            if (entries.indexOf(path) === -1) {
                                entries.push(path);
                            }
                        });
                    }
                    this._entries = entries;
                });
                ps = ps.then(() => {
                    return entries.reduce((a, entry) => {
                        return a.then(() => {
                            let info = {
                                path: entry,
                                type: "local",
                                required: entry.substring(this.config.sourcePath.length),
                                distPath: Path.resolve(this.config.distPath, entry.substring(this.config.sourcePath.length))
                            }
                            return SourceMap.mapEntity.call(this, entry, info);
                        });
                    }, Promise.resolve()).then(() => {
                        entries.forEach(entry => {
                            this._entryDependenceMap[entry] = [entry, ...SourceMap.getDependencesOf.call(this, entry)];
                        });
                        this.cleanUnuseSource();
                    }).then(() => {
                        return this.config.hooker.excute("afterMap", {
                            map: this._map,
                            entry: this._entries,
                            entryDependenceMap: this._entryDependenceMap,
                            name: this.config.name
                        }).then(() => {
                            return this._outputer.output(files);
                        });
                    });
                });
                return ps;
            });
        });
    }
}

module.exports = SourceMap;