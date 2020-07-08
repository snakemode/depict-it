import { JackboxStateMachine } from "../js/jackbox.js";

describe("JackboxStateMachine", () => {

    it("run, triggers opening step", async () => {
        const game = twoStepGame();

        const sut = new JackboxStateMachine(game);
        await sut.run();

        expect(sut.state.executeCalled).toBe(true);
    });

    it("run, opening step transition is executed", async () => {
        const game = twoStepGame();

        const sut = new JackboxStateMachine(game);
        await sut.run();

        expect(sut.currentStepKey).toBe("end");
    });

    it("run, game that only proceeds with input, proceeds with input", async () => {
        const game = gameThatNeedsInputToProceed();

        const sut = new JackboxStateMachine(game);
        await sut.run();

        expect(sut.currentStepKey).toBe("start");

        sut.handleInput("input");
        await sleep(50);

        expect(sut.currentStepKey).toBe("end");
    });

    it("run, step doesn't contain getStatus message, proceeds to next defined step by default", async () => {
        const game = gameWithoutGetStatusInStep();

        const sut = new JackboxStateMachine(game);
        await sut.run();

        expect(sut.currentStepKey).toBe("end");
    });

    it("run, step doesn't contain input handler when input received, nothing happens", async () => {
        const game = gameThatNeedsToWaitBetweenSteps();

        const sut = new JackboxStateMachine(game);
        await sut.run();

        sut.handleInput("input");
        await sleep(500);

        expect(sut.currentStepKey).toBe("end");
    });

    it("run, step exposes timeout, calls onTimeout when times out.", async () => {
        const game = gameWithTimeout(150);

        const sut = new JackboxStateMachine(game);
        await sut.run();
        await sleep(500);

        expect(sut.state.timedOut).toBe(true);
    });

});



const twoStepGame = () => ({
    steps: {
        "start": {
            execute: async function (state) { state.executeCalled = true; },
            handleInput: async function(state, input) { },
            getStatus: async function(state) { return { complete: true, transitionTo: "end" }; }
        },
        "end": {
            execute: async function (state) { },
            handleInput: async function(state) { }
        }
    }
});

const gameThatNeedsInputToProceed = () => ({
    steps: {
        "start": {
            execute: async function (state) { state.executeCalled = true; },
            handleInput: async function(state, input) { state.gotInput = true; },                
            getStatus: async function(state) { 
                if (state.gotInput) {
                    return { complete: true, transitionTo: "end" }; 
                } else {
                    return { complete: false }; 
                }
            }
        },
        "end": {
            execute: async function (state) { },
            handleInput: async function(state, input) { }
        }
    }
});


const gameThatNeedsToWaitBetweenSteps = () => ({
    steps: {
        "start": {
            execute: async function (state) { 
                state.executeCalled = true;
            },              
            getStatus: async function(state) {
                if (state.msInCurrentStep < 250) {
                    return { complete: false }; 
                } else {
                    return { complete: true, transitionTo: "end" }; 
                }
            }
        },
        "end": {
            execute: async function (state) { },
            handleInput: async function(state, input) { }
        }
    }
});

const gameWithTimeout = (timeout) => ({
    steps: {
        "start": {
            timeout: timeout,
            execute: async function (state) { state.executeCalled = true; },              
            getStatus: async function(state) { return { complete: false }; },
            onTimeout: async function(state) { 
                state.timedOut = true;
            }
        },
        "end": {
            execute: async function (state) { },
            handleInput: async function(state, input) { }
        }
    }
});

const gameWithoutGetStatusInStep = () => ({
    steps: {
        "start": {
            execute: async function (state) { state.executeCalled = true; },
        },
        "end": {
            execute: async function (state) { },
        }
    }
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}