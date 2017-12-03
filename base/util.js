let uglify = require("uglify-js");
let babel = require("babel-core");
let Path = require("path");
let File = require("./lib/file");
let manifestKeys = ["theme_color", "start_url", "short_name", "scope", "related_applications", "prefer_related_applications", "orientation", "name", "lang", "icons", "display", "dir", "description", "background_color"];

let util = {
    replacePaths(content, fn) {
        return content.replace(/url\(['"]*.*?["']*\)/gi, function (a) {
            let b = a.substring(4, a.length - 1).trim();
            let result = a;
            let aa = false;
            if (b[0] === "'" || b[0] === "\"") {
                aa = true;
                b = b.substring(1, b.length - 1);
            }
            let mt = b.split("?");
            b = mt[0], suffix = mt[1];
            if (/^\S+\.[a-zA-Z]+$/.test(b)) {
                let c = true;
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
            let result = a;
            if (a.indexOf("<%") === -1) {
                let rp = a, mt = a.substring(5, a.length - 1).split("?"), m = mt[0], suffix = mt[1];
                if (/^\S+\.[a-zA-Z]+$/.test(m)) {
                    let ct = false;
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
            let a = str.substring(7, str.length - 1).trim();
            if (a[0] === "'" || a[0] === "\"") {
                a = a.substring(1, a.length - 1).trim();
                if (/^\S+\.[a-zA-Z]+$/.test(a)) {
                    let ct = false;
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
        let r = [];
        let a = content.match(/url\(['"]*.*?["']*\)/gi);
        if (a) {
            for (let i = 0; i < a.length; i++) {
                let b = a[i].substring(4, a[i].length - 1).trim();
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
        let e = content.match(/src\=['"].*?['"]/gi);
        if (e) {
            for (let i = 0; i < e.length; i++) {
                let a = e[i];
                if (a.indexOf("<%") === -1) {
                    let rp = a, path = a.substring(5, a.length - 1).split("?")[0];
                    if (/^\S+\.[a-zA-Z]+$/.test(path)) {
                        r.push(path);
                    }
                }
            }
        }
        let f = content.match(/\@import.*?\;/gi);
        if (f) {
            for (let i = 0; i < f.length; i++) {
                let a = f[i].substring(7, f[i].length - 1).trim();
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
        let r = {
            url: [],
            src: [],
            import: []
        };
        let a = content.match(/url\(['"]*.*?["']*\)/gi);
        if (a) {
            for (let i = 0; i < a.length; i++) {
                let b = a[i].substring(4, a[i].length - 1).trim();
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
        let e = content.match(/src\=['"].*?['"]/gi);
        if (e) {
            for (let i = 0; i < e.length; i++) {
                let a = e[i];
                if (a.indexOf("<%") === -1) {
                    let rp = a, path = a.substring(5, a.length - 1).split("?")[0];
                    if (/^\S+\.[a-zA-Z]+$/.test(path)) {
                        r.src.push(path);
                    }
                }
            }
        }
        let f = content.match(/\@import.*?\;/gi);
        if (f) {
            for (let i = 0; i < f.length; i++) {
                let a = f[i].substring(7, f[i].length - 1).trim();
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
            let c = month.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        }).replace(/[d]+/g, function (str) {
            let c = day.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        }).replace(/[h]+/g, function (str) {
            let c = hour.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        }).replace(/[m]+/g, function (str) {
            let c = minute.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        }).replace(/[s]+/g, function (str) {
            let c = second.substring(0, str.length);
            if (str.length > 1) {
                return c.length > 1 ? c : "0" + c;
            } else {
                return c;
            }
        });
    },
    babelCodeOnly(config, code) {
        return babel.transform(code, config.compiler.babel).code;
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
            let character = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + character;
            hash = hash & hash;
        }
        return hash;
    },
    getMappedPath(path) {
        return `P${Math.abs(util.hashCode(path.replace(/\\/g, "/")))}`;
    },
};

module.exports = util;