export class ScrawlAppPageObject {
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
        await this.page.waitForSelector('text=Start Game');
        return this.gameId;
    }

    async joinASession(gameId) {
        this.playerName = await this.getSessionId();

        await this.enterGameId(gameId);
        await this.page.click('text=Join a Session');
    }

    async clickStartGame() {
        await this.page.click('text=Start Game');
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

    async drawableCanvasIsVisible() {        
        await this.page.waitForSelector('.drawable-canvas');
    }

    close() {        
        this.page.close();
    }
}