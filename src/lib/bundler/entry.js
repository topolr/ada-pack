let maker = require("../maker");
let util = require("./../../util/helper");
let File = require("../../../base/lib/file");
let Path = require("path");
let queue = require("../../../base/lib/queue");

class EntryPacker {
    constructor(config) {
        this.resultmap = ["nothing"];
        this.resultmapcode = {"nothing": "module.exports={}"};
        this.contentCache = {};
        this.config = config;
    }

    getFileCode(path) {
        let config = this.config;
        if (!this.contentCache[path]) {
            return new Promise((resolve, reject) => {
                let file = new File(path), suffix = file.suffix();
                if (suffix === "html") {
                    resolve(`module.exports=${JSON.stringify(file.readSync().replace(/\n/g, '').replace(/\r/g, '').replace(/\n\r/g, ''))}`);
                } else if (suffix === "less") {
                    maker.lessCode(file.readSync()).then(code => {
                        resolve(`module.exports={active:function(){var _a = document.createElement("style");_a.setAttribute("media", "screen");_a.setAttribute("type", "text/css");_a.appendChild(document.createTextNode(${JSON.stringify(code)}));document.head.appendChild(_a);}};`);
                    });
                } else if (suffix === "icon") {
                    maker.minifyIcon(file.readSync()).then(({name, code}) => {
                        let result = `var active=function(){var c=document.getElementById("ada-icon-container");if(!c){var c=document.createElement("div");c.setAttribute("id","ada-icon-container");c.style.cssText="width:0;height:0;";document.body.appendChild(c);}if(!document.getElementById("${name}")){var a=document.createElement("div");a.innerHTML=${JSON.stringify(code)};c.appendChild(a.childNodes[0]);}};module.exports={active:function(){if(/complete|loaded|interactive/.test(window.document.readyState)){active();}else{window.addEventListener("DOMContentLoaded",function(){active();});}},getIconId:function(){return "${name}";}};`;
                        resolve(result);
                    });
                } else {
                    let __code = file.readSync();
                    if (!config.develop) {
                        __code = __code.replace(/\$\$log\(.*\);/g, "");
                    }
                    if (__code.trim().length === 0) {
                        resolve("module.exports={};");
                    } else {
                        if (path.indexOf("node_modules") === -1) {
                            resolve(__code);
                        } else {
                            maker.babelCode(config, __code, path).then(content => {
                                resolve(content);
                            });
                        }
                    }
                }
            }).then((content) => {
                this.contentCache[path] = content;
                return content;
            });
        } else {
            return Promise.resolve(this.contentCache[path]);
        }
    }

    getDependenceInfo(path, code) {
        let config = this.config;
        if (!this.resultmapcode[path]) {
            let paths = [];
            code = code.replace(/require\(.*?\)/g, (one) => {
                if (one.indexOf("${") === -1 && one.indexOf("+") === -1 && one.indexOf(".concat(") === -1) {
                    if (["fs", "path", "request"].indexOf(one) === -1 && path.indexOf("/context/server") === -1) {
                        let a = one.substring(8, one.length - 1).replace(/['|"|`]/g, "").trim();
                        let _path = util.getFilePath(config, Path.resolve(path, "./../"), a);
                        let index = this.resultmap.indexOf(_path);
                        if (index === -1) {
                            paths.push(_path);
                            this.resultmap.push(_path);
                            index = this.resultmap.length - 1;
                        }
                        return `require(${index})`;
                    } else {
                        return "require(0)";
                    }
                } else {
                    return one;
                }
            });
            if (path.indexOf("/context/server") !== -1) {
                this.resultmapcode[path] = "module.exports={}";
            } else {
                this.resultmapcode[path] = code;
            }
            return paths;
        } else {
            return [];
        }
    }

    getCodeMap(path) {
        return this.getFileCode(path).then(code => {
            let tasks = this.getDependenceInfo(path, code).map(path => () => {
                return this.getCodeMap(path);
            });
            return queue(tasks);
        });
    }

    getBundleCode(path) {
        path = path.replace(/\\/g, "/");
        return this.getCodeMap(path).then(() => {
            this.resultmap.push(path);
            let result = this.resultmap.map(path => {
                return `function(module,exports,require){${this.resultmapcode[path]}}`;
            });
            return `(function(p){var a={};var r=function(i){if(a[i]){return a[i].exports;}var m=a[i]={exports:{}};p[i].call(m.exports,m,m.exports,r);return m.exports;};return r(p.length-1);})([${result.join(",")}])`;
        });
    }
}

module.exports = EntryPacker;