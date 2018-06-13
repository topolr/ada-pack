let File = require("./../lib/file");
let Path = require("path");

const util = {
	randomid(len = 7) {
		if (len <= 2) {
			len = 7;
		}
		return Math.random().toString(36).slice(2, len + 2);
	},
	getFilePath(config, filePath, path) {
		let checkPath = function (current) {
			let file = new File(current);
			if (file.isExists()) {
				if (file.isFolder()) {
					let checkPaths = [current + ".js", Path.resolve(current, "./index.js"), Path.resolve(current, "./index.ts"), Path.resolve(current, "./package.json")];
					let pathIndex = checkPaths.findIndex(path => new File(path).isExists());
					if (pathIndex !== -1) {
						if (pathIndex !== 3) {
							return checkPaths[pathIndex];
						} else {
							return Path.resolve(checkPaths[3], "./../", require(checkPaths[3]).main);
						}
					}
				} else {
					return current;
				}
			} else {
				let ext = Path.extname(current);
				if (ext && (ext === ".js" || ext === ".ts")) {
					return current;
				} else {
					let checkPaths = [current + ".js", current + ".ts"];
					let pathIndex = checkPaths.findIndex(path => new File(path).isExists());
					if (pathIndex !== -1) {
						return checkPaths[pathIndex];
					} else {
						return checkPaths[0];
					}
				}
			}
		};
		let result = "";
		if (path.startsWith("./") || path.startsWith("../") || path.startsWith("/")) {
			result = checkPath(Path.resolve(filePath, path)).replace(/\\/g, "/");
		} else {
			result = checkPath(Path.resolve(config.nmodule_path, path)).replace(/\\/g, "/");
		}
		return result;
	},
	getRequireInfo(config, info) {
		let currentPath = info.path;
		let tasks = [], parseTasks = [], infoTasks = [], importsTasks = [];
		let name = "";
		this.doneMap.push(currentPath);
		info.content = info.content.replace(/_adajs.view\)\(\{[\d\D]*?\)/g, str => {
			let map = str.substring(13, str.length - 1);
			map = map.replace(/['|"][\s\S]+?['|"]/g, str => {
				if (str.indexOf("./") !== -1 || str.indexOf("/") !== -1) {
					let value = str.substring(1, str.length - 1);
					let path = Path.join(info.path, "./../", value).replace(/\\/g, "/");
					if (path.indexOf("node_modules") === -1) {
						value = path.substring(config.source_path.length);
						parseTasks.push({
							path: Path.resolve(config.dist_path, path.substring(config.source_path.length)),
							current: path,
							value
						});
					} else {
						value = `${THRIDPARTFOLDER}/${path.substring(config.nmodule_path.length)}`;
						parseTasks.push({
							path: Path.resolve(config.dist_path, `./${THRIDPARTFOLDER}/${path.substring(config.nmodule_path.length)}`),
							current: path,
							value
						});
					}
					return `"${value}"`;
				} else {
					return str;
				}
			});
			let module = "";
			let __path = info.path.replace(/\\/g, "/");
			if (__path.indexOf("node_modules") === -1) {
				module = __path.substring(config.source_path.length);
			} else {
				module = `${THRIDPARTFOLDER}/${__path.substring(config.nmodule_path.length)}`;
			}
			let t = map.replace(/\n/g, "").replace(/\r/g, "").trim();
			map = t.substring(0, t.length - 1) + `,module:"${module}"}`;
			return `_adajs.view)(${map})`;
		});
		info.content = info.content.replace(/require\(.*?\)/g, (str) => {
			let a = str.substring(8, str.length - 1).replace(/['|"|`]/g, "").trim();
			if (IGNOREMODULES.indexOf(a) === -1) {
				let m = util.getFilePath(config, Path.resolve(info.path, "./../"), a);
				if (this.doneMap.indexOf(m) === -1 && m !== currentPath) {
					infoTasks.push({
						filePath: Path.resolve(info.path, "./../"),
						path: a
					});
				}
				if (m.indexOf("node_modules") === -1) {
					return `require("${m.substring(config.source_path.length)}")`;
				} else {
					let name = `${THRIDPARTFOLDER}/${m.substring(config.nmodule_path.length)}`;
					return `require("${name}")`;
				}
			} else {
				return str;
			}
		});
		info.content = info.content.replace(/import\(.*?\)/g, (str) => {
			let a = str.substring(7, str.length - 1);
			if (a.startsWith("\"") || a.startsWith("'") || a.startsWith("`")) {
				a = a.replace(/['|"|`]/g, "").trim();
				if (IGNOREMODULES.indexOf(a) === -1) {
					let m = util.getFilePath(config, Path.resolve(info.path, "./../"), a);
					let name = "", value = "";
					if (m.indexOf("node_modules") === -1) {
						name = m.substring(config.source_path.length);
						value = `imports("${name}")`;
					} else {
						let name = `${THRIDPARTFOLDER}/${m.substring(config.nmodule_path.length)}`;
						value = `imports("${name}")`;
					}
					if (this.doneMap.indexOf(m) === -1 && m !== currentPath) {
						importsTasks.push({
							filePath: Path.resolve(info.path, "./../"),
							path: a,
							name
						});
					}
					return value;
				} else {
					return `imports(${a})`;
				}
			} else {
				return `imports(${a})`;
			}
		});
		if (info.path.indexOf("node_modules") !== -1) {
			name = `${THRIDPARTFOLDER}/${info.path.substring(config.nmodule_path.length)}`;
			let __path = Path.resolve(config.dist_path, `./${name}`);
			if (this.doneMap.indexOf(__path) === -1) {
				tasks.push({
					path: __path,
					content: info.content
				});
			}
		} else {
			name = info.path.substring(config.source_path.length);
			let __path = Path.resolve(config.dist_path, info.path.substring(config.source_path.length))
			if (this.doneMap.indexOf(__path) === -1) {
				tasks.push({
					path: __path,
					content: info.content
				});
			}
		}
		return {info, tasks, parseTasks, infoTasks, importsTasks};
	}
};

module.exports = util;