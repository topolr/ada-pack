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
let ignore = require('ignore');
let ora = require('ora');

const THRIDPARTFOLDER = "node_modules";
const IGNOREMODULES = ["fs", "path", "util", "http", "url", "zlib", "https", "events", "crypto", "adajs"];
const MANIFESTKEYS = ["theme_color", "start_url", "short_name", "scope", "related_applications", "prefer_related_applications", "orientation", "name", "lang", "icons", "display", "dir", "description", "background_color"];

class AdaBundler {
    constructor() {
        this.resultmap = [];
        this.resultmapcode = {};
        this.contentCache = {};
    }

    getFileCode(path) {
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
                    if (__code.trim().length === 0) {
                        resolve("module.exports={};");
                    } else {
                        if (path.indexOf("node_modules") === -1) {
                            resolve(__code);
                        } else {
                            maker.babelCode(config, __code).then(content => {
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
        if (!this.resultmapcode[path]) {
            let paths = [];
            code = code.replace(/require\(.*?\)/g, (one) => {
                if (one.indexOf("${") === -1 && one.indexOf("+") === -1 && one.indexOf(".concat(") === -1) {
                    let a = one.substring(8, one.length - 1).replace(/['|"|`]/g, "").trim();
                    let _path = base.getFilePath(config, Path.resolve(path, "./../"), a);
                    let index = this.resultmap.indexOf(_path);
                    if (index === -1) {
                        paths.push(_path);
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

    bundle(path, output, develop) {
        path = path.replace(/\\/g, "/");
        console.log("");
        if (!config.ada_autobundle) {
            console.log(` [ada_autobundle:false] ALWAYS BUNDLE ADA CORE`.grey);
        }
        let spinner = ora({
            color: "yellow",
            text: `NOW BUNDLING ADA CORE [${develop ? "DEVELOP" : "PUBLIC"} MODE]`
        }).start();
        return new File(`${config.projectPath}/node_modules/adajs/index.d.ts`).copyTo(`${config.projectPath}/node_modules/@types/adajs/index.d.ts`).then(() => {
            return this.getCodeMap(path).then(() => {
                let veison = require(Path.resolve(path, "./../package.json")).version;
                this.resultmap.push(path);
                let result = this.resultmap.map(path => {
                    return `function(module,exports,require){${this.resultmapcode[path]}}`;
                });
                let commet = `/*! adajs[${develop ? "Develop" : "Publish"}] ${veison} https://github.com/topolr/ada | https://github.com/topolr/ada/blob/master/LICENSE */\n`;
                let code = `${commet}(function (map,moduleName) {var Installed={};var requireModule = function (index) {if (Installed[index]) {return Installed[index].exports;}var module = Installed[index] = {exports: {}};map[index].call(module.exports, module, module.exports, requireModule);return module.exports;};var mod=requireModule(map.length-1);window&&window.Ada.installModule(moduleName,mod);})([${result.join(",")}],"adajs");`;
                config.adaHash = hash.md5(code).substring(0, 10);
                code = code.replace(/\/ada\/sse/, `${config.server.protocol}://${config.server.host}${(config.server.port != 80 ? ":" + config.server.port : '')}/ada/sse`);
                return new File(output).write(code).then(() => {
                    spinner.stop();
                    process.stderr.clearLine();
                    process.stderr.cursorTo(0);
                    console.log(` BUNDLE ADA CORE DONE [${develop ? "DEVELOP" : "PUBLIC"} MODE GZIP:${util.getFileSizeAuto(gzipSize.sync(code))}]`.yellow);
                });
            });
        });
    }
}

let base = {
    logs: {},
    packageLogs: {},
    cache: {},
    doneMap: [],
    getUnIgnorePath(paths) {
        return paths.filter(path => {
            return !config.ignore.ignores("./" + path.substring(config.source_path.length));
        });
    },
    isBundleAda(develop) {
        let result = true;
        if (config.ada_autobundle) {
            let veison = require(Path.resolve(config.nmodule_path, "./adajs/package.json")).version;
            if (develop) {
                let adaFile = new File(Path.resolve(config.dist_path, "./ada.js"));
                if (adaFile.isExists()) {
                    let content = adaFile.readSync();
                    let r = content.match(/\*! adajs.*?\*/g);
                    if (r) {
                        let current_version = r[0].split(" ")[2];
                        if (current_version && current_version.trim() === veison) {
                            result = false;
                        }
                    }
                }
            } else {
                let k = new File(Path.resolve(config.dist_path)).subscan().filter(path => {
                    let a = /ada\-[0-9a-z]+\.js/.test(path.replace(/\\/g, "/").split("/").pop());
                    if (a) {
                        let content = new File(path).readSync();
                        let r = content.match(/\*! adajs.*?\*/g);
                        if (r) {
                            let current_version = r[0].split("")[2];
                            return current_version && current_version.trim() === veison;
                        }
                    }
                });
                if (k.length > 0) {
                    result = false;
                }
            }
        }
        return result;
    },
    getAllFiles() {
        return new File(config.source_path + "/").scan();
    },
    getAllSource() {
        let files = [];
        new File(config.source_path + "/").scan().forEach(path => {
            let suffix = new File(path).suffix();
            if (suffix === "js" || suffix === "ts") {
                files.push(path);
            }
        });
        return files;
    },
    getFilePath(config, filePath, path) {
        let __path = "", _path = "";
        if (path.substring(0, path.length - 3) === ".js") {
            path = path.substring(0, path.length - 3);
        }
        if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
            __path = _path = Path.resolve(filePath, path).replace(/\\/g, "/");
            let _file = new File(_path);
            if (!_file.isExists() || _file.isFolder()) {
                _path = __path + ".ts";
            }
            _file = new File(_path);
            if (!_file.isExists() || _file.isFolder()) {
                _path = __path + ".js";
            }
        } else {
            __path = _path = Path.resolve(config.nmodule_path, path);
            _path = __path + ".ts";
            let file = new File(_path);
            if (!file.isExists()) {
                _path = __path + ".js";
            }
            file = new File(_path);
            if (!file.isExists()) {
                _path = __path;
            }
            file = new File(_path);
            if (file.isExists()) {
                if (!file.isFile()) {
                    let _packagePath = Path.resolve(_path, "./package.json");
                    let _packageFile = new File(_packagePath);
                    if (_packageFile.isExists()) {
                        _path = Path.resolve(_packagePath, "./../", JSON.parse(_packageFile.readSync()).main);
                    } else {
                        let __path = Path.resolve(_path, "./index.ts");
                        if (!new File(__path).isExists()) {
                            __path = Path.resolve(_path, "./index.js");
                        }
                        _path = __path;
                    }
                }
            } else {
                _path = __path + ".ts";
                file = new File(_path);
                if (!file.isExists()) {
                    _path = __path + ".js";
                }
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
                this.logs[_path] = {
                    name: e.name,
                    message: e.message,
                    stack: e.stack
                };
                if (_file.suffix() === "js" || _file.suffix() === "ts") {
                    return {path: _path, content: `console.error(${JSON.stringify(e.message)})`, result: e}
                } else {
                    return {path: _path, content: `${JSON.stringify(e.message)}`, result: e}
                }
            });
        }
    },
    getRequireInfo(config, filePath, path) {
        let _path = this.getFilePath(config, filePath, path);
        if (!config.ignore.ignores("./" + _path.substring(config.source_path.length))) {
            return this.getFileContent(config, filePath, path).then(info => {
                let currentPath = info.path;
                let at = {}, tasks = [], parseTasks = [], infoTasks = [], importsTasks = [];
                let entry = {};
                let result = {};
                let name = "";
                this.doneMap.push(currentPath);
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
                    let __path = info.path.replace(/\\/g, "/");
                    if (__path.indexOf("node_modules") === -1) {
                        mapj.module = __path.substring(config.source_path.length);
                    } else {
                        mapj.module = `${THRIDPARTFOLDER}/${__path.substring(config.nmodule_path.length)}`;
                    }
                    let result = Reflect.ownKeys(mapj).map(key => {
                        return `${key}:"${mapj[key]}"`;
                    });
                    return `_adajs.view)({${result.join(",")}})`;
                });
                info.content = info.content.replace(/require\(.*?\)/g, (str) => {
                    let a = str.substring(8, str.length - 1).replace(/['|"|`]/g, "").trim();
                    if (IGNOREMODULES.indexOf(a) === -1) {
                        let m = this.getFilePath(config, Path.resolve(info.path, "./../"), a);
                        if (this.doneMap.indexOf(m) === -1 && m !== currentPath) {
                            infoTasks.push({
                                filePath: Path.resolve(info.path, "./../"),
                                path: a
                            });
                        }
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
                info.content = info.content.replace(/import\(.*?\)/g, (str) => {
                    let a = str.substring(7, str.length - 1);
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
                            if (this.doneMap.indexOf(m) === -1 && m !== currentPath) {
                                importsTasks.push({
                                    filePath: Path.resolve(info.path, "./../"),
                                    path: a,
                                    name
                                });
                            }
                            return value;
                        } else {
                            return `imports(${a})`;
                        }
                    } else {
                        return `imports(${a})`;
                    }
                });
                if (info.path.indexOf("node_modules") !== -1) {
                    name = `${THRIDPARTFOLDER}/${info.path.substring(config.nmodule_path.length)}`;
                    let __path = Path.resolve(config.dist_path, `./${name}`);
                    if (this.doneMap.indexOf(__path) === -1) {
                        tasks.push({
                            path: __path,
                            content: info.content
                        });
                    }
                } else {
                    name = info.path.substring(config.source_path.length);
                    let __path = Path.resolve(config.dist_path, info.path.substring(config.source_path.length))
                    if (this.doneMap.indexOf(__path) === -1) {
                        tasks.push({
                            path: __path,
                            content: info.content
                        });
                    }
                }
                at[name] = info.content;
                return Promise.all(parseTasks.map(({path, current, content, value}) => {
                    this.doneMap.push(path);
                    return this.getFileContent(config, current, "./").then(({content}) => {
                        at[value] = content;
                        return new File(path).write(content);
                    });
                }).concat(tasks.map(({path, content}) => {
                    this.doneMap.push(path);
                    return new File(path).write(content);
                })).concat(infoTasks.map(({filePath, path}) => {
                    return this.getRequireInfo(config, filePath, path).then(b => {
                        if (b) {
                            let name = b.__name__;
                            Object.keys(b[name]).forEach(key => {
                                at[key] = b[name][key];
                            });
                            Object.keys(b).forEach(key => {
                                if (key !== name) {
                                    result[key] = b[key];
                                }
                            });
                        }
                    });
                })).concat(importsTasks.map(({filePath, path, name}) => {
                    return this.getRequireInfo(config, filePath, path).then(b => {
                        if (b) {
                            let name = b.__name__;
                            result[name] = b[name];
                            Object.keys(b).forEach(key => {
                                if (key !== name) {
                                    result[key] = b[key];
                                }
                            });
                        }
                    });
                }))).then(() => {
                    util.setProp(result, "__name__", name);
                    result[name] = at;
                    return result;
                });
            }).catch(e => console.log(e));
        } else {
            return this.getFileContent(config, filePath, path).then(info => {
                let name = "";
                if (info.path.indexOf("node_modules") !== -1) {
                    name = `${THRIDPARTFOLDER}/${info.path.substring(config.nmodule_path.length)}`;
                } else {
                    name = info.path.substring(config.source_path.length);
                }
                let result = {[name]: {[name]: info.content}};
                util.setProp(result, "__name__", name);
                new File(info.path).copyTo(Path.resolve(config.dist_path, "./" + info.path.substring(config.source_path.length)));
                return result;
            });
        }
    },
    bundleAda(develop = false) {
        if (this.isBundleAda(develop)) {
            return new AdaBundler().bundle(Path.resolve(config.nmodule_path, `./adajs/${develop ? "develop" : (config.super_ada ? "super" : "index")}.js`),
                Path.resolve(config.dist_path, "./ada.js"), develop).then(a => {
                return a;
            });
        } else {
            return Promise.resolve();
        }
    },
    getEntriesInfo(paths) {
        paths = this.getUnIgnorePath(paths);
        let info = {};
        let main = Path.resolve(config.base_path, config.main);
        return queue(paths.map(path => {
                return "./" + path.substring(config.source_path.length);
            }).map(entry => () => {
                return this.getRequireInfo(config, config.source_path, entry).then(_info => {
                    if (_info) {
                        Object.keys(_info).forEach(key => {
                            info[key] = _info[key];
                        });
                    }
                });
            })
        ).then(() => {
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
    getAppSourceInfo() {
        let main = Path.resolve(config.base_path, config.main);
        let info = {};
        let entries = [];
        if (config.entry_path) {
            entries = new File(Path.resolve(config.base_path, config.entry_path) + "/").scan().filter(path => {
                let suffix = new File(path).suffix();
                return suffix === "js" || suffix === "ts";
            }).map(path => path.replace(/\\/g, "/").replace(/[\/]+/g, "/"));
        }
        return this.getEntriesInfo([main, ...entries]);
    },
    outputPWAFile(config) {
        let manifest = {};
        config = util.extend(true, {}, config);
        Reflect.ownKeys(config).filter(key => MANIFESTKEYS.indexOf(key) !== -1).forEach(key => {
            manifest[key] = config[key];
        });

        let worker = config.worker;
        let registCode = worker.beforeregist.toString().trim();
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
        let content = `<!DOCTYPE html><html><head><link rel="manifest" href="manifest.json"><meta charset="${page.charset}"><title>${config.name}</title>${metaContent}${iconsContent}${styleContent}${scriptContent}<script src="${config._adaPath}"></script><script>${config.regist_service ? workerRegistCode : ""}</script><script>Ada.boot(${JSON.stringify(config.ada)});</script></head><body></body></html>`;
        return Promise.all(config.icons.map(icon => {
            return new File(Path.resolve(config.source_path, icon.src)).copyTo(Path.resolve(config.dist_path, icon.src));
        })).then(() => {
            if (manifest.icons) {
                manifest.icons.forEach(icon => {
                    icon.src = config.site_url + icon.src;
                });
            }
            Promise.all([
                new File(Path.resolve(config.index_path, "./manifest.json")).write(JSON.stringify(manifest)),
                maker.minifyCode(config, codes.join("")).then(content => {
                    return new File(Path.resolve(config.index_path, "./serviceworker.js")).write(`'use strict';${content}`);
                }),
                new File(Path.resolve(config.index_path, "./index.html")).write(content)
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
                error[key] = this.logs[key].message;
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
        let spinner = ora({
            color: "yellow",
            text: "Built Project"
        }).start();
        this.logs = {};
        this.doneMap.length = [];
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
            otherEnteries = otherEnteries.filter(file => {
                let inp = [];
                Reflect.ownKeys(file.code).forEach(key => {
                    map[key] = file.code[key].hash;
                    inp.push(file.code[key].hash);
                });
                if (inp.length > 1) {
                    packages[file.key] = inp.join("|");
                    return true;
                }
            });

            let ps = Promise.resolve();
            if (config.entry_auto) {
                ps = ps.then(() => {
                    let allFiles = this.getAllSource(), _prentries = [];
                    allFiles.forEach(path => {
                        let a = util.getMappedPath(path.substring(config.source_path.length).replace(/\\/g, "/"));
                        if (!map[a]) {
                            _prentries.push(path);
                        }
                    });
                    return this.getEntriesInfo(_prentries).then(({otherEnteries: _otherEnteries}) => {
                        _otherEnteries.forEach(file => {
                            let r = {};
                            Reflect.ownKeys(file.code).forEach(key => {
                                if (!mainEntry.code[key]) {
                                    r[key] = file.code[key];
                                }
                            });
                            file.code = r;
                        });
                        let _realOtherEnteries = [];
                        _otherEnteries.forEach(file => {
                            let inp = [];
                            Reflect.ownKeys(file.code).forEach(key => {
                                map[key] = file.code[key].hash;
                                inp.push(file.code[key].hash);
                            });
                            if (inp.length > 1) {
                                packages[file.key] = inp.join("|");
                                _realOtherEnteries.push(file);
                            }
                        });
                        otherEnteries.push(..._realOtherEnteries);
                    });
                });
            }
            ps = ps.then(() => {
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
                tasks.push(() => {
                    return queue(this.getAllFiles().map(path => path.substring(config.source_path.length).replace(/\\/g, "/")).filter(path => {
                        return map[util.getMappedPath(path)] === undefined;
                    }).map(path => () => {
                        return new File(Path.resolve(config.source_path, path)).copyTo(Path.resolve(config.dist_path, path));
                    }));
                });
                return queue(tasks).then(() => {
                    spinner.stop();
                    this.logResult();
                    return map;
                });
            });
            return ps;
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
    util.extend(true, config, option);
    config.base_path = config.base_path.replace(/\\/g, "/");
    config.dist_path = Path.join(config.base_path, config.dist_path).replace(/\\/g, "/");
    config.source_path = Path.join(config.base_path, config.source_path).replace(/\\/g, "/");
    config.nmodule_path = Path.resolve(config.projectPath, "./node_modules/").replace(/\\/g, "/") + "/";
    config.index_path = Path.resolve(config.base_path, config.index_path, "./../").replace(/\\/g, "/");
    config.ignore = ignore().add(config.ignore);
    new File(config.dist_path).mkdir();
    if (config.site_url[config.site_url.length - 1] !== "/") {
        config.site_url = config.site_url + "/";
    }
    return maker.installAllDependence(config.source_path, config).then(() => {
        return base.bundleAda(config.develop).then(() => {
            return action;
        });
    });
};