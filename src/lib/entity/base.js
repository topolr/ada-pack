let { ENTITYNONE, ENTITYREADY } = require("./const");
let { SyncFile } = require("ada-util");
let util = require("./../../util/helper");
let path = require("path");

class BaseEntity {
    constructor(sourceMap, path, info, config) {
        this.sourceMap = sourceMap;
        this.path = path;
        this.state = ENTITYREADY;
        this.output = false;
        this.errorLog = null;
        this.info = info;
        this.mapName = this.info.required;
        this.config = config;
    }

    getHash() {
        return new SyncFile(this.path).hash().substring(0, 8);
    }

    getMapName() {
        return util.getMappedPath(this.mapName);
    }

    reset() {
        this.state = ENTITYNONE;
    }

    getDistPath() {
        if (this.config.develop) {
            return this.info.distPath;
        } else {
            let hash = new SyncFile(this.path).hash().substring(0, 8);
            let suffix = path.extname(this.path);
            return path.resolve(this.info.distPath, './../', `./${hash}${suffix}`);
        }
    }
}

module.exports = BaseEntity;