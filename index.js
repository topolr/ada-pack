let colors = require("colors");
let chokidar = require('chokidar');
let Packer = require("./src/index");

class Waiter {
    constructor() {
        this._data = {};
        this._tid = null;
        this._time = 500;
        this._fn = null;
        this._times = 0;
    }

    add(type, path) {
        if (!this._data[type]) {
            this._data[type] = [];
        }
        if (this._data[type].indexOf(path) === -1) {
            this._data[type].push(path);
        }
        if (this._tid !== null) {
            clearTimeout(this._tid);
        }
        this._tid = setTimeout(() => {
            let _has = false;
            for (let i in this._data) {
                _has = true;
            }
            if (_has) {
                this._fn && this._fn(this._data, this._times);
                this._times++;
            }
            this._data = {};
            this._tid = null;
        }, this._time);
        return this;
    }

    setHandler(fn) {
        this._fn = fn;
        return this;
    }
}

module.exports = {
    develop(config, fn) {
        return new Promise((resolve, reject) => {
            let configs = config;
            if (!Array.isArray(config)) {
                configs = [config];
            }
            console.log(` ADA-PACK `.yellow, `${(configs[0].develop ? 'DEVELOP' : 'PUBLISH')}`, `|`.yellow, `${require("./package").version}`.magenta);
            let packers = [];
            return configs.reduce((aa, config) => {
                return aa.then(() => {
                    let packer = new Packer(Object.assign(config, {develop: true}));
                    return packer.pack().then(() => {
                        let waiter = new Waiter();
                        chokidar.watch(packer.getWatchPaths(), {ignored: /[\/\\]\./}).on('change', (path) => waiter.add("edit", path)).on('add', (path) => waiter.add("add", path)).on('unlink', (path) => waiter.add("remove", path)).on("ready", () => {
                            waiter.setHandler((a, times) => {
                                if (times > 0) {
                                    if (a.add) {
                                        packer.sourceMap.addFiles(a.add).then(() => {
                                            fn && fn(Object.assign({
                                                files: packer.getChangedModule(a.add),
                                                name: packer.config.name
                                            }, packer.getCurrentState("edit")));
                                        });
                                    } else if (a.edit) {
                                        packer.sourceMap.editFiles(a.edit).then(() => {
                                            fn && fn(Object.assign({
                                                files: packer.getChangedModule(a.edit),
                                                name: packer.config.name
                                            }, packer.getCurrentState("edit")));
                                        });
                                    } else if (a.remove) {
                                        packer.sourceMap.editFiles(a.remove).then(() => {
                                            fn && fn(Object.assign({
                                                files: packer.getChangedModule(a.remove),
                                                name: packer.config.name
                                            }, packer.getCurrentState("edit")));
                                        });
                                    }
                                }
                            });
                        });
                        packers.push(packer);
                    });
                });
            }, Promise.resolve()).then(() => {
                resolve(packers);
            });
        });
    },
    publish(config) {
        let configs = config;
        if (!Array.isArray(config)) {
            configs = [config];
        }
        console.log(` ADA-PACK `.yellow, `${(configs[0].develop ? 'DEVELOP' : 'PUBLISH')}`, `|`.yellow, `${require("./package").version}`.magenta);
        return configs.reduce((a, config) => {
            return a.then(() => {
                return new Packer(Object.assign(config, {develop: false})).pack();
            });
        }, Promise.resolve());
    }
};