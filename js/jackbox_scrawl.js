import { scrawlHints, shuffle, Stack, StackItem } from "../js/scrawl.js";
import { JackboxStateMachine, waitUntil } from "./jackbox.js";

export class StartHandler {
    async execute(state) {
        state.stacks = [];
        state.hints = scrawlHints.slice();
        shuffle(state.hints);
        return { transitionTo: "deal" };
    }
}

export class DealHandler {
    async execute(state) {
        for (let player of state.players) {
            const hint = state.hints.pop();
            const stack = new Stack(player.clientId, hint);
            state.stacks.push(stack);
        }
        return { transitionTo: "getUserDrawing" };
    }   
}

export class GetUserDrawingHandler {
    constructor(waitForUsersFor) {
        this.waitForUsersFor = waitForUsersFor;
    }

    async execute(state) {
        this.submitted = 0;

        for (let player of state.players) {   
            const stack = state.stacks.filter(s => s.heldBy == player.clientId)[0];
            const lastItem = stack.items[stack.items.length -1];

            state.channel.sendMessage({ kind: "instruction", type: "drawing-request", value: lastItem.value }, player.clientId);
        }

        try { 
            await waitUntil(() => this.submitted == state.players.length, this.waitForUsersFor);
            return { transitionTo: "passStacksAround" }; 
        }
        catch (exception) {        
            console.log("Someone didn't send a drawing in time!");         
            return { transitionTo: "passStacksAround", error: true }; // Do something to compensate for lack of drawing?
        }
    }

    async handleInput(state, message) {

        if (message.kind == "drawing-response") {        
            const stackItem = new StackItem("image", message.imageUrl);
            const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];
            
            stack.add({ ...stackItem, author: message.metadata.clientId, id: createId() });
            state.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);

            this.submitted++;
        }
    }
}

export class GetUserCaptionHandler {    
    constructor(waitForUsersFor) {
        this.waitForUsersFor = waitForUsersFor;
    }

    async execute(state) {
        this.submitted = 0;

        for (let player of state.players) {   
            const stack = state.stacks.filter(s => s.heldBy == player.clientId)[0];
            const lastItem = stack.items[stack.items.length -1];
            state.channel.sendMessage({ kind: "instruction", type: "caption-request", value: lastItem.value }, player.clientId);
        }

        try { 
            await waitUntil(() => this.submitted == state.players.length, this.waitForUsersFor);
            return { transitionTo: "passStacksAround" }; 
        }
        catch {   
            console.log("Someone didn't send a caption in time!");         
            return { transitionTo: "passStacksAround", error: true };
        }         
    }

    async handleInput(state, message) {
        if (message.kind == "caption-response") {       
            const stackItem = new StackItem("string", message.caption);
            const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];

            stack.add({ ...stackItem, author: message.metadata.clientId, id: createId() });
            state.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);

            this.submitted++;
        }
    }
}

export class PassStacksAroundHandler {
    async execute(state) {
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

export class GetUserScoresHandler {
    async execute(state) {     

        for (let stack of state.stacks) { 
            this.submitted = 0;

            state.channel.sendMessage({ kind: "instruction", type: "pick-one", stack: stack });            
            await waitUntil(() => { return this.submitted == state.players.length });
        }

        return { transitionTo: "end" };
    }
    
    async handleInput(state, message) {
        if (message.kind != "pick-one-response") {
            return;
        }
            
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

export class EndHandler {
    async execute(state) {
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

export const game = new JackboxStateMachine({
    steps: {
        "start": new StartHandler(), 
        "deal": new DealHandler(), 
        "getUserDrawing": new GetUserDrawingHandler(30_000), 
        "getUserCaption": new GetUserCaptionHandler(30_000), 
        "passStacksAround": new PassStacksAroundHandler(), 
        "getUserScores": new GetUserScoresHandler(),
        "end": new EndHandler()
    }
});