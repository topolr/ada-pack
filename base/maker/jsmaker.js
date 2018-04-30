let babel = require("@babel/core");
let UglifyJS = require("uglify-es");
let classPropertiesPollyfill = require("./../pollyfills/class-properties");

module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        try {
            if (option.develop) {
                let info = babel.transform(content, Object.assign({
                    filename: path.indexOf("node_modules") === -1 ? path.substring(option.source_path.length) : "node_modules/" + path.substring(option.nmodule_path.length),
                    sourceMaps: "both"
                }, option.compiler.babel));
                content = info.code;
                content = classPropertiesPollyfill(content);
            } else {
                content = babel.transform(content, option.compiler.babel).code;
                content = classPropertiesPollyfill(content);
                try {
                    content = UglifyJS.minify(content, Object.assign({}, option.compiler.uglify)).code;
                } catch (e) {
                }
            }
            resolve(content);
        } catch (e) {
            reject(e);
        }
    });
};