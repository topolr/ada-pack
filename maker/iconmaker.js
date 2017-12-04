module.exports = function (content, option) {
    return new Promise((resolve, reject) => {
        try {
            let titleTag = content.match(/<title>[\s\S]*?>/);
            let name = "";
            if (titleTag) {
                name = titleTag[0].substring(7, titleTag[0].length - 8).trim();
            }
            let et = content.replace(/svg/g, "symbol").replace(/\n/g, "").replace(/\r/g, "").replace(/\n\r/g, "").replace(/version\=".*?"/, (str) => {
                return str + ` id="${name}" `;
            });
            let code = `<svg style="position: absolute; width: 0; height: 0; overflow: hidden;" version="1.1" xmlns="http://www.w3.org/2000/svg" ><defs>${et}</defs></svg>`;

            let result = `var c=document.getElementById("ada-icon-container");if(!c){var c=document.createElement("div");c.setAttribute("id","ada-icon-container");document.body.appendChild(c);}var a=document.createElement("div");a.innerHTML=${JSON.stringify(code)};c.appendChild(a.childNodes[0]);module.exports="${name}"`;
            resolve(result);
        } catch (e) {
            resolve(content);
        }
    });
};