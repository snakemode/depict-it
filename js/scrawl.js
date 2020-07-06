class ScrawlGame {
    constructor() {
        this.players = [];
        this.stacks = [];
        this.currentRound = 1;
        this.hints = scrawlHints.slice();
        shuffle(this.hints);
    }

    isComplete() {
        return this.currentRound > 0 && this.stacks[0].heldBy == this.players[0].clientId;
    }

    anyPlayerHasWon() {
        // Players win when they have 2 more points than the number of players.
    }

    addPlayer(identity) {
        this.players.push(identity);
    }

    dealStacks() {
        this.currentRound = 1;
        for (let player of this.players) {
            const hint = this.hints.pop();
            const stack = new Stack(player.clientId, hint);
            this.stacks.push(stack);
        }
    }

    isRoundCompleted() {
        const anyStacksNotSubmitted = this.stacks.filter(s => s.items.length <= this.currentRound);
        return anyStacksNotSubmitted.length == 0;
    }

    addToStack(submittersClientId, stackItem) {
        const stack = this.stacks.filter(s => s.heldBy == submittersClientId)[0];
        stack.items.push({ ...stackItem, author: submittersClientId, id: this.createId() });
    }

    passStacksAround() {
        if(!this.isRoundCompleted()) {
            console.log("Don't actually let this happen...");
        }

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

class Stack {
    constructor(ownerId, openingHint) {
        this.ownedBy = ownerId;
        this.heldBy = ownerId;
        this.items = [ new StackItem("string", openingHint) ];
        this.items[0].author = "SYSTEM";
    }
}

class StackItem {
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

try {
    module.exports = { ScrawlGame, StackItem };  
} catch { }