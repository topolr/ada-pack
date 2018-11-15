module.exports = function ({content, path, option}) {
    return new Promise((resolve, reject) => {
        try {
            content = content.replace(/>[\s]+</g, "><").replace(/\r\n/g, "").replace(/\r/g, "").replace(/\n/g, "");
            resolve(content);
        } catch (e) {
            reject(e);
        }
    });
};