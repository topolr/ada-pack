let TextEntity = require("./text");
let {ENTITYNONE, ENTITYREADY} = require("./const");
let util = require("./../../util/helper");
let Path = require("path");
let {File} = require("ada-util");

class StyleEntity extends TextEntity {
    getDependenceInfo() {
        if (this.state === ENTITYNONE) {
            let config = this.sourceMap.config;
            if (config.ignore.ignores("./" + this.path.substring(config.sourcePath.length))) {
                return new File(this.path).read().then(content => this.content = content).then(() => this.dependence);
            } else {
                let config = this.sourceMap.config;
                return new Promise(resolve => {
                    config.hooker.excute("beforeMake", this).then(() => {
                        this.sourceMap.maker.make(this.path).then(content => {
                            this.errorLog = null;
                            this.output = false;
                            this.content = content;
                            this.state = ENTITYREADY;
                            config.hooker.excute("afterMake", this).then(() => {
                                this.content = util.replacePaths(this.content, (_path) => {
                                    let r = "";
                                    let o = Path.resolve(this.path, "./../", _path).replace(/\\/g, "/");
                                    if (o.indexOf("{{") === -1) {
                                        if (o.indexOf("node_modules") === -1) {
                                            r = Path.resolve(this.path, "./../", _path).substring(config.sourcePath.length).replace(/\\/g, "/");
                                        } else {
                                            r = "node_modules/" + Path.resolve(this.path, "./../", _path).substring(config.nmodulePath.length).replace(/\\/g, "/");
                                        }
                                        if (this.dependence.indexOf(o) === -1) {
                                            this.dependence.push(o);
                                        }
                                        if (config.develop) {
                                            return config.siteURL + r;
                                        } else {
                                            let hash = new File(o).transform().hash().substring(0, 8);
                                            return config.siteURL + util.getHashPath(r, hash);
                                        }
                                    }
                                });
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
            }
        } else {
            return Promise.resolve(this.dependence);
        }
    }
}

module.exports = StyleEntity;