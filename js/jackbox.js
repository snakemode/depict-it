export class NullMessageChannel {
    constructor() {
        this.sentMessages = []
    }

    sendMessage(message, targetClientId) {
        this.sentMessages.push( { message, targetClientId });
    }
}

export class JackboxStateMachine {
    constructor(gameDefinition) {
        this.state = {
            msInCurrentStep: 0,
            channel: new NullMessageChannel()
        };

        this.game = gameDefinition;
        this.currentStepKey = "start";

        this.msTracker = null;
    }

    currentStep() { return this.game.steps[this.currentStepKey]; }

    async run() {
        console.log("Invoking run()", this.currentStepKey);

        this.trackMilliseconds();

        const currentStep = this.currentStep();
        const response = await currentStep.execute(this.state);

        if (this.currentStepKey == "end" && (response == null || response.complete)) {            
            return; // State machine exit signal
        }

        if (response == null) {
            throw "You must return a response from your execute functions so we know where to redirect to.";
        }

        this.currentStepKey = response.transitionTo; 
        this.run();
    }

    async handleInput(input) {
        const currentStep = this.currentStep();
        if(currentStep.handleInput) {
            currentStep.handleInput(this.state, input);
        } else {
            console.log("Input received while no handler was available.");
        } 
    }

    trackMilliseconds() {
        clearTimeout(this.msTracker);        
        this.state.msInCurrentStep = 0;

        const interval = 5;
        this.msTracker = setInterval(() => { this.state.msInCurrentStep += interval; }, interval);
    }
}



export const waitUntil = (condition, timeout) => {
    return new Promise((res, rej) => {

        if (condition()) {
            res();
            return;
        }

        let elapsed = 0;
        const pollFrequency = 5;
        let interval = setInterval(() => {

            if (condition()) {
                clearInterval(interval);
                res();
                return;
            }

            elapsed += pollFrequency;  

            if (timeout && elapsed >= timeout) {
                clearInterval(interval);
                rej("Timed out");
            }
        }, pollFrequency);        
    });
}