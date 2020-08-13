import { Stack, StackItem } from "./DepictIt.types.js";
import { DepictItCards } from "./DepictIt.cards.js";
import { waitUntil } from "./GameStateMachine.js";

export class StartHandler {
    async execute(state, context) {
        state.stacks = [];
        state.hints = DepictItCards.slice();
        shuffle(state.hints);
        return { transitionTo: "DealHandler" };
    }
}

export class DealHandler {
    async execute(state, context) {
        for (let player of state.players) {
            const hint = state.hints.pop();
            const stack = new Stack(player.clientId, hint);
            state.stacks.push(stack);
        }
        return { transitionTo: "GetUserDrawingHandler" };
    }
}

export class GetUserDrawingHandler {
    constructor(waitForUsersFor) {
        this.waitForUsersFor = waitForUsersFor;
        this.userTimeoutPromptAt = waitForUsersFor - 3_000;
        this.userTimeoutPromptAt = this.userTimeoutPromptAt < 0 ? this.waitForUsersFor : this.userTimeoutPromptAt;
    }

    async execute(state, context) {
        this.submitted = 0;
        this.initialStackLength = state.stacks[0].items.length;

        for (let player of state.players) {
            const stack = state.stacks.filter(s => s.heldBy == player.clientId)[0];
            const lastItem = stack.items[stack.items.length - 1];

            context.channel.sendMessage({ kind: "instruction", type: "drawing-request", value: lastItem.value, timeout: this.userTimeoutPromptAt }, player.clientId);
        }

        const result = { transitionTo: "PassStacksAroundHandler" };

        try {
            await waitUntil(() => this.submitted == state.players.length, this.waitForUsersFor);
        }
        catch (exception) {
            result.error = true;

            const stacksThatHaventBeenAddedTo = state.stacks.filter(s => s.items.length === this.initialStackLength);

            for (let stack of stacksThatHaventBeenAddedTo) {
                const stackItem = new StackItem("image", "/assets/no-submit.png");
                stack.add({ ...stackItem, author: "SYSTEM", id: createId() });
            }
        }

        return result;
    }

    async handleInput(state, context, message) {
        if (message.kind == "drawing-response") {
            const stackItem = new StackItem("image", message.imageUrl);
            const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];

            stack.add({ ...stackItem, author: message.metadata.clientId, id: createId() });
            context.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);

            this.submitted++;
        }
    }
}

export class GetUserCaptionHandler {
    constructor(waitForUsersFor) {
        this.waitForUsersFor = waitForUsersFor;
        this.userTimeoutPromptAt = waitForUsersFor - 3_000;
        this.userTimeoutPromptAt = this.userTimeoutPromptAt < 0 ? this.waitForUsersFor : this.userTimeoutPromptAt;
    }

    async execute(state, context) {
        this.submitted = 0;
        this.initialStackLength = state.stacks[0].items.length;

        for (let player of state.players) {
            const stack = state.stacks.filter(s => s.heldBy == player.clientId)[0];
            const lastItem = stack.items[stack.items.length - 1];
            context.channel.sendMessage({ kind: "instruction", type: "caption-request", value: lastItem.value, timeout: this.userTimeoutPromptAt }, player.clientId);
        }

        let redirect = { transitionTo: "PassStacksAroundHandler" };

        try {
            await waitUntil(() => this.submitted == state.players.length, this.waitForUsersFor);
        }
        catch {
            redirect.error = true;

            const stacksThatHaventBeenAddedTo = state.stacks.filter(s => s.items.length === this.initialStackLength);

            for (let stack of stacksThatHaventBeenAddedTo) {
                const stackItem = new StackItem("string", "Answer not submitted");
                stack.add({ ...stackItem, author: "SYSTEM", id: createId() });
            }
        }

        return redirect;
    }

    async handleInput(state, context, message) {
        if (message.kind == "caption-response") {
            const stackItem = new StackItem("string", message.caption);
            const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];

            stack.add({ ...stackItem, author: message.metadata.clientId, id: createId() });
            context.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);

            this.submitted++;
        }
    }
}

export class PassStacksAroundHandler {
    async execute(state, context) {
        let holders = state.stacks.map(s => s.heldBy);
        const popped = holders.pop();
        holders = [popped, ...holders];

        for (let stackIndex in state.stacks) {
            state.stacks[stackIndex].heldBy = holders[stackIndex];
        }

        const stacksHeldByOriginalOwners = state.stacks[0].heldBy == state.players[0].clientId;

        if (stacksHeldByOriginalOwners) {
            return { transitionTo: "GetUserScoresHandler" };
        }

        const nextStackRequirement = state.stacks[0].requires;
        const nextTransition = nextStackRequirement == "image" ? "GetUserDrawingHandler" : "GetUserCaptionHandler";
        return { transitionTo: nextTransition };
    }
}

export class GetUserScoresHandler {

    async execute(state, context) {

        for (let stack of state.stacks) {
            this.skip = false;
            this.submitted = 0;

            context.channel.sendMessage({ kind: "instruction", type: "pick-one-request", stack: stack });

            try {
                await waitUntil(() => { return this.skip || (this.submitted == state.players.length); });
            } catch {
                console.log("Not all votes cast, shrug")
            }
        }

        return { transitionTo: "EndHandler" };
    }

    async handleInput(state, context, message) {
        if (message.kind === "skip-scoring-forwards") {
            this.skip = true;
            return;
        }

        if (message.kind != "pick-one-response") {
            return;
        }

        for (let stack of state.stacks) {
            for (let item of stack.items) {
                if (item.id == message.id) {

                    const author = state.players.filter(p => p.clientId == item.author)[0];

                    if (!author) {
                        continue; // They voted on the original phrase, what?!
                    }

                    if (!author.score) {
                        author.score = 0;
                    }
                    author.score++;
                }
            }
        }

        context.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);
        this.submitted++;
    }
}

export class EndHandler {
    async execute(state, context) {
        context.channel.sendMessage({ kind: "instruction", type: "show-scores", playerScores: state.players });
        return { complete: true };
    }
}

function shuffle(collection) {
    for (let i = collection.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [collection[i], collection[j]] = [collection[j], collection[i]];
    }
}

function createId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}