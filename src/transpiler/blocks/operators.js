const { getScratchBlock } = require("../shared.js");
const TFAPass = require("../tfa-pass.js");
const CGPass = require("../cg-pass.js");

function type_binOp(operType, retType, arg1Name, arg2Name) {
    return (blockID, declSet) => {
        const {fields, inputs} = getScratchBlock(blockID);
        TFAPass.traverseBlock(inputs[arg1Name].block, declSet, new Set([operType]));
        TFAPass.traverseBlock(inputs[arg2Name].block, declSet, new Set([operType]));
        return new Set([retType]);
    };
}

function binOp(operType, retType, arg1Name, arg2Name, callback) {
    return (blockID) => {
        const {fields, inputs} = getScratchBlock(blockID);
        const arg1Info = CGPass.traverseBlock(inputs[arg1Name].block);
        const arg2Info = CGPass.traverseBlock(inputs[arg2Name].block);

        const [reg, line] = callback(arg1Info.regs[operType], arg2Info.regs[operType]);
        const literalType = new CGPass.LiteralType({[retType]: reg}, [...arg1Info.lines, ...arg2Info.lines, line]);

        return literalType;
    };
}

module.exports = {
    type_operator_add: type_binOp("num", "num", "NUM1", "NUM2"),
    type_operator_subtract: type_binOp("num", "num", "NUM1", "NUM2"),
    type_operator_multiply: type_binOp("num", "num", "NUM1", "NUM2"),
    type_operator_divide: type_binOp("num", "num", "NUM1", "NUM2"),
    type_operator_gt: type_binOp("num", "bool", "OPERAND1", "OPERAND2"),
    operator_add: binOp("num", "num", "NUM1", "NUM2", (a, b) => CGPass.assign(`fadd double ${a}, ${b}`)),
    operator_subtract: binOp("num", "num", "NUM1", "NUM2", (a, b) => CGPass.assign(`fsub double ${a}, ${b}`)),
    operator_multiply: binOp("num", "num", "NUM1", "NUM2", (a, b) => CGPass.assign(`fmul double ${a}, ${b}`)),
    operator_divide: binOp("num", "num", "NUM1", "NUM2", (a, b) => CGPass.assign(`fdiv double ${a}, ${b}`)),
    operator_gt: binOp("num", "bool", "OPERAND1", "OPERAND2", (a, b) => CGPass.assign(`fcmp oeq double ${a}, ${b}`))
};