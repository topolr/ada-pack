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
	hooker.hook("beforePack", () => { }).hook("startInstall", () => {
	}).hook("beforeInstall", (name) => {
		installSpinner = ora({ color: "yellow", text: "INSTALL " + name }).start();
	}).hook("afterInstall", (name) => {
		installSpinner && installSpinner.stop();
		console.log(chalk(`INSTALL`).green, chalk(`|`).green, name);
	}).hook("installError", (name) => {
		installSpinner && installSpinner.stop();
		console.log(chalk(`INSTALL`).red, chalk(`|`).green, name);
	}).hook("beforeMap", () => {
		mapTime = new Date().getTime();
		mapSpinner = ora({ color: "yellow", text: "MAP SOURCE" }).start();
	}).hook("beforeMake", () => {
	}).hook("afterMake", () => {
	}).hook("afterMap", ({ name }) => {
		mapSpinner && mapSpinner.stop();
		let header = cliui();
		header.div(
			{ text: chalk('NAME').cyan, width: 40 },
			{ text: chalk('TIME').cyan, width: 15 }
		);
		let ui = cliui();
		ui.div(
			{ text: chalk(name).blue, width: 40 },
			{ text: chalk(`${(new Date().getTime() - mapTime)}ms`).green, width: 15 }
		);
		console.log(chalk(('+ ' + util.formatDate('mm:ss') + ' +').padEnd(68, '-') + '+').gray);
		console.log(chalk(`MAPPING`).cyan, chalk(`|`).cyan, header.toString());
		console.log('       ', chalk(`|`).green, ui.toString());
	}).hook("beforeOutput", () => {
	}).hook("beforeAda", () => {
		adaSpinner = ora({ color: "yellow", text: "BUNDLE ADA CORE" }).start();
	}).hook("afterAda", bundler => {
		adaSpinner && adaSpinner.stop();
		let header = cliui();
		header.div(
			{ text: chalk('TIME').cyan, width: 40 },
			{ text: chalk('SIZE').cyan, width: 15 },
			{ text: chalk('GZIP').cyan, width: 15 }
		);
		let ui = cliui();
		ui.div(
			{ text: chalk(`${bundler.time}ms`).green, width: 40 },
			{ text: chalk(bundler.getFileSize()).green, width: 15 },
			{ text: chalk(bundler.getGzipSize()).green, width: 15 }
		);
		console.log(chalk.cyan(`ADACORE`), chalk(`|`).cyan, header.toString());
		console.log('       ', chalk(`|`).green, ui.toString());
	}).hook("beforeHooker", () => {
		initerSpinner = ora({ color: "yellow", text: "BUNDLE INITER CODE" }).start();
	}).hook("afterHooker", (bundler) => {
		initerSpinner && initerSpinner.stop();
		let header = cliui();
		header.div(
			{ text: chalk('TIME').cyan, width: 40 },
			{ text: chalk('SIZE').cyan, width: 15 },
			{ text: chalk('GZIP').cyan, width: 15 }
		);
		let ui = cliui();
		ui.div(
			{ text: chalk(`${bundler.time}ms`).green, width: 40 },
			{ text: chalk(bundler.getFileSize()).green, width: 15 },
			{ text: chalk(bundler.getGzipSize()).green, width: 15 }
		);
		console.log(chalk(`HOOKERC`).cyan, chalk(`|`).cyan, header.toString());
		console.log('       ', chalk(`|`).green, ui.toString());
	}).hook("beforeWorker", () => {
		workerSpinner = ora({ color: "yellow", text: "BUNDLE WORKER" }).start();
	}).hook("afterWorker", (bundler) => {
		workerSpinner && workerSpinner.stop();
		let header = cliui();
		header.div(
			{ text: chalk('FILE').cyan, width: 40 },
			{ text: chalk('SIZE').cyan, width: 15 },
			{ text: chalk('GZIP').cyan, width: 15 }
		);
		let ui = cliui();
		ui.div(
			{ text: chalk('service.worker.js').green, width: 40 },
			{ text: chalk(bundler.getFileSize()).green, width: 15 },
			{ text: chalk(bundler.getGzipSize()).green, width: 15 }
		);
		console.log(chalk(`WORKERC`).cyan, chalk(`|`).cyan, header.toString());
		console.log('       ', chalk(`|`).green, ui.toString());
	}).hook("beforeSingle", () => {
	}).hook("afterSingle", () => { }).hook().hook("outputFile", (entity) => {
	}).hook('beforeoutputPack', () => {
		let ui = cliui();
		ui.div(
			{ text: chalk('FILE').cyan, width: 40 },
			{ text: chalk('SIZE').cyan, width: 15 },
			{ text: chalk('GZIP').cyan, width: 15 }
		);
		console.log(chalk(`PACKAGE`).cyan, chalk(`|`).cyan, ui.toString());
	}).hook("outputPack", pack => {
		let ui = cliui();
		ui.div(
			{ text: pack.packName, width: 40 },
			{ text: chalk(pack.getFileSize()).green, width: 15 },
			{ text: chalk(pack.getGzipSize()).green, width: 15 }
		);
		console.log('       ', chalk(`|`).green, ui.toString());
	}).hook("outputIndex", () => {
	}).hook("afterOutput", (info, sourceMap) => {
		sourceMap.outputer.getLogInfo().forEach((info) => {
			// console.log(chalk(`MAKE ERROR [`).red, info.name, chalk(`]`).red);
			console.log(chalk(`  ERROR`).red, chalk(`|`).red, chalk(info.name).red);
			console.log(info.error);
		});
	}).hook("afterPack", (info, sourceMap) => {
	}).hook("fileEdit", () => {
		// console.log(chalk(`UPDATED`).yellow, chalk(`|`).yellow, chalk(`${util.formatDate()}                    [EDIT]`).green);
	}).hook("fileAdd", () => {
		// console.log(chalk(`UPDATED`).yellow, chalk(`|`).yellow, chalk(`${util.formatDate()}                    [ADD]`).green);
	}).hook("fileRemove", () => {
		// console.log(chalk(`UPDATED`).yellow, chalk(`|`).yellow, chalk(`${util.formatDate()}                    [REMOVE]`).green);
	});
};