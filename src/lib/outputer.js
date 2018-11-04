let hash = require("./../util/md5");
let isbinaryfile = require("isbinaryfile");
let gzipSize = require('gzip-size');
let ora = require('ora');
let AdaBundler = require("./bundler/ada");
let EntryBundler = require("./bundler/entry");

class Outputer {
    constructor(config, sourceMap) {
        this._config = config;
        this._sourceMap = sourceMap;
        this._entryBunlder = new EntryBundler(config);
        this._adaBunlder = new AdaBundler(config);
    }

    get config() {
        return this._config;
    }

    outputFiles() {
    }

    outputPackFiles() {
    }

    outputPWAFile() {
    }

    outputIndex() {
    }

    output() {

    }
}

module.exports = Outputer;