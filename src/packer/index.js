let Path = require("path");
let { File } = require("ada-util");
let SourceMap = require("./sourcemap");
let Hooker = require("./../hooker");
let defaultHooker = require("../config/hooker");

class Packer {
    constructor(config) {
        this._config = config;
        this._sourceMap = new SourceMap(config);
        this._config.hooker = new Hooker(this._sourceMap);
        this._config.hook.unshift(defaultHooker);
        this._config.hook.forEach(hook => hook(config.hooker));
    }

    get config() {
        return this._config;
    }

    get sourceMap() {
        return this._sourceMap;
    }

    getCurrentState(type, files = []) {
        type = this.sourceMap.outputer.rebuild ? "reload" : type;
        if (type === 'reload') {
            this.sourceMap.outputer.rebuild = false;
        }
        return {
            type,
            map: this.sourceMap.outputer.getSourceMap(),
            log: this.sourceMap.outputer.getLogInfo(),
            name: this.sourceMap.config.name,
            files: this.getChangedModule(files),
            app: this._config.name
        };
    }

    getChangedModule(files) {
        return files.map(file => {
            let key = Reflect.ownKeys(this.sourceMap._map).find(a => this.sourceMap._map[a].path === file);
            if (key) {
                return this.sourceMap._map[key].info.required;
            }
        }).filter(a => a !== undefined);
    }

    getWatchPaths() {
        return [this.config.sourcePath, ...Reflect.ownKeys(this.config.moduleMap).map(key => {
            return Path.resolve(this.config.sourcePath, this.config.moduleMap[key]);
        })];
    }

    pack() {
        let config = this.config, ps = config.hooker.excute("beforePack", config);
        let file = new File(config.distPath);
        if (!config.develop) {
            ps = ps.then(() => {
                if (file.exist) {
                    return file.empty();
                } else {
                    file.make();
                }
            });
        } else {
            file.make();
        }
        return ps.then(() => this.sourceMap.map()).then(() => config.hooker.excute("afterPack"));
    }
}

module.exports = Packer;