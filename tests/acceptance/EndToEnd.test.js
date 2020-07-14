import { chromium  } from "playwright";
import { ScrawlAppPageObject } from "./ScrawlAppPageObject";

jest.setTimeout(30_000);

describe("Something", () => {
    
    let browser, app, cleanup;
    beforeEach(async () => {
        browser = await chromium.launch({ headless: false });
        app = await ScrawlAppPageObject.create(browser);
        cleanup = [ browser, app ];
    });

    afterEach(async () => { cleanup.forEach(item => item.close()); });

    it("Can start a lobby for a game", async () => {
        const gameId = await app.hostASession();

        expect(gameId).not.toBeNull();
    });

    it("Players can join a game", async () => {
        const gameId = await app.hostASession();

        const player2 = await newPageObject();
        await player2.joinASession(gameId);

        const player3 = await newPageObject();
        await player3.joinASession(gameId);

        const player4 = await newPageObject();
        await player4.joinASession(gameId);

        await sleep(2000);

        const connectedPlayers = await app.connectedPlayers();

        expect(connectedPlayers).toContain(app.playerName);        
        expect(connectedPlayers).toContain(player2.playerName);        
        expect(connectedPlayers).toContain(player3.playerName);        
        expect(connectedPlayers).toContain(player4.playerName);        
    });

    it("Game is started - drawable canvas visible.", async () => {
        await app.hostASession();

        const player2 = await newPageObject();
        await player2.joinASession(app.gameId);
        
        await app.clickStartGame();
        await app.drawableCanvasIsVisible();     
    });

    async function newPageObject() {
        const instance = await ScrawlAppPageObject.create(browser);
        cleanup.push(instance);
        return instance;
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}