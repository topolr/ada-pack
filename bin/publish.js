let File = require("../base/lib/file");
let Path = require("path");
let util = require("./../base/util");

function publish() {
    let projectPath = Path.resolve(__dirname, "./../../../");
    let express = require(Path.resolve(projectPath, "./node_modules/express"));
    let packagePath = Path.resolve(projectPath, "./package.json");
    let package = JSON.parse(new File(packagePath).readSync());
    if (!package["ada-publish"]) {
        package["ada-publish"] = {
            appPath: "./app/app.js"
        };
    } else {
        package["ada-publish"] = Object.assign({
            appPath: "./app/app.js"
        }, package["ada-publish"]);
    }
    let appPath = Path.resolve(packagePath, "./../", package["ada-publish"].appPath);
    if (!new File(appPath).isExists()) {
        appPath = Path.resolve(projectPath, "./app.js");
    }
    return require("./../index").publish(appPath);
}

publish();