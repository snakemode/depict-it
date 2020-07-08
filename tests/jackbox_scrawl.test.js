import { JackboxStateMachine } from "../js/jackbox.js";
import { game } from "../js/jackbox_scrawl.js";
import { Identity } from "../js/p2p.js";

describe("JackboxStateMachine", () => {

    it("run, deals cards and asks users to draw", async () => {
        const sut = new JackboxStateMachine(game);
        
        sut.state.players = [];
        sut.state.players.push(new Identity("Player1"));
        sut.state.players.push(new Identity("Player2"));

        sut.run();

        await sleep(1000);

        expect(sut.currentStepKey).toBe("getUserDrawing");

        console.log(sut.state.channel.sentMessages);
    });
});


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}