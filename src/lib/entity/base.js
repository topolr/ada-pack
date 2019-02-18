let {ENTITYNONE, ENTITYREADY} = require("./const");
let {SyncFile} = require("ada-util");
let util = require("./../../util/helper");

class BaseEntity {
    constructor(sourceMap, path, info) {
        this.sourceMap = sourceMap;
        this.path = path;
        this.state = ENTITYREADY;
        this.output = false;
        this.errorLog = null;
        this.info = info;
        this.mapName = this.info.required;
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
        return this.info.distPath;
    }
}

module.exports = BaseEntity;