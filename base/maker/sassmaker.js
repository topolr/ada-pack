let sass = require('node-sass');
let maker = require("./cssmaker");
let Path = require("path");
module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        if (option.develop) {
            sass.render(Object.assign({
                file: path,
                sourceMap: "string",
                sourceMapContents: true
            }, option.compiler.sass), function (err, result) {
                if (!err) {
                    let map = JSON.parse(result.map.toString());
                    let fp = path.indexOf("node_modules") === -1 ? path.substring(option.source_path.length) : "node_modules/" + path.substring(option.nmodule_path.length);
                    map.file = "/" + fp;
                    map.sources = map.sources.map(path => {
                        let k = Path.resolve(process.cwd(), `./${path}`);
                        k = k.indexOf("node_modules") === -1 ? k.substring(option.source_path.length) : "node_modules/" + k.substring(option.nmodule_path.length);
                        return "/" + k;
                    });
                    console.log(map);
                    let _result = result.css.toString();
                    _result = _result.replace(/\/\*# sourceMappingURL[\s\S]+?\*\//g, "");
                    _result += "/*# sourceMappingURL=data:application/json;charset=utf-8;base64,";
                    _result += (new Buffer(JSON.stringify(map)).toString("base64"));
                    _result += "*/";
                    resolve(_result);
                } else {
                    reject(err);
                }
            });
        } else {
            sass.render(Object.assign({
                file: path
            }, option.compiler.sass), function (err, result) {
                if (!err) {
                    resolve(result.css.toString());
                } else {
                    reject(err);
                }
            });
        }
    }).then(content => {
        return maker(content, path, option);
    });
};