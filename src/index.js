let {File} = require("ada-util");
let SourceMap = require("./lib/sourcemap");
let Hook = require("./lib/hook");
let defaultHooker = require("./hooker");

class Packer {
    constructor(config) {
        this._config = config;
        this._sourceMap = new SourceMap(config);
        this._config.hooker = new Hook(this._sourceMap);
        this._config.hook.unshift(defaultHooker);
        this._config.hook.forEach(hook => hook(config.hooker));
    }

    get config() {
        return this._config;
    }

    get sourceMap() {
        return this._sourceMap;
    }

    getCurrentState(type) {
        return {
            type: this.sourceMap.outputer.rebuild ? "reload" : type,
            map: this.sourceMap.outputer.getSourceMap(),
            log: this.sourceMap.outputer.getLogInfo()
        };
    }

    pack() {
        let config = this.config, ps = config.hooker.excute("beforePack", config);
        let file = new File(config.distPath);
        if (!config.develop) {
            ps = ps.then(() => {
                if (file.exist) {
                    return file.empty();
                } else {
                    file.make();
                }
            });
        } else {
            file.make();
        }
        return ps.then(() => this.sourceMap.map()).then(() => config.hooker.excute("afterPack"));
    }
}

module.exports = Packer;