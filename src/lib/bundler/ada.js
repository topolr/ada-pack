let EntryPacker = require("./entry");
let Path = require("path");

class AdaPacker extends EntryPacker {
    getBundleCode(path) {
        path = path.replace(/\\/g, "/");
        return this.getCodeMap(path).then(() => {
            let packageInfo = require(Path.resolve(this.config.projectPath, "./package.json"));
            let veison = packageInfo.version;
            this.resultmap.push(path);
            let result = this.resultmap.map(path => {
                return `function(module,exports,require){${this.resultmapcode[path]}}`;
            });
            let commet = `/*! adajs ${veison} https://github.com/topolr/ada | https://github.com/topolr/ada/blob/master/LICENSE */`;
            let adacode = `(function (map,moduleName) {var Installed={};var requireModule = function (index) {if (Installed[index]) {return Installed[index].exports;}var module = Installed[index] = {exports: {}};map[index].call(module.exports, module, module.exports, requireModule);return module.exports;};var mod=requireModule(map.length-1);Ada.installModule(moduleName,mod);})([${result.join(",")}],"adajs");`;
            return `${commet}${adacode}`;
        });
    }
}

module.exports = AdaPacker;