let File = require("./../lib/file");
let queue = require("./../lib/queue");
let Path = require("path");
let colors = require("colors");

const Mapped = {
    js: {
        dependence: {
            "@babel/core": "^7.0.0-beta.37",
            "@babel/plugin-proposal-class-properties": "^7.0.0-beta.37",
            "@babel/plugin-proposal-decorators": "^7.0.0-beta.37",
            "@babel/plugin-proposal-do-expressions": "^7.0.0-beta.37",
            "@babel/plugin-proposal-function-bind": "^7.0.0-beta.37",
            "@babel/plugin-proposal-object-rest-spread": "^7.0.0-beta.37",
            "@babel/plugin-syntax-dynamic-import": "^7.0.0-beta.37",
            "@babel/plugin-syntax-export-extensions": "^7.0.0-beta.32",
            "@babel/plugin-transform-async-to-generator": "^7.0.0-beta.37",
            "@babel/polyfill": "^7.0.0-beta.37",
            "@babel/preset-env": "^7.0.0-beta.37",
            "@babel/preset-typescript": "^7.0.0-beta.37",
            "uglify-es": "^3.3.8"
        },
        maker: "./jsmaker"
    },
    css: {
        dependence: {
            "autoprefixer": "^7.1.6",
            "postcss": "^5.2.5",
            "uglifycss": "^0.0.25",
            "html-minifier": "^3.5.6"
        },
        maker: "./cssmaker"
    },
    scss: {
        dependence: {
            "autoprefixer": "^7.1.6",
            "postcss": "^5.2.5",
            "uglifycss": "^0.0.25",
            "node-sass": "^3.10.1",
            "html-minifier": "^3.5.6"
        },
        maker: "./sassmaker"
    },
    less: {
        dependence: {
            "autoprefixer": "^7.1.6",
            "postcss": "^5.2.5",
            "uglifycss": "^0.0.25",
            "less": "^2.7.1",
            "html-minifier": "^3.5.6"
        },
        maker: "./lessmaker"
    },
    json: {
        dependence: {},
        maker: "./jsonmaker"
    },
    html: {
        dependence: {
            "html-minifier": "^3.5.6"
        },
        maker: "./htmlmaker"
    },
    icon: {
        dependence: {
            "html-minifier": "^3.5.6"
        },
        maker: "./iconmaker"
    },
    ts: {
        dependence: {
            "@babel/core": "^7.0.0-beta.37",
            "@babel/plugin-proposal-class-properties": "^7.0.0-beta.37",
            "@babel/plugin-proposal-decorators": "^7.0.0-beta.37",
            "@babel/plugin-proposal-do-expressions": "^7.0.0-beta.37",
            "@babel/plugin-proposal-function-bind": "^7.0.0-beta.37",
            "@babel/plugin-proposal-object-rest-spread": "^7.0.0-beta.37",
            "@babel/plugin-syntax-dynamic-import": "^7.0.0-beta.37",
            "@babel/plugin-syntax-export-extensions": "^7.0.0-beta.32",
            "@babel/plugin-transform-async-to-generator": "^7.0.0-beta.37",
            "@babel/polyfill": "^7.0.0-beta.37",
            "@babel/preset-env": "^7.0.0-beta.37",
            "@babel/preset-typescript": "^7.0.0-beta.37",
            "uglify-es": "^3.3.8",
            "typescript": "^2.6.2"
        },
        maker: "./tsmaker"
    }
};

