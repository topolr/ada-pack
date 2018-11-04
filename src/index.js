let colors = require("colors");
let File = require("./util/file");
let SourceMap = require("./lib/sourcemap");

class Packer {
    constructor(config) {
        this._config = config;
        this._sourceMap = new SourceMap(config);
    }

    get config() {
        return this._config;
    }

    get sourceMap() {
        return this._sourceMap;
    }

    pack() {
        let config = this.config, ps = Promise.resolve();
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
        return pa.then(() => this.sourceMap.map());
    }
}

module.exports = Packer;