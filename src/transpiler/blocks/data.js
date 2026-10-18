const { getScratchBlock } = require("../shared.js");
const TFAPass = require("../tfa-pass.js");
const CGPass = require("../cg-pass.js");

function type_data_variable(blockID, declSet, inputType) {
    const {fields} = getScratchBlock(blockID);
    const varName = fields.VARIABLE.id;

    for(const decl of declSet[varName]) {
        TFAPass.injectVarTypeSet(decl, inputType);
    }
    return new Set();
}

function type_data_setvariableto(blockID, declSet) {
    const {fields, inputs} = getScratchBlock(blockID);
    const varName = fields.VARIABLE.id;
    const injectSet = TFAPass.blockInjects[blockID] ?? new Set();

    const typeSet = TFAPass.traverseBlock(inputs.VALUE.block, declSet, injectSet);
    declSet[varName] = new Set([blockID]);
    TFAPass.injectVarTypeSet(blockID, typeSet);
}

function data_variable(blockID) {
    return new CGPass.LiteralType({string: "%rstring", num: "%rnum", bool: "%rbool"}, []);
}

function data_setvariableto(blockID) {
    const {fields, inputs} = getScratchBlock(blockID);
    const varName = fields.VARIABLE.id;
    const injectSet = CGPass.blockInjects[blockID] ?? new Set();

    const valueInfo = CGPass.traverseBlock(inputs.VALUE.block);

    const lines = [...valueInfo.lines];
    for(const varType of injectSet) {
        const test = CGPass.useLocal(varName, varType);
        lines.push(`    store ${CGPass.types[varType]} ${valueInfo.regs[varType]}, ptr ${test}`);
    }
    return lines;
}

module.exports = {
    type_data_variable,
    type_data_setvariableto,
    data_variable,
    data_setvariableto
};