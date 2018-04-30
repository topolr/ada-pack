let sass = require('node-sass');
let maker = require("./cssmaker");
module.exports = function (content, path, option) {
    return new Promise((resolve, reject) => {
        sass.render(Object.assign({
            file: path,
            sourceMap: true,
            sourceMapEmbed:true
        }, option.compiler.sass), function (err, result) {
            if (!err) {
                resolve(result.css.toString());
            } else {
                reject(err);
            }
        });
    }).then(content => {
        return maker(content, path, option);
    });
};