let {ENTITYNONE, ENTITYREADY} = require("./const");
let hash = require("ada-util/src/md5");
let BaseEntity = require("./base");
let gzipSize = require('gzip-size');
let util = require("./../../util/helper");

class TextEntity extends BaseEntity {
    constructor(sourceMap, path, info) {
        super(sourceMap, path, info);
        this.content = null;
        this.dependence = [];
        this.state = ENTITYNONE;
    }

    getDependenceInfo() {
        if (this.state === ENTITYNONE) {
            let config = this.sourceMap.config;
            return new Promise(resolve => {
                config.hooker.excute("beforeMake", this).then(() => {
                    this.sourceMap.maker.make(this.path,this.info).then(content => {
                        this.state = ENTITYREADY;
                        this.content = content;
                        this.errorLog = null;
                        this.output = false;
                        config.hooker.excute("afterMake", this).then(() => {
                            resolve(this.dependence);
                        });
                    }, e => {
                        this.errorLog = e;
                        this.content = "";
                        this.state = ENTITYNONE;
                        config.hooker.excute("errorMake", this).then(() => {
                            resolve(this.dependence);
                        });
                    });
                });
            });
        } else {
            return Promise.resolve(this.dependence);
        }
    }

    getContent() {
        return this.content;
    }

    getHash() {
        return hash.md5(this.content).substring(0, 8);
    }

    reset() {
        this.state = ENTITYNONE;
        this.content = null;
        this.output = false;
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