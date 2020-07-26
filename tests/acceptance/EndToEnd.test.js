import { chromium  } from "playwright";
import { ScrawlAppPageObject } from "./ScrawlAppPageObject";

jest.setTimeout(30_000);
const chromeOptions = { headless: false };

describe("Behaviour of the app as a game host", () => {
    
    let browser, host, cleanup;
    beforeEach(async () => {
        browser = await chromium.launch(chromeOptions);
        host = await ScrawlAppPageObject.create(browser);
        cleanup = [ browser, host ];
    });

    afterEach(async () => { cleanup.forEach(item => item.close()); });

    it("Can start a lobby for a game", async () => {
        const joinUrl = await host.hostASession();

        expect(joinUrl).not.toBeNull();
    });

    async function newPageObject() {
        const instance = await ScrawlAppPageObject.create(browser);
        cleanup.push(instance);
        return instance;
    }
});

describe("Behaviour of the app as a game client", () => {
    
    let browser, host, cleanup, joinUrl;
    beforeEach(async () => {
        browser = await chromium.launch(chromeOptions);
        host = await ScrawlAppPageObject.create(browser);
        joinUrl = await host.hostASession();
        cleanup = [ browser, host ];
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

        const connectedPlayers = await host.connectedPlayers();

        expect(connectedPlayers).toContain(host.playerName);        
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
        
        await host.clickStartGame();
        await host.drawableCanvasIsVisible();     
    });

    it("Player can draw on a canvas, and will be prompted to wait for other players", async () => {
        const player2 = await newPageObject();
        await player2.joinASession(joinUrl);
        
        await host.clickStartGame();
        await host.drawableCanvasIsVisible();       
        
        await player2.drawOnCanvas();
        await sleep(2000);

        const pageBodyAsSeenByPlayerTwo = await player2.pageBody();
        expect(pageBodyAsSeenByPlayerTwo).toContain("Wait for other players to finish.")
    });

    it("Players can play multiple rounds of a game on the same gameId", async () => {
        const player2 = await newPageObject();
        await player2.joinASession(joinUrl);
        await sleep(2000);

        await host.clickStartGame();

        // Drawing
        await host.drawOnCanvas();
        await player2.drawOnCanvas();
        
        // Caption
        await host.captionImageReceivedFromServer("Some caption!");
        await player2.captionImageReceivedFromServer("Some other caption!");

        // Scores for each player
        await host.voteForFirstStackItem();
        await player2.voteForFirstStackItem();

        await host.voteForFirstStackItem();
        await player2.voteForFirstStackItem();
        
        // Scoreboard displayed
        await host.waitForScores();

        // Host can start next round
        await host.clickNextRound();   
        
        // Is back in the drawing phase  
        await host.waitForDrawingCanvasToAppear();
        await player2.waitForDrawingCanvasToAppear();

        // Total victory! A full game cycle!
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