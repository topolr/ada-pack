let DevServer = require("./../lib/server");
let opn = require("opn");
let config = require("./../../src/config/index");

module.exports = {
    command: "start",
    desc: "start server",
    paras: [],
    fn: function () {
        let port = config.server.port;
        new DevServer(config).start().then(() => {
            opn(`http://localhost:${port}`);
        });
    }
};