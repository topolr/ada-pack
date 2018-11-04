let colors = require("colors");
let path = require("path");
let chokidar = require('chokidar');
let Path = require("path");
let Packer = require("./src/index");

module.exports = {
    develop(config, fn) {
        return new Promise((resolve, reject) => {
            let waiter = {
                _data: {},
                _tid: null,
                _time: 500,
                _fn: null,
                _times: 0,
                add: function (type, path) {
                    if (!this._data[type]) {
                        this._data[type] = [];
                    }
                    if (this._data[type].indexOf(path) === -1) {
                        this._data[type].push(path);
                    }
                    if (this.tid !== null) {
                        clearTimeout(this.tid);
                    }
                    setTimeout(() => {
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
                },
                setHandler: function (fn) {
                    this._fn = fn;
                    return this;
                }
            };
            let packer = new Packer(Object.assign(config, {develop: true}));
            let basePath = config.basePath;
            packer.pack().then(() => {
                chokidar.watch(path.resolve(basePath, config.sourcePath), {ignored: /[\/\\]\./}).on('change', function (path) {
                    waiter.add("edit", path);
                }).on('add', function (path) {
                    waiter.add("add", path);
                }).on('unlink', function (path) {
                    waiter.add("remove", path);
                }).on("ready", function () {
                    waiter.setHandler(function (a, times) {
                        if (a.add) {
                            packer.sourceMap.addFiles(a.add).then((info) => {
                                fn && fn({
                                    type: "add",
                                    files: a.add.map(a => a.substring(Path.resolve(basePath, config.sourcePath).length + 1).replace(/\\/g, "/")),
                                    map: packer.sourceMap.outputer.getSourceMap(),
                                    log: packer.sourceMap.outputer.getLogInfo()
                                });
                            });
                        } else if (a.edit) {
                            packer.sourceMap.editFiles(a.edit).then((info) => {
                                fn && fn({
                                    type: "edit",
                                    files: a.edit.map(a => a.substring(Path.resolve(basePath, config.sourcePath).length + 1).replace(/\\/g, "/")),
                                    map: packer.sourceMap.outputer.getSourceMap(),
                                    log: packer.sourceMap.outputer.getLogInfo()
                                });
                            });
                        } else if (a.remove) {
                            packer.sourceMap.editFiles(a.remove).then((info) => {
                                fn && fn({
                                    type: "remove",
                                    files: a.remove.map(a => a.substring(Path.resolve(basePath, config.sourcePath).length + 1).replace(/\\/g, "/")),
                                    map: packer.sourceMap.outputer.getSourceMap(),
                                    log: packer.sourceMap.outputer.getLogInfo()
                                });
                            });
                        }
                    });
                });
                resolve();
            }, (e) => {
                reject(e);
            });
        });
    },
    publish(config) {
        return new Packer(Object.assign(config, {develop: false})).pack();
    }
};