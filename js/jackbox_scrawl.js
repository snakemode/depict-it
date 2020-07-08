import { JackboxStateMachine, waitUntil } from "./jackbox.js";

export class StartHandler {
    async execute(state) {
        state.stacks = [];
        state.hints = scrawlHints.slice();
        shuffle(state.hints);
        return { transitionTo: "DealHandler" };
    }
}

export class DealHandler {
    async execute(state) {
        for (let player of state.players) {
            const hint = state.hints.pop();
            const stack = new Stack(player.clientId, hint);
            state.stacks.push(stack);
        }
        return { transitionTo: "GetUserDrawingHandler" };
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
            return { transitionTo: "PassStacksAroundHandler" }; 
        }
        catch (exception) {        
            console.log("Someone didn't send a drawing in time!");         
            return { transitionTo: "PassStacksAroundHandler", error: true }; // Do something to compensate for lack of drawing?
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
            return { transitionTo: "PassStacksAroundHandler" }; 
        }
        catch {   
            console.log("Someone didn't send a caption in time!");         
            return { transitionTo: "PassStacksAroundHandler", error: true };
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
            return { transitionTo: "GetUserScoresHandler" }; 
        }

        const nextStackRequirement = state.stacks[0].requires;
        const nextTransition = nextStackRequirement == "image" ? "GetUserDrawingHandler" : "GetUserCaptionHandler";
        return { transitionTo: nextTransition };
    }
}

export class GetUserScoresHandler {
    constructor(waitForUsersFor) {
        this.waitForUsersFor = waitForUsersFor;
    }

    async execute(state) {     

        for (let stack of state.stacks) { 
            this.submitted = 0;

            state.channel.sendMessage({ kind: "instruction", type: "pick-one", stack: stack });
            
            try { 
                await waitUntil(() => { return this.submitted == state.players.length }, this.waitForUsersFor);
            } catch {
                console.log("Not all votes cast, shrug")
            }
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


export class Stack {
    constructor(ownerId, openingHint) {
        this.ownedBy = ownerId;
        this.heldBy = ownerId;
        this.items = [ new StackItem("string", openingHint) ];
        this.items[0].author = "SYSTEM";
        this.requires = "image";
    }

    add(item) {
        this.items.push(item);
        this.requires = item.type == "image" ? "string" : "image";
    }
}

export class StackItem {
    constructor(type, value) { // "string" | "image" && full text | url
        this.type = type;
        this.value = value;
    }
}

export const scrawlHints = [
    "Freezing your own head",
    "Making friends with your tapeworm",
    "A man who has lost his muffins",
    "Lost in IKEA",
    "Throwing the baby out with the bathwater",
    "Going out in a blaze of glory",
    "Burger nips",
    "Trust excercises",
    "DIY lobotomy",
    "Sexting",
    "Shaving the llama",
    "Sculpting the cactus",
    "Freestyle kazoo solo",
    "Awkward hug",
    "Butt chin",
    "Spontanious human combustion",
    "Bad babysitter",
    "Sharknado",
    "Fighting fire with fire",
    "Tasering a sloth",
    "Holiday in hell",
    "Haunted oven",
    "Dancing on someone's grave",
    "The world's biggest sneeze",
    "Putting make-up on an owl",
    "Sore loser",
    "Bronies",
    "Cereal killer",
    "Cleaning out your pipes",
    "Moobs"
];

export function shuffle(collection) {
    for (let i = collection.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [collection[i], collection[j]] = [collection[j], collection[i]];
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

export const ScrawlGame = new JackboxStateMachine({
    steps: {
        "StartHandler": new StartHandler(), 
        "DealHandler": new DealHandler(), 
        "GetUserDrawingHandler": new GetUserDrawingHandler(30_000), 
        "GetUserCaptionHandler": new GetUserCaptionHandler(30_000), 
        "PassStacksAroundHandler": new PassStacksAroundHandler(), 
        "GetUserScoresHandler": new GetUserScoresHandler(30_000),
        "EndHandler": new EndHandler()
    }
});