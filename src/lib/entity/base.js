let {ENTITYNONE, THRIDPARTFOLDER} = require("./const");
let util = require("./../../util/helper");
let File = require("./../../util/file");
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

    getDependenceInfo() {
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
        return util.getMappedPath(this.path);
    }

    reset() {
        this.state = ENTITYNONE;
        this.errorLog = null;
    }

    getDistPath() {
        if (this.path.indexOf("node_modules/") === -1) {
            return this.sourceMap.config.distPath + this.path.substring(this.sourceMap.config.sourcePath.length);
        } else {
            return this.sourceMap.config.distPath + `${THRIDPARTFOLDER}/` + this.path.substring(this.sourceMap.config.nmodulePath.length);
        }
    }
}

module.exports = BaseEntity;