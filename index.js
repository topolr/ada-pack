let bundler = require("./base/bundler");
let path = require("path");
let chokidar = require('chokidar');
let File = require("./base/util/file");
let basePath = path.resolve(__dirname, "./../../");
let Path=require("path");
let config = null;

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

module.exports = {
    develop(fn) {
        let configPath = path.resolve(basePath + "/", "./.adaboot");
        if (new File(configPath).isExists()) {
            config = JSON.parse(new File(configPath).readSync());
        }
        let _bundler = bundler(Object.assign({basePath, develop: true}, config));
        chokidar.watch(path.resolve(basePath, config.sourcePath), {ignored: /[\/\\]\./}).on('change', function (path) {
            waiter.add("edit", path);
        }).on('add', function (path) {
            waiter.add("add", path);
        }).on('unlink', function (path) {
            waiter.add("remove", path);
        }).on("ready", function () {
            waiter.setHandler(function (a, times) {
                if (a.add) {
                    _bundler.parseFiles(a.add).then(r=>{
                        fn && fn({type: "add", files: a.add.map(a=>a.substring(Path.resolve(basePath,config.sourcePath).length+1).replace(/\\/g,"/")), map: r});
                    });
                } else if (a.edit) {
                    _bundler.parseFiles(a.edit).then(r=>{
                        fn && fn({type: "edit", files: a.edit.map(a=>a.substring(Path.resolve(basePath,config.sourcePath).length+1).replace(/\\/g,"/")), map: r});
                    });
                } else if (a.remove) {
                    _bundler.bundle().then(r=>{
                        fn && fn({type: "remove", files: a.remove.map(a=>a.substring(Path.resolve(basePath,config.sourcePath).length+1).replace(/\\/g,"/")), map: r});
                    });
                }
            });
        }).on("error", function () {
        });
    },
    publish() {
        let configPath = path.resolve(basePath + "/", "./.adaboot");
        if (new File(configPath).isExists()) {
            config = JSON.parse(new File(configPath).readSync());
        }
        let _bundler = bundler(Object.assign({basePath, develop: false}, config));
        return _bundler.bundleAll();
    }
};