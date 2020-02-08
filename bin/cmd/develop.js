let ora = require('ora');
let opn = require("opn");
let { randomid } = require("ada-util");
let PassThrough = require('stream').PassThrough;
let DevServer = require("./../lib/server");
let config = require("./../../src/config/index");

let connected = false;
let messageQueue = {
	listeners: [],
	subscribe(id, fn) {
		this.listeners.push({ id, fn });
		return this;
	},
	unsubscribe(id) {
		let index = this.listeners.findIndex(item => item.id === id);
		if (index !== -1) {
			this.listeners.splice(index, 1);
		}
	},
	add(info) {
		this.listeners.forEach(item => {
			item.fn(item.id, info);
		});
		return this;
	}
};

module.exports = {
	command: "dev",
	desc: "develop",
	paras: ["[name]"],
	fn: function (params) {
		let waitTime = 5000;
		let port = config.server.port;
		config.develop = true;
		config.apps.forEach(a => a.develop = true);
		return require("../../index").develop(({ type, files, map, log, name, app }) => {
			if (config.server.enable) {
				messageQueue.add({ type, files, map, log, name, app });
			}
		}).then((packers) => {
			if (config.server.enable) {
				new DevServer(config).start().then(app => {
					app.use((context, next) => {
						if (context.request.path === "/ada/sse") {
							connected = true;
							const stream = new PassThrough();
							let id = randomid(20);
							context.res.writeHead(200, {
								'Connection': 'keep-alive',
								'Content-Type': 'text/event-stream',
								'Cache-Control': 'no-cache'
							});
							stream.write("id: " + id + "\ndata:" + JSON.stringify(packers[0].getCurrentState("start")) + "\n\n");
							messageQueue.subscribe(id, (id, info) => {
								stream.write("id: " + id + "\ndata: " + JSON.stringify(info) + "\n\n");
							});
							context.req.on("close", function () {
								messageQueue.unsubscribe(id);
							});
							context.body = stream;
						} else {
							return next();
						}
					});
				}).then(() => {
					let spinner = ora({
						color: "yellow",
						text: `OPEN OR REFRESH BROWSER`
					}).start();
					let count = waitTime / 1000, num = 0;
					let intevalId = setInterval(() => {
						num += 1;
						if (connected) {
							clearInterval(intevalId);
							messageQueue.add({ type: "reload" });
							spinner.stop();
						} else if (num === count) {
							clearInterval(intevalId);
							opn(`http://localhost:${port}`);
							spinner.stop();
						}
					}, 1000);
				});
			}
		});
	}
};