import { scrawlHints, shuffle, Stack, StackItem } from "../js/scrawl.js";

export const start = {
    execute: async function (state) {
        state.currentTick = 1;
        state.hints = scrawlHints.slice();
        shuffle(state.hints);
        
        state.currentTick = 1;
        state.stacks = [];
    },
    
    getStatus: async function(state) { return { complete: true, transitionTo: "deal" }; }
}

export const deal = {
    execute: async function (state) {
        state.currentTick = 1;

        for (let player of state.players) {
            const hint = state.hints.pop();
            const stack = new Stack(player.clientId, hint);
            state.stacks.push(stack);
        }
    },
    
    getStatus: async function(state) { return { complete: true, transitionTo: "getUserDrawing" }; }
}

export const getUserDrawing = {
    execute: async function (state) {
        this.submitted = 0;

        for (let player of state.players) {   
            const stack = state.stacks.filter(s => s.heldBy == player.clientId)[0];
            const lastItem = stack.items[stack.items.length -1];
            state.channel.sendMessage({ kind: "instruction", type: "drawing-request", value: lastItem.value }, player.clientId);
        }
    },

    handleInput: async function(state, message) {

        if (message.kind == "drawing-response") {        
            const stackItem = new StackItem("image", message.imageUrl);
            const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];
            
            stack.add({ ...stackItem, author: message.metadata.clientId, id: createId() });
            state.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);

            this.submitted++;
        }
    },

    getStatus: async function(state) {
        if (this.submitted < state.players.length) {            
            return { complete: false };
        }

        console.log("moving on from getUserDrawing");
        return { complete: true, transitionTo: "passStacksAround" }; 
    },
}

export const getUserCaption = {
    execute: async function (state) {
        this.submitted = 0;

        for (let player of state.players) {   
            const stack = state.stacks.filter(s => s.heldBy == player.clientId)[0];
            const lastItem = stack.items[stack.items.length -1];
            state.channel.sendMessage({ kind: "instruction", type: "caption-request", value: lastItem.value }, player.clientId);
        }
    },

    handleInput: async function(state, message) {

        if (message.kind == "caption-response") {           
            const stackItem = new StackItem("image", message.imageUrl);
            const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];

            stack.add({ ...stackItem, author: message.metadata.clientId, id: createId() });
            state.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);

            this.submitted++;
        }
    },

    getStatus: async function(state) {
        if (this.submitted < state.players.length) {            
            return { complete: false };
        }

        return { complete: true, transitionTo: "passStacksAround" }; 
    },
}

export const passStacksAround = {
    execute: async function (state) {

        let holders = state.stacks.map(s => s.heldBy);
        const popped = holders.pop();
        holders = [ popped, ...holders ];

        for (let stackIndex in state.stacks) {
            state.stacks[stackIndex].heldBy = holders[stackIndex];
        }
    },

    getStatus: async function(state) {
        
        const stacksHeldByOriginalOwners = state.stacks[0].heldBy == state.players[0].clientId;
        if (stacksHeldByOriginalOwners) {            
            return { complete: true, transitionTo: "getUserScores" }; 
        }

        const nextStackRequirement = state.stacks[0].requires;
        const nextTransition = nextStackRequirement == "image" ? "getUserDrawing" : "getUserCaption";                  
        return { complete: true, transitionTo: nextTransition };
    },
}

export const getUserScores = {
    execute: async function (state) {
        state.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);
    },

    getStatus: async function(state) {

    },
}

export const end = {
    execute: async function (state) {

    },

    getStatus: async function(state) {

    },
}

function createId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}

export const game = {
    steps: {
        start, 
        deal, 
        getUserDrawing, 
        getUserCaption, 
        passStacksAround, 
        getUserScores,
        end
    }
};