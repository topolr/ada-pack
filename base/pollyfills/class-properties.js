module.exports = function (content, path, option) {
    let result = content.replace(/_initializerDefineProperty[\s\S]+?\}/g, function (str) {
        return str.replace(/descriptor.writable/g, "true");
    });
    return Promise.resolve(result);
};