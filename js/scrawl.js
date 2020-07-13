import { JackboxStateMachine } from "./jackbox.js";
import {
    StartHandler, 
    DealHandler, 
    GetUserDrawingHandler, 
    GetUserCaptionHandler, 
    PassStacksAroundHandler,
    GetUserScoresHandler,
    EndHandler
} from "../js/scrawl.handlers.js";

export const ScrawlGame = new JackboxStateMachine({
    steps: {
        "StartHandler": new StartHandler(), 
        "DealHandler": new DealHandler(), 
        "GetUserDrawingHandler": new GetUserDrawingHandler(180_000), 
        "GetUserCaptionHandler": new GetUserCaptionHandler(60_000), 
        "PassStacksAroundHandler": new PassStacksAroundHandler(), 
        "GetUserScoresHandler": new GetUserScoresHandler(30_000),
        "EndHandler": new EndHandler()
    }
});

export class ScrawlClient {
    constructor(gameId, channel) {
        this.gameId = gameId;
        this.channel = channel;
    }
    
    async sendImage(drawableCanvas) {
        const asText = drawableCanvas.toString();
        console.log(this.gameId);
        
        const result = await fetch("/api/storeImage", {
          method: "POST",
          body: JSON.stringify({ gameId: this.gameId, imageData: asText })
        });
      
        const savedUrl = await result.json();
        this.channel.sendMessage({ kind: "drawing-response", imageUrl: savedUrl.url });
      }
      
      async sendCaption(caption) {
        this.channel.sendMessage({ kind: "caption-response", caption: caption });
      }
      
      async logVote(id) {
        this.channel.sendMessage({ kind: "pick-one-response", id: id });
      }
}