let DevServer = require("./../lib/server");
let config = require("./../../src/config/index");

module.exports = {
    command: "process",
    desc: "start server as a sub process",
    paras: [],
    fn: function () {
        new DevServer(config).start().then(() => {
            process.send && process.send({ type: "done" });
        });
    }
};