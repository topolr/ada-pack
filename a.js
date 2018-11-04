let Packer = require("./src/index");

let packer = new Packer({
    basePath: "/Users/wangjinliang/git/ada/app",
    projectPath: "/Users/wangjinliang/git/ada",
    sourcePath: "./src/",
    distPath: "./dist/",
    indexPath: "./dist/index.html",
    siteURL: "/",
    main: "./src/root.js",
    initer: "",
    entryPath: "./src/entries",
});


packer.pack().then(() => {
    packer.sourceMap.map().then(() => {
        console.log(packer.sourceMap);
        debugger;
    });
});