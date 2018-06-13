let worker = require("./main/index");
let test = require("./main/worker/test");

worker.start({test});

for (let i = 0; i < 20; i++) {
	worker.request({
		type: "test",
		parameter: new Date().getTime()
	}, time => {
		console.log("TIME:" + time + "--" + i);
	});
}