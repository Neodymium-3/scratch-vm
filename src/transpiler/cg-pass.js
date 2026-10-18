const log = require('../util/log');
const {executeOpcode, getScratchBlock, getBlockMutation, GlobalContext} = require("./shared.js");

module.exports = class CGPass {
    static types = {string: "ptr", num: "double", bool: "i1"};
    static typeGetter = {string: "@getString", num: "@getNum", bool: "@getBool"};

    static X_POSITION() {
        return (this.aliasTable[0] ??= {name: "X_POS", types: new Set(["num"])}).name;
    }
    static Y_POSITION() {
        return (this.aliasTable[1] ??= {name: "Y_POS", types: new Set(["num"])}).name;
    }

    static blockTypes;
    static blockInjects;
    static stackInjects;

    static scriptMode;
    static llvmBlockID;
    static llvmNameID;
    static currentBlock;

    static aliasTable;

    static LiteralType = class {
        constructor(regs={}, lines=[]) {
            this.regs = regs;
            this.lines = lines;
        }

        push(exprType, reg, lines) {
            this.regs[exprType] = reg;
            this.lines.push(...lines);
        }

        getInfo() {
            return [this.regs, this.lines];
        }
    }

    static bindTypeContext(tBlockTypes, tBlockInjects) {
        this.blockTypes = tBlockTypes;
        this.blockInjects = tBlockInjects;
    }

    static allocBlockName(n) {
        return Array.from({length: n}, () => `b${this.llvmBlockID++}`);
    }

    static allocName(n) {
        return Array.from({length: n}, () => `v${this.llvmNameID++}`);
    }

    static newBlock(blockName, description=null) {
        this.currentBlock = blockName;
        const descLine = description ? ` ; ${description}` : "";
        return `${blockName.slice(1)}:${descLine}`;
    }

    static assign(expr) {
        const [reg] = this.allocName(1);
        return [reg, `    ${reg} = ${expr}`];
    }

    static useLocal(varName, varType) {
        if(typeof varName === "function") return varName(varType);
        else return `${(this.aliasTable[GlobalContext.getVarIndex(varName)] ??= {name: this.allocName(1)[0], types: new Set(["string", "num", "bool"])}).name}_${varType}`;
    }

    static traverseStack(blockID) {
        if(blockID == null) return {};

        let lines = [];
        
        while(blockID != null) {
            lines.push(...this.traverseBlock(blockID));
            blockID = getScratchBlock(blockID).next;
        }

        return lines;
    }

    static traverseBlock(blockID) {
        const {opcode} = getScratchBlock(blockID);
        return executeOpcode(opcode, blockID) ?? [];
    }

    static run() {
        this.llvmBlockID = 0;
        this.llvmNameID = 0;

        let lines = [];

        for(const blockID of GlobalContext.scriptProcessed) {
            const scriptInfo = GlobalContext.state.scriptTable[blockID];
            GlobalContext.setTarget(scriptInfo.target);
            this.scriptMode = false;
            this.aliasTable = {};
            let scriptVisualName = "script";

            const {opcode, inputs} = getScratchBlock(blockID);
            if(opcode == "procedures_definition") {
                const {mutation} = inputs.custom_block.block;
                this.scriptMode = mutation.warp == "true";
                scriptVisualName = mutation.proccode;
            }

            const bodyLines = [];
            bodyLines.push(`define void @f${scriptInfo.id}(ptr %state, i32 %clone_id, i1 %warp)${"" ? this.scriptMode : " #0"} {`);
            bodyLines.push(`    ${this.newBlock(this.allocBlockName(1)[0])}`);
            
            for(const [varID, alias] of Object.entries(this.aliasTable)) {
                for(const varType of alias.types) {
                    bodyLines.push(`        ${this.useLocal(varID, varType)} = call ptr ${this.typeGetter[varType]}(ptr %state, i32 ${alias.name}, i32 %clone_id)`);
                }
            }
            bodyLines.push(...this.traverseStack(blockID).map((line) => `    ${line}`));

            const currentTarget = GlobalContext.currentTarget;
            if(currentTarget.runtime.debug) log.info(`LLVM IR: ${currentTarget.getName()}: compiled ${scriptVisualName}`, bodyLines.join("\n"));
            lines.push(...bodyLines);
            scriptInfo.dirty = false;
        }

        return lines.join("\n");
    }
}