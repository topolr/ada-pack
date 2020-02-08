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
		// 	console.log(`PACKING`.green, `|`.green, config.name);
		// }
		// console.log(chalk.blue(`[${config.name}]`));
	}).hook("startInstall", (names) => {
	}).hook("beforeInstall", (name) => {
		installSpinner = ora({ color: "yellow", text: "INSTALL " + name }).start();
	}).hook("afterInstall", (name) => {
		installSpinner && installSpinner.stop();
		console.log(`INSTALL`.green, `|`.green, name);
	}).hook("installError", (name) => {
		installSpinner && installSpinner.stop();
		console.log(`INSTALL`.red, `|`.green, name);
	}).hook("beforeMap", () => {
		mapTime = new Date().getTime();
		mapSpinner = ora({ color: "yellow", text: "MAP SOURCE" }).start();
	}).hook("beforeMake", (info) => {
	}).hook("afterMake", (info) => {
	}).hook("afterMap", ({ name }) => {
		mapSpinner && mapSpinner.stop();
		let header = cliui();
		header.div(
			{ text: chalk.cyan('NAME'), width: 40 },
			{ text: chalk.cyan('TIME'), width: 15 }
		);
		let ui = cliui();
		ui.div(
			{ text: chalk.blue(name), width: 40 },
			{ text: chalk.green(`${(new Date().getTime() - mapTime)}ms`), width: 15 }
		);
		console.log(`MAPPING`.cyan, `|`.cyan, header.toString());
		console.log(`       `.green, `|`.green, ui.toString());
	}).hook("beforeOutput", () => {
	}).hook("beforeAda", () => {
		adaSpinner = ora({ color: "yellow", text: "BUNDLE ADA CORE" }).start();
	}).hook("afterAda", bundler => {
		adaSpinner && adaSpinner.stop();
		let header = cliui();
		header.div(
			{ text: chalk.cyan('TIME'), width: 40 },
			{ text: chalk.cyan('SIZE'), width: 15 },
			{ text: chalk.cyan('GZIP'), width: 15 }
		);
		let ui = cliui();
		ui.div(
			{ text: chalk.green(`${bundler.time}ms`), width: 40 },
			{ text: chalk.green(bundler.getFileSize()), width: 15 },
			{ text: chalk.green(bundler.getGzipSize()), width: 15 }
		);
		console.log(chalk.cyan(`ADACORE`), `|`.cyan, header.toString());
		console.log(chalk.green(`       `), `|`.green, ui.toString());
	}).hook("beforeHooker", () => {
		initerSpinner = ora({ color: "yellow", text: "BUNDLE INITER CODE" }).start();
	}).hook("afterHooker", (bundler) => {
		initerSpinner && initerSpinner.stop();
		let header = cliui();
		header.div(
			{ text: chalk.cyan('TIME'), width: 40 },
			{ text: chalk.cyan('SIZE'), width: 15 },
			{ text: chalk.cyan('GZIP'), width: 15 }
		);
		let ui = cliui();
		ui.div(
			{ text: chalk.green(`${bundler.time}ms`), width: 40 },
			{ text: chalk.green(bundler.getFileSize()), width: 15 },
			{ text: chalk.green(bundler.getGzipSize()), width: 15 }
		);
		console.log(chalk.cyan(`HOOKERC`), `|`.cyan, header.toString());
		console.log(chalk.green(`       `), `|`.green, ui.toString());
	}).hook("beforeWorker", () => {
		workerSpinner = ora({ color: "yellow", text: "BUNDLE WORKER" }).start();
	}).hook("afterWorker", (bundler) => {
		workerSpinner && workerSpinner.stop();
		let header = cliui();
		header.div(
			{ text: chalk.cyan('FILE'), width: 40 },
			{ text: chalk.cyan('SIZE'), width: 15 },
			{ text: chalk.cyan('GZIP'), width: 15 }
		);
		let ui = cliui();
		ui.div(
			{ text: chalk.green('service.worker.js'), width: 40 },
			{ text: chalk.green(bundler.getFileSize()), width: 15 },
			{ text: chalk.green(bundler.getGzipSize()), width: 15 }
		);
		console.log(chalk.cyan(`WORKERC`), `|`.cyan, header.toString());
		console.log(chalk.green(`       `), `|`.green, ui.toString());
	}).hook("beforeSingle", () => {
	}).hook("afterSingle", () => {
		// console.log(`SINGLES`.green);
	}).hook().hook("outputFile", (entity) => {
	}).hook('beforeoutputPack', () => {
		let ui = cliui();
		ui.div(
			{ text: chalk.cyan('FILE'), width: 40 },
			{ text: chalk.cyan('SIZE'), width: 15 },
			{ text: chalk.cyan('GZIP'), width: 15 }
		);
		console.log(`PACKAGE`.cyan, `|`.cyan, ui.toString());
	}).hook("outputPack", pack => {
		let ui = cliui();
		ui.div(
			{ text: pack.packName, width: 40 },
			{ text: chalk.green(pack.getFileSize()), width: 15 },
			{ text: chalk.green(pack.getGzipSize()), width: 15 }
		);
		console.log(`       `.green, `|`.green, ui.toString());
	}).hook("outputIndex", () => {
	}).hook("afterOutput", (info, sourceMap) => {
		sourceMap.outputer.getLogInfo().forEach((info) => {
			console.log(`MAKE ERROR [`.red, info.name, `]`.red);
			console.log(info.error);
		});
	}).hook("afterPack", (info, sourceMap) => {
	}).hook("fileEdit", () => {
		console.log('--------|'.padEnd(69, '-').grey);
		console.log(`UPDATED`.cyan, `|`.cyan, `${util.formatDate()}                    [EDIT]`.green);
	}).hook("fileAdd", () => {
		console.log('--------|'.padEnd(69, '-').grey);
		console.log(`UPDATED`.cyan, `|`.cyan, `${util.formatDate()}                    [ADD]`.green);
	}).hook("fileRemove", () => {
		console.log('--------|'.padEnd(69, '-').grey);
		console.log(`UPDATED`.cyan, `|`.cyan, `${util.formatDate()}                    [REMOVE]`.green);
	});
};