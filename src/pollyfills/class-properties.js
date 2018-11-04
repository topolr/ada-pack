module.exports = function (content) {
    return content.replace(/_initializerDefineProperty[\s\S]+?\}/g, function (str) {
        return str.replace(/descriptor.writable/g, "true");
    });
};