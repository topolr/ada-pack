let pack = require("./base/mpacker");
let file = require("./base/util/file");

// pack("bootstrap", `G:/testjs/`);
pack("autoprefixer").then(info => {
    return new file("G:/testjs/result.js").write(info.reverse().map(a => a.code).join("\n"));
});