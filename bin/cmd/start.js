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
        let config = Array.isArray(appInfo) ? appInfo[0] : appInfo;
        let port = config.server.port;
        new DevServer(config).start().then(() => {
            opn(`http://localhost:${port}`);
        });
    }
};