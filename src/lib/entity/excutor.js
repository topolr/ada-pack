let TextEntity = require("./text");
let {ENTITYNONE, ENTITYREADY, IGNOREMODULES} = require("./const");
let Path = require("path");
let {File} = require("ada-util");

class ExcutorEntity extends TextEntity {
    constructor(sourceMap, path, info) {
        super(sourceMap, path, info);
        this.assets = [];
    }

    getRootDependence(content) {
        this.content = content.replace(/_adajs.root\)\([\d\D]*?\)/g, str => {
            let map = str.substring(13, str.length - 1);
            if (map) {
                map = map.replace(/[a-z]+\:[\s]+['|"][\s\S]+?['|"]/g, str => {
                    let _a = str.split(":"), key = _a[0].trim(), keyValue = _a[1].trim();
                    if (keyValue.indexOf("./") !== -1 || keyValue.indexOf("/") !== -1) {
                        let value = keyValue.substring(1, keyValue.length - 1);
                        let m = this.sourceMap.getTargetPath(Path.resolve(this.path, "./../"), value, this.info);
                        if (['template', 'style'].indexOf(key) !== -1) {
                            if (!this.dependence.find(a => a.path === m.path)) {
                                this.dependence.push(m);
                            }
                        } else if (key === 'asset') {
                            if (this.assets.indexOf(path) === -1) {
                                this.assets.push(path);
                            }
                        }
                        return `${key}:"${m.required}"`;
                    } else {
                        return str;
                    }
                });
            } else {
                map = "{root:true}";
            }
            let t = map.replace(/\n/g, "").replace(/\r/g, "").trim();
            map = t.substring(0, t.length - 1) + `,module:"${this.info.required}"}`;
            return `_adajs.root)(${map})`;
        });
    }

    getViewDependence(content) {
        this.content = content.replace(/_adajs.view\)\(\{[\d\D]*?\)/g, str => {
            let map = str.substring(13, str.length - 1);
            if (map) {
                map = map.replace(/[a-z]+\:[\s]+['|"][\s\S]+?['|"]/g, str => {
                    let _a = str.split(":"), key = _a[0].trim(), keyValue = _a[1].trim();
                    if (keyValue.indexOf("./") !== -1 || keyValue.indexOf("/") !== -1) {
                        let value = keyValue.substring(1, keyValue.length - 1);
                        let m = this.sourceMap.getTargetPath(Path.resolve(this.path, "./../"), value, this.info);
                        if (['template', 'style'].indexOf(key) !== -1) {
                            if (!this.dependence.find(a => a.path === m.path)) {
                                this.dependence.push(m);
                            }
                        } else if (key === 'asset') {
                            if (this.assets.indexOf(path) === -1) {
                                this.assets.push(path);
                            }
                        }
                        return `${key}:"${m.required}"`;
                    } else {
                        return str;
                    }
                });
            }
            let t = map.replace(/\n/g, "").replace(/\r/g, "").trim();
            map = t.substring(0, t.length - 1) + `,module:"${this.info.required}"}`;
            return `_adajs.view)(${map})`;
        });
    }

    getRequireDenpendence(content) {
        this.content = content.replace(/require\(.*?\)/g, (str) => {
            let a = str.substring(8, str.length - 1).replace(/['|"|`]/g, "").trim();
            if (IGNOREMODULES.indexOf(a) === -1) {
                let m = this.sourceMap.getTargetPath(Path.resolve(this.path, "./../"), a, this.info);
                if (!this.dependence.find(a => a.path === m.path)) {
                    this.dependence.push(m);
                }
                return `require("${m.required}")`;
            } else {
                if (a !== "adajs") {
                    console.log("[ada-pack] unsupport nodejs built-in modules [" + a + "]");
                }
                return str;
            }
        });
    }

    getImportDenpendence(content) {
        this.content = content.replace(/import\(.*?\)/g, (str) => {
            let a = str.substring(7, str.length - 1);
            if (IGNOREMODULES.indexOf(a) === -1) {
                if (a.startsWith("\"") || a.startsWith("'") || a.startsWith("`")) {
                    a = a.replace(/['|"|`]/g, "").trim();
                    let m = this.sourceMap.getTargetPath(Path.resolve(this.path, "./../"), a, this.info);
                    if (!this.dependence.find(a => a.path === m.path)) {
                        this.dependence.push(m);
                    }
                    if (this.sourceMap.entries.indexOf(m.path) === -1) {
                        this.sourceMap.entries.push(m.path);
                    }
                    return `imports("${m.required}")`;
                } else {
                    return `imports(${a})`;
                }
            } else {
                return str;
            }
        });
    }

    getDependenceInfo() {
        if (this.state === ENTITYNONE) {
            let config = this.sourceMap.config;
            if (config.ignore.ignores("./" + this.path.substring(config.sourcePath.length))) {
                return new File(this.path).read().then(content => this.content = content).then(() => this.dependence);
            } else {
                return new Promise(resolve => {
                    let config = this.sourceMap.config;
                    config.hooker.excute("beforeMake", this).then(() => {
                        this.sourceMap.maker.make(this.path, this.info).then(content => {
                            this.errorLog = null;
                            this.output = false;
                            this.content = content;
                            this.state = ENTITYREADY;
                            config.hooker.excute("afterMake", this).then(() => {
                                this.getRootDependence(this.content);
                                this.getViewDependence(this.content);
                                this.getRequireDenpendence(this.content);
                                this.getImportDenpendence(this.content);
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

    getAssetPaths() {
        return this.assets;
    }
}

module.exports = ExcutorEntity;