import { scrawlHints, shuffle, Stack } from "../js/scrawl.js";


export const start = {
    execute: async function (state) {
        state.currentTick = 1;
        state.hints = scrawlHints.slice();
        shuffle(state.hints);
        
        state.currentTick = 1;
        state.stacks = [];

        for (let player of state.players) {
            const hint = state.hints.pop();
            const stack = new Stack(player.clientId, hint);
            state.stacks.push(stack);
        }
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
    }
}

export const getUserDrawing = {
    execute: async function (state) {
        this.submittedDrawings = [];
        // Send outbound message to trigger UI into "get drawing" mode
        // Include stacks in message.
    },

    handleInput: async function(state, message) {

        if (message.kind == "client-drawing") {
            const stackItem = new StackItem("image", message.imageUrl);
            const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];
            stack.add({ ...stackItem, author: message.metadata.clientId, id: this.createId() });
        }
    },

    getStatus: async function(state) {
        if (this.submittedDrawings.length < state.players.length) {
            // Still players yet to submit.
            return { complete: false }; 
        }

        return { complete: true, transitionTo: "end" }; 
    },
}

export const game = {
    steps: {
        "start": start,
        "deal": deal,
        "getUserDrawing": getUserDrawing,
        "getUserCaption": {},
        "getUserScores": {},
        "end": {}
    }
}