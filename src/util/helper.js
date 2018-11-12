let colors = require("colors");
let {SyncFile} = require("ada-util");
let Path = require("path");
let Config = require("./../config");

let util = {
	isObject(obj) {
		return typeof (obj) === "object" && Object.prototype.toString.call(obj).toLowerCase() === "[object object]" && !obj.length;
	},
	isFunction(obj) {
		return (typeof obj === 'function') && obj.constructor === window.Function;
	},
	replacePaths(content, fn) {
		return content.replace(/url\((['"])(?:(?!\1).)*?\1\)/gi, function (a) {
			let b = a.substring(4, a.length - 1).trim();
			let result = a;
			let aa = false;
			if (b[0] === "'" || b[0] === "\"") {
				aa = true;
				b = b.substring(1, b.length - 1);
			}
			let mt = b.split("?");
			b = mt[0], suffix = mt[1];
			if (/^\S+\.[a-zA-Z]+$/.test(b)) {
				let c = true;
				if (fn) {
					c = fn(b);
				}
				if (c !== false) {
					if (aa) {
						rr = "url(\"" + c + (suffix ? ("?" + suffix) : "") + "\")";
					} else {
						rr = "url(" + c + (suffix ? ("?" + suffix) : "") + ")";
					}
					result = rr;
				}
			}
			return result;
		}).replace(/src\=(['"])(?:(?!\1).)*?\1/gi, function (a) {
			a = a.trim();
			let result = a;
			if (a.indexOf("<%") === -1) {
				let rp = a, mt = a.substring(5, a.length - 1).split("?"), m = mt[0], suffix = mt[1];
				if (/^\S+\.[a-zA-Z]+$/.test(m)) {
					let ct = false;
					if (fn) {
						ct = fn(m);
					}
					if (ct !== false) {
						result = "src=\"" + ct + (suffix ? ("?" + suffix) : "") + "\"";
					}
				}
			}
			return result;
		}).replace(/\@import.*?\;/gi, function (str) {
			let a = str.substring(7, str.length - 1).trim();
			if (a[0] === "'" || a[0] === "\"") {
				a = a.substring(1, a.length - 1).trim();
				if (/^\S+\.[a-zA-Z]+$/.test(a)) {
					let ct = false;
					if (fn) {
						ct = fn(a);
					}
					if (ct !== false) {
						result = "@import \"" + ct + "\";";
					}
				}
			}
			return result;
		});
	},
	getHashPath(path, hash) {
		let a = path.split("/");
		let b = a.pop();
		let c = b.split(".");
		a.push(`${hash}.${c[1]}`);
		return a.join("/");
	},
	formatDate(format = "yyyy-MM-dd hh:mm:ss") {
		let a = new Date();
		let year = a.getFullYear() + "", month = (a.getMonth() + 1) + "", day = a.getDate() + "",
			hour = a.getHours() + "", minute = a.getMinutes() + "", second = a.getSeconds() + "";
		return format.replace(/[y]+/g, function (str) {
			return year.substring(year.length - str.length);
		}).replace(/[M]+/g, function (str) {
			let c = month.substring(0, str.length);
			if (str.length > 1) {
				return c.length > 1 ? c : "0" + c;
			} else {
				return c;
			}
		}).replace(/[d]+/g, function (str) {
			let c = day.substring(0, str.length);
			if (str.length > 1) {
				return c.length > 1 ? c : "0" + c;
			} else {
				return c;
			}
		}).replace(/[h]+/g, function (str) {
			let c = hour.substring(0, str.length);
			if (str.length > 1) {
				return c.length > 1 ? c : "0" + c;
			} else {
				return c;
			}
		}).replace(/[m]+/g, function (str) {
			let c = minute.substring(0, str.length);
			if (str.length > 1) {
				return c.length > 1 ? c : "0" + c;
			} else {
				return c;
			}
		}).replace(/[s]+/g, function (str) {
			let c = second.substring(0, str.length);
			if (str.length > 1) {
				return c.length > 1 ? c : "0" + c;
			} else {
				return c;
			}
		});
	},
	hashCode(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			let character = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + character;
			hash = hash & hash;
		}
		return hash;
	},
	getMappedPath(path) {
		return `P${Math.abs(util.hashCode(path.replace(/\\/g, "/")))}`;
	},
	getByteLen(normal_val) {
		normal_val = String(normal_val);
		let byteLen = 0;
		for (let i = 0; i < normal_val.length; i++) {
			let c = normal_val.charCodeAt(i);
			byteLen += c < (1 << 7) ? 1 : c < (1 << 11) ? 2 : c < (1 << 16) ? 3 : c < (1 << 21) ? 4 : c < (1 << 26) ? 5 : c < (1 << 31) ? 6 : Number.NaN;
		}
		return byteLen;
	},
	getFileSizeAuto(size, radmon) {
		let v = 0, unit = "BYTE", byteSize = size;
		radmon = radmon || 0;
		if (byteSize >= 1073741824) {
			v = (byteSize / 1073741824).toFixed(radmon);
			unit = "GB";
		} else if (byteSize >= 1048576) {
			v = (byteSize / 1048576).toFixed(radmon);
			unit = "MB";
		} else if (byteSize >= 1024) {
			v = (byteSize / 1024).toFixed(radmon);
			unit = "KB";
		} else {
			v = byteSize;
			unit = "B";
		}
		return v + unit;
	},
	extend() {
		let options, name, src, copy, copyIsArray, clone,
			target = arguments[0] || {},
			i = 1,
			length = arguments.length,
			deep = false;
		if (typeof target === "boolean") {
			deep = target;
			target = arguments[i] || {};
			i++;
		}
		if (typeof target !== "object" && !util.isFunction(target)) {
			target = {};
		}
		if (i === length) {
			target = this;
			i--;
		}
		for (; i < length; i++) {
			if ((options = arguments[i]) != null) {
				for (name in options) {
					src = target[name];
					copy = options[name];
					if (target === copy) {
						continue;
					}
					if (deep && copy && (util.isObject(copy) ||
						(copyIsArray = Array.isArray(copy)))) {
						if (copyIsArray) {
							copyIsArray = false;
							clone = src && Array.isArray(src) ? src : [];
						} else {
							clone = src && util.isObject(src) ? src : {};
						}
						target[name] = util.extend(deep, clone, copy);
					} else if (copy !== undefined) {
						target[name] = copy;
					}
				}
			}
		}
		return target;
	},
	getFilePath(config, filePath, path) {
		let checkPath = function (current) {
			let file = new SyncFile(current);
			if (file.exist) {
				if (file.isFolder()) {
					let checkPaths = [current + ".js", Path.resolve(current, "./index.js"), Path.resolve(current, "./index.ts"), Path.resolve(current, "./package.json")];
					let pathIndex = checkPaths.findIndex(path => new SyncFile(path).exist);
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
					let pathIndex = checkPaths.findIndex(path => new SyncFile(path).exist);
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
	getAppInfo(projectPath, develop = true) {
		let packagePath = Path.resolve(projectPath, "./package.json");
		let packageInfo = require(packagePath);
		let adaInfo = packageInfo.ada, appPath = "";
		if (develop) {
			appPath = adaInfo.develop ? adaInfo.develop : "./app/app.js";
		} else {
			appPath = adaInfo.publish ? adaInfo.publish : "./app/app.js";
		}
		appPath = Path.resolve(packagePath, "./../", appPath);
		if (!new SyncFile(appPath).exist) {
			appPath = Path.resolve(projectPath, "./app.js");
		}
		let config = this.extend(true, {}, Config, require(appPath));
		config.projectPath = projectPath;
		config.basePath = Path.resolve(appPath, "./../");
		config.distPath = Path.join(config.basePath, config.distPath).replace(/\\/g, "/");
		config.sourcePath = Path.join(config.basePath, config.sourcePath).replace(/\\/g, "/");
		config.nmodulePath = Path.join(config.projectPath, "./node_modules/").replace(/\\/g, "/");
		config.indexPath = Path.join(config.basePath, config.indexPath, "./../").replace(/\\/g, "/");
		config.entryPath = Path.join(config.basePath, config.entryPath).replace(/\\/g, "/");
		config.mainEntryPath = Path.join(config.basePath, config.main).replace(/\\/g, "/");
		if (config.initer) {
			config.initerPath = Path.join(config.basePath, config.initer).replace(/\\/g, "/");
		}
		if (config.worker && config.worker.path) {
			config.workerPath = Path.join(config.basePath, config.worker.path).replace(/\\/g, "/");
		}
		config.staticPath = Path.join(config.basePath, config.staticPath).replace(/\\/g, "/");
		["projectPath", "basePath", "distPath", "sourcePath", "entryPath", "staticPath", "nmodulePath"].forEach(name => {
			if (!config[name].endsWith("/")) {
				config[name] = config[name] + "/";
			}
		});
		if (config.siteURL[config.siteURL.length - 1] !== "/") {
			config.siteURL = config.siteURL + "/";
		}
		return config;
	}
};

module.exports = util;