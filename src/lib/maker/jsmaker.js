let babel = require("@babel/core");
let UglifyJS = require("uglify-es");
let classPropertiesPollyfill = require("../../pollyfills/class-properties");
let {File} = require("ada-util");
let Path = require("path");

module.exports = function ({content, path, option}) {
	return new Promise((resolve, reject) => {
		try {
			if (option.develop) {
				let filename = path.indexOf("node_modules") === -1 ? path.substring(option.sourcePath.length) : "node_modules/" + path.substring(option.nmodulePath.length);
				let info = babel.transform(content, Object.assign({
					filename,
					sourceMaps: true
				}, option.compiler.babel));
				info.map.sources = [`${option.siteURL + filename}`];
				content = info.code;
				content = classPropertiesPollyfill(content);
				content = content + `\n//# sourceMappingURL=${filename}.map`;
				new File(Path.resolve(option.distPath, `./${filename}.map`)).write(JSON.stringify(info.map)).then(() => {
					resolve(content);
				});
			} else {
				let ops = Object.assign({}, option.compiler.babel);
				ops.filename = path;
				content = babel.transform(content, ops).code;
				content = classPropertiesPollyfill(content);
				try {
					content = UglifyJS.minify(content, Object.assign({}, option.compiler.uglify)).code;
				} catch (e) {
				}
				resolve(content);
			}
		} catch (e) {
			reject(e);
		}
	});
};