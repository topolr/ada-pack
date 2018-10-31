let colors = require("colors");

class Commander {
    constructor() {
        this._commands = {};
    }

    static blank(t) {
        let m = "";
        for (let i = 0; i < t; i++) {
            m += " ";
        }
        return m;
    }

    bind({command, desc, paras, fn}) {
        this._commands[command] = {
            name: command,
            desc: desc,
            fn: fn,
            paras: paras
        };
        return this;
    }

    call(parameter) {
        let command = parameter[0];
        parameter.splice(0, 1);
        if (this._commands[command]) {
            let p = parameter, rt = true;
            this._commands[command].fn(p);
        } else {
            this.showDesc();
        }
    }

    showDesc() {
        console.log("Useage:".yellow);
        let leg = 0;
        for (let i in this._commands) {
            let info = this._commands[i];
            if (info.name.length > leg) {
                leg = info.name.length;
            }
        }
        leg = leg + 6;
        for (let i in this._commands) {
            let info = this._commands[i], t = [];
            if (info.paras && info.paras.length > 0) {
                let a = [];
                for (let i in info.paras) {
                    a.push("<" + info.paras[i] + ">");
                }
                console.log(`    ${info.name}`.white, `  ${a.join(",")}`.cyan);
                info.desc.split("\n").forEach(function (a) {
                    console.log(`    ${Commander.blank(leg) + a}`);
                });
            } else {
                console.log(`    ${info.name}`.white, `${Commander.blank(leg - info.name.length) + info.desc}`.cyan);
            }
        }
    }

}

module.exports = Commander;