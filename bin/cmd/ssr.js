let colors = require("colors");
let os = require("os");
let Path = require("path");
let { File } = require("ada-util");
let Packer = require("./../../index");
let childProcess = require('child_process');
let config = require("./../../src/config/index");

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
    desc: "out put static files by SSR",
    paras: [],
    fn: function () {
        if (config.ssr.output) {
            tryKillProcess(config.server.port).then(() => {
                console.log('[SSR]'.grey, 'START TO PUBLISH PROJECT'.cyan);
                Packer.publish(config).then(() => {
                    console.log('[SSR]'.grey, 'PUBLISH PROJECT DONE,START SERVER'.cyan);
                    let server = childProcess.spawn("node", [Path.resolve(__dirname, "./../lib/process.js")], {
                        cwd: process.cwd(),
                        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                    });
                    server.on("message", a => {
                        if (a.type === 'done') {
                            console.log('[SSR]'.grey, 'SERVER STARTED,START SSR'.cyan);
                            let { DistRenderer } = require(Path.resolve(process.cwd(), "./node_modules/adajs/server"));
                            let startTime = new Date().getTime();
                            config.apps.reduce((a, appInfo) => {
                                return a.then(() => {
                                    const distPath = Path.resolve(appInfo.projectPath, appInfo.ssr.output);
                                    let renderer = new DistRenderer({
                                        origin: "http://localhost:8080",
                                        distPath: appInfo.distPath
                                    });
                                    return renderer.outputURLs(appInfo.ssr.urls).then(results => {
                                        Reflect.ownKeys(results).reduce((a, path) => {
                                            return a.then(() => new File(Path.resolve(distPath, `.${path === '/' ? '/index.html' : path}`)).make().then(file => file.write(results[path])));
                                        }, Promise.resolve());
                                    });
                                });
                            }, Promise.resolve()).then(() => {
                                console.log(`[SSR]`.grey, `ALL DONE IN ${new Date().getTime() - startTime}ms`.cyan);
                                server.kill();
                            }).catch(e => {
                                console.log(e);
                                server.kill();
                            });
                        }
                    });
                    server.on('error', () => {
                        server.kill();
                    });
                    server.on('close', () => {
                        console.log(`[SSR]`.grey, `SERVER STOPPED`.green);
                    });
                    process.on('unhandledRejection', (err) => {
                        console.log(err);
                        server.kill();
                    });
                });
            });
        } else {
            console.log(`[SSR] Error output path can not empty in config file`.red);
        }
    }
};