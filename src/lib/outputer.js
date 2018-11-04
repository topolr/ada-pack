let hash = require("./../util/md5");
let isbinaryfile = require("isbinaryfile");
let gzipSize = require('gzip-size');
let ora = require('ora');
let AdaBundler = require("./bundler/ada");
let EntryBundler = require("./bundler/entry");

class Pack {
    constructor(sourceMap, files) {
        this._sourceMap = sourceMap;
        this._files = files;
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
            this._packs[key] = new Pack(sourceMap, this._sourceMap._entryDependenceMap[key]);
        });
    }

    get config() {
        return this._config;
    }

    outputFiles() {
    }

    outputPackFiles() {

    }

    outputPWAFile() {
    }

    outputIndex() {
    }

    output() {

    }
}

module.exports = Outputer;