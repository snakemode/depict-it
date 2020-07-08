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

        this.stateObserver = null;
        this.msTracker = null;
        this.timeoutTracker = null;
    }

    currentStep() { return this.game.steps[this.currentStepKey]; }

    async run() {
        console.log("Running", this.currentStepKey, this.state);

        this.trackMilliseconds();
        this.trackAnyTimeouts();

        const currentStep = this.currentStep();
        await currentStep.execute(this.state);        
        await this.observeStateChanges();
    }

    async handleInput(input) {
        const currentStep = this.currentStep();
        if(currentStep.handleInput) {
            currentStep.handleInput(this.state, input);
        } else {
            console.log("Input received while no handler was available.");
        } 
    }

    async observeStateChanges() {    
        const step = this.currentStep();
      
        let nextStep = null;
        if (step.getStatus) {
            const status = await step.getStatus(this.state);
            if (status.complete) {
                nextStep = status.transitionTo ?? this.selectNextStepInDefinitionOrder();
            }
        } else {
            nextStep = this.selectNextStepInDefinitionOrder();
        }

        if (nextStep != null) {            
            this.currentStepKey = nextStep;            
            this.stopObservingChanges();
            this.run();
            return;
        }

        this.stateObserver = setTimeout(() => { this.observeStateChanges(); }, 25);
    }

    trackMilliseconds() {
        clearTimeout(this.msTracker);        
        this.state.msInCurrentStep = 0;

        const interval = 5;
        this.msTracker = setInterval(() => { this.state.msInCurrentStep += interval; }, interval);
    }

    trackAnyTimeouts() {
        clearTimeout(this.timeoutTracker);
        this.state.timedOut = false;

        const step = this.currentStep(); 
        if (!step.timeout) { 
            return; 
        }

        this.timeoutTracker = setTimeout(() => {
            if (step.onTimeout) {
                step.onTimeout(this.state);
                this.state.timedOut = true;
            }                
        }, step.timeout);        
    }

    selectNextStepInDefinitionOrder() {     
        const stepDefinitions = Object.getOwnPropertyNames(this.game.steps);
        const currentIndex = stepDefinitions.indexOf(this.currentStepKey);
        
        if (currentIndex == stepDefinitions.length -1) {
            return null; // End of the line.
        }

        return stepDefinitions[currentIndex+1];   
    }

    stopObservingChanges() { clearTimeout(this.stateObserver); }
}