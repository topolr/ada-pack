let colors = require("colors");
let Util = require("./util");
let File = require("./util/file");
let Path = require("path");
let maker = require("./../maker/maker");
let uglify = require("uglify-js");
let babel = require("babel-core");
let hash = require("./util/md5");
let isbinaryfile = require("isbinaryfile");
let queue = require("./util/queue");

let config = {
    "sourcePath": "./src/",
    "distPath": "./dist/",
    "entry": ["./root.js"],
    "pages": ["./index.html"],
    "rootPath": "dist/",
    "develop": true,
    "babel": {
        "presets": [["env", {
            "targets": {
                "chrome": 50
            }
        }]],
        "plugins": ["transform-decorators-legacy", "transform-async-to-generator", "syntax-dynamic-import"]
    },
    "uglify": {},
    "uglifycss": {},
    "autoprefixer": {},
    "sass": {},
    "minifier": {}
};

let util = {
    isPathOf(path) {
        return !(!path.includes("./") && !path.includes("/") && !path.includes("."));
    },
    getPathOf(_path, path) {
        path = path.trim();
        if (util.isPathOf(path)) {
            let a = path.split("/").pop();
            let b = a.split(".");
            let c = "";
            if (b.length > 1) {
                c = `${Path.join(_path, "./../", path).replace(/\\/g, "/")}`;
            } else {
                c = `${Path.join(_path, "./../", path).replace(/\\/g, "/")}.js`;
            }
            return {
                name: c,
                ispath: true
            }
        } else {
            return {
                name: path,
                ispath: false
            };
        }
    },
    getRequireInfo(basePath, path) {
        let _path = Path.resolve(basePath, path).replace(/\\/g, "/");
        let result = new File(_path).readSync().match(/require\(.*?\)/g);
        let at = new Set();
        if (result) {
            at.add(_path.substring(basePath.length));
            let ct = result.map(one => {
                let a = one.substring(8, one.length - 1).replace(/['|"|`]/g, "").trim();
                let b = util.getPathOf(_path, a);
                let name = b.ispath ? b.name.substring(basePath.length) : b.name;
                return {name: name, ispath: b.ispath};
            }).map(a => {
                at.add(a.name);
                return a;
            });
            ct.forEach(_p => {
                if (_p.ispath) {
                    let b = util.getRequireInfo(basePath, `./${_p.name}`);
                    for (let c of b.values()) {
                        at.add(c);
                    }
                }
            });
        }
        // console.log(at)
        return at;
    },
    getAllSourcePaths(path) {
        let file = new File(path);
        let filelist = [];
        file.scan((path, isfile) => {
            if (isfile) {
                filelist.push(path);
            }
        });
        return filelist;
    },
    babelCode(code) {
        let content = babel.transform(code, config.babel).code;
        try {
            content = uglify.minify(content, Object.assign({
                fromString: true,
                mangle: true
            }, config.uglify)).code;
        } catch (e) {
        }
        return content;
    },
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            var character = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + character;
            hash = hash & hash;
        }
        return hash;
    },
    getMappedPath(path) {
        return `P${Math.abs(util.hashCode(path.replace(/\\/g, "/")))}`;
    }
};

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
            code = util.minifyCode(code);
        } catch (e) {
        }
        this.resultmapcode[path] = code;
        return paths;
    }

    getCodeMap(path) {
        this.getDependenceInfo(path, util.babelCode(new File(path).readSync())).forEach(path => {
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
        let distpath = config.distPath + filepath.substring(config.sourcePath.length);
        if (new File(filepath).suffix() === "js") {
            let content = new File(filepath).readSync();
            let info = this.parseViewAnnotationPaths(distpath.substring(config.distPath.length), content);
            content = info.code;
            content = content.replace(/imports\(.*?\)/g, (one) => {
                let _a = one.substring(8, one.length - 1);
                if (_a[0] === "'" || _a[0] == "\"") {
                    let a = _a.replace(/['|"|`]/g, "").trim();
                    let b = `${Path.join(filepath, "./../", a).replace(/\\/g, "/")}.js`.substring(config.sourcePath.length);
                    return `imports("${b}")`;
                } else {
                    return one;
                }
            });
            this.map[distpath.substring(config.distPath.length).replace(/\\/g, "/")] = info.map;
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
        console.log(`+ ${Util.formatDate()} +`.cyan);
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
                    console.log(` - [${index + 1}] ${path.substring(config.sourcePath.length)}`.grey);
                });
                if (success.length > 5) {
                    console.log(` + [${success.length}]...`.grey);
                }
            }
            let et = Reflect.ownKeys(error);
            if (et.length > 0) {
                console.log(` [error]`.red);
                et.forEach((key, index) => {
                    console.log(` - [${index + 1}] ${key.substring(config.sourcePath.length)}:`.grey);
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
        new AdaBundler().bundle(Path.resolve(config.basePath, `./node_modules/adajs/${develop ? "develop" : "index"}.js`), Path.resolve(config.distPath, "./ada.js"), develop);
    },
    bundleAll() {
        config.develop = false;
        this.bundleAda();
        return this.parseFiles(util.getAllSourcePaths(config.sourcePath)).then((map) => {
            let paths = util.getAllSourcePaths(config.distPath);
            paths.forEach(path => {
                let suffix = new File(path).suffix();
                let a = path.substring(config.distPath.length).replace(/\\/g, "/");
                let b = "";
                if (!isbinaryfile.sync(path)) {
                    b = map[util.getMappedPath(a)];
                    if (!b) {
                        b = map[a.split(".").shift()];
                    }
                }
                if (b) {
                    new File(path).renameSync(Path.resolve(config.distPath, Util.getHashPath(a, b)));
                }
            });
            let adapath = Path.resolve(config.distPath, "./ada.js");
            let adahash = new File(adapath).hash().substring(0, 10);
            let newname = `ada${adahash}.js`;
            new File(adapath).renameSync(Path.resolve(config.distPath, newname));
            return queue(config.pages.map(page => () => {
                let path = Path.resolve(config.basePath, page);
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
        let basePath = config.basePath,
            sourcePath = config.sourcePath,
            distPath = config.distPath,
            entry = config.entry,
            pages = config.pages;
        let info = {};
        entry.forEach(entry => {
            let keyname = Path.resolve(basePath, entry).substring(basePath.length + 1);
            info[keyname] = util.getRequireInfo(distPath, entry);
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
                    let _hash = (new File(Path.resolve(distPath, path)).hash()).substring(0, 8);
                    result[util.getMappedPath(path)] = {
                        hash: _hash,
                        code: new File(Path.resolve(distPath, path)).readSync()
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
        return queue(files.map(file => () => {
            let p = file.key;
            let c = `Ada.unpack(${JSON.stringify(file.code)})`;
            file.hash = hash.md5(c).substring(0, 8);
            map[p] = file.hash;
            return new File(Path.resolve(distPath, p) + ".js").write(c);
        }).concat(pages.map(page => () => {
            let path = Path.resolve(basePath, page);
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
        }))).then(() => {
            return map;
        });
    }
};

module.exports = function (option) {
    Object.assign(config, option);
    config.basePath = config.basePath.replace(/\\/g, "/");
    config.distPath = Path.join(config.basePath, config.distPath).replace(/\\/g, "/");
    config.sourcePath = Path.join(config.basePath, config.sourcePath).replace(/\\/g, "/");
    base.bundleAda(config.develop);
    return base;
};