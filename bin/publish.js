let File = require("../base/lib/file");
let Path = require("path");
let util = require("./../base/util");

function publish() {
    let projectPath = Path.resolve(__dirname, "./../../../");
    let express = require(Path.resolve(projectPath, "./node_modules/express"));
    let packagePath = Path.resolve(projectPath, "./package.json");
    let package = JSON.parse(new File(packagePath).readSync());
    if (!package.adaDev) {
        package.adaDev = {
            port: 8080,
            appPath: "./app/app.js",
            serverPath: "./server.js"
        };
    }
    let appPath = Path.resolve(packagePath, "./../", package.adaDev.appPath);
    if (!new File(appPath).isExists()) {
        appPath = Path.resolve(projectPath, "./app.js");
    }
    return require("./../index").publish(appPath);
}

publish();