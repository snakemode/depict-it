import { GameStateMachine } from "./GameStateMachine.js";
import {
  StartHandler, DealHandler, GetUserDrawingHandler, GetUserCaptionHandler, PassStacksAroundHandler,
  GetUserScoresHandler, EndHandler
} from "./Scrawl.handlers.js";

export const Scrawl = new GameStateMachine({
  steps: {
    "StartHandler": new StartHandler(),
    "DealHandler": new DealHandler(),
    "GetUserDrawingHandler": new GetUserDrawingHandler(180_000),
    "GetUserCaptionHandler": new GetUserCaptionHandler(60_000),
    "PassStacksAroundHandler": new PassStacksAroundHandler(),
    "GetUserScoresHandler": new GetUserScoresHandler(),
    "EndHandler": new EndHandler()
  }
});

export class ScrawlClient {
  constructor(gameId, channel) {
    this.gameId = gameId;
    this.channel = channel;
  }

  async sendImage(base64EncodedImage) {
    const result = await fetch("/api/storeImage", {
      method: "POST",
      body: JSON.stringify({ gameId: this.gameId, imageData: base64EncodedImage })
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

  async hostProgressedVote() {
    this.channel.sendMessage({ kind: "skip-scoring-forwards" })
  }
}