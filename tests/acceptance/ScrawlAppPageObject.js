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
        await this.page.click('text=Create Game');
        await this.page.waitForSelector('text=Start Game');

        this.joinGameUrl = await this.getJoinGameUrl();
        return this.joinGameUrl;
    }

    async followJoinLink(joinUrl) { await this.page.goto(joinUrl); }

    async joinASession(joinUrl) {
        await this.followJoinLink(joinUrl);
        this.playerName = await this.getSessionId();
        await this.page.click('text=Join a Session');
    }

    async clickStartGame() {
        await this.page.click('text=Start Game');
    }

    async getJoinGameUrl() {
        return await this.page.$eval('#copyLinkInputBox', e => e.value);
    }

    async getSessionId() {
        return await this.page.$eval('[name=name]', e => e.value);
    }

    async connectedPlayers() {
        return await this.page.$eval('.players', e => e.innerHTML);
    }

    async youAreWaitingMessage() {        
        await this.page.waitForSelector('#wait-message');
        return await this.page.$eval('#wait-message', e => e.innerHTML);
    }

    async pageBody() {
        return await this.page.$eval('body', e => e.innerHTML);
    }

    async drawableCanvasIsVisible() {        
        await this.page.waitForSelector('.drawable-canvas');
    }

    close() {        
        this.page.close();
    }
}