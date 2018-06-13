module.exports = function (aa) {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve(aa);
		}, Math.round(Math.random() * 10) * 500);
	});
};