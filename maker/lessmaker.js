var less = require("less");
let maker = require("./cssmaker");
module.exports = function (content, option, fn) {
    return new Promise((resolve, reject) => {
        less.render(content, function (e, output) {
            if (!e) {
                reject(output.css);
            } else {
                resolve(content);
            }
        });
    }).then(content => {
        return maker(content, path, option);
    });
};