export class ScrawlGame {
    constructor() {
        this.players = [];
        this.stacks = [];
        this.currentRound = 1;
        this.currentTick = 1;
        this.state = { ticked: false, code: -1, reason: "Awaiting game start."};
        
        this.hints = scrawlHints.slice();
        shuffle(this.hints);
    }

    tryTick() {
        if (this.isRoundComplete()) {
            // Do scoring thing here
            console.log("Prompt users for scoring");
        }

        if (!this.isPassComplete()) {            
            return this.state = { ticked: false, reason: "Waiting for all players to complete stack.", code: 1 };
        }

        this.passStacksAround();

        this.currentTick++;
        return this.state = { ticked: true, reason: "", code: 0 };
    }

    // When starting player holds their cards again, our round is complete.
    isRoundComplete() { return this.currentTick > 1 && this.stacks[0].heldBy == this.players[0].clientId; }
    isPassComplete() { return this.stacks.filter(s => s.items.length <= this.currentTick).length == 0; }

    anyPlayerHasWonGame() {
        // Players win when they have 2 more points than the number of players.
    }

    addPlayer(identity) {
        this.players.push(identity);
    }

    dealStacks() {
        this.currentTick = 1;
        for (let player of this.players) {
            const hint = this.hints.pop();
            const stack = new Stack(player.clientId, hint);
            this.stacks.push(stack);
        }

        this.state = { ticked: false, reason: "Waiting for all players to complete stack.", code: 1 };
    }

    addToStack(submittersClientId, stackItem) {
        const stack = this.stacks.filter(s => s.heldBy == submittersClientId)[0];
        stack.add({ ...stackItem, author: submittersClientId, id: this.createId() });
    }

    passStacksAround() {
        let holders = this.stacks.map(s => s.heldBy);
        holders = [ holders.pop(), ...holders ];

        for (let stackIndex in this.stacks) {
            this.stacks[stackIndex].heldBy = holders[stackIndex];
        }
    }

    awardScore(stackItemId) {
        for (let stack of this.stacks) {
            for (let item of stack.items) {
                if (item.id == stackItemId) {
                    const author = this.players.filter(p => p.clientId == item.author)[0];
                    if(!author.score) {
                        author.score = 0;
                    }
                    author.score++;
                    return;
                }
            }
        }
    }

    createId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
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

const scrawlHints = [
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

function shuffle(collection) {
    for (let i = collection.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [collection[i], collection[j]] = [collection[j], collection[i]];
    }
}