let uglifycss = require("uglifycss");
let util = require("../util");
let postcss = require('postcss');
let autoprefixer = require('autoprefixer');
let Path = require("path");
let File = require("../lib/file");

module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        let r = util.replacePaths(content, function (_path) {
            let r = "";
            let o = Path.resolve(path, "./../", _path).replace(/\\/g, "/");
            if (o.indexOf("node_modules") === -1) {
                r = Path.resolve(path, "./../", _path).substring(option.source_path.length).replace(/\\/g, "/");
            } else {
                r = "node_modules/" + Path.resolve(path, "./../", _path).substring(option.nmodule_path.length).replace(/\\/g, "/");
            }
            let d = Path.resolve(option.dist_path, r).replace(/\\/g, "/");
            if (option.develop) {
                new File(o).copyTo(d);
                return option.site_url + r;
            } else {
                let hash = new File(o).hash().substring(0, 8);
                new File(o).copyTo(util.getHashPath(d, hash));
                return option.site_url + util.getHashPath(r, hash);
            }
        });
        if(!option.develop) {
            r = uglifycss.processString(r, Object.assign({
                uglyComments: true,
                cuteComments: true
            }, option.compiler.uglifycss));
        }
        postcss([
            autoprefixer(Object.assign({browsers: ['> 1%', 'IE 7']}, option.compiler.autoprefixer))
        ]).process(r, {
            from: undefined
        }).then(result => {
            resolve(result.css);
        }, (e) => {
            reject(e);
        });
    });
};