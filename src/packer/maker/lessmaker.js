var less = require("less");
let maker = require("./cssmaker");
module.exports = function ({content, path, option}) {
    return new Promise((resolve, reject) => {
        less.render(content, function (e, output) {
            if (!e) {
                reject(output.css);
            } else {
                reject(e);
            }
        });
    }).then(content => {
        return maker({content, path, option});
    });
};