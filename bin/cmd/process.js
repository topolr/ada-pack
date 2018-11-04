let File = require("../../src/util/file");
let Path = require("path");
let helper = require("../../src/util/helper");

module.exports = {
    command: "process",
    desc: "start server as a sub process",
    paras: [],
    fn: function () {
        let appInfo = helper.getAppInfo(process.cwd());
        let port = appInfo.server.port || 8080;
        let distPath = appInfo.distPath;
        let serverPath = Path.resolve(appInfo.projectPath, (appInfo.server.serverPath || "./server.js"));
        let app = null;
        if (!new File(serverPath).isExists()) {
            app = new require(Path.resolve(appInfo.projectPath, "./node_modules/express"))();
        } else {
            app = require(serverPath);
        }
        app.use(express.static(distPath));
        app.get("/", (req, res) => {
            res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
        });
        if (appInfo.proxy && appInfo.proxy.server) {
            let proxyMiddleWare = require(Path.resolve(projectPath, "./node_modules/http-proxy-middleware"));
            app.use(appInfo.proxy.path, proxyMiddleWare(Object.assign({
                target: "",
                changeOrigoin: true
            }, appInfo.proxy.option, {
                target: appInfo.proxy.server
            })));
        }
        app.get('*', function (req, res) {
            res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
        });
        app.listen(port, () => {
            process.send({type: "done"});
        });
    }
};