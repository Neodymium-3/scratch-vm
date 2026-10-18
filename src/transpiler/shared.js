let tops = new Set(["event_whenflagclicked", "procedures_definition"])

let stacks = new Set([
    "motion_setx",
    "data_setvariableto",
    "control_if_else",
    "procedures_call",
    "procedures_definition",
    "control_repeat",
    "event_whenflagclicked"
]);

let opcodes = null;

function registerOpcodes(...opc) {
    opcodes = Object.assign({}, ...opc);
    console.log(opcodes);
}

function executeOpcode(opcodeName, ...args) {
    if(opcodeName in opcodes) return opcodes[opcodeName](...args);
    else return null;
}

function getInitialProjectState() {
    return {
        targetID: 0,
        targetTable: {},
        targetFree: [],
        scriptID: 0,
        scriptTable: {},
        scriptFree: [],
        varID: 0,
        varTable: {},
        varFree: []
    };
}

function getScratchBlock(blockID) {
    return GlobalContext.currentTarget.blocks._blocks[blockID];
}

function getBlockMutation(blockID) {
    return getScratchBlock(blockID).mutation;
}

function isInstant() {
    // return scriptMode;
}

function isDirty(blockID) {
    return blockID in GlobalContext.state.scriptTable ? GlobalContext.state.scriptTable[blockID].dirty : true;
}

function isStack(opcode) {
    return stacks.has(opcode);
}

class Settings {
    static newTargetCallback;
    static newScriptCallback;
    static newVarCallback;

    static setNewTargetCallback(callback) {
        Settings.newTargetCallback = callback;
    }

    static setNewScriptCallback(callback) {
        Settings.newScriptCallback = callback;
    }

    static setNewVarCallback(callback) {
        Settings.newVarCallback = callback;
    }
}

class GlobalContext {
    static targets;
    static state;

    static scriptProcessed;
    static procedureTable;
    static varDefault;

    static setTarget(target) {
        this.currentTarget = target;
    }

    static withTargetsDo(callback) {
        for(const target of this.targets) {
            if(!target.isOriginal || target.isStage) continue;
            callback(target);
        }
    }

    static registerProcedure(scriptTop) {
        const {inputs, next} = getScratchBlock(scriptTop);
        const mutation = getBlockMutation(inputs.custom_block.block);

        let localTable = new Set();
        let funcCalls = new Set();
        
        let blockID = next;
        while(blockID != null) {
            const {opcode0, fields, mutation0, next0} = getScratchBlock(blockID);
            if(opcode0 == "data_setvariableto") localTable.add(fields.VARIABLE.id);
            if(opcode0 == "procedures_call") funcCalls.add(`${this.currentTarget.id}_${mutation0.proccode}`);
            blockID = next0;
        }

        this.procedureTable[`${this.currentTarget.id}_${mutation.proccode}`] = {
            id: scriptTop,
            out_sym: localTable,
            calls: funcCalls
        };
    }

    static registerScript(scriptTop) {
        const opcode = getScratchBlock(scriptTop).opcode;
        if(!isStack(opcode)) return;
        if(opcode == "procedures_definition") this.registerProcedure(scriptTop);
        if(!(scriptTop in this.state.scriptTable)) {
            this.state.scriptTable[scriptTop] = {
                target: this.currentTarget,
                id: this.state.scriptFree.length == 0 ? this.state.scriptID++ : this.state.scriptFree.pop(),
                dirty: true
            };
        }
        if(isDirty(scriptTop)) {
            this.scriptProcessed.push(scriptTop);
            Settings.newScriptCallback(scriptTop, {id: this.state.scriptTable[scriptTop].id, type: tops.has(opcode) ? opcode : "none"});
        }
    }

    // static ensureTargetExists() {
    //     if(!(this.currentTargetName in this.state.targetTable)) {
    //         let target = this.targets[this.currentTargetName];
    //         let targetObj = {
    //             name: this.currentTargetName,
    //             x: target.x,
    //             y: target.y,
    //             costume: target.currentCostume
    //         };
    //         Settings.newTargetCallback(targetObj);
    //     }
    // }

    static getVarIndex(varName, value=null) {
        if(!(varName in this.state.varTable)) {
            this.state.varTable[varName] = this.state.varFree.length == 0 ? this.state.varID++ : this.state.varFree.pop();
            Settings.newVarCallback(this.state.varTable[varName], value ?? this.varDefault[varName]);
        }
        return this.state.varTable[varName];
    }

    static initialize(data, state) {
        this.targets = data;
        this.state = state;
        this.scriptProcessed = [];
        this.procedureTable = {};
        this.varDefault = {};

        this.withTargetsDo((target) => {
            this.setTarget(target);
            for(const scriptTop of target.blocks._scripts) this.registerScript(scriptTop);
            for(const [varName, varObj] of Object.entries(target.variables)) this.varDefault[varName] = varObj.value;
        });
    }
}

module.exports = {
    registerOpcodes,
    executeOpcode,
    getInitialProjectState,
    getScratchBlock,
    getBlockMutation,
    isInstant,
    isDirty,
    isStack,
    Settings,
    GlobalContext
};