const {GlobalContext} = require("./shared.js");

module.exports = class IOPass {
    static inputTable;
    static globalCache;

    static resolveSymbols(key, visited) {
        let procedure = GlobalContext.procedureTable[key];

        if(key in this.globalCache) return [this.globalCache[key], false];
        if(key in visited) return [procedure.out_sym, true];

        visited.add(key);
        let cycleAny = false;

        for(procCall of procedure.calls) {
            const [localTable, cycle] = this.resolveSymbols(procCall, visited);
            for(const varName of localTable) procedure.out_sym.add(varName);
            cycleAny ||= cycle;
        }

        visited.delete(key);
        if(!cycleAny) this.globalCache[key] = procedure.out_sym;

        return [procedure.out_sym, cycleAny];
    }

    static collectStackInputs(blockID) {
        while(blockID != null) {
            this.collectBlockInputs(blockID);
            blockID = getScratchBlock(blockID).next;
        }
    }

    static collectBlockInputs(blockID) {
        const block = getScratchBlock(blockID);
        for(const [inputName, inputSlot] of Object.entries(block.inputs ?? {})) {
            const literal = inputSlot.block;
            const {opcode, fields} = getScratchBlock(literal);
            if(isStack(opcode)) {
                this.collectStackInputs(inputBlock.block);
            } else {
                if(opcode == "data_variable") {
                    const varName = fields.VARIABLE.id;
                    inputTable.add(varName);
                } else this.collectBlockInputs(literal);
            }
        }
    }

    static run() {
        this.globalCache = {};
        for(const [key, procedure] of Object.entries(GlobalContext.procedureTable)) {
            this.inputTable = new Set();
            this.resolveSymbols(key, new Set());
            this.collectStackInputs(procedure.id, new Set());
            procedure.in_sym = this.inputTable;
        }
    }
}