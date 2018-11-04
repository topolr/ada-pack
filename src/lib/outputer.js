let hash = require("./../util/md5");
let isbinaryfile = require("isbinaryfile");
let gzipSize = require('gzip-size');
let ora = require('ora');
let AdaBundler = require("./bundler/ada");
let EntryBundler = require("./bundler/entry");
let File = require("./../util/file");
let Path = require("path");
let util = require("./../util/helper");

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
            if (!entity.isBinaryFile()) {
                this._content[entity.getMapName()] = {
                    hash: entity.getHash(),
                    code: entity.getContent()
                }
            }
        });
        return JSON.stringify(this._content);
    }

    getMapName() {
        return util.getMappedPath("package-" + this._name.replace(/\//g, "-").replace(/\\/g, "-"));
    }

    getHash() {
        return hash.md5(this.getContent()).substring(0, 8);
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
        this._entryBunlder = new EntryBundler(config);
        this._adaBunlder = new AdaBundler(config);
        this._packs = {};
        Reflect.ownKeys(this._sourceMap._entryDependenceMap).forEach(key => {
            this._packs[key] = new Pack(sourceMap, key, this._sourceMap._entryDependenceMap[key]);
        });
    }

    get config() {
        return this._config;
    }

    getSourceMap() {
        let map = {};
        Reflect.ownKeys(this._sourceMap._map).forEach(key => {
            let entity = map[key] = this._sourceMap._map[key];
            let name = entity.getMapName();
            let hash = entity.getHash();
            map[name] = hash;
        });
        Reflect.ownKeys(this._packs).forEach(key => {
            let pack = this._packs[key];
            let name = pack.getMapName(), hash = pack.getHash();
            map[name]=hash;
        });
    }

    getLogInfo() {
    }

    outputAda() {
    }

    outputFiles() {
        return Reflect.ownKeys(this._sourceMap._map).reduce((a, entity) => {
            return a.then(() => {
                if (entity.isBinaryFile()) {
                    return new File(entity.path).copyTo(entity.getDistPath());
                } else {
                    return new File(entity.getDistPath()).write(entity.getContent());
                }
            });
        }, Promise.resolve());
    }

    outputPackFiles() {
        return Reflect.ownKeys(this._packs).reduce((a, pack) => {
            return a.then(() => {
                return new File(Path.resolve(this._sourceMap.config.distPath, `./${pack.getMapName()}.js`)).write(pack.getContent());
            });
        }, Promise.resolve());
    }

    outputPWAFile() {
    }

    outputIndex() {
    }

    output() {

    }
}

module.exports = Outputer;