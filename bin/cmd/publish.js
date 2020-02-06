module.exports = {
    command: "publish",
    desc: "publish project",
    paras: [],
    fn: function () {
        return require("../../index").publish();
    }
};