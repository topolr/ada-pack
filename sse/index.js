let opn = require('opn');
let util = require("./../base/util");
let Path = require("path");
let File = require("./../lib/file");

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

function openIndex(path, url) {
    setTimeout(() => {
        if (new File(path).isExists()) {
            opn(url);
        } else {
            openIndex(path, url);
        }
    }, 500);
}

module.exports = function (app) {
    app.listenDev = function () {
        let paras = arguments;
        let appPath = paras.shift();
        let fn = paras.pop();
        let server = null;
        paras.push(function () {
            let host = "localhost", port = server.address().port;
            let info = util.getAppInfo(appPath);
            let distPath = Path.resolve(appPath, info.dist_path);
            openIndex(distPath, `http://${host}:${port}`);
        });
        server = app.listen(...paras);
        require("./../index").develop(appPath, ({type, files, map}) => {
            messageQueue.add({type, files, map});
        });
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