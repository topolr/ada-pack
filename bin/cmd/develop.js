let helper = require("../../src/util/helper");
let DevServer = require("./../lib/server");
let {randomid} = require("ada-util");
let ora = require('ora');
let opn = require("opn");

let connected = false;
let messageQueue = {
    listeners: [],
    subscribe(id, fn) {
        this.listeners.push({id, fn});
        return this;
    },
    unsubscribe(id) {
        let index = this.listeners.findIndex(item => item.id === id);
        if (index !== -1) {
            this.listeners.splice(index, 1);
        }
    },
    add(info) {
        this.listeners.forEach(item => {
            item.fn(item.id, info);
        });
        return this;
    }
};

module.exports = {
    command: "dev",
    desc: "develop",
    paras: ["[name]"],
    fn: function (params) {
        let name = params[0];
        let waitTime = 5000;
        let appInfo = helper.getAppInfo(process.cwd(), name, true);
        let config = Array.isArray(appInfo) ? appInfo[0] : appInfo, port = config.server.port;
        return require("../../index").develop(appInfo, ({type, files, map, log, name}) => {
            messageQueue.add({type, files, map, log, name});
        }).then((packers) => {
            new DevServer(config).start().then(app => {
                app.use("/ada/sse", (req, res) => {
                    connected = true;
                    let id = randomid(20);
                    res.writeHead(200, {
                        'Connection': 'keep-alive',
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache'
                    });
                    res.write(`retry: 2000\n`);
                    res.write("id: " + id + "\ndata:" + JSON.stringify(packers[0].getCurrentState("start")) + "\n\n");
                    req.on("close", function () {
                        messageQueue.unsubscribe(id);
                    });
                    messageQueue.subscribe(id, (id, info) => {
                        res.write("id: " + id + "\ndata: " + JSON.stringify(info) + "\n\n");
                    });
                });
            }).then(() => {
                let spinner = ora({
                    color: "yellow",
                    text: `OPEN OR REFRESH BROWSER`
                }).start();
                let count = waitTime / 1000, num = 0;
                let intevalId = setInterval(() => {
                    num += 1;
                    if (connected) {
                        clearInterval(intevalId);
                        messageQueue.add({type: "reload"});
                        spinner.stop();
                    } else if (num === count) {
                        clearInterval(intevalId);
                        opn(`http://localhost:${port}`);
                        spinner.stop();
                    }
                }, 1000);
            });
        });
    }
};