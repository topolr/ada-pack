let File = require("../../base/lib/file");
let Path = require("path");
let util = require("../../base/util/util");
let opn = require("opn");
let ora = require('ora');

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

function runDev() {
	util.showTips();
	let waitTime = 5000;
	let projectPath = process.cwd();
	let express = require(Path.resolve(projectPath, "./node_modules/express"));
	let packagePath = Path.resolve(projectPath, "./package.json");
	let packageInfo = JSON.parse(new File(packagePath).readSync());
	if (!packageInfo["ada-develop"]) {
		packageInfo["ada-develop"] = {
			appPath: "./app/app.js"
		};
	} else {
		packageInfo["ada-develop"] = Object.assign({
			appPath: "./app/app.js"
		}, packageInfo["ada-develop"]);
	}
	let appPath = Path.resolve(packagePath, "./../", packageInfo["ada-develop"].appPath);
	if (!new File(appPath).isExists()) {
		appPath = Path.resolve(projectPath, "./app.js");
	}
	util.getAppInfo(appPath).then(appInfo => {
		let ps = Promise.resolve();
		if (appInfo.proxy && appInfo.proxy.server) {
			let proxy = new File(Path.resolve(projectPath, "./node_modules/http-proxy-middleware"));
			if (!proxy.isExists()) {
				ps = ps.then(() => {
					return new Promise((resolve, reject) => {
						let name = "http-proxy-middleware";
						let spinner = ora({
							color: "yellow",
							text: `INSTALL MODULE [ ${name} ]`
						}).start();
						let args = ["install", name, "--save-dev"];
						require("child_process").exec(`npm ${args.join(" ")}`, {
							encoding: "utf-8",
							cwd: projectPath
						}, (error, stdout, stderr) => {
							if (error) {
								spinner.fail(`INSTALL MODULE [ ${name} ]`);
								console.log(`Please run > npm install`.red, `${name}`.white, `to install the module`.red);
								reject(name);
							} else {
								spinner.succeed(`INSTALL MODULE [ ${name} ]`);
								resolve(name);
							}
						});
					});
				});
			}
		}
		ps.then(() => {
			if (!appInfo.server) {
				appInfo.server = {
					protocol: "http",
					host: "localhost",
					port: "8080",
					serverPath: "./server.js"
				};
			}
			let port = appInfo.server.port || 8080;
			let host = appInfo.server.host || "localhost";
			let distPath = Path.resolve(appPath, "./../", appInfo.dist_path);
			let serverPath = Path.resolve(projectPath, (appInfo.server.serverPath || "./server.js"));
			let app = null;
			if (!new File(serverPath).isExists()) {
				app = new express();
			} else {
				app = require(serverPath);
			}
			app.use(express.static(distPath));
			app.get("/", (req, res) => {
				res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
			});
			if (appInfo.proxy && appInfo.proxy.server) {
				let proxyMiddleWare = require(Path.resolve(projectPath, "./node_modules/http-proxy-middleware"));
				app.use(appInfo.proxy.path, proxyMiddleWare(Object.assign({
					target: "",
					changeOrigoin: true
				}, appInfo.proxy.option, {
					target: appInfo.proxy.server
				})));
			}
			app.use("/ada/sse", (req, res) => {
				connected = true;
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

			app.get('*', function (req, res) {
				res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
			});

			require("../../index").develop(appPath, ({type, files, map, log}) => {
				messageQueue.add({type, files, map, log});
			}).then(() => {
				app.listen(port, () => {
					console.log("");
					console.log(` ▶ SERVER RUNNING LOCALHOST PORT [: ${port}] `.yellow);
					let desc = `    now try to open the page...`;
					process.stderr.write(desc.grey);
					process.stderr.cursorTo(desc.length);
					let count = waitTime / 1000;
					let num = 0;
					let intevalId = setInterval(() => {
						num += 1;
						process.stderr.clearLine();
						process.stderr.cursorTo(0);
						if (connected) {
							clearInterval(intevalId);
							messageQueue.add({type: "reload"});
							process.stderr.write(`    page is opened,reload it`.grey);
							process.stderr.write(`\n`);
						} else if (num === count) {
							clearInterval(intevalId);
							opn(`http://${host}:${port}`);
							process.stderr.write(`    can not found opened page,open it`.grey);
							process.stderr.write(`\n`);
						} else {
							let rdesc = `    now check [${num}] times ...`;
							process.stderr.write(rdesc.grey);
							process.stderr.cursorTo(rdesc.length);
						}
					}, 1000);
				});
			});
		});
		return ps;
	});
}

module.exports = {
	command: "dev",
	desc: "develop",
	paras: [],
	fn: function () {
		runDev();
	}
};