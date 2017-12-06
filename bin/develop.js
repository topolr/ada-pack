let File = require("../base/lib/file");
let Path = require("path");
let util = require("./../base/util");

let messageQueue = {
    listeners: [],
    subscribe(fn) {
        this.listeners.push(fn);
        return this;
    },
    add(info) {
        this.listeners.forEach(fn => {
            fn(info);
        });
        return this;
    }
};

function openIndex(path, url, fn) {
    setTimeout(() => {
        if (new File(path).isExists()) {
            opn(url);
            fn && fn();
        } else {
            openIndex(path, url);
        }
    }, 500);
}

function handle(app) {
    app.listenDev = function () {
        let paras = [...arguments];
        let appPath = paras.shift();
        let server = null;
        let fn = null;
        if (typeof paras[paras.length - 1] === "function") {
            fn = paras.pop();
        }
        paras.push(function () {
            let host = "localhost", port = server.address().port;
            let info = util.getAppInfo(appPath);
            let distPath = Path.resolve(appPath, "./../", info.dist_path, "./index.html");
            require("./../index").develop(appPath, ({type, files, map}) => {
                messageQueue.add({type, files, map});
            });
            openIndex(distPath, `http://${host}:${port}`, function () {
                fn && fn();
            });
        });
        server = app.listen(...paras);
        return server;
    };
    app.use("/ada/sse", (req, res) => {
        res.writeHead(200, {
            'Connection': 'keep-alive',
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
        });
        res.write("retry: 10000\n");
        messageQueue.subscribe((info) => {
            res.write("id: " + Date.now() + "\ndata: " + JSON.stringify(info) + "\n\n");
        });
    });
    return app;
};

function runDev() {
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
    let port = package.adaDev.port;
    let appPath = Path.resolve(packagePath, "./../", package.adaDev.appPath);
    if (!new File(appPath).isExists()) {
        appPath = Path.resolve(projectPath, "./app.js");
    }
    let appInfo = util.getAppInfo(appPath);
    let distPath = Path.resolve(appPath, "./../", appInfo.dist_path);
    let serverPath = Path.resolve(projectPath, package.adaDev.serverPath);
    let app = null;
    if (!new FIle(serverPath).isExists()) {
        app = new express();
    } else {
        app = require(serverPath);
    }
    app.use(express.static(distPath));
    app.get("/", (req, res) => {
        res.send(require("fs").readFileSync(Path.resolve(distPath, "./index.html"), "utf-8"));
    });
    app = handle(app);
    app.listenDev(appPath, port);
}
runDev();