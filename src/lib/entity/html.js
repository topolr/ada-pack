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
                        this.sourceMap.maker.make(this.path, this.info).then(content => {
                            this.errorLog = null;
                            this.output = false;
                            this.content = content;
                            this.state = ENTITYREADY;
                            config.hooker.excute("afterMake", this).then(() => {
                                this.content = util.replacePaths(this.content, (_path) => {
                                    let m = this.sourceMap.getTargetPath(Path.resolve(this.path, "./../"), "./" + _path, this.info);
                                    if (m.path.indexOf("{{") === -1) {
                                        if (!this.dependence.find(a => a.path === this.info.path)) {
                                            this.dependence.push(m);
                                        }
                                        if (config.develop) {
                                            return config.siteURL + m.required;
                                        } else {
                                            let hash = new File(m.path).transform().hash().substring(0, 8);
                                            return config.siteURL + util.getHashPath(m.required, hash);
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