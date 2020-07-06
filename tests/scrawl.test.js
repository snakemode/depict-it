const { ScrawlGame, StackItem } = require("../js/scrawl.js");
const { Identity, uuidv4 } = require("../js/p2p.js");

const p1 = new Identity("Player 1");
const p2 = new Identity("Player 2");
const p3 = new Identity("Player 3");

describe("Scrawl-clone", () => {

    let sut;
    beforeEach(() => {
        sut = new ScrawlGame();
    });

    it("constructs, current round set to 1", () => {
        expect(sut.currentRound).toBe(1);
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

    it("addToStack, adds an item to the stack, recorded against the player", async () => {
        sut.addPlayer(p1);
        sut.dealStacks();

        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));

        expect(sut.stacks[0].items[1].author).toBe(p1.clientId);
    });

    it("addToStack, ids added to item", async () => {
        sut.addPlayer(p1);
        sut.dealStacks();

        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));

        expect(sut.stacks[0].items[1].id).toBeDefined();
    });

    it("isRoundCompleted, returns false when players are still due to submit", async () => {
        sut.addPlayer(p1);
        sut.addPlayer(p2);
        sut.dealStacks();

        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));

        const result = sut.isRoundCompleted();

        expect(result).toBe(false);
    });

    it("isRoundCompleted, returns true when all players have submitted for the round", async () => {
        sut.addPlayer(p1);
        sut.addPlayer(p2);
        sut.dealStacks();

        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));
        sut.addToStack(p2.clientId, new StackItem("image", "http://tempuri.org/2.png"));

        const result = sut.isRoundCompleted();

        expect(result).toBe(true);
    });

    it("startNextRound, shuffles forwards who is holding the stacks", async () => {
        sut.addPlayer(p1);
        sut.addPlayer(p2);
        sut.addPlayer(p3);
        sut.dealStacks();

        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));
        sut.addToStack(p2.clientId, new StackItem("image", "http://tempuri.org/2.png"));
        sut.addToStack(p3.clientId, new StackItem("image", "http://tempuri.org/3.png"));
        sut.passStacksAround();

        expect(sut.stacks[0].heldBy).toBe(p3.clientId);
        expect(sut.stacks[1].heldBy).toBe(p1.clientId);
        expect(sut.stacks[2].heldBy).toBe(p2.clientId);
    });

    it("isComplete, when hand returns to originating player", async () => {
        sut.addPlayer(p1);
        sut.addPlayer(p2);
        sut.addPlayer(p3);

        sut.dealStacks();

        sut.passStacksAround();
        sut.passStacksAround();
        sut.passStacksAround();

        const completed = sut.isComplete();

        expect(completed).toBe(true);
    });

    it("awardScore, adds points to player that wrote card", async () => {
        sut.addPlayer(p1);
        sut.addPlayer(p2);
        sut.addPlayer(p3);

        sut.dealStacks();
        sut.addToStack(p1.clientId, new StackItem("image", "http://tempuri.org/1.png"));
        sut.addToStack(p2.clientId, new StackItem("image", "http://tempuri.org/2.png"));
        sut.addToStack(p3.clientId, new StackItem("image", "http://tempuri.org/3.png"));

        const stackItem = sut.stacks[0].items[1];
        sut.awardScore(stackItem.id);

        expect(sut.players[0].score).toBe(1);
    });
})