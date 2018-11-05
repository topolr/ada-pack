let colors = require("colors");
let ora = require('ora');

module.exports = function (hooker) {
	let adaSpinner = null;
	let initerSpinner = null;
	let workerSpinner = null;
	hooker.hook("beforePack", () => {
		console.log(` ≡ ADA-PACK ${require("./../package").version} ≡`.blue);
	}).hook("startInstall", (names) => {
	}).hook("beforeInstall", (name) => {
	}).hook("afterInstall", (name) => {
	}).hook("installError", (name) => {
	}).hook("beforeMap", (info) => {
	}).hook("beforeMake", (info) => {
		// process.stderr.clearLine();
		// process.stderr.cursorTo(0);
		// console.log(`[ADA-PACK]`.grey, ` MAKE [ `.green, info.path, ` ]`.green);
	}).hook("afterMake", (info) => {
	}).hook("afterMap", (info) => {
	}).hook("beforeOutput", () => {
	}).hook("beforeAda", () => {
		adaSpinner = ora({color: "yellow", text: "PACK ADA CORE"}).start();
	}).hook("afterAda", () => {
		adaSpinner && adaSpinner.succeed();
	}).hook("beforeIniter", () => {
		initerSpinner = ora({color: "yellow", text: "PACK INITER CODE"}).start();
	}).hook("afterIniter", () => {
		initerSpinner && initerSpinner.succeed();
	}).hook("beforeWorker", () => {
		workerSpinner = ora({color: "yellow", text: "PACK WORKER"}).start();
	}).hook("afterWorker", () => {
		workerSpinner && workerSpinner.succeed();
	}).hook().hook("outputFile", (entity) => {
		// process.stderr.clearLine();
		// process.stderr.cursorTo(0);
		// console.log(`[ADA-PACK]`.grey, ` OUTPUT [ `.green, entity.path, ` ]`.green);
	}).hook("outputPack", pack => {
		console.log(`[ADA-PACK]`.grey, `PACK [`.green, pack.packName, `] Size [`.green, pack.getFileSize(), `] Gzip [`.green, pack.getGzipSize(), `]`.green);
	}).hook("outputIndex", () => {
	}).hook("afterOutput", () => {
	}).hook("afterPack", () => {
	}).hook("fileEdit", () => {
		console.log('---->file edit')
	}).hook("fileAdd", () => {
		console.log('---->file add')
	}).hook("fileRemove", () => {
		console.log('---->file remove')
	});
};