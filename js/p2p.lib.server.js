import { ScrawlGame, StackItem } from "./scrawl.js";

export class P2PServer {
    constructor(identity, uniqueId, ably) {
      this.identity = identity;
      this.uniqueId = uniqueId;
      this.ably = ably;

      this.state = { 
        players: [],
        game: null
       };
    }
     
    async connect() {
      await this.ably.connect(this.identity, this.uniqueId);
    }

    async startGame() {
      this.state.game = new ScrawlGame();      
      for (let player of this.state.players) {
        this.state.game.addPlayer(player);
      }
      this.state.game.dealStacks();

      this.ably.sendMessage({ kind: "game-start", serverState: this.state });
    }

    onReceiveMessage(message) {
      switch(message.kind) {
        case "connected": this.onClientConnected(message); break;
        case "client-drawing": this.onClientDrawing(message); break;
        case "client-caption": this.onClientCaption(message); break;
        default: () => { };
      }
    }

    onClientConnected(message) {
      this.state.players.push(message.metadata);
      this.ably.sendMessage({ kind: "connection-acknowledged", serverState: this.state }, message.metadata.clientId);
      this.ably.sendMessage({ kind: "game-state", serverState: this.state });
    }

    onClientDrawing(message) {
      this.state.game.addToStack(message.metadata.clientId, new StackItem("image", message.imageUrl))
      this.cascadeAnyGameStateChanges();
    }

    onClientCaption(message) {
      this.state.game.addToStack(message.metadata.clientId, new StackItem("string", message.caption));
      this.cascadeAnyGameStateChanges();
    }

    cascadeAnyGameStateChanges() {
      const tickResult = this.state.game.tryTick();
      console.log("tickResult", tickResult);
      
      this.ably.sendMessage({ kind: "game-state", serverState: this.state });
    }

    stackHeldBy(clientId) {
      return this.state.game?.stacks?.filter(s => s.heldBy == clientId)[0];
    }
}  
