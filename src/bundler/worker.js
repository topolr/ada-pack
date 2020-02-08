const EntryPacker = require("./entry");

class WorkerPacker extends EntryPacker {
    getBundleCode(path) {
        path = path.replace(/\\/g, "/");
        this.time = new Date().getTime();
        return this.getCodeMap(path).then(() => {
            this.resultmap.push(path);
            let result = this.resultmap.map(path => {
                return `function(module,exports,require,self){${this.resultmapcode[path]}}`;
            });
            this.content = `(function(p,self){var a={};var r=function(i){if(a[i]){return a[i].exports;}var m=a[i]={exports:{}};p[i].call(m.exports,m,m.exports,r,self);return m.exports;};return r(p.length-1);})([${result.join(",")}],self)`;
            this.ready = true;
            this.time = new Date().getTime() - this.time;
            return this.content;
        });
    }
}

module.exports = WorkerPacker;