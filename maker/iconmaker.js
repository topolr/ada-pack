module.exports = function (content, option) {
    return new Promise((resolve, reject) => {
        try {
            let code = `<svg style="position: absolute; width: 0; height: 0; overflow: hidden;" version="1.1" xmlns="http://www.w3.org/2000/svg" ><defs>${content.replace("svg", "symbol")}</defs></svg>`;
            let result = `var c=document.getElementById("ada-icon-container");iif(!c){var c=document.createElement("div");c.setAttribute("id","ada-icon-container");document.body.appendChild(c);}var a=document.createDocumentFragment();a.innerHTML="${code}";c.appendChild(a);`;
            resolve(result);
        } catch (e) {
            resolve(content);
        }
    });
};