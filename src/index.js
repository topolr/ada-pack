const config = require("./config/index");
const Packer = require("./packer");
const Pager = require("./pager");

let pager = new Pager();
let ps = Promise.resolve();
ps.then(() => {
    return pager.outputAda();
}).then(() => {
    let targets = config.apps.filter(app => !app.host);
    return targets.reduce((a, b) => {
        return a.then(() => {
            return new Packer(b).pack();
        });
    }, Promise.resolve());
}).then(() => {
    return pager.outputIndex();
});