let BaseEntity = require("./base");
let {ENTITYREADY} = require("./const");

class BinaryEntity extends BaseEntity {
	reset() {
		this.state = ENTITYREADY;
		this.output = false;
		this.errorLog = null;
	}
}

module.exports = BinaryEntity;