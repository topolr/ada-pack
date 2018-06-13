let File = require("./lib/file");
let Path = require("path");
let util = require("./../util/util");
let maker = require("./../maker/maker");

module.exports = function (config, filePath, path) {
	let _path = util.getFilePath(config, filePath, path);
	let _file = new File(_path);
	return maker.parse(_file.suffix(), _path, _file.readSync(), config).then(content => {
		return {path: _path, content, result: "done"};
	}).catch(e => {
		if (_file.suffix() === "js" || _file.suffix() === "ts") {
			return {path: _path, content: `console.error(${JSON.stringify(e.message)})`, result: e}
		} else {
			return {path: _path, content: `${JSON.stringify(e.message)}`, result: e}
		}
	});
};