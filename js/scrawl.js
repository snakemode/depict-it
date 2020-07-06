class ScrawlGame {
    constructor() {
        this.players = [];
        this.stacks = [];
        this.currentRound = 0;
        this.hints = scrawlHints.slice();
        shuffle(this.hints);
    }

    addPlayer(identity) {
        this.players.push(identity);
    }

    startRound() {
        for (let player of this.players) {
            const hint = this.hints.pop();
            const stack = new Stack(player.clientId, hint);
            this.stacks.push(stack);
        }
    }
}

class Stack {
    constructor(ownerId, openingHint) {
        this.ownedBy = ownerId;
        this.heldBy = ownerId;

        this.items = [
            new StackItem("string", openingHint)
        ];
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
    module.exports = { ScrawlGame };  
} catch { }