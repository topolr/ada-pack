let {ENTITYNONE, ENTITYREADY, THRIDPARTFOLDER} = require("./const");
let File = require("./../../util/file");
let Path = require("path");
let util = require("./../../util/helper");

class BaseEntity {
    constructor(sourceMap, path) {
        this.sourceMap = sourceMap;
        this.path = path;
        this.state = ENTITYREADY;
        this.errorLog = null;
        let str = "";
        if (this.path.indexOf("node_modules/") === -1) {
            str = this.path.substring(this.sourceMap.config.sourcePath.length);
        } else {
            str = "node_modules" + this.path.substring(this.sourceMap.config.nmodulePath.length);
        }
        this.mapName = str;
    }

    isMaked() {
        return this.state !== ENTITYNONE;
    }

    getHash() {
        return new File(this.path).hash().substring(0, 8);
    }

    getMapName() {
        return util.getMappedPath(this.mapName);
    }

    reset() {
        this.state = ENTITYNONE;
        this.errorLog = null;
    }

    getDistPath() {
        let r = "";
        if (this.path.indexOf("node_modules/") === -1) {
            r = this.sourceMap.config.distPath + this.path.substring(this.sourceMap.config.sourcePath.length);
        } else {
            r = this.sourceMap.config.distPath + `${THRIDPARTFOLDER}/` + this.path.substring(this.sourceMap.config.nmodulePath.length);
        }
        if (!this.sourceMap.config.develop) {
            let suffix = Path.extname(r);
            r = Path.resolve(r, "./../", `${this.getHash()}${suffix}`);
        }
        return r;
    }
}

module.exports = BaseEntity;