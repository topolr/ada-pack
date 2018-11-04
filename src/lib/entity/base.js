let {ENTITYNONE, ENTITYREADY, THRIDPARTFOLDER} = require("./const");
let util = require("./../../util/helper");
let File = require("./../../util/file");
let Path = require("path");
let isbinaryfile = require("isbinaryfile");

class BaseEntity {
    constructor(sourceMap, path) {
        this.sourceMap = sourceMap;
        this.path = path;
        this.content = null;
        this.dependence = [];
        this.state = ENTITYNONE;
        this.errorLog = null;
    }

    isBinaryFile() {
        return isbinaryfile.sync(this.path);
    }

    isMaked() {
        return this.state !== ENTITYNONE;
    }

    getDependenceInfo() {
        this.state = ENTITYREADY;
        return Promise.resolve(this.dependence);
    }

    getContent() {
        if (this.isBinaryFile()) {
            return this.sourceMap.maker.make(this.path).catch(e => this.errorLog = e);
        }
    }

    getHash() {
        return new File(this.path).hash().substring(0, 8);
    }

    getMapName() {
        let str = "";
        if (this.path.indexOf("node_modules/") === -1) {
            str = this.path.substring(this.sourceMap.config.sourcePath.length);
        } else {
            str = "node_modules" + this.path.substring(this.sourceMap.config.nmodulePath.length);
        }
        return util.getMappedPath(str);
    }

    reset() {
        this.state = ENTITYNONE;
        this.errorLog = null;
        this.content = null;
        this.dependence = [];
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