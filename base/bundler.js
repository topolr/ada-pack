let colors = require("colors");
let util = require("./util");
let File = require("./lib/file");
let Path = require("path");
let maker = require("./maker/maker");
let hash = require("./lib/md5");
let queue = require("./lib/queue");
let isbinaryfile = require("isbinaryfile");
let config = require("./config");
let gzipSize = require('gzip-size');
let less = require("less");
let minify = require('html-minifier').minify;

const THRIDPARTFOLDER = "node_modules";
const IGNOREMODULES = ["fs", "path", "util", "http", "events", "crypto", "adajs"];
const MANIFESTKEYS = ["theme_color", "start_url", "short_name", "scope", "related_applications", "prefer_related_applications", "orientation", "name", "lang", "icons", "display", "dir", "description", "background_color"];

class AdaBundler {
    constructor() {
        this.resultmap = [];
        this.resultmapcode = {};
    }

    getFileCode(path) {
        return new Promise((resolve, reject) => {
            let file = new File(path), suffix = file.suffix();
            if (suffix === "html") {
                resolve(`module.exports=${JSON.stringify(file.readSync().replace(/\n/g, '').replace(/\r/g, '').replace(/\n\r/g, ''))}`);
            } else if (suffix === "less") {
                less.render(file.readSync(), function (e, output) {
                    if (!e) {
                        let code = minify(output.css, {
                            removeComments: true,
                            collapseWhitespace: true,
                            minifyJS: true,
                            minifyCSS: true
                        });
                        resolve(`var _a = document.createElement("style");_a.setAttribute("media", "screen");_a.setAttribute("type", "text/css");_a.appendChild(document.createTextNode(${JSON.stringify(code)}));document.head.appendChild(_a);module.exports=_a;`);
                    } else {
                        console.log(e)
                    }
                });
            } else if (suffix === "icon") {
                let content = file.readSync();
                content = minify(content, {
                    removeComments: true,
                    collapseWhitespace: true,
                    minifyJS: true,
                    minifyCSS: true
                });
                let titleTag = content.match(/<title>[\s\S]*?>/);
                let name = "";
                if (titleTag) {
                    name = titleTag[0].substring(7, titleTag[0].length - 8).trim();
                }
                let et = content.replace(/svg/g, "symbol").replace(/xmlns\=".*?"/, "").replace(/version\=".*?"/, "").replace(/viewBox\=".*?"/, (str) => {
                    return `${str} id="${name}"`;
                });
                let code = `<svg style="width:0;height:0;overflow:hidden;" version="1.1" xmlns="http://www.w3.org/2000/svg">${et}</svg>`;
                let result = `window.addEventListener("load",function(){var c=document.getElementById("ada-icon-container");if(!c){var c=document.createElement("div");c.setAttribute("id","ada-icon-container");c.style.cssText="width:0;height:0;";document.body.appendChild(c);}if(!document.getElementById("${name}")){var a=document.createElement("div");a.innerHTML=${JSON.stringify(code)};c.appendChild(a.childNodes[0]);}});module.exports="${name}"`;
                resolve(result);
            } else {
                resolve(util.babelCode(config, file.readSync()));
            }
        });
    }

