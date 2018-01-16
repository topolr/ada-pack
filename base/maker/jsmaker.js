let babel = require("@babel/core");
let uglify = require("uglify-js");
let pollyfill = require("./../pollyfills/polyfill");
module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        try {
            content = babel.transform(content, option.compiler.babel).code;
            return pollyfill.pollyfill("js", path, content, option).then(content => {
                try {
                    return uglify.minify(content, Object.assign({
                        fromString: true,
                        mangle: true
                    }, option.compiler.uglify)).code;
                } catch (e) {
                    return content;
                }
            });
        } catch (e) {
            reject(e);
        }
    });
};