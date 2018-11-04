let Packer = require("./src/index");
let util = require("./src/util/helper");

let packer = new Packer(util.getAppInfo("/Users/wangjinliang/git/ada"));

packer.pack().then(() => {
    console.log('=======>000');
});