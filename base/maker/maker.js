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
        moduleName: "./jsmaker"

    },
    css: {
        dependence: {
            "autoprefixer": "^7.1.6",
            "postcss": "^5.2.5",
            "uglifycss": "^0.0.25",
        },
        moduleName: "./cssmaker"
    },
    scss: {
        dependence: {
            "autoprefixer": "^7.1.6",
            "postcss": "^5.2.5",
            "uglifycss": "^0.0.25",
            "node-sass": "^3.10.1"
        },
        maker: "./sassmaker"
    },
    less: {
        dependence: {
            "autoprefixer": "^7.1.6",
            "postcss": "^5.2.5",
            "uglifycss": "^0.0.25",
            "less": "^2.7.1"
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
    checkDependence(type, config) {
        let a = Mapped[type];
        if (a) {
            return queue(Reflect.ownKeys(a.dependence).map(name => () => {
                let path = Path.resolve(config.projectPath, "./node_modules/", name);
                if (!new File(path).isExists()) {
                    console.log(` - [INSTALL MODULE]:${name}`.white);
                    return new Promise((resolve, reject) => {
                        let args = ["install", name, "--save-dev"];
                        require("child_process").exec(`npm ${args.join(" ")}`, {
                            encoding: "utf-8",
                            cwd: config.projectPath
                        }, (error, stdout, stderr) => {
                            if (error) {
                                console.log(` - [INSTALL MODULE FAIL]:${name}`.red);
                                reject(name);
                            } else {
                                console.log(` - [INSTALL MODULE DONE]:${name}`.green);
                                resolve(name);
                            }
                        });
                    });
                } else {
                    return Promise.resolve();
                }
            }));
        } else {
            return Promise.resolve();
        }
    }
};

let Maker = {
    parse(type, path, content, option) {
        if (Map[type]) {
            return base.checkDependence(type, option).then(() => {
                return require(Mapped[type].maker)(content, path, option);
            });
        } else {
            return Promise.resolve(content);
        }
    },
    jsCode(content) {
        return this.babelCode({
            projectPath: Path.resolve(__dirname, "./../../../../")
        }, content);
    },
    babelCode(config, code) {
        return base.checkDependence("js", config).then(() => {
            let content = require("@babel/core").transform(code, config.compiler.babel).code;
            try {
                content = require("uglify-es").minify(content, Object.assign({
                    fromString: true,
                    mangle: true
                }, config.compiler.uglify)).code;
            } catch (e) {
            }
            return content;
        });
    },
    minifyCode(config, code) {
        return base.checkDependence("js", config).then(() => {
            let content = code;
            try {
                content = require("uglify-es").minify(content, Object.assign({
                    fromString: true,
                    mangle: true
                }, config.compiler.uglify)).code;
            } catch (e) {
            }
            return content;
        });
    },
    lessCode(content) {
        return base.checkDependence("less", config).then(() => {
            require("less").render(content, function (e, output) {
                if (!e) {
                    let code = minify(output.css, {
                        removeComments: true,
                        collapseWhitespace: true,
                        minifyJS: true,
                        minifyCSS: true
                    });
                    resolve(code);
                } else {
                    console.log(e)
                }
            });
        });
    }
};

module.exports = Maker;