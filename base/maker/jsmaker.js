let babel = require("@babel/core");
let uglify = require("uglify-js");
let classPropertiesPollyfill = require("./../pollyfills/class-properties");
module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        try {
            content = babel.transform(content, option.compiler.babel).code;
            content = classPropertiesPollyfill(content);
            try {
                content = uglify.minify(content, Object.assign({
                    fromString: true,
                    mangle: true
                }, option.compiler.uglify)).code;
            } catch (e) {
            }
            resolve(content);
        } catch (e) {
            reject(e);
        }
    });
};