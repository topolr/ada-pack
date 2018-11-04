let colors = require("colors");
let File = require("./../util/file");
let Path = require("path");
let ignore = require('ignore');
let Outputer = require("./outputer");
let Maker = require("./maker");
let BaseEntity = require("./entity/base");
let ExcutorEntity = require("./entity/excutor");
let StyleEntity = require("./entity/style");

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
        if (entity) {
            entity.dependence.forEach(path => {
                result.add(path);
                SourceMap.getDependencesOf.call(this, path).forEach(k => result.add(k));
            });
        }
        return [...result];
    }

    static mapEntity(path) {
        let entity = this.setEntity(path);
        return entity.getDependenceInfo().then(dependences => {
            return dependences.reduce((a, dependence) => {
                return a.then(() => {
                    return SourceMap.mapEntity.call(this, dependence);
                });
            }, Promise.resolve());
        });
    }

    getMapName(path) {
        let str = "";
        if (path.indexOf("node_modules/") === -1) {
            str = path.substring(this.config.sourcePath.length);
        } else {
            str = "node_modules" + path.substring(this.config.nmodulePath.length);
        }
        return str;
    }

    setEntity(path) {
        if (!this.hasEntity(path)) {
            let entity = null;
            if ([".js", ".ts"].indexOf(Path.extname(path)) !== -1) {
                entity = new ExcutorEntity(this, path);
            } else if ([".css", ".less", ".scss"].indexOf(Path.extname(path)) !== -1) {
                entity = new StyleEntity(this, path);
            } else {
                entity = new BaseEntity(this, path);
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
            let file = new File(current);
            if (file.isExists()) {
                if (file.isFolder()) {
                    let checkPaths = [current + ".js", Path.resolve(current, "./index.js"), Path.resolve(current, "./index.ts"), Path.resolve(current, "./package.json")];
                    let pathIndex = checkPaths.findIndex(path => new File(path).isExists());
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
                    let pathIndex = checkPaths.findIndex(path => new File(path).isExists());
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
        return this.map();
    }

    addFiles(files) {
        return this.map();
    }

    removeFiles(files) {
        return this.map();
    }

    map() {
        return this.maker.installer.readyProjectModules().then(() => {
            let entries = [], entry = new File(this.config.entryPath);
            if (new File(this.config.mainEntryPath).isExists()) {
                entries.push(this.config.mainEntryPath);
            }
            if (entry.isExists()) {
                entries = entries.concat(new File(this.config.entryPath).scan().filter(path => {
                    let suffix = Path.extname(path);
                    return suffix === ".js" || suffix === ".ts";
                }).map(path => path.replace(/\\/g, "/").replace(/[\/]+/g, "/")));
            }
            this._entries = entries;
            return entries.reduce((a, entry) => {
                return a.then(() => {
                    return SourceMap.mapEntity.call(this, entry);
                });
            }, Promise.resolve()).then(() => {
                this.entries.forEach(entry => {
                    this._entryDependenceMap[entry] = SourceMap.getDependencesOf.call(this, entry);
                });
            }).then(() => {
                new File(this.config.sourcePath).scan().forEach(item => {
                    if (!this.hasEntity(item)) {
                        this.setEntity(item);
                    }
                });
                this._outputer.output();
            });
        });
    }
}

module.exports = SourceMap;