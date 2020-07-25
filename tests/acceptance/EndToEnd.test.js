import { chromium  } from "playwright";
import { ScrawlAppPageObject } from "./ScrawlAppPageObject";

jest.setTimeout(30_000);
const chromeOptions = { headless: false };

describe("Behaviour of the app as a game host", () => {
    
    let browser, app, cleanup;
    beforeEach(async () => {
        browser = await chromium.launch(chromeOptions);
        app = await ScrawlAppPageObject.create(browser);
        cleanup = [ browser, app ];
    });

    afterEach(async () => { cleanup.forEach(item => item.close()); });

    it("Can start a lobby for a game", async () => {
        const joinUrl = await app.hostASession();

        expect(joinUrl).not.toBeNull();
    });

    async function newPageObject() {
        const instance = await ScrawlAppPageObject.create(browser);
        cleanup.push(instance);
        return instance;
    }
});

describe("Behaviour of the app as a game client", () => {
    
    let browser, app, cleanup, joinUrl;
    beforeEach(async () => {
        browser = await chromium.launch(chromeOptions);
        app = await ScrawlAppPageObject.create(browser);
        joinUrl = await app.hostASession();
        cleanup = [ browser, app ];
    });

    afterEach(async () => { cleanup.forEach(item => item.close()); });

    it("Players can join a game", async () => {
        const player2 = await newPageObject();
        await player2.joinASession(joinUrl);

        const player3 = await newPageObject();
        await player3.joinASession(joinUrl);

        const player4 = await newPageObject();
        await player4.joinASession(joinUrl);

        await sleep(2000);

        const connectedPlayers = await app.connectedPlayers();

        expect(connectedPlayers).toContain(app.playerName);        
        expect(connectedPlayers).toContain(player2.playerName);
        expect(connectedPlayers).toContain(player3.playerName);        
        expect(connectedPlayers).toContain(player4.playerName);        
    });

    it("Players follow a join link, there is no host button available to them.", async () => {
        const player2 = await newPageObject();
        await player2.followJoinLink(joinUrl);

        const pageBodyAsSeenByPlayerTwo = await player2.pageBody();
        expect(pageBodyAsSeenByPlayerTwo).not.toContain("Create Game");
    });

    it("Players follow a join link, they are told they are waiting on the host.", async () => {
        const player2 = await newPageObject();
        await player2.joinASession(joinUrl);

        const waitMessage = await player2.youAreWaitingMessage();

        expect(waitMessage).toContain("Waiting for ");
        expect(waitMessage).toContain(" to start the game.");
    });

    it("Game is started - drawable canvas visible.", async () => {
        const player2 = await newPageObject();
        await player2.joinASession(joinUrl);
        
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