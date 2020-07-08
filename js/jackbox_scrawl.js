import { scrawlHints, shuffle, Stack, StackItem } from "../js/scrawl.js";
import { waitUntil } from "./jackbox.js";

export const start = {
    execute: async function (state) {
        state.currentTick = 1;
        state.hints = scrawlHints.slice();
        shuffle(state.hints);
        
        state.currentTick = 1;
        state.stacks = [];

        return { transitionTo: "deal" };
    }
}

export const deal = {
    execute: async function (state) {
        state.currentTick = 1;

        for (let player of state.players) {
            const hint = state.hints.pop();
            const stack = new Stack(player.clientId, hint);
            state.stacks.push(stack);
        }

        return { transitionTo: "getUserDrawing" };
    }
}

export const getUserDrawing = {
    execute: async function (state) {
        this.submitted = 0;

        for (let player of state.players) {   
            const stack = state.stacks.filter(s => s.heldBy == player.clientId)[0];
            const lastItem = stack.items[stack.items.length -1];
            state.channel.sendMessage({ kind: "instruction", type: "drawing-request", value: lastItem.value }, player.clientId);
        }

        try { 
            await waitUntil(() => this.submitted == state.players.length, 30_000);
            return { transitionTo: "passStacksAround" }; 
        }
        catch {   
            console.log("Someone didn't send a drawing in time!");         
            return { transitionTo: "passStacksAround" }; // Do something to compensate for lack of drawing?
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
    }
}

export const getUserCaption = {
    execute: async function (state) {
        this.submitted = 0;

        for (let player of state.players) {   
            const stack = state.stacks.filter(s => s.heldBy == player.clientId)[0];
            const lastItem = stack.items[stack.items.length -1];
            state.channel.sendMessage({ kind: "instruction", type: "caption-request", value: lastItem.value }, player.clientId);
        }

        try { 
            await waitUntil(() => this.submitted == state.players.length, 30_000);
            return { transitionTo: "passStacksAround" }; 
        }
        catch {   
            console.log("Someone didn't send a caption in time!");         
            return { transitionTo: "passStacksAround" };
        }         
    },

    handleInput: async function(state, message) {

        if (message.kind == "caption-response") {  
            console.log("got caption response");         
            const stackItem = new StackItem("image", message.imageUrl);
            const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];

            stack.add({ ...stackItem, author: message.metadata.clientId, id: createId() });
            state.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);

            this.submitted++;
        }
    }
}

export const passStacksAround = {
    execute: async function (state) {

        let holders = state.stacks.map(s => s.heldBy);
        const popped = holders.pop();
        holders = [ popped, ...holders ];

        for (let stackIndex in state.stacks) {
            state.stacks[stackIndex].heldBy = holders[stackIndex];
        }
        
        const stacksHeldByOriginalOwners = state.stacks[0].heldBy == state.players[0].clientId;
        
        if (stacksHeldByOriginalOwners) {
            return { transitionTo: "getUserScores" }; 
        }

        const nextStackRequirement = state.stacks[0].requires;
        const nextTransition = nextStackRequirement == "image" ? "getUserDrawing" : "getUserCaption";  

        return { transitionTo: nextTransition };
    }
}

export const getUserScores = {
    execute: async function (state) {        

        for (let stack of state.stacks) { 

            console.log("Getting score for stack", stack);

            this.submitted = 0;
            state.channel.sendMessage({ kind: "instruction", type: "pick-one", stack: stack });
            await waitUntil(() => this.submitted == state.players.length);
        }

        return { transitionTo: "end" };
    },
    
    handleInput: async function(state, message) {

        if (message.kind == "pick-one-response") { 
            
            for (let stack of state.stacks) {
                for (let item of stack.items) {
                    if (item.id == message.id) {
                        console.log("found voted item", item);
                        const author = state.players.filter(p => p.clientId == item.author)[0];
                        if(!author.score) {
                            author.score = 0;
                        }
                        author.score++;
                    }
                }
            }            

            this.submitted++;
        }
    }
}

export const end = {
    execute: async function (state) {
        state.channel.sendMessage({ kind: "instruction", type: "show-scores", playerScores: state.players });
        return { complete: true };
    }
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