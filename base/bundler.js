let colors = require("colors");
let util = require("./util");
let File = require("./lib/file");
let Path = require("path");
let maker = require("./../maker/maker");
let hash = require("./lib/md5");
let isbinaryfile = require("isbinaryfile");
let queue = require("./lib/queue");
let config = require("./config");

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
    map: {},
    parseViewAnnotationPaths(filePath, code) {
        let set = new Set();

        function edit(str, type) {
            let map = str.substring(6, str.length - 1);
            let mapj = new Function(`return ${map};`)();
            if (mapj.template) {
                mapj.template = Path.join(filePath, "./../", mapj.template).replace(/\\/g, "/");
            }
            if (mapj.style) {
                mapj.style = Path.join(filePath, "./../", mapj.style).replace(/\\/g, "/");
            }
            let result = Reflect.ownKeys(mapj).map(key => {
                if (key === "style" || key === "template") {
                    set.add(mapj[key]);
                }
                return `${key}:"${mapj[key]}"`;
            });
            return `@${type}({${result.join(",")}})`;
        }

        code = code.replace(/@view\(\{[\s\S]+?\}\)/g, code => {
            return edit(code, "view");
        }).replace(/@root\(\{[\s\S]+?\}\)/g, code => {
            return edit(code, "root");
        });
        return {code, map: set};
    },
    parseFile(filepath) {
        let distpath = config.dist_path + filepath.substring(config.source_path.length);
        if (new File(filepath).suffix() === "js") {
            let content = new File(filepath).readSync();
            let info = this.parseViewAnnotationPaths(distpath.substring(config.dist_path.length), content);
            content = info.code;
            content = content.replace(/imports\(.*?\)/g, (one) => {
                let _a = one.substring(8, one.length - 1);
                if (_a[0] === "'" || _a[0] == "\"") {
                    let a = _a.replace(/['|"|`]/g, "").trim();
                    let b = `${Path.join(filepath, "./../", a).replace(/\\/g, "/")}.js`.substring(config.source_path.length);
                    return `imports("${b}")`;
                } else {
                    return one;
                }
            });
            this.map[distpath.substring(config.dist_path.length).replace(/\\/g, "/")] = info.map;
            return maker.parse("js", "", content, config).then(content => {
                return new File(distpath).write(content);
            });
        } else {
            if (!isbinaryfile.sync(filepath)) {
                let _file = new File(filepath);
                let suffix = _file.suffix();
                return maker.parse(_file.suffix(), filepath, _file.readSync(), config).then(content => {
                    return new File(distpath).write(content);
                });
            } else {
                return Promise.resolve();
            }
        }
    },
    parseFiles(files) {
        console.log(`+ ${util.formatDate()} +`.cyan);
        let success = [], error = {};
        return Promise.all(files.map(_path => {
            return this.parseFile(_path).then(() => {
                success.push(_path);
            }).catch(e => {
                error[_path] = e;
            });
        })).then(() => {
            return this.bundle();
        }).then(() => {
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
        }).catch(e => console.log(e));
    },
    removeFile() {
        this.bundle();
        return Promise.resolve();
    },
    bundleAda(develop = false) {
        new AdaBundler().bundle(Path.resolve(config.projectPath, `./node_modules/adajs/${develop ? "develop" : "index"}.js`), Path.resolve(config.dist_path, "./ada.js"), develop);
    },
    bundleAll() {
        config.develop = false;
        this.bundleAda();
        return this.parseFiles(util.getAllSourcePaths(config.source_path)).then((map) => {
            let paths = util.getAllSourcePaths(config.dist_path);
            paths.forEach(path => {
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
            let adapath = Path.resolve(config.dist_path, "./ada.js");
            // let adahash = new File(adapath).hash().substring(0, 10);
            let adahash = config.adaHash;
            let newname = `ada${adahash}.js`;
            new File(adapath).renameSync(Path.resolve(config.dist_path, newname));
            return queue(config.pages.map(page => () => {
                let path = Path.resolve(config.base_path, page);
                let content = new File(path).readSync();
                content = content.replace(/ada[a-z0-9]*.js/g, function (a) {
                    return newname;
                });
                return new File(path).write(content);
            })).then(() => {
                console.log(`[BUILT DONE]`.green);
            });
        });
    },
    bundle() {
        let info = {};
        config.entry.forEach(entry => {
            let keyname = Path.resolve(config.base_path, entry).substring(config.base_path.length + 1);
            info[keyname] = util.getRequireInfo(config.dist_path, entry);
            for (let a of info[keyname]) {
                if (this.map[a]) {
                    for (let b of this.map[a]) {
                        info[keyname].add(b);
                    }
                }
            }
        });
        let files = Reflect.ownKeys(info).map(key => {
            let result = {};
            [...info[key]].forEach(path => {
                if (util.isPathOf(path)) {
                    let _hash = (new File(Path.resolve(config.dist_path, path)).hash()).substring(0, 8);
                    result[util.getMappedPath(path)] = {
                        hash: _hash,
                        code: new File(Path.resolve(config.dist_path, path)).readSync()
                    };
                }
            });
            return {
                code: result,
                key: util.getMappedPath("package-" + key.replace(/\//g, "-").replace(/\\/g, "-"))
            };
        });
        let basefile = files[0];
        files.shift();
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
        }).concat(config.pages.map(page => () => {
            let path = Path.resolve(config.base_path, page);
            let content = new File(path).readSync();
            content = content.replace(/Ada\.boot\(\{[\w\W]*?\}\)/g, function (a) {
                let q = a.substring(9, a.length - 1);
                let obj = new Function(`return ${q}`)();
                obj.map = map;
                obj.develop = config.develop;
                return `Ada.boot(${JSON.stringify(obj)})`;
            }).replace(/ada[a-z0-9]*.js/g, function (a) {
                return "ada.js";
            });
            return new File(path).write(content);
        }));
        tasks.push(() => {
            if (config.develop) {
                config._adaPath = config.site_path + "/ada.js";
            } else {
                config._adaPath = `${config.site_path}/ada${config.adaHash}.js`;
            }
            config.ada = {
                basePath: config.site_path,
                root: config.entry[0],
                map: map,
                develop: config.develop
            };
            return util.outputPWAFile(config);
        });
        return queue(tasks).then(() => {
            return map;
        });
    }
};

module.exports = function (option) {
    Object.assign(config, option);
    config.base_path = config.base_path.replace(/\\/g, "/");
    config.dist_path = Path.join(config.base_path, config.dist_path).replace(/\\/g, "/");
    config.source_path = Path.join(config.base_path, config.source_path).replace(/\\/g, "/");
    base.bundleAda(config.develop);
    return base;
};