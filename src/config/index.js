const Path = require("path");
const { SyncFile } = require("ada-util");
const configPath = process.env.CONFIG_PATH || '/Users/wangjinliang/flutter/ada';
const helper = require("./../util/helper");

const appConfig = {
    name: "root",
    basePath: "./app/",
    sourcePath: "./src/",
    main: "./src/root.js",
    initer: "",
    worker: {
        scope: "/",
        path: ""
    },
    entryPath: "./src/entries",
    staticPath: "./src/static",
    moduleMap: {},
    watchNodeModules: false,
    entryFiles() {
        return [];
    },
    singleFiles() {
        return [];
    },
    ignore: [],
    output: {
        files: true,
        packFiles: true,
        staticFiles: true
    },
    hook: [],
    style: [],
    script: []
};

const config = {
    siteURL: "/",
    siteInfo: {
        name: "ada",
        icons: [],
        short_name: "ada",
        start_url: "/",
        display: "standalone",
        background_color: "#fff",
        theme_color: "#fff",
        description: "ada web framework.",
        related_applications: [{ "platform": "web" }],
        keywords: "",
        charset: "UTF-8",
        meta: [
            { name: 'viewport', content: "width=device-width, initial-scale=1.0, minimum-scale=1.0, user-scalable=no" },
            { name: 'format_detection', content: "telephone=no" },
            { name: 'apple_mobile_web_app_status_bar_style', content: "white" },
            { name: 'apple_mobile_web_app_capable', content: "yes" }
        ],
        link: [],
        style: [],
        script: []
    },
    root: 'root',
    distPath: "./dist/",
    apps: [],
    dependence: {
        js: {
            dependence: {
                "uglify-es": "^3.3.8",
                "@babel/cli": "^7.1.0",
                "@babel/core": "^7.1.0",
                "@babel/runtime-corejs2": "^7.1.2",
                "@babel/plugin-proposal-class-properties": "^7.1.0",
                "@babel/plugin-proposal-decorators": "^7.0.0-beta.52",
                "@babel/plugin-proposal-do-expressions": "^7.0.0",
                "@babel/plugin-proposal-function-bind": "^7.0.0",
                "@babel/plugin-proposal-object-rest-spread": "^7.0.0",
                "@babel/plugin-syntax-dynamic-import": "^7.0.0",
                "@babel/plugin-syntax-export-extensions": "^7.0.0-beta.32",
                "@babel/plugin-transform-async-to-generator": "^7.1.0",
                "@babel/plugin-transform-runtime": "^7.1.0",
                "@babel/polyfill": "^7.0.0",
                "@babel/preset-env": "^7.1.0",
                "@babel/preset-typescript": "^7.1.0",
                "@babel/register": "^7.0.0",
                "@babel/runtime": "^7.0.0",
                "koa": ""
            },
            maker: "./maker/jsmaker"
        },
        css: {
            dependence: {
                "autoprefixer": "^7.1.6",
                "postcss": "^5.2.5",
                "uglifycss": "^0.0.25",
                "html-minifier": "^3.5.6"
            },
            maker: "./maker/cssmaker"
        },
        scss: {
            dependence: {
                "autoprefixer": "^7.1.6",
                "postcss": "^5.2.5",
                "uglifycss": "^0.0.25",
                "node-sass": "^3.10.1",
                "html-minifier": "^3.5.6"
            },
            maker: "./maker/sassmaker"
        },
        less: {
            dependence: {
                "autoprefixer": "^7.1.6",
                "postcss": "^5.2.5",
                "uglifycss": "^0.0.25",
                "less": "^2.7.1",
                "html-minifier": "^3.5.6"
            },
            maker: "./maker/lessmaker"
        },
        json: {
            dependence: {},
            maker: "./maker/jsonmaker"
        },
        html: {
            dependence: {
                "html-minifier": "^3.5.6"
            },
            maker: "./maker/htmlmaker"
        },
        icon: {
            dependence: {
                "html-minifier": "^3.5.6"
            },
            maker: "./maker/iconmaker"
        },
        ts: {
            dependence: {
                "typescript": "^2.6.2",
                "uglify-es": "^3.3.8",
                "@babel/cli": "^7.1.0",
                "@babel/core": "^7.1.0",
                "@babel/runtime-corejs2": "^7.1.2",
                "@babel/plugin-proposal-class-properties": "^7.1.0",
                "@babel/plugin-proposal-decorators": "^7.0.0-beta.52",
                "@babel/plugin-proposal-do-expressions": "^7.0.0",
                "@babel/plugin-proposal-function-bind": "^7.0.0",
                "@babel/plugin-proposal-object-rest-spread": "^7.0.0",
                "@babel/plugin-syntax-dynamic-import": "^7.0.0",
                "@babel/plugin-syntax-export-extensions": "^7.0.0-beta.32",
                "@babel/plugin-transform-async-to-generator": "^7.1.0",
                "@babel/plugin-transform-runtime": "^7.1.0",
                "@babel/polyfill": "^7.0.0",
                "@babel/preset-env": "^7.1.0",
                "@babel/preset-typescript": "^7.1.0",
                "@babel/register": "^7.0.0",
                "@babel/runtime": "^7.0.0",
            },
            maker: "./lib/maker/tsmaker"
        }
    },
    compiler: {
        babel: {
            presets: [
                "@babel/typescript", ["@babel/env", { "targets": { "chrome": "59" } }]
            ],
            plugins: [
                ["@babel/plugin-transform-runtime", {
                    "helpers": false,
                    "regenerator": true
                }],
                ["@babel/plugin-proposal-decorators", { "legacy": true }],
                ["@babel/plugin-proposal-class-properties", { "loose": true }],
                "@babel/transform-async-to-generator",
                "@babel/plugin-syntax-dynamic-import",
                "@babel/plugin-proposal-function-bind",
                "@babel/plugin-syntax-export-extensions",
                "@babel/plugin-proposal-do-expressions",
                "@babel/plugin-proposal-object-rest-spread"
            ]
        },
        uglify: {},
        uglifycss: {},
        postcss: [
            { autoprefixer: {} }
        ],
        sass: {},
        minifier: {},
        typescript: ["--target ESNext", "--noEmit", "--pretty", "--skipLibCheck", "--experimentalDecorators"]
    },
    server: {
        enable: true,
        protocol: "http",
        host: "localhost",
        port: "8080",
        serverPath: "./server.js",
        proxy: null
    },
    ssr: {
        urls: [],
        output: ""
    },
    hook: [],
    indexPaths() {
        return []
    }
};
const configFilePath = Path.resolve(configPath || process.cwd(), "./.ada-app-config.js");
new SyncFile(configFilePath).exist && helper.extend(true, config, require(configFilePath));
const projectPath = Path.resolve(configFilePath, './../');
const distPath = Path.resolve(projectPath, config.distPath).replace(/\\/g, "/");
config.projectPath = projectPath;
config.nmodulePath = Path.join(projectPath, "./node_modules/").replace(/\\/g, "/");
config.distPath = distPath;
config.apps = config.apps.map(app => {
    if (!app.host) {
        let _config = helper.extend(true, {}, appConfig, app, {
            dependence: config.dependence,
            compiler: config.compiler
        });
        let basePath = Path.resolve(projectPath, _config.basePath);
        _config.siteURL = config.siteURL + _config.name + "/";
        _config.projectPath = projectPath;
        _config.basePath = basePath;
        _config.distPath = Path.join(config.distPath, `./${_config.name}`).replace(/\\/g, "/");
        _config.sourcePath = Path.join(basePath, _config.sourcePath).replace(/\\/g, "/");
        _config.nmodulePath = Path.join(_config.projectPath, "./node_modules/").replace(/\\/g, "/");
        // _config.indexPath = Path.join(basePath, _config.indexPath, "./../").replace(/\\/g, "/");
        _config.entryPath = Path.join(basePath, _config.entryPath).replace(/\\/g, "/");
        _config.mainEntryPath = Path.join(basePath, _config.main).replace(/\\/g, "/");
        if (_config.initer) {
            _config.initerPath = Path.join(basePath, _config.initer).replace(/\\/g, "/");
        }
        if (_config.worker && _config.worker.path) {
            _config.workerPath = Path.join(basePath, _config.worker.path).replace(/\\/g, "/");
        }
        if (_config.staticPath) {
            _config.staticPath = Path.join(basePath, _config.staticPath).replace(/\\/g, "/");
        }
        ["projectPath", "basePath", "distPath", "sourcePath", "entryPath", "staticPath", "nmodulePath"].forEach(name => {
            if (_config[name] && !_config[name].endsWith("/")) {
                _config[name] = _config[name] + "/";
            }
        });
        return _config;
    } else {
        let host = app.host[app.host.length - 1] === '/' ? app.host : app.host + '/';
        app.siteURL = host + app.name + '/';
        return app;
    }
});
["distPath"].forEach(name => {
    if (config[name] && !config[name].endsWith("/")) {
        config[name] = config[name] + "/";
    }
});
if (config.siteURL[config.siteURL.length - 1] !== "/") {
    config.siteURL = config.siteURL + "/";
}

module.exports = config;