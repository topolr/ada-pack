module.exports = function (content, option, fn) {
    return new Promise((resolve, reject) => {
        let TypeScriptSimple = require('typescript-simple').TypeScriptSimple;
        let tss = new TypeScriptSimple(Object.assign({
            target: ts.ScriptTarget.ES6,
            noImplicitAny: true
        }, option.compiler.typescript));
        try {
            resolve(tss.compile(content));
        } catch (e) {
            reject(e);
        }
    });
};