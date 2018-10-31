let File = require("../../base/lib/file");
let Path = require("path");
let util = require("../../base/util/util");

function publish() {
    util.showTips();
    let projectPath = process.cwd();
    let packagePath = Path.resolve(projectPath, "./package.json");
    let packageInfo = JSON.parse(new File(packagePath).readSync());
    if (!packageInfo["ada-publish"]) {
        packageInfo["ada-publish"] = {
            appPath: "./app/app.js"
        };
    } else {
        packageInfo["ada-publish"] = Object.assign({
            appPath: "./app/app.js"
        }, packageInfo["ada-publish"]);
    }
    let appPath = Path.resolve(packagePath, "./../", packageInfo["ada-publish"].appPath);
    if (!new File(appPath).isExists()) {
        appPath = Path.resolve(projectPath, "./app.js");
    }
    return require("../../index").publish(appPath);
}

module.exports = {
	command: "publish",
	desc: "publish project",
	paras: [],
	fn: function () {
		publish();
	}
};