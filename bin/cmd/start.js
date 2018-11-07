let helper = require("../../src/util/helper");
let DevServer = require("./../lib/server");
let opn = require("opn");

module.exports = {
	command: "start",
	desc: "start server,mode[ develop | publish ]",
	paras: ["mode"],
	fn: function (params) {
		let mode = params[0], type = mode && mode === 'develop';
		let appInfo = helper.getAppInfo(process.cwd(), type);
		let port = appInfo.server.port;
		new DevServer(appInfo).start().then(() => {
			opn(`http://localhost:${port}`);
		});
	}
};