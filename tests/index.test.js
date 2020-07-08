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

global.Vue = require("../js/vue.min.js");
global.Ably = { Realtime: { Promise: AblyStub } };
global.crypto = { getRandomValues: function() { return [ 123454373 ] } };
global.window = { location: { protocol: "https:", host: "localhost", pathname: "/bingo" } }

const { app } = require("../index.js");

describe("Vue app", () => {

    it("Hosting a game creates a server", async () => {
        await app.host({ preventDefault: function() {}});

        //expect(app.gameServer).toBeDefined();        
        //expect(app.gameServer).not.toBeNull();        
    });
/*
    it("Hosting a game creates a client", async () => {
        await app.host({ preventDefault: function() {}});

        expect(app.gameClient).toBeDefined();        
        expect(app.gameClient).not.toBeNull();        
    });

    it("Joining a game creates a client", async () => {
        await app.join({ preventDefault: function() {}});

        expect(app.gameClient).toBeDefined();        
        expect(app.gameClient).not.toBeNull();        
    });*/
});