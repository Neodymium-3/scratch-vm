const {executeOpcode, getScratchBlock, GlobalContext} = require("./shared.js");

module.exports = class TFAPass {
    static scriptMode;
    static typesChanged;

    static blockTypes;
    static blockInjects;
    static blockInjectsNext;
    static blockInjectsStack;
    static blockInjectsStackNext;

    static typeSetDeclUnion(typeSet, typeSet0) {
        let hasChanged = false;
        for(const [varType, declList] of Object.entries(typeSet0)) {
            if(!(varType in typeSet)) typeSet[varType] = new Set();
            for(const decl of declList) {
                hasChanged ||= !typeSet[varType].has(decl);
                typeSet[varType].add(decl);
            }
        }
    }

    static injectSetUnionChange(typeSet, typeSet0) {
        for(const varType of typeSet0) {
            this.typesChanged ||= !typeSet.has(varType);
            typeSet.add(varType);
        }
    }

    static injectVarTypeSet(blockID, injectSet) {
        if(!(blockID in this.blockInjectsNext)) this.blockInjectsNext[blockID] = new Set();
        this.injectSetUnionChange(this.blockInjectsNext[blockID], injectSet);
    }

    static syncAllVars(declSet) {
        for(const [varName, declList] of Object.entries(declSet)) {
            for(const decl of declList) {
                this.injectVarTypeSet(decl, new Set(["string", "num", "bool"]));
            }
        }
    }

    static declSetUnion(finalSet, ...declSets) {
        for(const declSet of declSets) {
            for(const [varName, declList] of Object.entries(declSet)) {
                if(!(varName in finalSet)) finalSet[varName] = new Set();
                for(const decl of declList) finalSet[varName].add(decl);
            }
        }
    }

    // static injectTypeSetStack(blockID, injectSet) {
    //     if(!(blockID in this.blockInjectsStackNext)) this.blockInjectsStackNext[blockID] = new Set();
    //     this.typeSetUnion(this.blockInjectsStackNext[blockID], injectSet);
    // }

    static initPass() {
        this.blockInjects = structuredClone(this.blockInjectsNext);
        this.blockInjectsStack = structuredClone(this.blockInjectsStackNext);
        this.blockTypes = {};
    }

    static traverseStack(blockID, typeSet) {
        if(blockID == null) return {};
        Object.assign(typeSet, (this.blockInjectsStack[blockID] ?? {}));
        
        while(blockID != null) {
            this.traverseBlock(blockID, typeSet);
            blockID = getScratchBlock(blockID).next;
        }

        return typeSet;
    }

    static traverseBlock(blockID, typeSet, inputType=null) {
        const {opcode} = getScratchBlock(blockID);
        return this.blockTypes[blockID] = executeOpcode(`type_${opcode}`, blockID, typeSet, inputType);
    }

    static run() {
        let aliasTable = null;

        for(const blockID of GlobalContext.scriptProcessed) {
            const scriptInfo = GlobalContext.state.scriptTable[blockID];
            GlobalContext.setTarget(scriptInfo.target);
            this.scriptMode = false;
            let scriptID = scriptInfo.id;
            aliasTable = {};

            const {opcode, inputs} = getScratchBlock(blockID);
            if(opcode == "procedures_definition") {
                const {mutation} = inputs.custom_block.block;
                this.scriptMode = mutation.warp == "true";
            }

            this.blockInjectsNext = {};
            this.blockInjectsStackNext = {};
            this.typesChanged = true;
            let i = 0;
            this.initPass();
            this.syncAllVars(this.traverseStack(blockID, {}));
            
            while(this.typesChanged) {
                this.typesChanged = false;
                this.initPass();
                this.syncAllVars(this.traverseStack(blockID, {}));
            }
        }
    }
}