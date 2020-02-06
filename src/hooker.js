class Hooker {
    constructor(sourceMap) {
        this._hooks = {};
        this._sourceMap = sourceMap;
    }

    hook(type, fn) {
        if (!this._hooks[type]) {
            this._hooks[type] = [];
        }
        if (this._hooks[type].indexOf(fn) === -1) {
            this._hooks[type].push(fn);
        }
        return this;
    }

    unhook(type, fn) {
        if (this._hooks[type]) {
            let index = this._hooks[type].indexOf(fn);
            if (index !== -1) {
                this._hooks[type].splice(index, 1);
            }
        }
    }

    excute(type, data) {
        if (this._hooks[type]) {
            return this._hooks[type].reduce((a, hook) => {
                return a.then(() => {
                    try {
                        return hook(data, this._sourceMap);
                    } catch (e) {
                        console.log(e);
                    }
                });
            }, Promise.resolve());
        } else {
            return Promise.resolve();
        }
    }
}

module.exports = Hooker;