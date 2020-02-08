let os = require("os");
let Path = require("path");
let { File } = require("ada-util");
let Packer = require("./../../index");
let childProcess = require('child_process');
let config = require("./../../src/config/index");
let ora = require('ora');
let chalk = require('chalk');

function tryKillProcess(port) {
    return new Promise((resolve, reject) => {
        let result = [];
        let ps = childProcess.spawn("lsof", ["-i", `tcp:${port}`]);
        ps.stdout.on('data', (data) => {
            result = data;
        });
        ps.on("error", resolve);
        ps.on('close', () => {
            let t = result.toString().split(os.EOL);
            if (t.length > 2) {
                let pid = t[1].replace(/[\s]+/g, " ").split(" ")[1];
                let ki = childProcess.spawn("kill", [pid]);
                ki.on("error", resolve);
                ki.on("close", resolve);
            } else {
                resolve();
            }
        });
    });
}

module.exports = {
    command: "ssr",
    desc: "out put static files",
    paras: [],
    fn: function () {
        if (config.ssr.output) {
            tryKillProcess(config.server.port).then(() => {
                console.log(chalk(`ADAPACK`).yellow, chalk(`|`).green, `PUBLISH`, chalk(`|`).yellow, chalk(`${require("./../../package").version}`).magenta);
                console.log(chalk('--------|'.padEnd(25, '-')).rainbow);
                console.log(chalk(`    SSR`).green, chalk(`|`).green, chalk('PUBLISH PROJECT').cyan);
                Packer.publish(true).then(() => {
                    console.log(chalk(`    SSR`).green, chalk(`|`).green, chalk('STARTE SERVER').cyan);
                    let server = childProcess.spawn("node", [Path.resolve(__dirname, "./../lib/process.js")], {
                        cwd: process.cwd(),
                        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                    });
                    server.on("message", a => {
                        if (a.type === 'done') {
                            let { DistRenderer } = require('/Users/wangjinliang/ada/ada/server');
                            let startTime = new Date().getTime();
                            const distPath = Path.resolve(config.projectPath, config.ssr.output);
                            let renderer = new DistRenderer({
                                origin: "http://localhost:8080",
                                distPath: config.distPath
                            });
                            let spinner = ora({ color: "yellow", text: "SERVER RENDER PAGE" }).start();
                            return renderer.outputURLs(config.ssr.urls).then(results => {
                                Reflect.ownKeys(results).reduce((a, path) => {
                                    return a.then(() => new File(Path.resolve(distPath, `.${path === '/' ? '/index.html' : path}`)).make().then(file => file.write(results[path])));
                                }, Promise.resolve());
                            }).then(() => {
                                spinner.stop();
                                console.log(chalk(`    SSR`).green, chalk(`|`).green, chalk(`RENDER DONE IN ${new Date().getTime() - startTime}ms`).cyan);
                                server.kill();
                            }).catch(e => {
                                spinner.stop();
                                console.log(e);
                                server.kill();
                            });
                        }
                    });
                    server.on('error', () => {
                        server.kill();
                    });
                    server.on('close', () => {
                        console.log(chalk(`    SSR`).green, chalk(`|`).green, chalk('SERVER STOPPED').cyan);
                    });
                    process.on('unhandledRejection', (err) => {
                        console.log(err);
                        server.kill();
                    });
                });
            });
        } else {
            console.log(chalk(`[SSR] Error output path can not empty in config file`).red);
        }
    }
};