const AdaBundler = require("./bundler/ada");
const config = require("./config/index");
const Maker = require("./packer/maker");
const Path = require("path");
const { File, clone } = require("ada-util");
const hash = require("ada-util/src/md5");
const Hooker = require("./hooker");
const defaultHooker = require("./config/hooker");

class Pager {
    constructor() {
        this._adaURL = '';
        this._adaBunlder = new AdaBundler(config, new Maker(config));
        this.hooker = new Hooker({});
        [defaultHooker, ...config.hook].forEach(hook => hook(this.hooker));
    }

    outputAda() {
        if (!this._adaBunlder.ready) {
            return this.hooker.excute("beforeAda").then(() => {
                if (config.develop) {
                    return this._adaBunlder.getBundleCode(Path.resolve(config.nmodulePath, "./adajs/develop.js")).then(code => {
                        let url = config.siteURL + "ada.js";
                        let path = Path.resolve(config.distPath, "./ada.js");
                        return this.hooker.excute("afterAda", this._adaBunlder).then(() => {
                            this._adaURL = url;
                            return new File(path).write(this._adaBunlder.getContent());
                        });
                    });
                } else {
                    return this._adaBunlder.getBundleCode(Path.resolve(config.nmodulePath, "./adajs/index.js")).then(code => {
                        let h = hash.md5(code).substring(0, 8);
                        let url = config.siteURL + `ada.${h}.js`;
                        let path = Path.resolve(config.distPath, `./ada.${h}.js`);
                        return this.hooker.excute("afterAda", this._adaBunlder).then(() => {
                            this._adaURL = url;
                            return new File(path).write(this._adaBunlder.getContent());
                        });
                    });
                }
            });
        } else {
            return Promise.resolve();
        }
    }

    outputIndex() {
        let baseInfo = config.siteInfo;
        let metaContent = baseInfo.meta.map(item => {
            let props = Reflect.ownKeys(item).map(key => `${key}="${item[key]}"`).join(" ");
            return `<meta ${props}>`;
        }).join("");
        let iconsContent = baseInfo.icons.map(info => {
            return `<link rel="apple-touch-icon-precomposed" sizes="${info.sizes}" href="${config.siteURL + "logos/" + Path.basename(info.src)}">`;
        }).join("");
        if (baseInfo.icons.length > 0) {
            iconsContent += `<link rel="shortcut icon" href="${config.siteURL + "logos/" + Path.basename(baseInfo.icons[0].src)}">`;
        }
        let linkContent = baseInfo.link.map(path => {
            let props = Reflect.ownKeys(path).map(key => `${key}="${path[key]}"`).join(" ");
            return `<link ${props}>`;
        }).join("");
        let styleContent = baseInfo.style.map(path => {
            if (util.isObject(path)) {
                path.rel = "stylesheet";
                let props = Reflect.ownKeys(path).map(key => `${key}="${path[key]}"`).join(" ");
                return `<link ${props}>`;
            } else {
                return `<link rel="stylesheet" href="${path}">`;
            }
        }).join("");
        let scriptContent = baseInfo.script.map(path => {
            if (util.isObject(path)) {
                let props = Reflect.ownKeys(path).map(key => `${key}="${path[key]}"`).join(" ");
                return `<script ${props}></script>`;
            } else {
                return `<script src="${path}"></script>`;
            }
        }).join("");
        let bootMap = {
            basePath: config.siteURL,
            develop: config.develop,
            map: config.apps.map(a => {
                return {
                    name: a.name,
                    url: a.siteURL
                }
            }),
            root: config.root
        };
        let manifest = {};
        Reflect.ownKeys(baseInfo).forEach(key => {
            if (["keywords", "meta", "link", "style", "script"].indexOf(key) === -1) {
                manifest[key] = clone(baseInfo[key]);
            }
        });
        let hookInfo = {
            map: bootMap,
            manifest
        };
        let ps = Promise.resolve();
        return ps.then(() => {
            return baseInfo.icons.reduce((a, icon) => {
                return a.then(() => {
                    return new File(Path.resolve(config.projectPath, icon.src)).copyTo(Path.resolve(config.distPath, './logos/', Path.basename(icon.src)));
                });
            }, Promise.resolve()).then(() => {
                let workerCode = "", initer = ""//, initer = this._initerBundler.getContent();
                // if (config.worker && config.worker.path) {
                //     workerCode = `<script>if('serviceWorker' in navigator){navigator.serviceWorker.register('${this._workerURL}', { scope: '${config.worker.scope}' }).then(function(reg) {console.log('Registration succeeded. Scope is ' + reg.scope);}).catch(function(error) {console.log('Registration failed with ' + error);});}</script>`
                // }
                let content = `<!DOCTYPE html><html><head><link rel="manifest" href="manifest.json"><meta charset="${baseInfo.charset}"><title>${baseInfo.name}</title>${metaContent}${iconsContent}${styleContent}${linkContent}${scriptContent}<script src="${this._adaURL}"></script><script>${initer ? "Ada.init(" + initer + ");" : ""}Ada.boot(${JSON.stringify(hookInfo.map)});</script>${workerCode ? workerCode : ''}</head><body></body></html>`;
                if (hookInfo.manifest.icons) {
                    hookInfo.manifest.icons.forEach(icon => {
                        icon.src = config.siteURL + icon.src;
                    });
                }
                return Promise.all([
                    new File(Path.resolve(config.distPath, "./manifest.json")).write(JSON.stringify(hookInfo.manifest)),
                    new File(Path.resolve(config.distPath, "./index.html")).write(content)
                ]);
            });
        });
    }
}

module.exports = Pager;