const base = {
    tasks: [],
    checkDependence(type, config) {
        if (this.tasks.indexOf(type) === -1) {
            this.tasks.push(type);
            let a = Mapped[type];
            if (a) {
                return queue(Reflect.ownKeys(a.dependence).map(name => () => {
                    let path = Path.resolve(config.projectPath, "./node_modules/", name);
                    if (!new File(path).isExists()) {
                        let desc = ` - INSTALL MODULE [${name.green}]...`;
                        process.stderr.write(desc.cyan);
                        process.stderr.cursorTo(desc.length);
                        return new Promise((resolve, reject) => {
                            // let args = ["install", name, "--save-dev"];
                            let args = ["install", name];
                            require("child_process").exec(`npm ${args.join(" ")}`, {
                                encoding: "utf-8",
                                cwd: config.projectPath
                            }, (error, stdout, stderr) => {
                                if (error) {
                                    process.stderr.clearLine();
                                    process.stderr.cursorTo(0);
                                    console.log(` - INSTALL MODULE [${name.yellow}] FAIL`.red);
                                    console.log(` - Please run > npm install ${name.yellow} to install the module`);
                                    reject(name);
                                } else {
                                    process.stderr.clearLine();
                                    process.stderr.cursorTo(0);
                                    console.log(` - INSTALL MODULE [${name.blue}] DONE`.green);
                                    resolve(name);
                                }
                            });
                        });
                    } else {
                        return Promise.resolve();
                    }
                }));
            } else {
                console.log(` [sorry ada-pack can not resolve files with suffix of ${type}]`.red);
                return Promise.resolve();
            }
        } else {
            return Promise.resolve();
        }
    },
    checkAllDependence(sourcePath, config){
        let types = [];
        new File(sourcePath).scan().map(path => {
            let suffix = new File(path).suffix();
            if (types.indexOf(suffix) === -1) {
                types.push(suffix);
            }
        });
        if (this.checkNotInstalled(types)) {
            console.log(` NOW CHECK AND INSTALL MODULES WHICH REQUIRED`.yellow);
            return queue(types.map(type => () => {
                return this.checkDependence(type, config);
            })).then(() => {
                console.log(` MODULES INSTALL DONE`.yellow);
            });
        } else {
            return Promise.resolve();
        }
    },
    checkNotInstalled(types){
        let projectPath = Path.resolve(__dirname, "./../../../../"), result = false;
        for (let i = 0; i < types.length; i++) {
            let type = types[i];
            if (Mapped[type]) {
                for (let name in Mapped[type].dependence) {
                    let path = Path.resolve(projectPath, "./node_modules/", name);
                    if (!new File(path).isExists()) {
                        result = true;
                        break;
                    }
                }
            }
            if (result) {
                break;
            }
        }
        return result;
    }
};

let Maker = {
    parse(type, path, content, option) {
        if (Mapped[type]) {
            return base.checkDependence(type, option).then(() => {
                return require(Mapped[type].maker)(content, path, option);
            });
        } else {
            return Promise.resolve(content);
        }
    },
    appCode(appPath) {
        return base.checkDependence("js", {
            projectPath: Path.resolve(__dirname, "./../../../../")
        }).then(() => {
            let content = new File(appPath).readSync();
            content = require("@babel/core").transform(content, {
                presets: [
                    "@babel/typescript", ["@babel/env", {"targets": {"browsers": "last 2 Chrome versions"}}]
                ],
                plugins: [
                    "@babel/plugin-proposal-decorators",
                    ["@babel/plugin-proposal-class-properties", {"loose": true}],
                    "@babel/transform-async-to-generator",
                    "@babel/syntax-dynamic-import"
                ]
            }).code;
            try {
                content = require("uglify-es").minify(content).code;
            } catch (e) {
            }
            return content;
        });

    },
    babelCode(config, code) {
        return base.checkDependence("js", config).then(() => {
            let content = require("@babel/core").transform(code, config.compiler.babel).code;
            try {
                content = require("uglify-es").minify(content, Object.assign({}, config.compiler.uglify)).code;
            } catch (e) {
            }
            return content;
        });
    },
    minifyCode(config, code) {
        return base.checkDependence("js", config).then(() => {
            let content = code;
            try {
                content = require("uglify-es").minify(content, Object.assign({}, config.compiler.uglify)).code;
            } catch (e) {
            }
            return content;
        });
    },
    lessCode(content) {
        return base.checkDependence("less", {
            projectPath: Path.resolve(__dirname, "./../../../../")
        }).then(() => {
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
    },
    installAllDependence(sourcePath, config){
        return base.checkAllDependence(sourcePath, config);
    },
    installAdapackDependence(){
        let types = ["js"];
        if (base.checkNotInstalled(types)) {
            console.log(` CHECK AND INSTALL BASE MODULES...`.yellow);
            return queue(types.map(type => () => {
                return base.checkDependence(type, {
                    projectPath: Path.resolve(__dirname, "./../../../../")
                });
            })).then(() => {
                console.log(` BASE MODULES INSTALL DONE`.green);
            });
        } else {
            return Promise.resolve();
        }
    }
};

module.exports = Maker;