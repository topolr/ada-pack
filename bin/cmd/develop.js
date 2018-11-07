let helper = require("../../src/util/helper");
let DevServer = require("./../lib/server");
let ora = require('ora');
let opn = require("opn");

let connected = false;
let messageQueue = {
	listeners: [],
	subscribe(fn) {
		this.listeners.push(fn);
		return this;
	},
	add(info) {
		this.listeners.forEach(fn => {
			fn(info);
		});
		return this;
	}
};

module.exports = {
	command: "dev",
	desc: "develop",
	paras: [],
	fn: function () {
		let waitTime = 5000;
		let appInfo = helper.getAppInfo("/Users/wangjinliang/git/ada", true);
		let port = appInfo.server.port;
		return require("../../index").develop(appInfo, ({type, files, map, log}) => {
			messageQueue.add({type, files, map, log});
		}).then(() => {
			new DevServer(appInfo).start().then(app => {
				app.use("/ada/sse", (req, res) => {
					res.writeHead(200, {
						'Connection': 'keep-alive',
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache'
					});
					res.write(`retry: ${waitTime}\n`);
					res.write("id: " + Date.now() + "\ndata:{}\n\n");
					messageQueue.subscribe((info) => {
						res.write("id: " + Date.now() + "\ndata: " + JSON.stringify(info) + "\n\n");
					});
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
						messageQueue.add({type: "reload"});
						spinner.stop();
					} else if (num === count) {
						clearInterval(intevalId);
						opn(`http://localhost:${port}`);
						spinner.stop();
					}
				}, 1000);
			});
		});
	}
};