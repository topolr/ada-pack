let colors = require("colors");
let ora = require('ora');
let {DistRenderer} = require("adajs/server");
let Path = require("path");
let {File} = require("ada-util");
let Packer = require("./../../index");

module.exports = {
	command: "ssr",
	desc: "out put static files by ssr",
	paras: [],
	fn: function () {
		let appInfo = helper.getAppInfo(process.cwd(), true);
		if (appInfo.ssr.output) {
			const distPath = Path.resolve(appInfo.projectPath, appInfo.ssr.output);
			let spinner = ora({color: "yellow", text: '[SSR] START TO PUBLISH PROJECT'});
			Packer.publish(appInfo, false).then(() => {
				spinner.succeed();
				spinner = ora({color: "yellow", text: '[SSR] PUBLISH PROJECT DONE,START SERVER'});
				let server = require('child_process').spawn("node", [Path.resolve(__dirname, "./../lib/process.js")], {
					cwd: process.cwd(),
					stdio: ['inherit', 'inherit', 'inherit', 'ipc']
				});
				server.on("message", a => {
					if (a.type === 'done') {
						spinner.succeed();
						spinner = ora({color: "yellow", text: '[SSR] SERVER STARTED,START SSR'});
						let renderer = new DistRenderer({
							origin: "http://localhost:8080",
							distPath
						});
						let startTime = new Date().getTime();
						renderer.outputURLs(appInfo.ssr.urls).then(results => {
							Reflect.ownKeys(results).reduce((a, path) => {
								return a.then(() => new File(Path.resolve(distPath, `.${path === '/' ? '/index.html' : path}`)).write(results[path]));
							}, Promise.resolve());
						}).then(() => {
							spinner.succeed();
							spinner = ora({
								color: "yellow",
								text: `[SSR] ALL DONE IN ${new Date().getTime() - startTime}ms`
							});
							server.kill();
						});
					}
				});
				server.on('close', () => {
					console.log(`[SSR] SERVER HAS STOPPED`.green);
				});
			});
		} else {
			console.log(`[SSR] Error output path can not empty in config file`.red);
		}
	}
};