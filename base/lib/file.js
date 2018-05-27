let Path = require("path");
let fs = require("fs");
let Hash = require("./md5");

let util = {
    make(path) {
        let dirpath = Path.normalize(path).replace(/\\/g, "/");
        if (!fs.existsSync(dirpath)) {
            let a = dirpath.split("/"), pathtmp = a[0] === "" ? "/" : "";
            let b = a.pop();
            a.forEach(_dot => {
                pathtmp += _dot;
                if (!fs.existsSync(pathtmp)) {
                    fs.mkdirSync(pathtmp);
                }
                pathtmp += "/";
            });
            pathtmp = pathtmp + "/" + b;
            fs.closeSync(fs.openSync(pathtmp, "w"));
        }
    },
    move(from, to) {
        return new Promise((resolve, reject) => {
            util.make(to);
            let source = fs.createReadStream(from), dest = fs.createWriteStream(to);
            source.pipe(dest);
            source.on('end', function () {
                fs.unlink(from, function () {
                    resolve(new file(to));
                });
            });
            source.on('error', function (err) {
                reject(err);
            });
        });
    },
    copy(from, to) {
        return new Promise((resolve, reject) => {
            util.make(to);
            let source = fs.createReadStream(from), dest = fs.createWriteStream(to);
            source.pipe(dest);
            source.on('end', function () {
                resolve(new file(to));
            });
            source.on('error', function (err) {
                reject(err);
            });
        });
    },
    mkdir(path) {
        let dirpath = Path.normalize(path).replace(/\\/g, "/");
        if (!fs.existsSync(dirpath)) {
            let a = dirpath.split("/"), pathtmp = a[0] === "" ? "/" : "";
            a.forEach(_dot => {
                pathtmp += _dot;
                if (!fs.existsSync(pathtmp)) {
                    fs.mkdirSync(pathtmp);
                }
                pathtmp += Path.sep;
            });
        }
    }
};

class file {
    constructor(path) {
        this._path = Path.normalize(path);
    }

    remove() {
        return new Promise((resolve, reject) => {
            let path = this._path;
            if (fs.existsSync(path)) {
                let stats = fs.statSync(path);
                if (stats.isDirectory()) {
                    let deleteFolderRecursive = function (path) {
                        let files = [];
                        if (fs.existsSync(path)) {
                            files = fs.readdirSync(path);
                            files.forEach((file, index) => {
                                let curPath = path + "/" + file;
                                if (fs.statSync(curPath).isDirectory()) {
                                    deleteFolderRecursive(curPath);
                                } else {
                                    fs.unlinkSync(curPath);
                                }
                            });
                            fs.rmdirSync(path);
                        }
                    };
                    deleteFolderRecursive(path);
                    resolve();
                } else {
                    fs.unlink(path, () => {
                        resolve();
                    });
                }
            } else {
                resolve();
            }
        });
    }

