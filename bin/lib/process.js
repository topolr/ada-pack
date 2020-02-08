let DevServer = require("./../lib/server");
let config = require("./../../src/config/index");

return new DevServer(config).start().then(() => {
	process.send({ type: "done" });
});