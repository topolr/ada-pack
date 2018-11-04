let {ENTITYNONE, ENTITYREADY, THRIDPARTFOLDER} = require("./const");
let hash = require("./../../util/md5");
let BaseEntity = require("./base");
let gzipSize = require('gzip-size');
let util = require("./../../util/helper");

class TextEntity extends BaseEntity {
    constructor(sourceMap, path) {
        super(sourceMap, path);
        this.content = null;
        this.dependence = [];
        this.state = ENTITYNONE;
    }

    getDependenceInfo() {
        return this.sourceMap.maker.make(this.path).then(content => {
            this.state = ENTITYREADY;
            this.content = content;
            return this.dependence;
        });
    }

    getContent() {
        return this.content;
    }

    getHash() {
        return hash.md5(this.content).substring(0, 8);
    }

    reset() {
        this.state = ENTITYNONE;
        this.errorLog = null;
        this.content = null;
        this.dependence = [];
    }

    getGzipSize() {
        return gzipSize(this.getContent());
    }

    getFileSize() {
        return util.getFileSizeAuto(this.getContent());
    }
}

module.exports = TextEntity;