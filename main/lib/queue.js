class queue {
    constructor(tasks = [], option = {delay: 0, progress: null}) {
        this._tasks = tasks.map((task, index) => {
            return {
                index, task
            };
        });
        this._option = option;
        this._successTask = [];
        this._failTask = [];
        this._total = this._tasks.length;

        return new Promise((resolve, reject) => {
            this._next(result => {
                resolve({success: this._successTask, fail: this._failTask});
            });
        });
    }

    _next(fn) {
        setTimeout(() => {
            if (this._tasks.length > 0) {
                let task = this._tasks.shift();
                task.task().then(result => {
                    this._successTask.push(result);
                    this._option.progress && this._option.progress(result, true, this._tasks.length, this._total);
                    this._next(fn);
                }, err => {
                    this._failTask.push({index: task.index, error: err});
                    this._option.progress && this._option.progress(result, false, this._tasks.length, this._total);
                    this._next(fn);
                });
            } else {
                fn && fn(this._result);
            }
        }, this._option.delay);
    }
}

module.exports = function (tasks, option) {
    return new queue(tasks, option);
};