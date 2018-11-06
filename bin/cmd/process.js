let helper = require("../../src/util/helper");
let DevServer = require("./../lib/server");

module.exports = {
	command: "process",
	desc: "start server as a sub process",
	paras: [],
	fn: function () {
		let appInfo = helper.getAppInfo(process.cwd());
		new DevServer(appInfo).start();
	}
};