var map = require("./../../package.json");
module.exports = {
    command: "version",
    desc: "version",
    paras: [],
    fn: function () {
        console.log(` version ${map.version}`.yellow);
    }
};