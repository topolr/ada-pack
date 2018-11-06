let uglifycss = require("uglifycss");
let postcss = require('postcss');
let autoprefixer = require('autoprefixer');

module.exports = function ({content, path, option}) {
    return new Promise((resolve, reject) => {
        let r = content;
        if (!option.develop) {
            r = uglifycss.processString(r, Object.assign({
                uglyComments: true,
                cuteComments: true
            }, option.compiler.uglifycss));
        }
        postcss([
            autoprefixer(Object.assign({browsers: ['> 1%', 'IE 7']}, option.compiler.autoprefixer))
        ]).process(r, {
            from: undefined
        }).then(result => {
            resolve(result.css);
        }, (e) => {
            reject(e);
        });
    });
};