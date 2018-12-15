let {File} = require("ada-util");
let Path = require("path");
let ora = require('ora');
let detectInstalled = require("detect-installed");

class DevServer {
    constructor(appInfo) {
        this._appInfo = appInfo;
    }

    get appInfo() {
        return this._appInfo;
    }

    _setup() {
        let appInfo = this._appInfo;
        let express = require(Path.resolve(appInfo.projectPath, "./node_modules/express"));
        let ps = Promise.resolve();
        if (appInfo.server && appInfo.server.proxy) {
            let name = "http-proxy-middleware";
            ps = ps.then(() => {
                return detectInstalled(name, {
                    local: true
                }).then(exists => {
                    if (!exists) {
                        let installSpinner = ora({color: "yellow", text: "INSTALL " + name}).start();
                        return new Promise((resolve, reject) => {
                            let args = ["install", name, "--save-dev"];
                            require("child_process").exec(`npm ${args.join(" ")}`, {
                                encoding: "utf-8",
                                cwd: appInfo.projectPath
                            }, (error, stdout, stderr) => {
                                if (error) {
                                    reject(name);
                                } else {
                                    resolve(name);
                                }
                            });
                        }).then(() => installSpinner.stop(), () => installSpinner.stop());
                    }
                });
            });
        }
        return ps.then(() => {
            if (!appInfo.server) {
                appInfo.server = {
                    protocol: "http",
                    host: "localhost",
                    port: "8080",
                    serverPath: "./server.js"
                };
            }
            let distPath = appInfo.distPath;
            let serverPath = Path.resolve(appInfo.projectPath, (appInfo.server.serverPath || "./server.js"));
            let app = null;
            if (!new File(serverPath).exist) {
                app = new express();
            } else {
                app = require(serverPath);
            }
            app.use(express.static(distPath));
            app.get("/", (req, res) => {
                res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
            });
            if (appInfo.indexPaths) {
                appInfo.indexPaths().forEach(path => {
                    app.get(path, (req, res) => {
                        res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
                    });
                });
            }
            if (appInfo.server.proxy) {
                let proxyMiddleWare = require(Path.resolve(appInfo.projectPath, "./node_modules/http-proxy-middleware"));
                let proxies = [];
                if (!Array.isArray(appInfo.server.proxy)) {
                    proxies = [appInfo.server.proxy];
                } else {
                    proxies = appInfo.server.proxy;
                }
                proxies.forEach(proxy => {
                    app.use(proxy.path, proxyMiddleWare(proxy.option));
                });
            }
            return app;
        });
    }

    start(fn) {
        return this._setup().then(app => {
            let ps = Promise.resolve();
            if (fn) {
                ps = ps.then(() => fn(app));
            }
            let port = this.appInfo.server.port || 8080;
            return ps.then(() => {
                return new Promise(resolve => {
                    app.listen(port, () => {
                        console.log(`[ADA-PACK]`.grey, `RUN SERVER PORT [`.green, port, `]`.green);
                        resolve();
                    });
                });
            }).then(() => app);
        });
    }
}

module.exports = DevServer;