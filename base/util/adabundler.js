let EntryBundler = require("./entryb");

class AdaBundler extends EntryBundler {
	bundle(path, output, develop) {
		let config = this.config;
		path = path.replace(/\\/g, "/");
		console.log("");
		if (!config.ada_autobundle) {
			console.log(` [ada_autobundle:false] ALWAYS BUNDLE ADA CORE`.grey);
		}
		let spinner = ora({
			color: "yellow",
			text: `NOW BUNDLING ADA CORE [${develop ? "DEVELOP" : "PUBLIC"} MODE]`
		}).start();
		return this.getCodeMap(path).then(() => {
			let packageInfo = require(Path.resolve(path, "./../package.json"));
			let veison = packageInfo.version;
			this.resultmap.push(path);
			let result = this.resultmap.map(path => {
				return `function(module,exports,require){${this.resultmapcode[path]}}`;
			});
			let commet = `/*! adajs[${develop ? "Develop" : "Publish"}] ${veison} https://github.com/topolr/ada | https://github.com/topolr/ada/blob/master/LICENSE */`;
			let adacode = `(function (map,moduleName) {var Installed={};var requireModule = function (index) {if (Installed[index]) {return Installed[index].exports;}var module = Installed[index] = {exports: {}};map[index].call(module.exports, module, module.exports, requireModule);return module.exports;};var mod=requireModule(map.length-1);Ada.installModule(moduleName,mod);})([${result.join(",")}],"adajs");`;
			let code = `${commet}
${adacode}`;
			config.adaHash = hash.md5(code).substring(0, 10);
			code = code.replace(/\/ada\/sse/, `${config.server.protocol}://${config.server.host}${(config.server.port != 80 ? ":" + config.server.port : '')}/ada/sse`);
			return new File(output).write(code).then(() => {
				spinner.stop();
				process.stderr.clearLine();
				process.stderr.cursorTo(0);
				console.log(` BUNDLE ADA CORE DONE [${develop ? "DEVELOP" : "PUBLIC"} MODE GZIP:${util.getFileSizeAuto(gzipSize.sync(adacode))}]`.yellow);
			});
		});
	}
}

module.exports = AdaBundler;