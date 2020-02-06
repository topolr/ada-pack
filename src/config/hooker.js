let colors = require("colors");
let ora = require('ora');
let util = require("../util/helper");
const cliui = require('cliui');
const chalk = require('chalk');

module.exports = function (hooker) {
	let adaSpinner = null;
	let initerSpinner = null;
	let workerSpinner = null;
	let mapSpinner = null;
	let mapTime = 0;
	let installSpinner = null;
	hooker.hook("beforePack", (config) => {
		// if (config.name) {
		// 	console.log(`[ADA-PACK]`.grey, `PACKING`.green, `|`.green, config.name);
		// }
		// console.log(chalk.blue(`[${config.name}]`));
	}).hook("startInstall", (names) => {
	}).hook("beforeInstall", (name) => {
		installSpinner = ora({ color: "yellow", text: "INSTALL " + name }).start();
	}).hook("afterInstall", (name) => {
		installSpinner && installSpinner.stop();
		console.log(`[ADA-PACK]`.grey, `INSTALL`.green, `|`.green, name);
	}).hook("installError", (name) => {
		installSpinner && installSpinner.stop();
		console.log(`[ADA-PACK]`.grey, `INSTALL`.red, `|`.green, name);
	}).hook("beforeMap", () => {
		mapTime = new Date().getTime();
		mapSpinner = ora({ color: "yellow", text: "MAP SOURCE" }).start();
	}).hook("beforeMake", (info) => {
	}).hook("afterMake", (info) => {
	}).hook("afterMap", ({ name }) => {
		mapSpinner && mapSpinner.stop();
		console.log(`[ADA-PACK]`.grey, `MAPPING`.green, `|`.green, `[${name}]`.blue, `|`.green, (new Date().getTime() - mapTime), `ms`.green);
	}).hook("beforeOutput", () => {
	}).hook("beforeAda", () => {
		adaSpinner = ora({ color: "yellow", text: "BUNDLE ADA CORE" }).start();
	}).hook("afterAda", bundler => {
		adaSpinner && adaSpinner.stop();
		let ui = cliui();
		ui.div(
			{ text: chalk.green(`${bundler.time}ms`), width: 15 },
			{ text: chalk.green(bundler.getFileSize()), width: 15 },
			{ text: chalk.green(bundler.getGzipSize()), width: 15 }
		);
		console.log(chalk.grey(`[ADA-PACK]`), chalk.green(`ADACORE`), `|`.green, ui.toString());
	}).hook("beforeIniter", () => {
		initerSpinner = ora({ color: "yellow", text: "BUNDLE INITER CODE" }).start();
	}).hook("afterIniter", (bundler) => {
		initerSpinner && initerSpinner.stop();
		console.log(`[ADA-PACK]`.grey, `INITERC`.green, `|`.green, bundler.time, `ms |`.green, bundler.getFileSize(), `|`.cyan, bundler.getGzipSize());
	}).hook("beforeWorker", () => {
		workerSpinner = ora({ color: "yellow", text: "BUNDLE WORKER" }).start();
	}).hook("afterWorker", (bundler) => {
		workerSpinner && workerSpinner.succeed();
		console.log(`[ADA-PACK]`.grey, `WORKERC`.green, `|`.green, bundler.getFileSize(), `|`.cyan, bundler.getGzipSize());
	}).hook("beforeSingle", () => {
	}).hook("afterSingle", () => {
		// console.log(`[ADA-PACK]`.grey, `SINGLES`.green);
	}).hook().hook("outputFile", (entity) => {
	}).hook("outputPack", pack => {
		let ui = cliui();
		ui.div(
			{ text: pack.packName, width: 40 },
			{ text: chalk.green(pack.getFileSize()), width: 15 },
			{ text: chalk.green(pack.getGzipSize()), width: 15 }
		);
		console.log(`[ADA-PACK]`.grey, `PACKAGE`.green, `|`.green, ui.toString());
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