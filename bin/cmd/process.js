let File = require("../../base/lib/file");
let Path = require("path");
let util = require("../../base/util/util");
let ora = require('ora');

function runDev() {
	util.showTips();
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
	return util.getAppInfo(appPath).then(appInfo => {
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
			app.get('*', function (req, res) {
				res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
			});

			app.listen(port, () => {
				process.send({type: "done"});
			});
		});
		return ps;
	});
}

module.exports = {
	command: "process",
	desc: "start server as a sub process",
	paras: [],
	fn: function () {
		runDev();
	}
};