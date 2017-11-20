let sass = require('node-sass');
let maker = require("./cssmaker");
module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        sass.render(Object.assign({
            file: path,
            sourceMap: true
        }, option.sass), function (err, result) {
            if (!err) {
                resolve(result.css.toString());
            } else {
                reject(content);
            }
        });
    }).then(content => {
        return maker(content, path, option);
    });
};