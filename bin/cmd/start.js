let helper = require("../../src/util/helper");
let DevServer = require("./../lib/server");
let opn = require("opn");

module.exports = {
	command: "start",
	desc: "start server",
	paras: [],
	fn: function () {
		let appInfo = helper.getAppInfo(process.cwd());
		let port = appInfo.server.port;
		new DevServer(appInfo).start().then(() => {
			opn(`http://localhost:${port}`);
		});
	}
};