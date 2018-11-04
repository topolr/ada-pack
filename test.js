// let Packer = require("./src/index");
let util = require("./src/util/helper");
//
// let packer = new Packer();
//
// packer.pack().then(() => {
//     console.log('=======>000');
// });

let index = require("./index");
index.develop(util.getAppInfo("/Users/wangjinliang/git/ada")).catch(e=>console.log(e));