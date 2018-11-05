let util = require("./src/util/helper");
let index = require("./index");
index.develop(util.getAppInfo("/Users/jinliang/git/ada")).catch(e => console.log(e));