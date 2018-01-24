let babel = require("@babel/core");
let uglify = require("uglify-js");
let UglifyJS = require("uglify-es");
let classPropertiesPollyfill = require("./../pollyfills/class-properties");
module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        try {
            content = babel.transform(content, option.compiler.babel).code;
            content = classPropertiesPollyfill(content);
            try {
                content = UglifyJS.minify(content, Object.assign({}, option.compiler.uglify)).code;
            } catch (e) {
            }
            resolve(content);
        } catch (e) {
            reject(e);
        }
    });
};