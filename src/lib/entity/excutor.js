let BaseEntity = require("./base");
let {ENTITYNONE, ENTITYREADY, THRIDPARTFOLDER, IGNOREMODULES} = require("./const");
let hash = require("./../../util/md5");
let gzipSize = require('gzip-size');
let util = require("./../../util/helper");
let Path = require("path");

class ExcutorEntity extends BaseEntity {
    constructor(sourceMap, path) {
        super(sourceMap, path);
        this.dependences = new Set();
    }

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
                    this.content.replace(/_adajs.root\)\([\d\D]*?\)/g, str => {
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
                    this.content.replace(/_adajs.view\)\(\{[\d\D]*?\)/g, str => {
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
                    this.content.replace(/require\(.*?\)/g, (str) => {
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
                        }
                    });
                    this.content.replace(/import\(.*?\)/g, (str) => {
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

module.exports = ExcutorEntity;