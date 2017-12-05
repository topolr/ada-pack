let File = require("./../lib/file");
let Path = require("path");
let adaSSE = require("./../sse/index");
let util = require("./../base/util");

function runDev() {
    let projectPath = Path.resolve(__dirname, "./../../../");
    let express = require(Path.resolve(projectPath, "./node_modules/express"));
    let packagePath = Path.resolve(projectPath, "./package.json");
    let package = JSON.parse(new File(packagePath).readSync());
    if (package.adaDev) {
        let port = package.adaDev.port;
        let appPath = Path.resolve(packagePath, "./../", package.adaDev.appPath);
        let appInfo = util.getAppInfo(appPath);
        let distPath = Path.resolve(appPath, "./../", appInfo.dist_path);
        let app = new express();
        app.use(express.static(distPath));
        app.get("/", (req, res) => {
            res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
        });
        app = adaSSE(app);
        app.listenDev(appPath, port);
    } else {
        throw Error("package can not contain adaDev set");
    }
};
runDev();