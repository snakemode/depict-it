import { ScrawlGame } from "./jackbox_scrawl";

export class P2PServer {
    constructor(identity, uniqueId, ably) {
      this.identity = identity;
      this.uniqueId = uniqueId;
      this.ably = ably;

      this.stateMachine = ScrawlGame;
      this.stateMachine.state.channel = ably;

      this.state = { 
        players: []
      };
    }
     
    async connect() {
      await this.ably.connect(this.identity, this.uniqueId);
    }

    async startGame() {
      this.ably.sendMessage({ kind: "game-start", serverState: this.state });
      this.stateMachine.state.players = this.state.players;
      await this.stateMachine.run();
    }

    onReceiveMessage(message) {
      switch(message.kind) {
        case "connected": this.onClientConnected(message); break;
        default: {
          this.stateMachine.handleInput(message);
        };
      }
    }

    onClientConnected(message) {
      this.state.players.push(message.metadata);
      this.ably.sendMessage({ kind: "connection-acknowledged", serverState: this.state }, message.metadata.clientId);
      this.ably.sendMessage({ kind: "game-state", serverState: this.state });
    }
}  
