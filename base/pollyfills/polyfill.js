const Map = {
    js: require("./class-properties")
};

module.exports = {
    pollyfill(type, path, content, option) {
        if (Map[type]) {
            return Map[type](content, path, option);
        } else {
            return Promise.resolve(content);
        }
    }
};