let uglifycss = require("uglifycss");
let util = require("./../base/util");
let postcss = require('postcss');
let autoprefixer = require('autoprefixer');
let Path = require("path");
let File = require("../base/lib/file");

module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        let r = util.replacePaths(content, function (_path) {
            let r = Path.resolve(path, "./../", _path).substring(option.source_path.length).replace(/\\/g, "/");
            let o = Path.resolve(path, "./../", _path).replace(/\\/g, "/");
            let d = Path.resolve(option.dist_path, r).replace(/\\/g, "/");
            if (option.develop) {
                new File(o).copyTo(d);
                return option.site_path + r;
            } else {
                let hash = new File(o).hash().substring(0, 8);
                new File(o).copyTo(util.getHashPath(d, hash));
                return option.site_path + util.getHashPath(r, hash);
            }
        });
        r = uglifycss.processString(r, Object.assign({
            uglyComments: true,
            cuteComments: true
        }, option.compiler.uglifycss));
        postcss([
            autoprefixer(Object.assign({browsers: ['> 1%', 'IE 7']}, option.compiler.autoprefixer))
        ]).process(r).then(result => {
            resolve(result.css);
        });
    });
};