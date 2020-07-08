import { ScrawlGame, StackItem } from "./scrawl.js";
import { JackboxStateMachine } from "./jackbox.js";
import { game } from "./jackbox_scrawl.js";

export class P2PServer {
    constructor(identity, uniqueId, ably) {
      this.identity = identity;
      this.uniqueId = uniqueId;
      this.ably = ably;

      this.stateMachine = new JackboxStateMachine(game);
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
