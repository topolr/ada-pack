const ENTITYREADY = "ready";
const ENTITYNONE = "none";
const THRIDPARTFOLDER = "node_modules";
const IGNOREMODULES = ["adajs", ...require('module').builtinModules];

module.exports = {ENTITYNONE, ENTITYREADY, THRIDPARTFOLDER, IGNOREMODULES};