let colors = require("colors");
let ora = require('ora');
let util = require("./util/helper");

module.exports = function (hooker) {
    let adaSpinner = null;
    let initerSpinner = null;
    let workerSpinner = null;
    let mapSpinner = null;
    let mapTime = 0;
    hooker.hook("beforePack", () => {
        console.log(` ADA-PACK  ${require("./../package").version}`.yellow);
    }).hook("startInstall", (names) => {
    }).hook("beforeInstall", (name) => {
    }).hook("afterInstall", (name) => {
    }).hook("installError", (name) => {
    }).hook("beforeMap", () => {
        mapTime = new Date().getTime();
        mapSpinner = ora({color: "yellow", text: "MAP SOURCE"}).start();
    }).hook("beforeMake", (info) => {
    }).hook("afterMake", (info) => {
    }).hook("afterMap", () => {
        mapSpinner && mapSpinner.stop();
        console.log(`[ADA-PACK]`.grey, `MAPPED [`.green, (new Date().getTime() - mapTime), `ms ]`.green);
    }).hook("beforeOutput", () => {
    }).hook("beforeAda", () => {
        adaSpinner = ora({color: "yellow", text: "BUNDLE ADA CORE"}).start();
    }).hook("afterAda", bundler => {
        adaSpinner && adaSpinner.stop();
        console.log(`[ADA-PACK]`.grey, `ADAJS  [`.green, bundler.getFileSize(), `|`.green, bundler.getGzipSize(), `]`.green);
    }).hook("beforeIniter", () => {
        initerSpinner = ora({color: "yellow", text: "BUNDLE INITER CODE"}).start();
    }).hook("afterIniter", (bundler) => {
        initerSpinner && initerSpinner.stop();
        console.log(`[ADA-PACK]`.grey, `INITER [`.green, bundler.getFileSize(), `|`.green, bundler.getGzipSize(), `]`.green);
    }).hook("beforeWorker", () => {
        workerSpinner = ora({color: "yellow", text: "BUNDLE WORKER"}).start();
    }).hook("afterWorker", () => {
        workerSpinner && workerSpinner.succeed();
    }).hook().hook("outputFile", (entity) => {
    }).hook("outputPack", pack => {
        console.log(`[ADA-PACK]`.grey, `ENTRY  [`.green, pack.packName, `] [`.green, pack.getFileSize(), `|`.green, pack.getGzipSize(), `]`.green);
    }).hook("outputIndex", () => {
    }).hook("afterOutput", (info, sourceMap) => {
        sourceMap.outputer.getLogInfo().forEach((info) => {
            console.log(`[ADA-PACK]`.grey, `MAKE ERROR [`.red, info.name, `]`.red);
            console.log(info.error);
        });
    }).hook("afterPack", (info, sourceMap) => {
    }).hook("fileEdit", () => {
        console.log(`[ADA-PACK]`.grey, `EDIT FILE ${util.formatDate()}`.grey);
    }).hook("fileAdd", () => {
        console.log(`[ADA-PACK]`.grey, `ADD FILE ${util.formatDate()}`.grey);
    }).hook("fileRemove", () => {
        console.log(`[ADA-PACK]`.grey, `REMOVE FILE ${util.formatDate()}`.grey);
    });
};