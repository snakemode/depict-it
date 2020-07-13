import { ScrawlClient } from "./game/scrawl.js";

export class P2PClient {
    constructor(identity, uniqueId, ably) {
      this.identity = identity;
      this.uniqueId = uniqueId;
      this.ably = ably;

      this.scrawl = null;
      this.serverState = null;
      this.state = { 
        status: "disconnected",
        lastInstruction: null
       };
    }

    async connect() {
      await this.ably.connect(this.identity, this.uniqueId);
      this.ably.sendMessage({ kind: "connected" });
      this.state.status = "awaiting-acknowledgement";
      this.scrawl = new ScrawlClient(this.uniqueId, this.ably);
    }

    onReceiveMessage(message) {
      if (message.serverState) {
        this.serverState = message.serverState; 
      }

      switch(message.kind) {
        case "connection-acknowledged": 
          this.state.status = "acknowledged"; 
          break;
        case "instruction":
          this.state.lastInstruction = message;
          break;
        default: { };
      }
    }
  }