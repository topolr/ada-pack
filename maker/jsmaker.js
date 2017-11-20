let babel = require("babel-core");
let uglify = require("uglify-js");
module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        try {
            content = babel.transform(content, option.babel).code;
            try {
                content = uglify.minify(content, Object.assign({
                    fromString: true,
                    mangle: true
                }, option.uglify)).code;
            } catch (e) {
            }
            resolve(content);
        } catch (e) {
            reject(e);
        }
    });
};