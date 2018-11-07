let helper = require("../../src/util/helper");

module.exports = {
	command: "publish",
	desc: "publish project",
	paras: [],
	fn: function () {
		return require("../../index").publish(helper.getAppInfo(process.cwd(), false));
	}
};