    read(option) {
        let ops = {
            encoding: "utf8",
            flag: 'r'
        };
        Object.assign(ops, option);
        return new Promise((resolve, reject) => {
            fs.readFile(this._path, ops, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    readSync(encode) {
        return fs.readFileSync(this._path, encode || "utf-8");
    }

    scan(fn) {
        let path = this._path;
        let fileList = [], folderList = [];
        let walk = function (path, fileList, folderList) {
            try {
                fs.readdirSync(path).forEach((item) => {
                    let tmpPath = path + item, stats = fs.statSync(tmpPath);
                    if (stats.isDirectory()) {
                        let r = tmpPath;
                        if (fn) {
                            r = fn(tmpPath + Path.sep, false);
                        }
                        if (r !== false) {
                            walk(tmpPath + Path.sep, fileList, folderList);
                            if (r) {
                                folderList.push(r);
                            }
                        }
                    } else {
                        let r = tmpPath;
                        if (fn) {
                            r = fn(tmpPath, true);
                        }
                        if (r !== false) {
                            if (r) {
                                fileList.push(r);
                            }
                        }
                    }
                });
            } catch (e) {
            }
        };
        walk(path, fileList, folderList);
        return fileList;
    }

    create() {
        util.make(this._path);
        return this;
    }

    write(content, ops) {
        return new Promise((resolve, reject) => {
            let dirpath = this._path;
            util.make(this._path);
            if (ops) {
                fs.writeFile(dirpath, content, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                fs.writeFile(dirpath, content, ops, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    }

    moveTo(path) {
        let p = this._path;
        let stats = fs.statSync(p);
        if (!stats.isDirectory()) {
            return util.move(p, path);
        } else {
            return new Promise((resolve, reject) => {
                let stats = fs.statSync(path);
                if (stats.isDirectory()) {
                    let list = this.scan((patht, isfile) => {
                        if (isfile) {
                            return {
                                to: Path.normalize(path + patht.substring(p.length)),
                                form: Path.normalize(patht)
                            };
                        }
                    });
                    Promise.all(list.map(item => {
                        return util.move(item.from, item.to);
                    })).then(() => {
                        resolve();
                    }, () => {
                        reject();
                    });
                } else {
                    reject();
                }
            });
        }
    }

    copyTo(path) {
        let p = this._path, stats = fs.statSync(p);
        if (!stats.isDirectory()) {
            return util.copy(p, path);
        } else {
            return new Promise((resolve, reject) => {
                let stats = fs.statSync(path);
                if (stats.isDirectory()) {
                    let list = this.scan((patht, isfile) => {
                        if (isfile) {
                            return {
                                to: Path.normalize(path + patht.substring(p.length)),
                                form: Path.normalize(patht)
                            };
                        }
                    });
                    Promise.all(list.map(item => {
                        return util.copy(item.from, item.to);
                    })).then(() => {
                        resolve();
                    }, () => {
                        reject();
                    });
                } else {
                    reject();
                }
            });
        }
    }

    isFolder() {
        return fs.statSync(this._path).isDirectory();
    }

    isFile() {
        return !fs.statSync(this._path).isDirectory();
    }

    isExists() {
        return fs.existsSync(this._path);
    }

    hash() {
        try {
            if (fs.statSync(this._path).isFile()) {
                return Hash.md5(fs.readFileSync(this._path));
            }
        } catch (e) {
        }
        return "";
    }

    subscan(fn) {
        let tmpPatht = this._path, r = [];
        let stats = fs.statSync(tmpPatht);
        if (stats.isDirectory()) {
            fs.readdirSync(tmpPatht).forEach(function (item) {
                let tmpPath = tmpPatht + Path.sep + item;
                let stats = fs.statSync(tmpPath);
                if (!stats.isDirectory()) {
                    let t = tmpPath;
                    if (fn) {
                        t = fn(tmpPath, true);
                    }
                    if (t !== false) {
                        if (t) {
                            r.push(t);
                        }
                    } else {
                        return false;
                    }
                } else {
                    let t = tmpPath + Path.sep;
                    if (fn) {
                        t = fn(t, false);
                    }
                    if (t !== false) {
                        if (t) {
                            r.push(t);
                        }
                    } else {
                        return false;
                    }
                }
            });
        }
        return r;
    }

    infoSync() {
        return fs.statSync(this._path);
    }

    info() {
        return new Promise((resolve, reject) => {
            fs.stat(this._path, (a, b) => {
                if (!a) {
                    resolve(b);
                } else {
                    reject();
                }
            });
        });
    }

    suffix() {
        let name = this.name();
        if (name) {
            let a = name.split(".");
            if (a.length > 1) {
                return a.pop();
            }
        }
        return "";
    }

    name() {
        if (this.isFile()) {
            return this._path.split(Path.sep).pop();
        }
        return "";
    }

    path() {
        return this._path;
    }

    mkdir() {
        util.mkdir(this._path);
        return this;
    }

    renameSync(newname) {
        fs.renameSync(this._path, newname);
    }

    getFileSizeAuto(radmon) {
        let info = this.infoSync();
        let v = 0, unit = "BYTE", byteSize = info.size;
        radmon = radmon || 0;
        if (byteSize >= 1073741824) {
            v = (byteSize / 1073741824).toFixed(radmon);
            unit = "GB";
        } else if (byteSize >= 1048576) {
            v = (byteSize / 1048576).toFixed(radmon);
            unit = "MB";
        } else if (byteSize >= 1024) {
            v = (byteSize / 1024).toFixed(radmon);
            unit = "KB";
        } else {
            v = byteSize;
            unit = "B";
        }
        return v + unit;
    }
}

module.exports = file;