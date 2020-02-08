let chokidar = require('chokidar');
let config = require("./src/config/index");
let Pager = require("./src/pager");
let Packer = require("./src/packer");
let chalk = require('chalk');

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

class Queue {
    constructor() {
        this._list = [];
        this._run = false;
    }

    add(fn) {
        return new Promise(resolve => {
            this._list.push({ resolve, fn });
            this._trigger();
        });
    }

    _trigger() {
        if (!this._run) {
            if (this._list.length > 0) {
                this._run = true;
                let { resolve, fn } = this._list.shift();
                Promise.resolve().then(() => fn()).then(a => {
                    this._run = false;
                    resolve(a);
                    this._trigger();
                }, e => {
                    console.log('queue emit error:', e);
                    this._run = false;
                    resolve(e);
                    this._trigger();
                });
            } else {
                this._run = false;
            }
        }
    }
}

const queue = new Queue();

module.exports = {
    develop(fn) {
        console.log(chalk(`ADAPACK`).yellow, chalk(`|`).yellow, `DEVELOP`, chalk(`|`).yellow, chalk(`${require("./package").version}`).magenta);
        console.log(chalk('--------+'.padEnd(25, '-')).rainbow);
        let pager = new Pager(), packers = [];
        return Promise.resolve().then(() => pager.outputAda()).then(() => {
            return config.apps.filter(app => !app.host).reduce((a, b) => {
                return a.then(() => {
                    let packer = new Packer(b);
                    packers.push(packer);
                    return packer.pack().then(() => {
                        let waiter = new Waiter();
                        let paths = packer.getWatchPaths(), pathSet = new Set();
                        paths.forEach(a => pathSet.add(a));
                        if (config.watchNodeModules) {
                            pathSet.add(config.nmodulePath);
                        }
                        chokidar.watch([...pathSet], { ignored: /[\/\\]\./ }).on('change', (path) => waiter.add("edit", path)).on('add', (path) => waiter.add("add", path)).on('unlink', (path) => waiter.add("remove", path)).on("ready", () => {
                            waiter.setHandler((a, times) => {
                                queue.add(() => {
                                    if (times > 0) {
                                        if (a.add) {
                                            return packer.sourceMap.addFiles(a.add).then(() => {
                                                fn && fn(packer.getCurrentState("edit", a.add));
                                            });
                                        } else if (a.edit) {
                                            return packer.sourceMap.editFiles(a.edit).then(() => {
                                                fn && fn(packer.getCurrentState("edit", a.edit));
                                            });
                                        } else if (a.remove) {
                                            return packer.sourceMap.editFiles(a.remove).then(() => {
                                                fn && fn(packer.getCurrentState("edit", a.remove));
                                            });
                                        } else {
                                            return Promise.resolve();
                                        }
                                    } else {
                                        return Promise.resolve();
                                    }
                                });
                            });
                        });
                    });
                });
            }, Promise.resolve());
        }).then(() => pager.outputIndex()).then(() => packers);
    },
    publish(isSSR = false) {
        if (!isSSR) {
            console.log(chalk(`ADAPACK`).yellow, chalk(`|`).green, `PUBLISH`, chalk(`|`).yellow, chalk(`${require("./package").version}`).magenta);
            console.log(chalk('--------+'.padEnd(25, '-')).rainbow);
        }
        let pager = new Pager();
        return Promise.resolve().then(() => pager.outputAda()).then(() => {
            return config.apps.filter(app => !app.host).reduce((a, b) => {
                return a.then(() => new Packer(b).pack());
            }, Promise.resolve());
        }).then(() => pager.outputIndex());
    }
};