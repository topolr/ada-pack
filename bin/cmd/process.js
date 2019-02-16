let helper = require("../../src/util/helper");
let DevServer = require("./../lib/server");

module.exports = {
    command: "process",
    desc: "start server as a sub process,mode[ develop | publish ]",
    paras: ["mode"],
    fn: function (arguments) {
        let mode = arguments[0], type = mode && mode === 'develop';
        let appInfo = helper.getAppInfo(process.cwd(), type);
        let config = Array.isArray(appInfo) ? appInfo[0] : appInfo;
        new DevServer(config).start().then(() => {
            process.send({type: "done"});
        });
    }
};