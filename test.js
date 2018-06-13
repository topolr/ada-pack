let worker = require("./main/util/worker");
let test = require("./main/worker/test");

worker.start({test});

for (let i = 0; i < 20; i++) {
	worker.requestPromise({
		type: "test",
		parameter: new Date().getTime()
	}).then(time => {
		console.log("TIME:" + time + "--" + i);
	});
}