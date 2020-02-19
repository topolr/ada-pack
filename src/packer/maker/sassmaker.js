let sass = require('sass');
let maker = require("./cssmaker");
let Path = require("path");
let {File} = require("ada-util");

module.exports = function ({content, path, option, fileInfo}) {
    return new Promise((resolve, reject) => {
        if (option.develop) {
            sass.render(Object.assign({
                file: path,
                sourceMap: "string",
                sourceMapContents: true
            }, option.compiler.sass), function (err, result) {
                if (!err) {
                    let map = JSON.parse(result.map.toString());
                    let filename = fileInfo.required;
                    map.file = option.siteURL + filename;
                    map.sources = map.sources.map(_path => {
                        _path = Path.resolve(option.projectPath, `./${_path}`);
                        return option.siteURL + (_path.indexOf("node_modules") === -1 ? _path.substring(option.sourcePath.length) : "node_modules/" + _path.substring(option.nmodulePath.length));
                    });
                    let _result = result.css.toString();
                    _result = _result.replace(/\/\*# sourceMappingURL[\s\S]+?\*\//g, "");
                    _result = _result + `\n/*# sourceMappingURL=${map.file}.map*/`;
                    new File(Path.resolve(option.distPath, `./${filename}.map`)).write(JSON.stringify(map)).then(() => {
                        resolve(_result);
                    });
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
        return maker({content, path, option});
    });
};