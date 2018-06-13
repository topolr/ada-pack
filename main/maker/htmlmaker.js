let minify = require('html-minifier').minify;
let util = require("../util/util");
let Path = require("path");
let File = require("../lib/file");

module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        try {
            content = content.replace(/>[\s]+</g, "><").replace(/\r\n/g, "").replace(/\r/g, "").replace(/\n/g, "");
            content = util.replacePaths(content, (_path) => {
                let r = "";
                let o = Path.resolve(path, "./../", _path).replace(/\\/g, "/");
                if(o.indexOf("{{")===-1) {
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
                }
            });
            // resolve(minify(content, Object.assign({
            //     removeComments: true,
            //     collapseWhitespace: true,
            //     minifyJS: true,
            //     minifyCSS: true
            // }, option.minifier)));
            resolve(content);
        } catch (e) {
            reject(e);
        }
    });
};