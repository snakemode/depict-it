import { DrawableCanvas } from "./js/painting.js";
import { Identity, PubSubClient } from "./js/p2p.js";
import { P2PClient } from "./js/p2p.lib.client.js";
import { P2PServer } from "./js/p2p.lib.server.js";

export var app = new Vue({
  el: '#app',
  data: {   
    p2pClient: null,
    p2pServer: null,
    
    identity: null,
    friendlyName: "Player-" + crypto.getRandomValues(new Uint32Array(1))[0],
    uniqueId: "Session-" + crypto.getRandomValues(new Uint32Array(1))[0],

    canvas: null,
    caption: ""
  }, 
  updated: function () {
    const element = document.getElementById("paintCanvas");
    if (element) {
      this.canvas = new DrawableCanvas("paintCanvas").registerPaletteElements("palette");
    }
  },
  computed: {
    state: function() { return this.p2pClient?.state; },
    transmittedServerState: function() { return this.p2pClient?.serverState; },
    joinedOrHosting: function () { return this.p2pClient != null || this.p2pServer != null; },
    iAmHost: function() { return this.p2pServer != null; },
  },
  methods: {
    host: async function(evt) {
      evt.preventDefault();

      const pubSubClient = new PubSubClient((message, metadata) => { 
        handleMessagefromAbly(message, metadata, this.p2pClient, this.p2pServer); 
      });

      this.identity = new Identity(this.friendlyName);
      this.p2pServer = new P2PServer(this.identity, this.uniqueId, pubSubClient);
      this.p2pClient = new P2PClient(this.identity, this.uniqueId, pubSubClient);
      
      await this.p2pServer.connect();
      await this.p2pClient.connect();
    },
    join: async function(evt) { 
      evt.preventDefault();

      const pubSubClient = new PubSubClient((message, metadata) => { 
        handleMessagefromAbly(message, metadata, this.p2pClient, this.p2pServer); 
      });
      
      this.identity = new Identity(this.friendlyName);
      this.p2pClient = new P2PClient(this.identity, this.uniqueId, pubSubClient);

      await this.p2pClient.connect();
    },
    startGame: async function(evt) {
      this.p2pServer?.startGame();
    },
    sendImage: async function(evt) {
      await this.p2pClient.sendImage(this.canvas);
      this.canvas.clear();
    },
    sendCaption: async function(evt) {
      await this.p2pClient.sendCaption(this.caption);
      this.caption = "";
    },
    logVote: async function(evt) {
      console.log(evt);
      await this.p2pClient.logVote(evt.target.id);
    },
    sendVotes: async function(evt) {
      await this.p2pClient.sendVotes();
    }
  }
});

function shouldHandleMessage(message, metadata) {  
  return message.forClientId == null || !message.forClientId || (message.forClientId && message.forClientId === metadata.clientId); 
}

function handleMessagefromAbly(message, metadata, p2pClient, p2pServer) {
  if (shouldHandleMessage(message, metadata)) {
    p2pServer?.onReceiveMessage(message);  
    p2pClient?.onReceiveMessage(message);
  } 
}