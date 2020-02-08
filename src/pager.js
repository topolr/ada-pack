const AdaBundler = require("./bundler/ada");
const config = require("./config/index");
const Maker = require("./packer/maker");
const Path = require("path");
const { File, SyncFile, clone } = require("ada-util");
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
        return baseInfo.icons.reduce((a, icon) => {
            return a.then(() => {
                let path = Path.resolve(config.projectPath, icon.path);
                icon.hash = new SyncFile(path).hash();
                icon.fileName = config.develop ? Path.basename(icon.path) : `${icon.hash.substring(0, 8)}${Path.extname(icon.path)}`;
                icon.src = `${config.siteURL}logos/${icon.fileName}`;
                return new File(path).copyTo(Path.resolve(config.distPath, './logos/', icon.fileName));
            });
        }, Promise.resolve()).then(() => {
            let metaContent = baseInfo.meta.map(item => {
                let props = Reflect.ownKeys(item).map(key => `${key}="${item[key]}"`).join(" ");
                return `<meta ${props}>`;
            }).join("");
            let iconsContent = baseInfo.icons.map(info => {
                return `<link rel="apple-touch-icon-precomposed" sizes="${info.sizes}" href="${info.src}">`;
            }).join("");
            if (baseInfo.icons.length > 0) {
                iconsContent += `<link rel="shortcut icon" href="${baseInfo.icons[0].src}">`;
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
                let content = `<!DOCTYPE html><html><head><link rel="manifest" href="manifest.json"><meta charset="${baseInfo.charset}"><title>${baseInfo.name}</title>${metaContent}${iconsContent}${styleContent}${linkContent}${scriptContent}<script src="${this._adaURL}"></script><script>Ada.boot(${JSON.stringify(hookInfo.map)});</script></head><body></body></html>`;
                if (hookInfo.manifest.icons) {
                    hookInfo.manifest.icons.map(icon => {
                        return {
                            src: icon.src,
                            sizes: icon.sizes,
                            type: icon.type
                        };
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