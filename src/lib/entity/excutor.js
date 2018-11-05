let TextEntity = require("./text");
let {ENTITYNONE, ENTITYREADY, THRIDPARTFOLDER, IGNOREMODULES} = require("./const");
let Path = require("path");
let File = require("./../../util/file");

class ExcutorEntity extends TextEntity {
    getDependenceInfo() {
        if (this.state === ENTITYNONE) {
            let config = this.sourceMap.config;
            if (config.ignore.ignores("./" + this.path.substring(config.sourcePath.length))) {
                this.content = new File(this.path).readSync();
                return Promise.resolve(this.dependence);
            } else {
                return new Promise(resolve => {
                    let config = this.sourceMap.config;
                    config.hooker.excute("beforeMake", this).then(() => {
                        this.sourceMap.maker.make(this.path).then(content => {
                            this.errorLog = null;
                            this.output = false;
                            this.content = content;
                            this.state = ENTITYREADY;
                            config.hooker.excute("afterMake", this).then(() => {
                                this.content = this.content.replace(/_adajs.root\)\([\d\D]*?\)/g, str => {
                                    let map = str.substring(13, str.length - 1);
                                    if (map) {
                                        map = map.replace(/['|"][\s\S]+?['|"]/g, str => {
                                            if (str.indexOf("./") !== -1 || str.indexOf("/") !== -1) {
                                                let value = str.substring(1, str.length - 1),
                                                    path = Path.join(this.path, "./../", value).replace(/\\/g, "/");
                                                if (path.indexOf("node_modules") === -1) {
                                                    value = path.substring(this.sourceMap.config.sourcePath.length);
                                                } else {
                                                    value = `${THRIDPARTFOLDER}/${path.substring(this.sourceMap.config.nmodulePath.length)}`;
                                                }
                                                if (this.dependence.indexOf(path) === -1) {
                                                    this.dependence.push(path);
                                                }
                                                return `"${value}"`;
                                            } else {
                                                return str;
                                            }
                                        });
                                    } else {
                                        map = "{root:true}";
                                    }
                                    let __path = this.path.replace(/\\/g, "/"),
                                        module = __path.substring(config.sourcePath.length);
                                    let t = map.replace(/\n/g, "").replace(/\r/g, "").trim();
                                    map = t.substring(0, t.length - 1) + `,module:"${module}"}`;
                                    return `_adajs.root)(${map})`;
                                });
                                this.content = this.content.replace(/_adajs.view\)\(\{[\d\D]*?\)/g, str => {
                                    let map = str.substring(13, str.length - 1);
                                    if (map) {
                                        map = map.replace(/['|"][\s\S]+?['|"]/g, str => {
                                            if (str.indexOf("./") !== -1 || str.indexOf("/") !== -1) {
                                                let value = str.substring(1, str.length - 1),
                                                    path = Path.join(this.path, "./../", value).replace(/\\/g, "/");
                                                if (path.indexOf("node_modules") === -1) {
                                                    value = path.substring(config.sourcePath.length);
                                                } else {
                                                    value = `${THRIDPARTFOLDER}/${path.substring(this.sourceMap.config.nmodulePath.length)}`;
                                                }
                                                if (this.dependence.indexOf(path) === -1) {
                                                    this.dependence.push(path);
                                                }
                                                return `"${value}"`;
                                            } else {
                                                return str;
                                            }
                                        });
                                    }
                                    let __path = this.path.replace(/\\/g, "/"),
                                        module = __path.substring(config.sourcePath.length);
                                    let t = map.replace(/\n/g, "").replace(/\r/g, "").trim();
                                    map = t.substring(0, t.length - 1) + `,module:"${module}"}`;
                                    return `_adajs.view)(${map})`;
                                });
                                this.content = this.content.replace(/require\(.*?\)/g, (str) => {
                                    let a = str.substring(8, str.length - 1).replace(/['|"|`]/g, "").trim();
                                    if (IGNOREMODULES.indexOf(a) === -1) {
                                        let m = this.sourceMap.getTargetPath(Path.resolve(this.path, "./../"), a);
                                        if (this.dependence.indexOf(m) === -1) {
                                            this.dependence.push(m);
                                        }
                                        if (m.indexOf("node_modules") === -1) {
                                            return `require("${m.substring(config.sourcePath.length)}")`;
                                        } else {
                                            let name = `${THRIDPARTFOLDER}/${m.substring(config.nmodulePath.length)}`;
                                            return `require("${name}")`;
                                        }
                                    } else {
                                        return str;
                                    }
                                });
                                this.content = this.content.replace(/import\(.*?\)/g, (str) => {
                                    let a = str.substring(7, str.length - 1);
                                    if (IGNOREMODULES.indexOf(a) === -1) {
                                        if (a.startsWith("\"") || a.startsWith("'") || a.startsWith("`")) {
                                            a = a.replace(/['|"|`]/g, "").trim();
                                            let m = this.sourceMap.getTargetPath(Path.resolve(this.path, "./../"), a);
                                            if (this.dependence.indexOf(m) === -1) {
                                                this.dependence.push(m);
                                            }
                                            if (this.sourceMap.entries.indexOf(m) === -1) {
                                                this.sourceMap.entries.push(m);
                                            }
                                            let name = "", value = "";
                                            if (m.indexOf("node_modules") === -1) {
                                                name = m.substring(config.sourcePath.length);
                                                value = `imports("${name}")`;
                                            } else {
                                                name = `${THRIDPARTFOLDER}/${m.substring(config.nmodulePath.length)}`;
                                                value = `imports("${name}")`;
                                            }
                                            return value;
                                        } else {
                                            return `imports(${a})`;
                                        }
                                    } else {
                                        return str;
                                    }
                                });
                                resolve(this.dependence);
                            });
                        }, e => {
                            this.errorLog = e;
                            this.content = "";
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

module.exports = ExcutorEntity;