let {ENTITYNONE} = require("./const");
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
    }

    isBinaryFile() {
        return isbinaryfile.sync(this.path);
    }

    getDependenceInfo() {
        return Promise.resolve(this.dependence);
    }

    getContent() {
        if (this.isBinaryFile()) {
            return this.sourceMap.maker.make(this.path);
        }
    }

    getHash() {
        return new File(this.path).hash().substring(0, 8);
    }

    getMapName() {
        return util.getMappedPath(this.path);
    }

    edit() {
        this.state = ENTITYNONE;
    }
}

module.exports = BaseEntity;