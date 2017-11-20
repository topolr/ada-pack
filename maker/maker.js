const Map = {
    js: require("./jsmaker"),
    css: require("./cssmaker"),
    scss: require("./sassmaker"),
    less: require("./lessmaker"),
    json: require("./jsonmaker"),
    html: require("./htmlmaker")
};

module.exports = {
    parse(type, path, content, option) {
        if (Map[type]) {
            return Map[type](content, path, option);
        } else {
            return Promise.resolve(content);
        }
    }
};