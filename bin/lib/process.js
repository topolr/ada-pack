let helper = require("../../src/util/helper");
let DevServer = require("./../lib/server");

let appInfo = helper.getAppInfo(process.cwd(), false);
return new DevServer(appInfo).start().then(() => {
	process.send({type: "done"});
});