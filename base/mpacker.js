let Path = require("path");
let uglify = require("uglify-js");
let babel = require("babel-core");
let isbinaryfile = require("isbinaryfile");
let File = require("./util/file");
let config = require("../config.json");
let queue = require("./util/queue");

let util = {
    isPathOf(path){
        return path[0] === "." || path[0] === "/";
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
    minifyCode(code){
        return uglify.minify(code, Object.assign({
            fromString: true,
            mangle: true
        })).code;
    }
};

class packer {
    constructor() {
        this.resultmap = [];
        this.resultmapcode = {};
        this.paths = new Set();
        this.refer = new Set();
    }

    getDependenceInfo(path, code) {
        if (!this.paths.has(path)) {
            this.paths.add(path);
            let paths = [];
            if (this.resultmap.indexOf(path) === -1) {
                this.resultmap.push(path);
            }
            code = code.replace(/require\(.*?\)/g, (one) => {
                if (one.indexOf("${") === -1 && one.indexOf("+") === -1) {
                    let a = one.substring(8, one.length - 1).replace(/['|"|`]/g, "").trim();
                    if (util.isPathOf(a)) {
                        let _path = Path.resolve(path, "./../", a).replace(/\\/g, "/");// + ".js";
                        if (_path.substring(_path.length - 3) !== ".js") {
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
                        this.refer.add(a);
                        // console.log("====>", a);
                        return one;
                    }
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
        } else {
            return [];
        }
    }

    getCodeMap(path) {
        let code = new File(path).readSync();
        try {
            code = util.babelCode(code);
        } catch (e) {
        }
        this.getDependenceInfo(path, code).forEach(path => {
            this.getCodeMap(path);
        });
    }

    bundle(path, name) {
        this.getCodeMap(path);
        let result = this.resultmap.map(path => {
            return this.resultmapcode[path];
        }).map(code => {
            return `function(module,exports,require){${code}}`;
        });
        let code = `(function(map,moduleName){var Installed={};var requireModule=function(index){if(Installed[index]){return Installed[index].exports}var module=Installed[index]={exports:{}};map[index].call(module.exports,module,module.exports,requireModule);return module.exports};window&&window.Ada.installModule(moduleName,requireModule(0))})
        ([${result.join(",")}],"${name}");`;
        // return new File(output).write(code).then(() => [...this.refer]);
        return Promise.resolve({code, refer: [...this.refer]});
    }
}

function pack(moduleName, codes) {
    let mainPath = "";
    console.log("-->", moduleName)
    if (moduleName.includes("/")) {
        mainPath = Path.resolve(__dirname, "./../", `./node_modules/`, moduleName);
    } else {
        let packagepath = Path.resolve(__dirname, "./../", `./node_modules/${moduleName}/package.json`);
        if (new File(packagepath).isExists()) {
            mainPath = Path.resolve(__dirname, "./../", `./node_modules/${moduleName}/`, JSON.parse(new File(packagepath).readSync()).main || "index.js");
            if (mainPath.substring(mainPath.length - 3) !== ".js") {
                mainPath = mainPath + ".js";
            }
        } else {
            return Promise.resolve([]);
        }
    }
    if (new File(mainPath).isExists()) {
        return new packer().bundle(mainPath, moduleName).then((a) => {
            codes.add({name: moduleName, code: a.code});
            return queue(a.refer.filter(b => ["fs", "path", "util", "http", "events", "crypto"].indexOf(b) === -1).map(b => () => {
                return pack(b, codes).then(info => {
                    codes.add({name: b, code: info.code});
                    return info;
                });
            }));
        });
    } else {
        return Promise.resolve([]);
    }
}

class codeSet {
    constructor() {
        this.result = [];
    }

    add({name, code}) {
        if (!this.result[this.result.length - 1] || this.result[this.result.length - 1].name !== name) {
            this.result.push({name, code});
        }
    }

    get() {
        return this.result;
    }
}

module.exports = function (moduleName) {
    let codes = new codeSet();
    return pack(moduleName, codes).then(() => codes.get());
};