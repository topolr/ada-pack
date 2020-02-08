let map = require("./../../package.json");
let chalk = require('chalk');

module.exports = {
	command: "version",
	desc: map.version,
	paras: [],
	fn: function () {
		console.log(chalk(` version ${map.version}`).yellow);
	}
};