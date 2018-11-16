#!/usr/bin/env node
let {Commander} = require("ada-util");
let commander = new Commander();
[
	require("./cmd/version"),
	require("./cmd/develop"),
	require("./cmd/publish"),
	require("./cmd/start"),
	require("./cmd/process"),
	require("./cmd/ssr")
].forEach(function (a) {
	let command = a.command, desc = a.desc, paras = a.paras, fn = a.fn;
	commander.bind({command, desc, paras, fn});
});
commander.call(process.argv.slice(2));