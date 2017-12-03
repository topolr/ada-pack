let colors = require("colors");
let util = require("./util");
let File = require("./lib/file");
let Path = require("path");
let maker = require("./../maker/maker");
let hash = require("./lib/md5");
let queue = require("./lib/queue");
let config = require("./config");
let THRIDPARTFOLDER = "node_modules";
const IGNOREMODULES = ["fs", "path", "util", "http", "events", "crypto", "adajs"];
const MANIFESTKEYS = ["theme_color", "start_url", "short_name", "scope", "related_applications", "prefer_related_applications", "orientation", "name", "lang", "icons", "display", "dir", "description", "background_color"];

class AdaBundler {
    constructor() {
        this.resultmap = [];
        this.resultmapcode = {};
    }

    getDependenceInfo(path, code) {
        let paths = [];
        if (this.resultmap.indexOf(path) === -1) {
            this.resultmap.push(path);
        }
        code = code.replace(/require\(.*?\)/g, (one) => {
            if (one.indexOf("${") === -1 && one.indexOf("+") === -1) {
                let a = one.substring(8, one.length - 1).replace(/['|"|`]/g, "").trim();
                let _path = Path.resolve(path, "./../", a).replace(/\\/g, "/") + ".js";
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
        try {
            code = util.minifyCode(config, code);
        } catch (e) {
        }
        this.resultmapcode[path] = code;
        return paths;
    }

    getCodeMap(path) {
        this.getDependenceInfo(path, util.babelCode(config, new File(path).readSync())).forEach(path => {
            this.getCodeMap(path);
        });
    }

    bundle(path, output, develop) {
        this.getCodeMap(path);
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
    }
}

let base = {
    logs: {},
    getFilePath(config, filePath, path) {
        let _path = "";
        if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
            _path = Path.resolve(filePath, path).replace(/\\/g, "/");
            if (!new File(_path).isExists()) {
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
        return _path;
    },
    getFileContent(config, filePath, path) {
        let _path = this.getFilePath(config, filePath, path);
        let _file = new File(_path);
        return maker.parse(_file.suffix(), _path, _file.readSync(), config).then(content => {
            this.logs[_path] = "done";
            return {path: _path, content};
        }).catch(e => {
            this.logs[_path] = e.message;
        });
    },
    getRequireInfo(config, filePath, path) {
        return this.getFileContent(config, filePath, path).then(info => {
            let at = {}, tasks = [], parseTasks = [], infoTasks = [];
            info.content = info.content.replace(/_adajs.view\)\(\{[\d\D]*?\)/g, str => {
                let map = str.substring(13, str.length - 1);
                let mapj = new Function(`return ${map};`)();
                ["template", "style"].forEach(key => {
                    let value = mapj[key];
                    if (value) {
                        let path = Path.join(info.path, "./../", value).replace(/\\/g, "/");
                        let content = new File(path).readSync();
                        if (path.indexOf("node_modules") === -1) {
                            value = path.substring(config.source_path.length);
                            parseTasks.push({
                                path: Path.resolve(config.dist_path, path.substring(config.source_path.length)),
                                current: path,
                                content: new File(path).readSync(),
                                value
                            });
                        } else {
                            value = `${THRIDPARTFOLDER}/${path.substring(config.nmodule_path.length)}`;
                            parseTasks.push({
                                path: Path.resolve(config.dist_path, `./${THRIDPARTFOLDER}/${path.substring(config.nmodule_path.length)}`),
                                current: path,
                                content: new File(path).readSync(),
                                value
                            });
                        }
                        mapj[key] = value;
                        at[value] = content;
                    }
                });
                let result = Reflect.ownKeys(mapj).map(key => {
                    return `${key}:"${mapj[key]}"`;
                });
                return `_adajs.view)({${result.join(",")}})`;
            }).replace(/require\(.*?\)/g, (str) => {
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
            if (info.path.indexOf("node_modules") !== -1) {
                let name = `${THRIDPARTFOLDER}/${info.path.substring(config.nmodule_path.length)}`;
                tasks.push({
                    path: Path.resolve(config.dist_path, `./${name}`),
                    content: info.content
                });
                at[name] = info.content;
            } else {
                tasks.push({
                    path: Path.resolve(config.dist_path, info.path.substring(config.source_path.length)),
                    content: info.content
                });
                at[info.path.substring(config.source_path.length)] = info.content;
            }
            return Promise.all(parseTasks.map(({path, current, content, value}) => {
                let _file = new File(current);
                return maker.parse(_file.suffix(), current, content, config).then(content => {
                    at[value] = content;
                    return new File(path).write(content);
                });
            }).concat(tasks.map(({path, content}) => {
                return new File(path).write(content);
            })).concat(infoTasks.map(({filePath, path}) => {
                return this.getRequireInfo(config, filePath, path).then(b => {
                    Reflect.ownKeys(b).forEach(key => {
                        at[key] = b[key];
                    });
                });
            }))).then(() => at);
        }).catch(e => console.log(e));
    },
    bundleAda(develop = false) {
        new AdaBundler().bundle(Path.resolve(config.projectPath, `./node_modules/adajs/${develop ? "develop" : "index"}.js`), Path.resolve(config.dist_path, "./ada.js"), develop);
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
    bundle() {
        let info = {};
        return queue(config.entry.map(entry => () => {
            return this.getRequireInfo(config, config.source_path, entry).then(_info => {
                let keyname = Path.resolve(config.base_path, entry).substring(config.base_path.length + 1);
                info[keyname] = _info;
            });
        })).then(() => {
            let files = Reflect.ownKeys(info).map(key => {
                let result = {};
                Reflect.ownKeys(info[key]).forEach(path => {
                    result[util.getMappedPath(path)] = {
                        hash: hash.md5(info[key][path]).substring(0, 8),
                        code: info[key][path]
                    }
                });
                return {
                    code: result,
                    key: util.getMappedPath("package-" + key.replace(/\//g, "-").replace(/\\/g, "-"))
                };
            });
            let basefile = files.shift();
            files.forEach(file => {
                let r = {};
                Reflect.ownKeys(file.code).forEach(key => {
                    if (!basefile.code[key]) {
                        r[key] = file.code[key];
                    }
                });
                file.code = r;
            });
            files.unshift(basefile);
            let map = {}, packages = {};
            files.forEach(file => {
                let inp = [];
                Reflect.ownKeys(file.code).forEach(key => {
                    map[key] = file.code[key].hash;
                    inp.push(file.code[key].hash);
                });
                packages[file.key] = inp.join("|");
            });
            map.packages = packages;
            let tasks = files.map(file => () => {
                let p = file.key;
                let c = `Ada.unpack(${JSON.stringify(file.code)})`;
                file.hash = hash.md5(c).substring(0, 8);
                map[p] = file.hash;
                return new File(Path.resolve(config.dist_path, p) + ".js").write(c);
            });
            tasks.push(() => {
                if (config.develop) {
                    config._adaPath = config.site_url + "ada.js";
                } else {
                    config._adaPath = `${config.site_url}ada${config.adaHash}.js`;
                }
                config.ada = {
                    basePath: config.site_url,
                    root: config.entry[0],
                    map: map,
                    develop: config.develop
                };
                return this.outputPWAFile(config);
            });
            return queue(tasks).then(() => {
                let success = [], error = {};
                Reflect.ownKeys(this.logs).forEach(key => {
                    if (this.logs[key] === "done") {
                        success.push(key);
                    } else {
                        error[key] = this.logs[key];
                    }
                });
                if (success.length > 0) {
                    console.log(` [done]`.yellow);
                    success.splice(0, 5).forEach((path, index) => {
                        console.log(` - [${index + 1}] ${path.substring(config.source_path.length)}`.grey);
                    });
                    if (success.length > 5) {
                        console.log(` + [${success.length}]...`.grey);
                    }
                }
                let et = Reflect.ownKeys(error);
                if (et.length > 0) {
                    console.log(` [error]`.red);
                    et.forEach((key, index) => {
                        console.log(` - [${index + 1}] ${key.substring(config.source_path.length)}:`.grey);
                        console.log(`   ${error[key]}`.red);
                    });
                }
                return map;
            });
        });
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
    base.bundleAda(config.develop);
    return base;
};