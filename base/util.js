let uglify = require("uglify-js");
let babel = require("babel-core");
let Path = require("path");
let File = require("./lib/file");
let manifestKeys = ["theme_color", "start_url", "short_name", "scope", "related_applications", "prefer_related_applications", "orientation", "name", "lang", "icons", "display", "dir", "description", "background_color"];

let util = {
    replacePaths(content, fn) {
        return content.replace(/url\(['"]*.*?["']*\)/gi, function (a) {
            var b = a.substring(4, a.length - 1).trim();
            var result = a;
            var aa = false;
            if (b[0] === "'" || b[0] === "\"") {
                aa = true;
                b = b.substring(1, b.length - 1);
            }
            var mt = b.split("?");
            b = mt[0], suffix = mt[1];
            if (/^\S+\.[a-zA-Z]+$/.test(b)) {
                var c = true;
                if (fn) {
                    c = fn(b);
                }
                if (c !== false) {
                    if (aa) {
                        rr = "url(\"" + c + (suffix ? ("?" + suffix) : "") + "\")";
                    } else {
                        rr = "url(" + c + (suffix ? ("?" + suffix) : "") + ")";
                    }
                    result = rr;
                }
            }
            return result;
        }).replace(/src\=['"].*?['"]/gi, function (a) {
            a = a.trim();
            var result = a;
            if (a.indexOf("<%") === -1) {
                var rp = a, mt = a.substring(5, a.length - 1).split("?"), m = mt[0], suffix = mt[1];
                if (/^\S+\.[a-zA-Z]+$/.test(m)) {
                    var ct = false;
                    if (fn) {
                        ct = fn(m);
                    }
                    if (ct !== false) {
                        result = "src=\"" + ct + (suffix ? ("?" + suffix) : "") + "\"";
                    }
                }
            }
            return result;
        }).replace(/\@import.*?\;/gi, function (str) {
            var a = str.substring(7, str.length - 1).trim();
            if (a[0] === "'" || a[0] === "\"") {
                a = a.substring(1, a.length - 1).trim();
                if (/^\S+\.[a-zA-Z]+$/.test(a)) {
                    var ct = false;
                    if (fn) {
                        ct = fn(a);
                    }
                    if (ct !== false) {
                        result = "@import \"" + ct + "\";";
                    }
                }
            }
            return result;
        });
    },
    findPaths(content) {
        var r = [];
        var a = content.match(/url\(['"]*.*?["']*\)/gi);
        if (a) {
            for (var i = 0; i < a.length; i++) {
                var b = a[i].substring(4, a[i].length - 1).trim();
                if (b[0] === "'" || b[0] === "\"") {
                    aa = true;
                    b = b.substring(1, b.length - 1);
                }
                b = b.split("?")[0];
                if (/^\S+\.[a-zA-Z]+$/.test(b)) {
                    r.push(b);
                }
            }
        }
        var e = content.match(/src\=['"].*?['"]/gi);
        if (e) {
            for (var i = 0; i < e.length; i++) {
                var a = e[i];
                if (a.indexOf("<%") === -1) {
                    var rp = a, path = a.substring(5, a.length - 1).split("?")[0];
                    if (/^\S+\.[a-zA-Z]+$/.test(path)) {
                        r.push(path);
                    }
                }
            }
        }
        var f = content.match(/\@import.*?\;/gi);
        if (f) {
            for (var i = 0; i < f.length; i++) {
                var a = f[i].substring(7, f[i].length - 1).trim();
                if (a[0] === "'" || a[0] === "\"") {
                    a = a.substring(1, a.length - 1).trim();
                    if (/^\S+\.[a-zA-Z]+$/.test(a)) {
                        r.push(a);
                    }
                }
            }
        }
        return r;
    },
    findPathsMap(content) {
        var r = {
            url: [],
            src: [],
            import: []
        };
        var a = content.match(/url\(['"]*.*?["']*\)/gi);
        if (a) {
            for (var i = 0; i < a.length; i++) {
                var b = a[i].substring(4, a[i].length - 1).trim();
                if (b[0] === "'" || b[0] === "\"") {
                    aa = true;
                    b = b.substring(1, b.length - 1);
                }
                b = b.split("?")[0];
                if (/^\S+\.[a-zA-Z]+$/.test(b)) {
                    r.url.push(b);
                }
            }
        }
        var e = content.match(/src\=['"].*?['"]/gi);
        if (e) {
            for (var i = 0; i < e.length; i++) {
                var a = e[i];
                if (a.indexOf("<%") === -1) {
                    var rp = a, path = a.substring(5, a.length - 1).split("?")[0];
                    if (/^\S+\.[a-zA-Z]+$/.test(path)) {
                        r.src.push(path);
                    }
                }
            }
        }
        var f = content.match(/\@import.*?\;/gi);
        if (f) {
            for (var i = 0; i < f.length; i++) {
                var a = f[i].substring(7, f[i].length - 1).trim();
                if (a[0] === "'" || a[0] === "\"") {
                    a = a.substring(1, a.length - 1).trim();
                    if (/^\S+\.[a-zA-Z]+$/.test(a)) {
                        r.import.push(a);
                    }
                }
            }
        }
        return r;
    },
    getHashPath(path, hash) {
        let a = path.split("/");
        let b = a.pop();
        let c = b.split(".");
        a.push(`${hash}.${c[1]}`);
        return a.join("/");
    },
    formatDate(format = "yyyy-MM-dd hh:mm:ss") {
        let a = new Date();
        let year = a.getFullYear() + "", month = (a.getMonth() + 1) + "", day = a.getDate() + "",
            hour = a.getHours() + "", minute = a.getMinutes() + "", second = a.getSeconds() + "";
        return format.replace(/[y]+/g, function (str) {
            return year.substring(year.length - str.length);
        }).replace(/[M]+/g, function (str) {
            var c = month.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        }).replace(/[d]+/g, function (str) {
            var c = day.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        }).replace(/[h]+/g, function (str) {
            var c = hour.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        }).replace(/[m]+/g, function (str) {
            var c = minute.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        }).replace(/[s]+/g, function (str) {
            var c = second.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        });
    },
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
    babelCode(config, code) {
        let content = babel.transform(code, config.compiler.babel).code;
        try {
            content = uglify.minify(content, Object.assign({
                fromString: true,
                mangle: true
            }, config.compiler.uglify)).code;
        } catch (e) {
        }
        return content;
    },
    minifyCode(config, code) {
        let content = code;
        try {
            content = uglify.minify(content, Object.assign({
                fromString: true,
                mangle: true
            }, config.compiler.uglify)).code;
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
    },
    outputPWAFile(config) {
        let manifest = {};
        Reflect.ownKeys(config).filter(key => manifestKeys.indexOf(key) !== -1).forEach(key => {
            manifest[key] = config[key];
        });

        let worker = config.worker;
        let registCode = worker.regist.toString().trim();
        let start = registCode.indexOf("{") + 1;
        let a = registCode.substring(start, registCode.length - 1);
        let c = a.substring(a.indexOf("."));
        let workerRegistCode = `if ('serviceWorker' in navigator) {navigator.serviceWorker.register('/serviceworker.js', { scope: '${worker.scope}' })${c}}`;
        let codes = Reflect.ownKeys(worker).filter(key => ["scope", "regist"].indexOf(key) === -1).map(key => {
            let code = worker[key].toString();
            return `self.addEventListener('${key.substring(2)}', function${code.substring(code.indexOf("("))});`;
        });

        let page = config.page;
        let metaContent = Reflect.ownKeys(page.meta).map(key => {
            return `<meta name="${key.replace(/_/g, "-")}" content="${page.meta[key]}">`;
        }).join("");
        let styleContent = page.style.map(path => {
            return `<link rel="stylesheet" href="${path}">`;
        }).join("");
        let scriptContent = page.script.map(path => {
            return `<script src="${path}"></script>`;
        }).join("");
        let content = `<!DOCTYPE html><html><head><link rel="manifest" href="/manifest.json"><meta charset="${page.charset}"><title>${config.name}</title>${metaContent}${styleContent}${scriptContent}<script src="${config._adaPath}"></script><script>${workerRegistCode}</script><script>Ada.boot(${JSON.stringify(config.ada)});</script></head><body></body></html>`;
        return Promise.all([
            new File(Path.resolve(config.dist_path, "./manifest.json")).write(JSON.stringify(manifest)),
            new File(Path.resolve(config.dist_path, "./serviceworker.js")).write(`'use strict';${util.minifyCode(codes.join(""))}`),
            new File(Path.resolve(config.dist_path, "./index.html")).write(content)
        ]);
    }
};

module.exports = util;