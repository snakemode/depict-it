const { DrawableCanvas } = require("../js/painting.js");
const { Identity, PubSubClient } = require("../js/p2p.js");
const { P2PServer } = require("../js/p2p.lib.server.js");
const { P2PClient } = require("../js/p2p.lib.client.js");
const vue = require("../js/vue.min.js");

const fakeAblyChannel = {
    published: [],
    subscribe: function(callback) { 
        this.callback = callback 
    },
    publish: function(message) { 
        this.published.push(message); 
        this.callback(message);
    }
}

class AblyStub {
    connection = { on: function(string) { } };
    channels = { get: function(chName) { return fakeAblyChannel; } }
}

global.Vue = vue;
global.crypto = { getRandomValues: function() { return [ 123454373 ] } };
global.Identity = Identity;
global.PubSubClient = PubSubClient;
global.DrawableCanvas = DrawableCanvas;
global.P2PClient = P2PClient;
global.P2PServer = P2PServer;
global.Ably = { Realtime: { Promise: AblyStub } };
global.window = { location: { protocol: "https:", host: "localhost", pathname: "/bingo" } }

const { app } = require("../index.js");

describe("Vue app", () => {

    it("Hosting a game creates a server", async () => {
        await app.host({ preventDefault: function() {}});

        expect(app.gameServer).toBeDefined();        
        expect(app.gameServer).not.toBeNull();        
    });

    it("Hosting a game creates a client", async () => {
        await app.host({ preventDefault: function() {}});

        expect(app.gameClient).toBeDefined();        
        expect(app.gameClient).not.toBeNull();        
    });

    it("Joining a game creates a client", async () => {
        await app.join({ preventDefault: function() {}});

        expect(app.gameClient).toBeDefined();        
        expect(app.gameClient).not.toBeNull();        
    });
});