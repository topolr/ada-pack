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
			postcss(option.compiler.postcss.map(info => {
				if (info.autoprefixer) {
					return autoprefixer(info.autoprefixer);
				} else {
					return info;
				}
			})).process(r, {
				from: undefined
			}).then(result => {
				resolve(result.css);
			}, (e) => {
				reject(e);
			});
		} else {
			resolve(content);
		}
	});
};