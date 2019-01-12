let EntryPacker = require("./entry");
let Path = require("path");

class AdaPacker extends EntryPacker {
    getBundleCode(path) {
        if (!this.content) {
            path = path.replace(/\\/g, "/");
            this.time = new Date().getTime();
            return this.getCodeMap(path).then(() => {
                let packageInfo = require(Path.resolve(this.config.nmodulePath, "./adajs", "./package.json"));
                let veison = packageInfo.version;
                this.resultmap.push(path);
                let result = this.resultmap.map(path => {
                    return `function(module,exports,require){${this.resultmapcode[path]}}`;
                });
                let commet = `/*! adajs ${veison} https://github.com/topolr/ada | https://github.com/topolr/ada/blob/master/LICENSE */`;
                let adacode = `(function (map,moduleName) {var Installed={};var requireModule = function (index) {if (Installed[index]) {return Installed[index].exports;}var module = Installed[index] = {exports: {}};map[index].call(module.exports, module, module.exports, requireModule);return module.exports;};var mod=requireModule(map.length-1);Ada.installModule(moduleName,mod);})([${result.join(",")}],"adajs");`;
                this.content = `${commet}${adacode}`;
                this.ready = true;
                this.time = new Date().getTime() - this.time;
                return this.content;
            });
        } else {
            return this.content;
        }
    }
}

module.exports = AdaPacker;