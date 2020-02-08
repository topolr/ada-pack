let BaseEntity = require("./base");
let { ENTITYREADY } = require("./const");

class BinaryEntity extends BaseEntity {
	reset() {
		this.state = ENTITYREADY;
		this.output = false;
	}
}

module.exports = BinaryEntity;