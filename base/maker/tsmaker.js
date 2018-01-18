let jsmaker = require("./jsmaker");
let Path = require("path");
module.exports = function (content, path, config) {
    return new Promise((resolve, reject) => {
        let file = path.substring(config.source_path.length);
        let args = config.compiler.typescript || ["--target ES5", "--noEmit", "--pretty", "--skipLibCheck", "--experimentalDecorators"];
        require("child_process").exec(`node ${Path.resolve(config.projectPath, "./node_modules/typescript")}/bin/tsc ${file} ${args.join(" ")}`, {
            encoding: "utf-8",
            cwd: config.source_path
        }, (error, stdout, stderr) => {
            if (error) {
                error.message = stdout || stderr;
                reject(error);
            } else {
                jsmaker(content, path, config).then((content) => {
                    resolve(content);
                }, (e) => {
                    reject(e);
                });
            }
        });
    });
};