    getDependenceInfo(path, code) {
        let paths = [];
        if (this.resultmap.indexOf(path) === -1) {
            this.resultmap.push(path);
        }
        code = code.replace(/require\(.*?\)/g, (one) => {
            if (one.indexOf("${") === -1 && one.indexOf("+") === -1) {
                let a = one.substring(8, one.length - 1).replace(/['|"|`]/g, "").trim();
                let _path = Path.resolve(path, "./../", a).replace(/\\/g, "/");
                if (_path.split(".").length === 1) {
                    _path = _path + ".js";
                }
                paths.push(_path);
                let index = this.resultmap.indexOf(_path);
                if (index === -1) {
                    this.resultmap.push(_path);
                    index = this.resultmap.length - 1;
                }
                return `require(${index})`;
            } else {
                return one;
            }
        });
        this.resultmapcode[path] = code;
        return paths;
    }

    getCodeMap(path) {
        return this.getFileCode(path).then(code => {
            let tasks = this.getDependenceInfo(path, code).map(path => () => {
                return this.getCodeMap(path);
            });
            return queue(tasks);
        });
    }

    bundle(path, output, develop) {
        return this.getCodeMap(path).then(() => {
            let veison = require(Path.resolve(path, "./../package.json")).version;
            let result = this.resultmap.map(path => {
                return this.resultmapcode[path];
            }).map(code => {
                return `function(module,exports,require){${code}}`;
            });
            let commet = `/*! adajs ${veison} https://github.com/topolr/ada | https://github.com/topolr/ada/blob/master/LICENSE */\n`;
            let code = `${commet}(function (map,moduleName) {var Installed={};var requireModule = function (index) {if (Installed[index]) {return Installed[index].exports;}var module = Installed[index] = {exports: {}};map[index].call(module.exports, module, module.exports, requireModule);return module.exports;};var mod=requireModule(0);window&&window.Ada.installModule(moduleName,mod);})([${result.join(",")}],"adajs");`;
            config.adaHash = hash.md5(code).substring(0, 10);
            return new File(output).write(code);
        });
    }
}

let base = {
    logs: {},
    packageLogs: {},
    cache: {},
    getFilePath(config, filePath, path) {
        let _path = "";
        if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
            _path = Path.resolve(filePath, path).replace(/\\/g, "/");
            let _file = new File(_path);
            if (!_file.isExists() || _file.isFolder()) {
                _path = _path + ".js";
            }
        } else {
            _path = Path.resolve(config.nmodule_path, path);
            let file = new File(_path);
            if (file.isExists()) {
                if (!file.isFile()) {
                    let _packagePath = Path.resolve(_path, "./package.json");
                    let _packageFile = new File(_packagePath);
                    if (_packageFile.isExists()) {
                        _path = Path.resolve(_packagePath, "./../", JSON.parse(_packageFile.readSync()).main);
                    } else {
                        _path = Path.resolve(_packagePath, "./index.js");
                    }
                }
            } else {
                _path = _path + ".js";
            }
        }
        return _path.replace(/\\/g, "/");
    },
    getFileContent(config, filePath, path) {
        let _path = this.getFilePath(config, filePath, path);
        let _file = new File(_path);
        let hash = _file.hash();
        if (this.cache[_path] && this.cache[_path].hash === hash) {
            return Promise.resolve(Object.assign({}, this.cache[_path]));
        } else {
            return maker.parse(_file.suffix(), _path, _file.readSync(), config).then(content => {
                this.logs[_path] = "done";
                this.cache[_path] = {hash, content, path: _path, result: "done"};
                return {path: _path, content, result: "done"};
            }).catch(e => {
                this.logs[_path] = e;
                return {path: _path, content: "", result: e}
            });
        }
    },
    getRequireInfo(config, filePath, path) {
        return this.getFileContent(config, filePath, path).then(info => {
            let at = {}, tasks = [], parseTasks = [], infoTasks = [], importsTasks = [];
            let entry = {};
            let result = {};
            let name = "";
            info.content = info.content.replace(/_adajs.view\)\(\{[\d\D]*?\)/g, str => {
                let map = str.substring(13, str.length - 1);
                let mapj = new Function(`return ${map};`)();
                ["template", "style"].forEach(key => {
                    let value = mapj[key];
                    if (value) {
                        let path = Path.join(info.path, "./../", value).replace(/\\/g, "/");
                        if (path.indexOf("node_modules") === -1) {
                            value = path.substring(config.source_path.length);
                            parseTasks.push({
                                path: Path.resolve(config.dist_path, path.substring(config.source_path.length)),
                                current: path,
                                value
                            });
                        } else {
                            value = `${THRIDPARTFOLDER}/${path.substring(config.nmodule_path.length)}`;
                            parseTasks.push({
                                path: Path.resolve(config.dist_path, `./${THRIDPARTFOLDER}/${path.substring(config.nmodule_path.length)}`),
                                current: path,
                                value
                            });
                        }
                        mapj[key] = value;
                    }
                });
                let result = Reflect.ownKeys(mapj).map(key => {
                    return `${key}:"${mapj[key]}"`;
                });
                return `_adajs.view)({${result.join(",")}})`;
            });
            info.content = info.content.replace(/require\(.*?\)/g, (str) => {
                let a = str.substring(8, str.length - 1).replace(/['|"|`]/g, "").trim();
                if (IGNOREMODULES.indexOf(a) === -1) {
                    let m = this.getFilePath(config, Path.resolve(info.path, "./../"), a);
                    infoTasks.push({
                        filePath: Path.resolve(info.path, "./../"),
                        path: a
                    });
                    if (m.indexOf("node_modules") === -1) {
                        return `require("${m.substring(config.source_path.length)}")`;
                    } else {
                        let name = `${THRIDPARTFOLDER}/${m.substring(config.nmodule_path.length)}`;
                        return `require("${name}")`;
                    }
                } else {
                    return str;
                }
            });
            info.content = info.content.replace(/imports\(.*?\)/g, (str) => {
                let a = str.substring(8, str.length - 1);
                if (a.startsWith("\"") || a.startsWith("'") || a.startsWith("`")) {
                    a = a.replace(/['|"|`]/g, "").trim();
                    if (IGNOREMODULES.indexOf(a) === -1) {
                        let m = this.getFilePath(config, Path.resolve(info.path, "./../"), a);
                        let name = "", value = "";
                        if (m.indexOf("node_modules") === -1) {
                            name = m.substring(config.source_path.length);
                            value = `imports("${name}")`;
                        } else {
                            let name = `${THRIDPARTFOLDER}/${m.substring(config.nmodule_path.length)}`;
                            value = `imports("${name}")`;
                        }
                        importsTasks.push({
                            filePath: Path.resolve(info.path, "./../"),
                            path: a,
                            name
                        });
                        return value;
                    } else {
                        return str;
                    }
                } else {
                    return str;
                }
            });
            if (info.path.indexOf("node_modules") !== -1) {
                name = `${THRIDPARTFOLDER}/${info.path.substring(config.nmodule_path.length)}`;
                tasks.push({
                    path: Path.resolve(config.dist_path, `./${name}`),
                    content: info.content
                });
            } else {
                name = info.path.substring(config.source_path.length);
                tasks.push({
                    path: Path.resolve(config.dist_path, info.path.substring(config.source_path.length)),
                    content: info.content
                });
            }
            at[name] = info.content;
            return Promise.all(parseTasks.map(({path, current, content, value}) => {
                return this.getFileContent(config, current, "./").then(({content}) => {
                    at[value] = content;
                    return new File(path).write(content);
                });
            }).concat(tasks.map(({path, content}) => {
                return new File(path).write(content);
            })).concat(infoTasks.map(({filePath, path}) => {
                return this.getRequireInfo(config, filePath, path).then(b => {
                    let name = b.__name__;
                    Object.keys(b[name]).forEach(key => {
                        at[key] = b[name][key];
                    });
                    Object.keys(b).forEach(key => {
                        if (key !== name) {
                            result[key] = b[key];
                        }
                    });
                });
            })).concat(importsTasks.map(({filePath, path, name}) => {
                return this.getRequireInfo(config, filePath, path).then(b => {
                    let name = b.__name__;
                    result[name] = b[name];
                    Object.keys(b).forEach(key => {
                        if (key !== name) {
                            result[key] = b[key];
                        }
                    });
                });
            }))).then(() => {
                util.setProp(result, "__name__", name);
                result[name] = at;
                return result;
            });
        }).catch(e => console.log(e));
    },
    bundleAda(develop = false) {
        return new AdaBundler().bundle(Path.resolve(config.nmodule_path, `./adajs/${develop ? "develop" : "index"}.js`), Path.resolve(config.dist_path, "./ada.js"), develop);
    },
    getAppSourceInfo() {
        let main = Path.resolve(config.base_path, config.main);
        let info = {};
        let entries = [];
        if (config.entry_path) {
            entries = util.getAllSourcePaths(Path.resolve(config.base_path, config.entry_path) + "/");
        }
        return queue([main, ...entries].map(path => {
            return "./" + path.substring(config.source_path.length);
        }).map(entry => () => {
            return this.getRequireInfo(config, config.source_path, entry).then(_info => {
                Object.keys(_info).forEach(key => {
                    info[key] = _info[key];
                });
            });
        })).then(() => {
            let mainEntry = null, otherEnteries = [];
            let _mainEntry = main.substring(config.source_path.length);
            Object.keys(info).forEach(key => {
                let result = {};
                Reflect.ownKeys(info[key]).forEach(path => {
                    result[util.getMappedPath(path)] = {
                        hash: hash.md5(info[key][path]).substring(0, 8),
                        code: info[key][path]
                    }
                });
                let _result = {
                    code: result,
                    key: util.getMappedPath("package-" + key.replace(/\//g, "-").replace(/\\/g, "-")),
                    name: key
                };
                if (key === _mainEntry) {
                    mainEntry = _result;
                } else {
                    otherEnteries.push(_result);
                }
            });
            return {mainEntry, otherEnteries};
        });
    },
    outputPWAFile(config) {
        let manifest = {};
        Reflect.ownKeys(config).filter(key => MANIFESTKEYS.indexOf(key) !== -1).forEach(key => {
            manifest[key] = config[key];
        });

        let worker = config.worker;
        let registCode = worker.regist.toString().trim();
        let start = registCode.indexOf("{") + 1;
        let a = registCode.substring(start, registCode.length - 1);
        let c = a.substring(a.indexOf("."));
        let workerRegistCode = `if ('serviceWorker' in navigator) {navigator.serviceWorker.register('/serviceworker.js', { scope: '${worker.scope}' })${c}}`;

        let codes = Reflect.ownKeys(worker).filter(key => ["scope", "beforeregist"].indexOf(key) === -1).map(key => {
            let code = worker[key].toString();
            return `self.addEventListener('${key.substring(2)}', function${code.substring(code.indexOf("("))});`;
        });

        let page = config.page;
        page.meta.theme_color = config.theme_color;
        page.meta.description = config.description;
        page.meta.keywords = config.keywords;
        let metaContent = Reflect.ownKeys(page.meta).map(key => {
            return `<meta name="${key.replace(/_/g, "-")}" content="${page.meta[key]}">`;
        }).join("");
        let iconsContent = config.icons.map(info => {
            return `<link rel="apple-touch-icon-precomposed" sizes="${info.sizes}" href="${config.site_url + info.src}">`;
        }).join("");
        if (config.icons.length > 0) {
            iconsContent += `<link rel="shortcut icon" href="${config.site_url + config.icons[0].src}">`;
        }
        let styleContent = page.style.map(path => {
            return `<link rel="stylesheet" href="${path}">`;
        }).join("");
        let scriptContent = page.script.map(path => {
            return `<script src="${path}"></script>`;
        }).join("");
        let content = `<!DOCTYPE html><html><head><link rel="manifest" href="${config.site_url}manifest.json"><meta charset="${page.charset}"><title>${config.name}</title>${metaContent}${iconsContent}${styleContent}${scriptContent}<script src="${config._adaPath}"></script><script>${config.regist_service ? workerRegistCode : ""}</script><script>Ada.boot(${JSON.stringify(config.ada)});</script></head><body></body></html>`;
        return Promise.all(config.icons.map(icon => {
            return new File(Path.resolve(config.source_path, icon.src)).copyTo(Path.resolve(config.dist_path, icon.src));
        })).then(() => {
            Promise.all([
                new File(Path.resolve(config.dist_path, "./manifest.json")).write(JSON.stringify(manifest)),
                new File(Path.resolve(config.dist_path, "./serviceworker.js")).write(`'use strict';${util.minifyCode(config, codes.join(""))}`),
                new File(Path.resolve(config.dist_path, "./index.html")).write(content)
            ]);
        });
    },
    hashFiles(map) {
        util.getAllSourcePaths(config.dist_path).forEach(path => {
            let suffix = new File(path).suffix();
            let a = path.substring(config.dist_path.length).replace(/\\/g, "/");
            let b = "";
            if (!isbinaryfile.sync(path)) {
                b = map[util.getMappedPath(a)];
                if (!b) {
                    b = map[a.split(".").shift()];
                }
            }
            if (b) {
                new File(path).renameSync(Path.resolve(config.dist_path, util.getHashPath(a, b)));
            }
        });
        new File(Path.resolve(config.dist_path, "./ada.js")).renameSync(Path.resolve(config.dist_path, `./ada-${config.adaHash}.js`));
    },
    logResult() {
        let success = [], error = {};
        let maxLine = 10, _localLength = 0, _moduleLength = 0;
        Reflect.ownKeys(this.logs).forEach(key => {
            if (key.indexOf("node_modules") === -1) {
                _localLength += 1;
            } else {
                _moduleLength += 1;
            }
            if (this.logs[key] === "done") {
                success.push(key);
            } else {
                error[key] = this.logs[key];
            }
        });
        console.log("");
        console.log(` ${util.formatDate()} LOCAL[`, `${_localLength}`.yellow, `] NODE-MODULES[`, `${_moduleLength}`.yellow, `]`);
        let hasSuccess = false, hasError = false;
        if (success.length > 0) {
            hasSuccess = true;
            console.log(` COMPILED`.green, util.padEnd(" ", 37 + `${_localLength}`.length + `${_moduleLength}`.length, "-").grey);
            success.splice(0, maxLine).forEach((path, index) => {
                if (path.indexOf("node_modules") === -1) {
                    console.log(`  [${index + 1}]`.grey, `${path.substring(config.source_path.length)}`.cyan, `[local]`.grey);
                } else {
                    console.log(`  [${index + 1}]`.grey, `${path.substring(config.nmodule_path.length)}`.cyan, `[node_module]`.grey);
                }
            });
            if (success.length > maxLine) {
                console.log(` +[${success.length + maxLine}]...`.grey);
            }
        }
        let et = Reflect.ownKeys(error);
        if (et.length > 0) {
            hasError = true;
            console.log(` ERRORS`.red, util.padEnd(" ", 39 + `${_localLength}`.length + `${_moduleLength}`.length, "-").red);
            et.forEach((path, index) => {
                if (path.indexOf("node_modules") === -1) {
                    console.log(`  [${index + 1}] ${path.substring(config.source_path.length)}`.grey);
                } else {
                    console.log(`  [${index + 1}] ${path.substring(config.nmodule_path.length)}`.grey);
                }
                console.log(`   ${error[path]}`.red);
            });
        }
        if (!hasSuccess && !hasError) {
            console.log(` - [NOTHING TO DISPLAY] -`.grey);
        }
        let _length = 0, __length = 0;
        Reflect.ownKeys(this.packageLogs).forEach(key => {
            if (key.length > _length) {
                _length = key.length;
            }
            let info = this.packageLogs[key];
            let _a = key.length + info.hash.length + info.size.length + info.key.length + info.gsize.length;
            if (_a > __length) {
                __length = _a;
            }
        });
        __length = __length + 16;
        console.log(` PACKAGES`.green, util.padEnd(" ", __length - 10, "-").grey);
        Reflect.ownKeys(this.packageLogs).forEach((key, index) => {
            let info = this.packageLogs[key];
            if (index === 0) {
                console.log(` [${info.key}]`.grey, `${util.padEnd(key, _length, " ")}`.green, `[${info.size} GZIP:${info.gsize}]`.yellow, `[${info.hash}]`.grey);
            } else {
                console.log(` [${info.key}]`.grey, `${util.padEnd(key, _length, " ")}`.cyan, `[${info.size} GZIP:${info.gsize}]`.yellow, `[${info.hash}]`.grey);
            }
        });
    },
    bundle() {
        this.logs = {};
        return this.getAppSourceInfo().then(({mainEntry, otherEnteries}) => {
            otherEnteries.forEach(file => {
                let r = {};
                Reflect.ownKeys(file.code).forEach(key => {
                    if (!mainEntry.code[key]) {
                        r[key] = file.code[key];
                    }
                });
                file.code = r;
            });
            otherEnteries.unshift(mainEntry);
            let map = {}, packages = {};
            otherEnteries.forEach(file => {
                let inp = [];
                Reflect.ownKeys(file.code).forEach(key => {
                    map[key] = file.code[key].hash;
                    inp.push(file.code[key].hash);
                });
                packages[file.key] = inp.join("|");
            });
            map.packages = packages;
            let tasks = otherEnteries.map(file => () => {
                let p = file.key;
                let c = `Ada.unpack(${JSON.stringify(file.code)})`;
                file.hash = hash.md5(map.packages[p].split("|").sort().join("|")).substring(0, 8);
                map[p] = file.hash;
                return new File(Path.resolve(config.dist_path, p) + ".js").write(c).then(() => {
                    this.packageLogs[file.name] = {
                        size: new File(Path.resolve(config.dist_path, p) + ".js").getFileSizeAuto(),
                        key: p,
                        hash: file.hash,
                        gsize: util.getFileSizeAuto(gzipSize.sync(c))
                    };
                });
            });
            tasks.push(() => {
                if (config.develop) {
                    config._adaPath = config.site_url + "ada.js";
                } else {
                    config._adaPath = `${config.site_url}ada-${config.adaHash}.js`;
                }
                config.ada = {
                    basePath: config.site_url,
                    root: Path.resolve(config.base_path, config.main).replace(/\\/g, "/").substring(config.source_path.length),
                    map: map,
                    develop: config.develop
                };
                if (!config.develop) {
                    this.hashFiles(map);
                }
                return Promise.resolve();
            });
            tasks.push(() => {
                return this.outputPWAFile(config);
            });
            return queue(tasks).then(() => {
                this.logResult();
                return map;
            });
        }).then(map => {
            if (config.complete) {
                config.complete();
                config.complete = null;
            }
            return {map, log: this.logs};
        }).catch(e => console.log(e));
    }
};

let action = {
    addFiles(files) {
        return base.bundle();
    },
    editFiles(files) {
        return base.bundle();
    },
    removeFiles(files) {
        return base.bundle();
    },
    publish() {
        return base.bundle();
    }
};

module.exports = function (option) {
    Object.assign(config, option);
    config.base_path = config.base_path.replace(/\\/g, "/");
    config.dist_path = Path.join(config.base_path, config.dist_path).replace(/\\/g, "/");
    config.source_path = Path.join(config.base_path, config.source_path).replace(/\\/g, "/");
    config.nmodule_path = Path.resolve(config.projectPath, "./node_modules/").replace(/\\/g, "/") + "/";
    if (config.site_url[config.site_url.length - 1] !== "/") {
        config.site_url = config.site_url + "/";
    }
    return base.bundleAda(config.develop).then(() => {
        return action;
    });
};