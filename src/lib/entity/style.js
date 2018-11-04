let BaseEntity = require("./base");
let {ENTITYNONE, ENTITYREADY} = require("./const");
let hash = require("./../../util/md5");
let gzipSize = require('gzip-size');
let util = require("./../../util/helper");
let Path = require("path");
let File = require("./../../util/file");

class StyleEntity extends BaseEntity {
    getDependenceInfo() {
        if (this.state === ENTITYNONE) {
            let config = this.sourceMap.config;
            if (config.ignore.ignores("./" + this.path.substring(config.sourcePath.length))) {
                return Promise.resolve(this.dependence);
            } else {
                return this.sourceMap.maker.make(this.path).then(content => {
                    this.content = content;
                    this.state = ENTITYREADY;
                }).then(() => {
                    this.content = util.replacePaths(this.content, (_path) => {
                        let r = "";
                        let o = Path.resolve(this.path, "./../", _path).replace(/\\/g, "/");
                        if (o.indexOf("node_modules") === -1) {
                            r = Path.resolve(this.path, "./../", _path).substring(this.sourceMap.config.sourcePath.length).replace(/\\/g, "/");
                        } else {
                            r = "node_modules/" + Path.resolve(this.path, "./../", _path).substring(this.sourceMap.config.nmodulePath.length).replace(/\\/g, "/");
                        }
                        if (this.dependence.indexOf(o) === -1) {
                            this.dependence.push(o);
                        }
                        if (this.sourceMap.config.develop) {
                            return this.sourceMap.config.siteURL + r;
                        } else {
                            let hash = new File(o).hash().substring(0, 8);
                            return this.sourceMap.config.siteURL + util.getHashPath(r, hash);
                        }
                    });
                }).then(() => {
                    return this.dependence;
                });
            }
        } else {
            return Promise.resolve(this.dependence);
        }
    }

    getContent() {
        return this.content;
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

module.exports = StyleEntity;