// const createLLC = require("llvm-wasm/llc.js");
// const createLLD = require("llvm-wasm/lld.js");

const {registerOpcodes, getInitialProjectState, Settings, GlobalContext} = require("./shared.js");
const IOPass = require("./io-pass.js");
const TFAPass = require("./tfa-pass.js");
const CGPass = require("./cg-pass.js");

let llc = null;
let lld = null;

let projectState = null;

registerOpcodes(
    require("./blocks/control.js"),
    require("./blocks/operators.js"),
    require("./blocks/data.js"),
    require("./blocks/exclusive.js")
);

// async function initializeTranspiler() {
//     llc = await createLLC({
//         instantiateWasm: (imports, callback) => {
//             WebAssembly.instantiateStreaming(fetch("llvm-wasm/llc.wasm"), imports)
//             .then((result) => callback(result.instance, result.module))
//             .catch((error) => console.log(error));
//             return {};
//         }
//     });

//     lld = await createLLD({
//         instantiateWasm: (imports, callback) => {
//             WebAssembly.instantiateStreaming(fetch("llvm-wasm/lld.wasm"), imports)
//             .then((result) => callback(result.instance, result.module))
//             .catch((error) => console.log(error));
//             return {};
//         }
//     });
// }

function setScriptDirty(scriptID) {
    if(scriptID in projectState.scriptTable) projectState.scriptTable[scriptID].dirty = true;
}

function initializeProjectState() {
    projectState = getInitialProjectState();
}

async function transpile(data, debug=false) {
    let targetNew = [];
    let scriptNew = [];
    let varNew = [];

    Settings.setNewTargetCallback((target) => targetNew.push(target));
    Settings.setNewScriptCallback((scriptTop, entry) => scriptNew.push(entry));
    Settings.setNewVarCallback((id, value) => varNew.push({id, value}));

    GlobalContext.initialize(data, projectState);
    IOPass.run();
    TFAPass.run();
    CGPass.bindTypeContext(TFAPass.blockTypes, TFAPass.blockInjects);

    const code = CGPass.run();

    const inLL = "/input.ll";
    const outO = "/output.o";
    const outWasm = "/final_output.wasm";

    // llc.FS.writeFile(inLL, code);
    // llc.callMain(["-filetype=obj", "-mtriple=wasm32-unknown-unknown", inLL, "-o", outO]);
    // const objectFileBytes = llc.FS.readFile(outO);

    // lld.FS.writeFile(outO, objectFileBytes);
    // lld.callMain(["-flavor", "wasm", "--no-entry", "--export-all", outO, "-o", outWasm]);
    // const finalWasmBinary = lld.FS.readFile(outWasm);

    // console.log(finalWasmBinary.length);
}

module.exports = {
    setScriptDirty,
    initializeProjectState,
    transpile
};

