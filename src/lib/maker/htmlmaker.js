let minify = require('html-minifier').minify;
let util = require("../../util/helper");
let Path = require("path");
let File = require("../../util/file");

module.exports = function ({content, path, option}) {
    return new Promise((resolve, reject) => {
        try {
            content = content.replace(/>[\s]+</g, "><").replace(/\r\n/g, "").replace(/\r/g, "").replace(/\n/g, "");
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