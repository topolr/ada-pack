let helper = require("../../src/util/helper");

module.exports = {
    command: "publish",
    desc: "publish project",
    paras: ["[name]"],
    fn: function (params) {
        let name = params[0];
        return require("../../index").publish(helper.getAppInfo(process.cwd(), name, false));
    }
};