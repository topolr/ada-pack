let File = require("./util/file");
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

    pack() {
        let config = this.config, ps = config.hooker.excute("beforePack");
        if (!config.develop) {
            ps = ps.then(() => {
                if (new File(config.distPath).isExists()) {
                    return new File(config.distPath).remove().then(() => {
                        new File(config.distPath).mkdir();
                    });
                } else {
                    new File(config.distPath).mkdir();
                }
            });
        } else {
            new File(config.distPath).mkdir();
        }
        return ps.then(() => this.sourceMap.map()).then(() => config.hooker.excute("afterPack"));
    }
}

module.exports = Packer;