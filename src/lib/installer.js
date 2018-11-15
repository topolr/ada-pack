let {File} = require("ada-util");
let Path = require("path");
let detectInstalled = require("detect-installed");

class Installer {
	constructor(config) {
		this._config = config;
		this._onstartinstall = (names) => {
			return config.hooker.excute("startInstall", names);
		};
		this._onbeforeinstall = (name) => {
			return config.hooker.excute("beforeInstall", name);
		};
		this._oninstalled = (name) => {
			return config.hooker.excute("afterInstall", name);
		};
		this._oninstallerror = (name) => {
			return config.hooker.excute("installError", name);
		};
		this._installed = [];
	}

	get config() {
		return this._config;
	}

	getFileTypesOfProject() {
		return new File(this.config.sourcePath).getAllSubFilePaths().then(paths => paths.map(path => Path.extname(path)).filter(a => !!a).map(a => a.substring(1)));
	}

	checkInstallModules(names) {
		let result = [];
		return names.reduce((a, name) => {
			return a.then(() => {
				return detectInstalled(name).then(exists => {
					if (!exists) {
						if (result.indexOf(name) === -1) {
							result.push(name);
						}
					}
				});
			});
		}, Promise.resolve()).then(() => result);
	}

	getUnInstallModules() {
		let map = this.config.dependence, target = [];
		return this.getFileTypesOfProject().then(types => types.filter(type => {
			return !!map[type];
		}).forEach(type => {
			Reflect.ownKeys(map[type].dependence).forEach(name => {
				if (target.indexOf(name) === -1) {
					target.push(name);
				}
			});
		})).then(() => {
			return this.checkInstallModules(target);
		});
	}

	installModules(result) {
		result = result.filter(a => this._installed.indexOf(a) === -1);
		if (result.length > 0) {
			return this._onstartinstall(result).then(() => {
				return result.reduce((a, name) => {
					return a.then(() => {
						return this._onbeforeinstall(name).then(() => {
							return new Promise((resolve, reject) => {
								let args = ["install", name, "--save-dev"];
								require("child_process").exec(`npm ${args.join(" ")}`, {
									encoding: "utf-8",
									cwd: this.config.projectPath
								}, (error, stdout, stderr) => {
									if (error) {
										reject(name);
									} else {
										resolve(name);
									}
								});
							}).then(name => {
								if (this._installed.indexOf(name) === -1) {
									this._installed.push(name);
								}
								return this._oninstalled(name);
							}).catch(name => {
								return this._oninstallerror(name);
							});
						});
					});
				}, Promise.resolve());
			});
		} else {
			return Promise.resolve();
		}
	}

	readyTypeModules(type) {
		let map = this.config.dependence, target = [];
		if (map[type]) {
			Reflect.ownKeys(map[type].dependence).forEach(name => {
				if (target.indexOf(name) === -1) {
					target.push(name);
				}
			});
			return this.checkInstallModules(target).then(result => {
				return this.installModules(result);
			});
		} else {
			return Promise.resolve();
		}
	}

	readyProjectModules() {
		return this.getUnInstallModules().then(result => {
			return this.installModules(result);
		});
	}
}

module.exports = Installer;