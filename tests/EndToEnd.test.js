import { chromium  } from 'playwright';

jest.setTimeout(30_000);

describe("Something", () => {
    
    let browser, app, cleanup;
    beforeEach(async () => {
        browser = await chromium.launch({ headless: false });
        app = await ScrawlAppPageObject.create(browser);
        cleanup = [];
        cleanup.push(browser, app);
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

    async function newPageObject() {
        const instance = await ScrawlAppPageObject.create(browser);
        cleanup.push(instance);
        return instance;
    }
});

class ScrawlAppPageObject {
    static async create(browser) {
        const page = await browser.newPage();
        await page.goto('http://127.0.0.1:8080');
        return new ScrawlAppPageObject(browser, page);
    }    

    constructor(browser, page) {
        this.browser = browser;
        this.page = page;
    }

    async hostASession() {
        this.playerName = await this.getSessionId();
        this.gameId = await this.getGameId();

        await this.page.click('text=Host a Session');
        await this.clickStartGame();
        return this.gameId;
    }

    async joinASession(gameId) {
        this.playerName = await this.getSessionId();

        await this.enterGameId(gameId);
        await this.page.click('text=Join a Session');
    }

    async clickStartGame() {
        await this.page.waitForSelector('text=Start Game');
    }

    async enterGameId(id) {
        await this.page.fill('[name=session-name]', id);
    }

    async getGameId() {
        return await this.page.$eval('[name=session-name]', e => e.value);
    }

    async getSessionId() {
        return await this.page.$eval('[name=name]', e => e.value);
    }

    async connectedPlayers() {
        return await this.page.$eval('.players', e => e.innerHTML);
    }

    close() {        
        this.page.close();
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}