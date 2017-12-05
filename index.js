let bundler = require("./base/bundler");
let path = require("path");
let chokidar = require('chokidar');
let Path = require("path");
let package = require("./package.json");
let colors = require("colors");
let uglify = require("uglify-js");
let babel = require("babel-core");
let util = require("./base/util");

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

function showTips() {
    console.log(colors.blue.bold(` ☰ ADA-PACK ${package.version} ☰`));
}

module.exports = {
    develop(appPath = "", fn) {
        showTips();
        let config = util.getAppInfo(appPath);
        let basePath = path.resolve(appPath, "./../");
        let _bundler = bundler(Object.assign({
            base_path: basePath,
            develop: true,
            projectPath: path.resolve(__dirname, "./../../")
        }, config));
        chokidar.watch(path.resolve(basePath, config.source_path), {ignored: /[\/\\]\./}).on('change', function (path) {
            waiter.add("edit", path);
        }).on('add', function (path) {
            waiter.add("add", path);
        }).on('unlink', function (path) {
            waiter.add("remove", path);
        }).on("ready", function () {
            waiter.setHandler(function (a, times) {
                if (a.add) {
                    _bundler.addFiles(a.add).then(r => {
                        fn && fn({
                            type: "add",
                            files: a.add.map(a => a.substring(Path.resolve(basePath, config.source_path).length + 1).replace(/\\/g, "/")),
                            map: r
                        });
                    });
                } else if (a.edit) {
                    _bundler.editFiles(a.edit).then(r => {
                        fn && fn({
                            type: "edit",
                            files: a.edit.map(a => a.substring(Path.resolve(basePath, config.source_path).length + 1).replace(/\\/g, "/")),
                            map: r
                        });
                    });
                } else if (a.remove) {
                    _bundler.editFiles(a.remove).then(r => {
                        fn && fn({
                            type: "remove",
                            files: a.remove.map(a => a.substring(Path.resolve(basePath, config.source_path).length + 1).replace(/\\/g, "/")),
                            map: r
                        });
                    });
                }
            });
        }).on("error", function () {
        });
    },
    publish(appPath = "") {
        showTips();
        let config = util.getAppInfo(appPath);
        let basePath = path.resolve(appPath, "./../");
        let _bundler = bundler(Object.assign({
            base_path: basePath,
            develop: false,
            projectPath: path.resolve(__dirname, "./../../")
        }, config));
        return _bundler.publish();
    }
};