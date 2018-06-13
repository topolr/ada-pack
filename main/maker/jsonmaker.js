module.exports = function (content, option) {
    return new Promise((resolve, reject) => {
        try {
            resolve(JSON.stringify(JSON.parse(content)));
        } catch (e) {
            reject(e);
        }
    });
};