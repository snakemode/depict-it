const { ScrawlGame } = require("../js/scrawl.js");
const { Identity } = require("../js/p2p.js");

describe("Scrawl-clone", () => {

    let sut;
    beforeEach(() => {
        sut = new ScrawlGame();
    });

    it("constructs, current round set to 0", () => {
        expect(sut.currentRound).toBe(0);
    });

    it("addPlayer, adds a player", async () => {
        const somePlayer = new Identity("Cool player");

        sut.addPlayer(somePlayer)

        expect(sut.players.length).toBe(1);
    });
    
    it("startRound, assigns each player a stack", async () => {
        const player = new Identity("Cool player");
        sut.addPlayer(player);

        sut.startRound();

        expect(sut.stacks.length).toBe(1);
        expect(sut.stacks[0].ownedBy).toBe(player.clientId);
        expect(sut.stacks[0].heldBy).toBe(player.clientId);
    });
    
    it("startRound, starts each stack with a hint", async () => {
        sut.addPlayer(new Identity("Cool player"));

        sut.startRound();

        expect(sut.stacks[0].items[0].type).toBe("string");
        expect(sut.stacks[0].items[0].value).not.toBeNull();
    });
})