const { getScratchBlock } = require("../shared.js");
const TFAPass = require("../tfa-pass.js");
const CGPass = require("../cg-pass.js");

function type_control_if_else(blockID, declSet) {
    const {fields, inputs} = getScratchBlock(blockID);
    TFAPass.traverseBlock(inputs.CONDITION.block, declSet, new Set(["bool"]));
    TFAPass.declSetUnion(
        declSet,
        TFAPass.traverseStack(inputs?.SUBSTACK?.block, structuredClone(declSet)),
        TFAPass.traverseStack(inputs?.SUBSTACK2?.block, structuredClone(declSet))
    );
}

function control_if_else(blockID, declSet) {
    const {fields, inputs} = getScratchBlock(blockID);
    const [condRegs, condLines] = CGPass.traverseBlock(inputs?.CONDITION?.block).getInfo();

    const [thenBlock, elseBlock, exitBlock] = CGPass.allocBlockName(3);

    return [
        ...condLines,
        `    br i1 ${condRegs.bool}, label ${thenBlock}, label ${elseBlock}`,

        CGPass.newBlock(thenBlock, "Then block"),
        ...CGPass.traverseStack(inputs?.SUBSTACK?.block),
        `    br label ${exitBlock}`,

        CGPass.newBlock(elseBlock, "Else block"),
        ...CGPass.traverseStack(inputs?.SUBSTACK2?.block),
        `    br label ${exitBlock}`,

        CGPass.newBlock(exitBlock)
    ]
}

module.exports = {
    type_control_if_else,
    control_if_else
};