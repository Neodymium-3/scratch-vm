const { getScratchBlock } = require("../shared.js");
const TFAPass = require("../tfa-pass.js");
const CGPass = require("../cg-pass.js");

function type_numberInput() {
    return () => new Set(["num"]);
}

function numberInput() {
    return (blockID) => {
        const {fields} = getScratchBlock(blockID);
        const value = Number(fields.NUM.value);
        return new CGPass.LiteralType({num: Number.isInteger(value) ? value.toFixed(1) : value.toString(10)}, []);
    };
}

function type_text(blockID, declSet, inputType) {
    return new Set(inputType);
}

function text(blockID) {
    const {fields} = getScratchBlock(blockID);
    const text = fields.TEXT.value;
    const context = CGPass.blockTypes[blockID];
    
    let regs = new CGPass.LiteralType();

    for(const textType of context) {
        if(textType == "string") {
            const [stringName, reg] = CGPass.allocName(2);
            regs.push("string", reg, [
                `    ${stringName} = call ptr @malloc(i64 ${text.length + 1})`,
                `    store [${text.length + 1} x i8] c "${text}\\00", ptr ${stringName}`,
                `    ${reg} = call ptr @stringIntern(ptr ${stringName})`
            ]);
        } else if(textType == "num") regs.push("num", text, []);
        else if(textType == "bool") regs.push("bool", text, []);
    }

    return regs;
}

module.exports = {
    type_math_number: type_numberInput(),
    type_math_positive_number: type_numberInput(),
    type_math_whole_number: type_numberInput(),
    type_math_integer: type_numberInput(),
    type_text,
    math_number: numberInput(),
    math_positive_number: numberInput(),
    math_whole_number: numberInput(),
    math_integer: numberInput(),
    text
};