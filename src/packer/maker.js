let Installer = require("./installer");
let Path = require("path");
let {File} = require("ada-util");
let Config=require("./../config/index");

class Maker {
    constructor(config) {
        this._config = config;
        this._installer = new Installer(config);
    }

    get config() {
        return this._config;
    }

    get installer() {
        return this._installer;
    }

    make(path, info) {
        let type = Path.extname(path).substring(1);
        return new File(path).read().then(content => {
            if (Config.dependence[type]) {
                return this.installer.readyTypeModules(type).then(() => {
                    let makers = Config.dependence[type].maker;
                    if (!Array.isArray(makers)) {
                        makers = [makers];
                    }
                    return makers.reduce((a, maker) => {
                        return a.then((code) => {
                            if (typeof maker === 'string') {
                                maker = require(maker);
                            }
                            return maker({content: code, path, option: this.config, fileInfo: info});
                        });
                    }, Promise.resolve(content));
                });
            } else {
                return Promise.resolve(content);
            }
        });
    }

    babelCode(code, path) {
        let config = this.config;
        let ops = Object.assign({}, Config.compiler.babel, {filename: path});
        let content = require("@babel/core").transform(code, ops).code;
        try {
            content = require("uglify-es").minify(content, Object.assign({}, Config.compiler.uglify)).code;
        } catch (e) {
        }
        return content;
    }

    minifyCode(code) {
        return this.installer.readyTypeModules("js").then(() => {
            let content = code;
            try {
                content = require("uglify-es").minify(content, Object.assign({}, Config.compiler.uglify)).code;
            } catch (e) {
            }
            return content;
        });
    }

    minifyIcon(content) {
        return this.installer.readyTypeModules("less").then(() => {
            content = require('html-minifier').minify(content, {
                removeComments: true,
                collapseWhitespace: true,
                minifyJS: true,
                minifyCSS: true
            });
            let titleTag = content.match(/<title>[\s\S]*?>/);
            let name = "";
            if (titleTag) {
                name = titleTag[0].substring(7, titleTag[0].length - 8).trim();
            }
            let et = content.replace(/svg/g, "symbol").replace(/xmlns\=".*?"/, "").replace(/version\=".*?"/, "").replace(/viewBox\=".*?"/, (str) => {
                return `${str} id="${name}"`;
            });
            let code = `<svg style="width:0;height:0;overflow:hidden;" version="1.1" xmlns="http://www.w3.org/2000/svg">${et}</svg>`;
            return {name, code};
        });
    }

    lessCode(content) {
        return this.installer.readyTypeModules("less").then(() => {
            return new Promise((resolve, reject) => {
                require("less").render(content, function (e, output) {
                    if (!e) {
                        let code = require('html-minifier').minify(output.css, {
                            removeComments: true,
                            collapseWhitespace: true,
                            minifyJS: true,
                            minifyCSS: true
                        });
                        resolve(code);
                    } else {
                        console.log(e)
                        resolve("");
                    }
                });
            });
        });
    }
}

module.exports = Maker;