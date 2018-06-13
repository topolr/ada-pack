const cluster = require('cluster');
const os = require('os');

const STATEWAIT = "wait";
const STATEWORK = "work";

const WorkerManager = {
	total: 0,
	isruning: false,
	queue: new Map(),
	queueIds: [],
	workers: {},
	start(workers) {
		if (!this.isruning) {
			this.isruning = true;
			this.workers = workers;
			if (cluster.isMaster) {
				os.cpus().map(() => {
					cluster.fork();
				});
				Reflect.ownKeys(cluster.workers).forEach(id => {
					cluster.workers[id].state = STATEWAIT;
					cluster.workers[id].on('message', (msg) => {
						this._done(cluster.workers[id], msg, id);
					});
				});
			} else {
				process.on('message', (msg) => {
					this.workers[msg.type](msg.parameter).then(info => {
						process.send(info);
					});
				});
			}
		}
	},
	request(msg, fn) {
		let id = "A" + this.total++;
		this.queueIds.push(id);
		this.queue.set(id, {
			msg: msg,
			fn
		});
		this._next();
	},
	requestPromise(msg) {
		return new Promise(resolve => {
			this.request(msg, resolve);
		});
	},
	_next() {
		if (cluster.isMaster) {
			let workerId = Reflect.ownKeys(cluster.workers).find(id => cluster.workers[id].state === STATEWAIT);
			if (workerId) {
				this.queueIds.find(id => {
					let info = this.queue.get(id);
					if (!info.isrun) {
						info.isrun = true;
						cluster.workers[workerId].task = id;
						cluster.workers[workerId].state = STATEWORK;
						cluster.workers[workerId].send(info.msg);
						// console.log(`worker[${workerId}] is start task[${id}]`);
						return true;
					}
				});
			}
		}
	},
	_done(worker, data, workerId) {
		worker.state = STATEWAIT;
		let id = worker.task;
		let info = this.queue.get(id);
		this.queue.delete(id);
		this.queueIds.splice(this.queueIds.indexOf(id), 1);
		info && info.fn && info.fn(data);
		console.log(`worker[${workerId}] is done task[${id}]`);
		this._next();
	}
};

module.exports = WorkerManager;