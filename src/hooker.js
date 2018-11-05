let colors = require("colors");
let ora = require('ora');

module.exports = function (hooker) {
	let outputSpinner = null;
	hooker.hook("beforePack", () => {
		console.log(` ≡ ADA-PACK ${require("./../package").version} ≡`.blue);
	}).hook("startInstall", (names) => {
	}).hook("beforeInstall", (name) => {
	}).hook("afterInstall", (name) => {
	}).hook("installError", (name) => {
	}).hook("beforeMap", (info) => {
	}).hook("beforeMake", (info) => {
		process.stderr.clearLine();
		process.stderr.cursorTo(0);
		process.stderr.write(`[ADA-PACK]`.grey + ` MAKE [ `.green + info.path + ` ]`.green);
	}).hook("afterMake", (info) => {
	}).hook("afterMap", (info) => {
	}).hook("beforeOutput", () => {
		outputSpinner = ora({color: "yellow", text: "Output Source"}).start();
	}).hook("beforeAda",()=>{

	}).hook().hook("outputFile", () => {

	}).hook("outputIndex", () => {

	}).hook("afterOutput", () => {
		if (outputSpinner) {
			outputSpinner.stop();
		}
	}).hook("afterPack", () => {
	});
};