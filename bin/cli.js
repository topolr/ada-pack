#!/usr/bin/env node
let Commnader = require("./lib/commander");
let commander = new Commnader();
[
	require("./cmd/version"),
	require("./cmd/develop"),
	require("./cmd/publish"),
	require("./cmd/start"),
	require("./cmd/process")
].forEach(function (a) {
	let command = a.command, desc = a.desc, paras = a.paras, fn = a.fn;
	commander.bind({command, desc, paras, fn});
});
commander.call(process.argv.slice(2));