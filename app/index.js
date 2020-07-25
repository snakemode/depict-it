import { Identity, PubSubClient } from "./js/p2p.js";
import { P2PClient } from "./js/p2p.lib.client.js";
import { P2PServer } from "./js/p2p.lib.server.js";
import { generateName } from "./js/dictionaries.js";
import { DrawableCanvas } from "./js/components/DrawableCanvasComponent.js";
import { CopyableTextbox } from "./js/components/CopyableTextBoxComponent.js";
import { InviteLink } from "./js/components/InviteLinkComponent.js";
import { StackItem } from "./js/components/StackItemComponent.js";
import { TimerBar } from "./js/components/TimerBarComponent.js";

const urlParams = new URLSearchParams(location.search);
const queryGameId = urlParams.get("gameId");
const queryMessage = urlParams.get("message");
const isJoinLink = [...urlParams.keys()].indexOf("join") > -1;
const isHostLink = [...urlParams.keys()].indexOf("host") > -1;

Vue.component('drawable-canvas', DrawableCanvas);
Vue.component('stack-item', StackItem);
Vue.component('timer-bar', TimerBar);
Vue.component('copyable-text-box', CopyableTextbox);
Vue.component('invite-link', InviteLink);

export var app = new Vue({
  el: '#app',
  data: {   
    p2pClient: null,
    p2pServer: null,
    
    identity: null,
    friendlyName: generateName(2),
    gameId: queryGameId || generateName(3, "-").toLocaleLowerCase(),
    
    message: queryMessage || null,    
    isJoinLink: isJoinLink,
    isHostLink: isHostLink,

    caption: ""
  },
  computed: {
    state: function() { return this.p2pClient?.state; },
    transmittedServerState: function() { return this.p2pClient?.serverState; },
    joinedOrHosting: function () { return this.p2pClient != null || this.p2pServer != null; },
    iAmHost: function() { return this.p2pServer != null; },
    hasMessage: function () { return this.message != null; },
  },
  methods: {
    host: async function(evt) {
      evt.preventDefault();

      const pubSubClient = new PubSubClient((message, metadata) => { 
        handleMessagefromAbly(message, metadata, this.p2pClient, this.p2pServer); 
      });

      this.identity = new Identity(this.friendlyName);
      this.p2pServer = new P2PServer(this.identity, this.gameId, pubSubClient);
      this.p2pClient = new P2PClient(this.identity, this.gameId, pubSubClient);
      
      await this.p2pServer.connect();
      await this.p2pClient.connect();
    },
    join: async function(evt) { 
      evt.preventDefault();

      const pubSubClient = new PubSubClient((message, metadata) => { 
        handleMessagefromAbly(message, metadata, this.p2pClient, this.p2pServer); 
      });
      
      this.identity = new Identity(this.friendlyName);
      this.p2pClient = new P2PClient(this.identity, this.gameId, pubSubClient);

      await this.p2pClient.connect();
    },
    startGame: async function(evt) {
      this.p2pServer?.startGame();
    },
    sendImage: async function(base64EncodedImage) {
      await this.p2pClient.scrawl.sendImage(base64EncodedImage);
    },
    sendCaption: async function(evt) {
      await this.p2pClient.scrawl.sendCaption(this.caption);
      this.caption = "";
    },
    sendVote: async function(id) {
      await this.p2pClient.scrawl.logVote(id);
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

