let colors = require("colors");
let Path = require("path");
let {File} = require("ada-util");
let Packer = require("./../../index");
let helper = require("../../src/util/helper");
let os = require("os");
let childProcess = require('child_process');

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
    desc: "out put static files by ssr",
    paras: [],
    fn: function () {
        let appInfo = helper.getAppInfo(process.cwd(), true);
        if (appInfo.ssr.output) {
            tryKillProcess(appInfo.server.port).then(() => {
                const distPath = Path.resolve(appInfo.projectPath, appInfo.ssr.output);
                console.log('[SSR]'.grey, 'START TO PUBLISH PROJECT'.green);
                Packer.publish(appInfo, false).then(() => {
                    console.log('[SSR]'.grey, 'PUBLISH PROJECT DONE,START SERVER'.green);
                    let server = childProcess.spawn("node", [Path.resolve(__dirname, "./../lib/process.js")], {
                        cwd: process.cwd(),
                        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
                    });
                    server.on("message", a => {
                        if (a.type === 'done') {
                            console.log('[SSR]'.grey, 'SERVER STARTED,START SSR'.green);
                            let {DistRenderer} = require(Path.resolve(process.cwd(), "./adajs/server"));
                            let renderer = new DistRenderer({
                                origin: "http://localhost:8080",
                                distPath: appInfo.distPath
                            });
                            let startTime = new Date().getTime();
                            renderer.outputURLs(appInfo.ssr.urls).then(results => {
                                Reflect.ownKeys(results).reduce((a, path) => {
                                    return a.then(() => new File(Path.resolve(distPath, `.${path === '/' ? '/index.html' : path}`)).make().then(file => file.write(results[path])));
                                }, Promise.resolve());
                            }).then(() => {
                                console.log(`[SSR]`.grey, `ALL DONE IN ${new Date().getTime() - startTime}ms`.green);
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
                        console.log(`[SSR]`.grey, `SERVER HAS STOPPED`.green);
                    });
                });
            });
        } else {
            console.log(`[SSR] Error output path can not empty in config file`.red);
        }
    }
};