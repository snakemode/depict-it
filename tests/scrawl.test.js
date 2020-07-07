const { ScrawlGame, Stack, StackItem } = require("../js/scrawl.js");
const { Identity } = require("../js/p2p.js");

const p1 = new Identity("Player 1");
const p2 = new Identity("Player 2");
const p3 = new Identity("Player 3");

describe("ScrawlGame", () => {

    let sut;
    beforeEach(() => {
        sut = new ScrawlGame();
    });

    it("constructs, current round and current tick set to 1", () => {
        expect(sut.currentRound).toBe(1);
        expect(sut.currentTick).toBe(1);
    });

    it("addPlayer, adds a player", async () => {
        const somePlayer = new Identity("Cool player");

        sut.addPlayer(somePlayer)

        expect(sut.players.length).toBe(1);
    });
    
    it("dealStacks, assigns each player a stack", async () => {
        const player = new Identity("Cool player");
        sut.addPlayer(player);

        sut.dealStacks();

        expect(sut.stacks.length).toBe(1);
        expect(sut.stacks[0].ownedBy).toBe(player.clientId);
        expect(sut.stacks[0].heldBy).toBe(player.clientId);
    });
    
    it("dealStacks, starts each stack with a hint", async () => {
        sut.addPlayer(new Identity("Cool player"));

        sut.dealStacks();

        expect(sut.stacks[0].items[0].type).toBe("string");
        expect(sut.stacks[0].items[0].value).not.toBeNull();
    });

    it("dealStacks, sets up game state", async () => {
        sut.addPlayer(new Identity("Cool player"));

        sut.dealStacks();

        expect(sut.state.reason).toBe("Waiting for all players to complete stack.");
    });

    it("addToStack, adds an item to the stack, recorded against the player", async () => {
        gameWithOnePlayer(sut);

        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));

        expect(sut.stacks[0].items[1].author).toBe(p1.clientId);
    });

    it("addToStack, ids added to item", async () => {
        gameWithOnePlayer(sut);

        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));

        expect(sut.stacks[0].items[1].id).toBeDefined();
    });

    it("isPassComplete, returns false when players are still due to submit", async () => {
        gameWithTwoPlayers(sut);

        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));

        const result = sut.isPassComplete();

        expect(result).toBe(false);
    });

    it("isPassComplete, returns true when all players have submitted for the round", async () => {
        gameInTickableStateWithTwoPlayers(sut);

        const result = sut.isPassComplete();

        expect(result).toBe(true);
    });

    it("startNextRound, shuffles forwards who is holding the stacks", async () => {
        gameInTickableStateWithThreePlayers(sut);

        sut.passStacksAround();

        expect(sut.stacks[0].heldBy).toBe(p3.clientId);
        expect(sut.stacks[1].heldBy).toBe(p1.clientId);
        expect(sut.stacks[2].heldBy).toBe(p2.clientId);
    });

    it("isComplete, when hand returns to originating player", async () => {
        gameWithTwoPlayers(sut);
        
        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));
        sut.addToStack(p2.clientId, new StackItem("image", "http://tempuri.org/2.png"));
        sut.tryTick();
            
        sut.addToStack(p1.clientId, new StackItem("string", "A funny description"));
        sut.addToStack(p2.clientId, new StackItem("string", "A funnier description"));
        sut.tryTick();

        const completed = sut.isRoundComplete();

        expect(completed).toBe(true);
    });

    it("awardScore, adds points to player that wrote card", async () => {
        gameInTickableStateWithTwoPlayers(sut);

        const stackItem = sut.stacks[0].items[1];
        sut.awardScore(stackItem.id);

        expect(sut.players[0].score).toBe(1);
    });

    it("tryTick, increments current tick", () => {
        gameInTickableStateWithTwoPlayers(sut);

        const result = sut.tryTick();

        expect(sut.currentTick).toBe(2);
    });

    it("tryTick, returns false if someone has yet to submit their hand", () => {
        gameWithTwoPlayers(sut);
        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));

        const result = sut.tryTick();

        expect(result.ticked).toBe(false);
        expect(result.reason).toBe("Waiting for all players to complete stack.");
    });

    it("tryTick, returns true if everyone has completed their hand for the round", () => {
        gameInTickableStateWithTwoPlayers(sut);

        const result = sut.tryTick();

        expect(result.ticked).toBe(true);
        expect(result.reason).toBe("");
    });

    it("tryTick, passes card stacks to the next player", () => {
        gameInTickableStateWithTwoPlayers(sut);

        const result = sut.tryTick();

        expect(sut.stacks[0].heldBy).toBe(p2.clientId);
        expect(sut.stacks[1].heldBy).toBe(p1.clientId);
    });
})

describe("Stack", () => {
    let sut;
    beforeEach(() => {
        sut = new Stack("owner-id", "Some hint");
    });

    it("Can be constrcuted", () => {
        expect(sut).not.toBeNull();
    });

    it("requires, returns type of card it next requires when created", () => {
        expect(sut.requires).toBe("image");
    });

    it("requires, returns type of card it next requires when image provided", () => {
        sut.add({author: "1234", id: "blah", ...new StackItem("image", "http://url.org") })

        expect(sut.requires).toBe("string");
    });

    it("requires, returns type of card it next requires when string provided", () => {
        sut.add({author: "1234", id: "blah", ...new StackItem("string", "I am very funny") })

        expect(sut.requires).toBe("image");
    });
});

function gameWithOnePlayer(sut) {
    sut.addPlayer(p1);
    sut.dealStacks();   
}

function gameWithTwoPlayers(sut) {
    sut.addPlayer(p1);
    sut.addPlayer(p2);   
    sut.dealStacks();
}

function gameInTickableStateWithTwoPlayers(sut) {
    gameWithTwoPlayers(sut);

    sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));
    sut.addToStack(p2.clientId, new StackItem("image", "http://tempuri.org/2.png"));
}

function gameInTickableStateWithThreePlayers(sut) {
    sut.addPlayer(p1);
    sut.addPlayer(p2);
    sut.addPlayer(p3);

    sut.dealStacks();

    sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));
    sut.addToStack(p2.clientId, new StackItem("image", "http://tempuri.org/2.png"));
    sut.addToStack(p3.clientId, new StackItem("image", "http://tempuri.org/3.png"));
}