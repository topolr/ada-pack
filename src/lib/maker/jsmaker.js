let babel = require("@babel/core");
let UglifyJS = require("uglify-es");
let classPropertiesPollyfill = require("../../pollyfills/class-properties");

module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        try {
            if (option.develop) {
                let filename = path.indexOf("node_modules") === -1 ? path.substring(option.sourcePath.length) : "node_modules/" + path.substring(option.nmodulePath.length);
                let info = babel.transform(content, Object.assign({
                    filename: filename,
                    sourceMaps: true
                }, option.compiler.babel));
                info.map.sources = [filename];
                content = info.code;
                content = classPropertiesPollyfill(content);
                // content = content + `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${new Buffer(JSON.stringify(info.map)).toString('base64')}`;
            } else {
                let ops = Object.assign({}, option.compiler.babel);
                ops.filename = path;
                content = babel.transform(content, ops).code;
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