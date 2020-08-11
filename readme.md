# Depict-It

Depict-It is a party game for 4+ players (ideally!) where you mutate a phrase through drawings and captions, to make funny scenarios up with your friends.

You can play this online here: https://depictit.snkmo.de

## The rules of the game

* The game is played in rounds. 
* Each player is provided with a `Game Stack` containing a `Caption` and a blank screen for them to draw on.
* They have 180 seconds to draw a picture for the caption.
* Once either *all players* have finished, or 180 seconds elapses each drawing is passed to the next player.
* Now each player captions the drawing in front of them to the best of their ability
* Once the first player has their own `Game Stack` returned to them the `Scoring phase` begins.
* Each `Game Stack` is displayed shown, and all the players get to vote on the `funniest` card in the `Game Stack`
* Points are awarded and the `Host` can start a new round.

## What are we going to build?

We're going to build `Depict-It` as a browser game hosted inside our users browsers.

To do this, we're going to create a `web application` using `Vue.js`, some code derived from this `Ably Peer to Peer sample` (link here) and `ably` to send messages between our players.

We'll be hosting the application on `Azure Static Web Applications` and we'll use `Azure Blob Storage` to store user generated content.

## A brief introduction to Vue.js before we start

> Vue (pronounced /vjuː/, like view) is a progressive framework for building user interfaces. It is designed from the ground up to be incrementally adoptable, and can easily scale between a library and a framework depending on different use cases. It consists of an approachable core library that focuses on the view layer only, and an ecosystem of supporting libraries that helps you tackle complexity in large Single-Page Applications. 
> <cite>-- [vue.js Github repo](https://github.com/vuejs/vue)</cite>

[Vue.js](https://vuejs.org/) is a single page app framework, and we will use it to build the UI of our app. Our Vue code lives in [index.js](index.js) - and handles all of the user interactions. We're using Vue because it doesn't require a toolchain and it provides simple binding syntax for updating the UI when data changes.

Our Vue app looks a little like this abridged sample:

```js
var app = new Vue({
  el: '#app',
  data: {
    greeting: "hello world",
    displayGreeting: true,
  }
  methods: {
    doSomething: async function(evt) { ... }
  }
});
```

It finds an element with the id of `app` in our markup, and treats any elements within it as markup that can contain `Vue Directives` - extra attributes to bind data and manipulate our HTML based on the applications state.

Typically, the Vue app makes data available (such as `greeting` in the above code snippet), and when that data changes, it'll re-render the parts of the UI that are bound to it.
Vue.js exposes a `methods` property, which we use to implement things like click handlers and callbacks from our UI, like the `doSomething` function above.

This snippet of HTML should help illustrate how Vue if-statements and directives work

```html
<div id="app">
    <div v-if="displayGreeting" v-on:click="doSomething">
        {{ greeting }}
    </div>
</div>
```

Here you'll see Vue's `v-if` directive, which means that this `div` and its contents will only display if the `displayGreeting` `data` property is true.
You can also see Vue's binding syntax, where we use `{{ greeting }}` to bind data to the UI.

**Vue is simple to get started with, especially with a small app like this, with easy to understand data-binding syntax.
Vue works well for our example here, because it doesn't require much additional code.**

## Ably Channels for pub-sub

We're also going to use Ably for pub-sub between our players.

[Ably Channels](https://www.ably.io/channels) are multicast (many publishers can publish to many subscribers) and we can use them to build peer-to-peer apps.

"Peer to peer" (p2p) is a term from distributed computing that describes any system where many participants, often referred to as "nodes", can participate in some form of collective communication. The idea of peer to peer was popularised in early filesharing networks, where users could connect to each other to exchange files, and search operated across all of the connected users, there is a long history of apps built using p2p. In this demo, we're going to build a simple app that will allow one of the peers to elect themselves the **"leader"**, and co-ordinate communication between each instance of our app.


## Ably channels and API keys

In order to run this app, you will need an Ably API key. If you are not already signed up, you can [sign up now for a free Ably account](https://www.ably.io/signup). Once you have an Ably account:

* Log into your app dashboard
* Under **“Your apps”**, click on **“Manage app”** for any app you wish to use for this tutorial, or create a new one with the “Create New App” button
* Click on the **“API Keys”** tab
* Copy the secret **“API Key”** value from your Root key, we will use this later when we build our app.

This app is going to use [Ably Channels](https://www.ably.io/channels) and [Token Authentication](https://www.ably.io/documentation/rest/authentication/#token-authentication).


## Making sure we send consistent messages by wrapping our Ably client

We're going to make a class called `PubSubClient` which will do a few things for us:

1. Allow us to call connect twice to the same channel to make our calling code simpler
2. Adds metadata to messages sent outwards, so we don't have to remember to do it in our calling code.

```js
class PubSubClient {
  constructor(onMessageReceivedCallback) {  
    this.connected = false;
    this.onMessageReceivedCallback = onMessageReceivedCallback;
  }
```

First we're defining a `constructor` for our class - and setting up some values. These values are a property called `connected`, set to false, and `onMessageReceivedCallback` - a function passed to the constructor that we will use later when Ably messages arrive.

We're then going to define our `connect` function

```js
  async connect(identity, uniqueId) {
    if(this.connected) return;

    this.metadata = { uniqueId: uniqueId, ...identity };

    const ably = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });
    this.channel = await ably.channels.get(`p2p-sample-${uniqueId}`);

    this.channel.subscribe((message) => {
      this.onMessageReceivedCallback(message.data, this.metadata);
    });

    this.connected = true;
  }
```

While we're making our connection, we're subscribing to an `Ably Channel` and adding a callback function that passes on the `data` property from the Ably message. This data is the `json` that our `peers` sent, along with some `identifying metadata` (like the user's `friendlyName` in this example) - to whatever function we pass to our constructor.

We're also going to define a `sendMessage` function, that adds some functionality on top of the default `Ably publish`.

```javascript
  sendMessage(message, targetClientId) {
    if (!this.connected) {
      throw "Client is not connected";
    }

    message.metadata = this.metadata;
    message.forClientId = targetClientId ? targetClientId : null;
    this.channel.publish({ name: "myMessageName", data: message});
  }
}
```

What we're doing here, is making sure that whenever `sendMessage` is called, we're including the data stored in `this.metadata` that was set during construction - our clients friendlyName. This ensures that whenever a message is sent from a peer, it's always going to include the name of the person that sent it.

We're also making sure that if the message is for a specific peer - set using `targetClientId` - then this property is added to our message before we publish it on the Ably Channel.

We're going to pass this wrapper to the instances of our `P2PClient` and `P2PServer` classes, to make sure they publish messages in a predictable way.


# Creating our Vue app

Our application is going to be composed of a `Vue` UI, and two main classes, `P2PClient` and `P2PServer`.

The `peer` who elects themselves as host will be the only one to have an instance of `P2PServer` and all of our `peers` will be `P2PClients`.

When we define our `Vue` app, we're going to create two `null` properties, one for each of these things, inside of `Vue data`.

```js
var app = new Vue({
  el: '#app',
  data: {
    p2pClient: null,
    p2pServer: null,
  ...
```

When a Vue instance is created, it adds all the properties found in its data object to Vue’s **reactivity system**. When the values of those properties change, the view will “react”, updating to match the new values.

By defining both our `p2pClient` and `p2pServer` properties inside of Vue's data object, we make them **reactive**, so any changes observed to the properties, will cause the UI to **re-render**.

Our Vue app only contains two functions, one to start `hosting` and the other to `join`. In reality, they're both doing the same thing (connecting to an `Ably channel` by name), but depending on which button is clicked in our UI, that `peer` will either behave as a host or a client.

```js
    host: async function(evt) {
      evt.preventDefault();

      const pubSubClient = new PubSubClient((message, metadata) => {
        handleMessagefromAbly(message, metadata, this.p2pClient, this.p2pServer);
      });

      const identity = new Identity(this.friendlyName);
      this.p2pServer = new P2PServer(identity, this.uniqueId, pubSubClient);
      this.p2pClient = new P2PClient(identity, this.uniqueId, pubSubClient);

      await this.p2pServer.connect();
      await this.p2pClient.connect();
    },
```
Our `host` function, creates an instance of the `PubSubClient`, and provides it with a callback to `handleMessageFromAbly` then:

* Creates a new `Identity` instance, using the `friendlyName` bound to our UI
* Creates a new `P2PServer`
* Creates a new `P2PClient`
* Connects to each of them (which in turn, calls `connect` on our `PubSubClient` instance)

Joining is very similar

```js

    join: async function(evt) {
      evt.preventDefault();

      const pubSubClient = new PubSubClient((message, metadata) => {
        handleMessagefromAbly(message, metadata, this.p2pClient, this.p2pServer);
      });

      const identity = new Identity(this.friendlyName);
      this.p2pClient = new P2PClient(identity, this.uniqueId, pubSubClient);

      await this.p2pClient.connect();
    }
```

Here, we're doing *exactly the same* as the host, except we're only creating a `P2PClient`.

# HandleMessageFromAbly

`handleMessageFromAbly` is the callback function we want our `PubSubClient` to trigger whenever a message appears on the `Ably Channel`.

```js
function shouldHandleMessage(message, metadata) {  
  return message.forClientId == null || !message.forClientId || (message.forClientId && message.forClientId === metadata.clientId); 
}

function handleMessagefromAbly(message, metadata, p2pClient, p2pServer) {
  if (shouldHandleMessage(message, metadata)) {
    p2pServer?.onReceiveMessage(message);  
    p2pClient?.onReceiveMessage(message);
  } 
}
```

It's responsible for calling any p2pServer `onReceiveMessage` if the client is a `host`, calling `onReceiveMessage` on our client, but also making sure that if the message has been flagged as for a specific client by including the property `forClientId`, it doesn't get processed by other peers.

This is deliberately **not secure**. All the messages sent on our `Ably channel` are multicast, and received by all peers, so it should not be considered tamper proof - but it does prevent us having to filter inside of our client and server instances.

## P2PClient

The `P2PClient` class does most of the work in the app.
It's responsible for sending a `connected` message over the `PubSubClient` when `connect` is called, and most importantly of keeping track of a copy of the `serverState` whenever a message is received.

```js
class P2PClient {
  constructor(identity, uniqueId, ably) {
    this.identity = identity;
    this.uniqueId = uniqueId;
    this.ably = ably;

    this.depictIt = null;
    this.serverState = null;
    this.countdownTimer = null;

    this.state = {
      status: "disconnected",
      instructionHistory: [],
      lastInstruction: null
    };
  }
```
Our constructor assigns it's parameters to instance variables, and initilises a `null` `this.serverState` property, along with it's own client state in `this.state`.

We then go on to define our `connect` function

```js
  async connect() {
    await this.ably.connect(this.identity, this.uniqueId);
    this.ably.sendMessage({ kind: "connected" });
    this.state.status = "awaiting-acknowledgement";
    // this.depictIt = new DepictItClient(this.uniqueId, this.ably);
  }
```

This uses the provided `PubSubClient` (here stored as the property `this.ably`) to send a `connected` message. The `PubSubClient` is doing the rest of the work - adding in the `identity` of the sender during the `sendMessage` call.

It also sets `this.state.status` to `awaiting-acknowledgement` - the default state for all of our client instances until the `P2PServer` has sent them a `connection-acknowledged` message.

`OnReceiveMessage` does a little more work

```js  
  onReceiveMessage(message) {
    if (message.serverState) {
      this.serverState = message.serverState;
    }

    switch (message.kind) {
      case "connection-acknowledged":
        this.state.status = "acknowledged";
        break;
      /*case "instruction":
        this.state.instructionHistory.push(message);
        this.state.lastInstruction = message;
        break;*/
      default: { };
    }
  }
```

There are two things to pay close attention to here - firstly that we update the property `this.serverState` whenever an incoming message has a property called `serverState` on it - our clients use this to keep a local copy of whatever the `host` says its state is, and we'll use this to bind to our UI later.

Then there's our switch on `message.kind` - the type of message we're receiving.

In this case, we only actually care about our `connection-acknowledged` message, updating our `this.state.status` property to `acknowledged` once we receive one.

There are a few commented lines in this code that we'll discuss later on.

## P2PServer

Our `P2PServer` class hardly differs from the client.

It contains a constructor that creates an empty `this.state` object

```js
export class P2PServer {
  constructor(identity, uniqueId, ably) {
    this.identity = identity;
    this.uniqueId = uniqueId;
    this.ably = ably;

    // this.stateMachine = DepictIt({ channel: ably });

    this.state = {
      players: [],
      hostIdentity: this.identity,
      started: false
    };
  }
```

A connect function that connects to Ably via the `PubSubClient`

```js
    async connect() {
      await this.ably.connect(this.identity, this.uniqueId);
    }
```

And an `onReceiveMessage` callback function that responds to the `connected` message.

```js
  onReceiveMessage(message) {
    switch (message.kind) {
      case "connected": this.onClientConnected(message); break;
      default: {
        // this.stateMachine.handleInput(message);
      };
    }
  }
```

All the work is done in `onClientConnected`

```js
  onClientConnected(message) {
    this.state.players.push(message.metadata);
    this.ably.sendMessage({ kind: "connection-acknowledged", serverState: this.state }, message.metadata.clientId);
    this.ably.sendMessage({ kind: "game-state", serverState: this.state });
  }
```

When a client connects, we keep track of their `metadata` - the `friendlyName`, and then send two messages.
The first, is a `connection-acknowledged` message, that is sent **specifically** to the `clientId` that just connected.

Then, it send a `peer-status` message, with a copy of the latest `this.state` object, that will in turn trigger all the clients to update their internal state.

There's a little more that happens in our server class (you might notice the currently commented `stateMachine` line) but let's talk about how our game logic works first.

# Designing our game

Our game is going to play out over messages between the `host` and all the `players`.

As a principal we're going to send messages from the `host` to each individual client representing the next thing they have to do.
The `game stacks` - the piles of Depcit-It cards, will be stored in memory in the `hosts` browser, with only the information required to display to the player sent in messages at any one time.

This:

- Keeps our message payloads small
- Means we can structure our application in pairs of messages - requests for user input and their responses.

Our game has five key phases:

- Dealing and setup
- Collecting image input from players
- Collecting text captions from players
- Collecting scores from players
- Displaying scores

Each of these phases will be driven by pairs of messages.

To fit inside our `p2p client`, we're going to always store a variable called `lastMessage` in our web app - and have our UI respond to the contents of this last message. This is a simple way to control what is shown on each players screen.

We'll use a message type called `wait` to place players in a holding page while other players complete their inputs.

Here are the messages used in each phase of the game:

| Phase  | Message kind | Example |
|--------|------| --- |
| Dealing and setup                          | No messages | |
| Collecting image input                     | `drawing-request`        | { kind: "instruction", type: "drawing-request", value: lastItem.value, timeout: 30_000 } |
| Collecting image input response            | `drawing-response`       | { kind: "drawing-response", imageUrl: "http://some/url" } |
| Collecting caption input                   | `caption-request`       | { kind: "instruction", type: "caption-request", value: lastItem.value, timeout: 30_000 } |
| Collecting caption input response          | `caption-response`      | { kind: "caption-response", caption: "a funny caption" } |
| Collecting scores from players input       | `pick-one-request`      | { kind: "instruction", type: "pick-one-request", stack: stack } |
| Collecting scores from players response    | `pick-one-response`     | { kind: "pick-one-response", id: "stack-item-id" } |
|                                            | `skip-scoring-forwards` | { kind: "skip-scoring-forwards" } |
| Displaying scores                          | `show-scores`           | { kind: "instruction", type: "show-scores", playerScores: state.players } |
|                                            | `wait`                  | { kind: "instruction", type: "wait" } |

Each of these messages will be sent through our `PubSubClient` class, that'll add some identifying information (the id of the player that sent each message) into the message body for us to filter by in our code.

As our game runs, and sends these messages to each individual client, it can collect their responses and move the `game state` forwards.

Luckily, there isn't very much logic in the game, it has to:

- Ensure when a player sends a response to a request, it's placed on the correct `game stack` of items
- Keep track of scores when players vote on items
- Keep track of which stack each player is currently holding

We need to make sure we write code for each of our game phases to send these `p2p messages` at the right time, and then build a web UI that responds to the last message received to add our gameplay experience.

There's a pattern in software called a `State Machine` - a way to model a system that can exist in one of several known states, and we're going to build a `State Machine` to run our game logic.

# The GameStateMachine

Forgetting the web-UI for a moment, we need to write some code to capture the logic of our game.

We're going to break the various phases of our game up into different `Handlers` - that represent both the logic of that portion of the game, and the logic that handles user input during that specific game phase.

Our implementation is part `state-machine`, part `command-pattern-style handler`.

Let's take a look at what our state machine code can look like - here's a "simple" two-step game definition, taken from one of our unit tests:

```js
const twoStepGame = () => ({
    steps: {
        "StartHandler": {
            execute: async function (state) { 
                state.executeCalled = true; 
                return { transitionTo: "EndHandler" };
            }
        },
        "EndHandler": {
            execute: async function (state) { }
        }
    }
});
```

This game definition doesn't do anything on it's own - it's a collection of `steps`.
In this example, we have a start handler that just flags that execute has been called, and then `transitionTo`s the `EndHandler`.

## Defining a game

A game definition looks exactly like this:

```js
const gameDef = () => ({
    steps: {
        "StartHandler": { ... },
        "EndHandler": { ... }
    },
    context: {
      some: "object"
    }
});
```

* Steps **must** be named
* Steps **must** contain `StartHandler` and `EndHandler`
* Properties assigned to the `state` object during `handleInput` **can** be read in the `execute` function.
* `context` can be provided, and can contain anything you like to make your game work.

## Defining a handler

Here's one of the handlers from the previous example:

```js
{
    execute: async function (state, context) { 
        await waitUntil(() => state.gotInput == true, 5_000);                
        return { transitionTo: "EndHandler" }; 
    },
    handleInput: async function(state, context, input) { 
        state.gotInput = true; 
    }
}
```

This is an exhaustive example, with both an `execute` and a `handleInput` function, though only `execute` is required.

* Handlers **must** contain an `execute` function
* Handlers **can** contain a `handleInput` function
* Handlers **can** call `waitUntil(() => some-condition-here);` to pause execution while waiting for input
* `handleInput` **can** be called multiple times
* `waitUntil` can be given a `timeout` in `milliseconds`.
* `context` will be passed to the `execute` and `handleInput` functions every time they are called by the `GameStateMachine`.
* Handlers **must** return a `transitionTo` response from their `execute` function, that refers to the next `Handler`.
* Handlers **must** be `async functions`.

## How the GameStateMachine works

The `GameStateMachine` takes our `Game Definition` - comprised of `steps` and an optional `context` object, and manages which steps are executed, and when. It's always expecting a game to have a `StartHandler` and an `EndHandler` - as it uses those strings to know which game steps to start and end on.

You create a new `instance` of a Game by doing something like this:

```js
const game = new GameStateMachine({
    steps: {
        "StartHandler": { ... },
        "EndHandler": { ... }
    },
    context: {
      some: "object"
    }
});
```
Once you have a `game` object, you can call

```js
  game.run();
```
To start processing the game logic at the `StartHandler`.

Let's peak under the hook of the `GameStateMachine` to see what it's doing.

The constructor for the `GameStateMachine` takes the `steps` and the `context` and saves them inside itself.
Once that's done, the `run` function does all the hard work.

```js
async run() {
    console.log("Invoking run()", this.currentStepKey);

    this.trackMilliseconds();

    const currentStep = this.currentStep();
    const response = await currentStep.execute(this.state, this.context);

    if (this.currentStepKey == "EndHandler" && (response == null || response.complete)) {
        return; // State machine exit signal
    }

    if (response == null) {
        throw "You must return a response from your execute functions so we know where to redirect to.";
    }

    this.currentStepKey = response.transitionTo;
    this.run();
}
```

The state machine:

* Keeps track of the `currentStepKey` - this is the string that you use to define your `steps` in the `game definition`.
* Keeps track of time
* awaits the `execute` function of the `StartHandler`
* Evaluates the response

Once a response from the current handler has been received:

* If the `currentStepKey` is `EndHandler` we return, the game has concluded.
* Otherwise, we update the `currentStepKey` to be the target of the `transitionTo` response - changing the current active state of the game.
* We then call `run` again, to process the step we've just arrived at.

This flow of moving between game steps based on the outcome of the current step allows us to define games of all kinds of shapes.

The state machine contains the function `handleInput`

```js
async handleInput(input) {
    const currentStep = this.currentStep();
    if (currentStep.handleInput) {
        currentStep.handleInput(this.state, this.context, input);
    } else {
        console.log("Input received while no handler was available.");
    }
}
```
This is the glue code that we can pass input to, which will in turn find the currently active step, and forward the input onto the `handleInput` function defined in it. This means if any of our steps require user input, the input will be passed through this function.

We'll have to wire this up to our Web UI and Ably connection later.


# The GameStateMachine and our Game

Now that we understand a little about how the `GameStateMachine` can be used to define "any game", let's get specific and talk about `Depict-It`.

Inside of `/app/js/game/` there are a series of files

```
DepictIt.js
DepictIt.cards.js
DepictIt.handlers.js
DepictIt.types.js
GameStateMachine.js
```

The ones with `DepictIt` in the filename, predictably contain our game logic.

`DepictIt.js` is our entrypoint, and references all our game handlers, returning the `Game Definition` that we need to create our game.

```js
export const DepictIt = (handlerContext) => new GameStateMachine({
  steps: {
    "StartHandler": new StartHandler(),
    "DealHandler": new DealHandler(),
    "GetUserDrawingHandler": new GetUserDrawingHandler(180_000),
    "GetUserCaptionHandler": new GetUserCaptionHandler(60_000),
    "PassStacksAroundHandler": new PassStacksAroundHandler(),
    "GetUserScoresHandler": new GetUserScoresHandler(),
    "EndHandler": new EndHandler()
  },
  context: handlerContext
});
```
It's a function, because we're going to pass in our Ably connection inside the `handlerContext` parameter here, but it returns a fully created `GameStateMachine` instance for us to run in our `Vue.js` app.

You can see we have our game defined as a series of handlers in the sample above. Each of these game handlers are `imported` from the `DepictIt.handlers.js` file. The game handlers themselves are a couple of hundred lines of code long in total.

Each `Handler` has access to an `ably client` that we're going to supply as a property called `channel` in our `context` object, and our game works by having the `hosting players browser` keep track of where all the `game hands` are, sending players `p2p messages` to make the client code in their browsers prompt the players for input.

Each of these messages looks similar:

```js
context.channel.sendMessage({ 
    kind: "instruction", 
    type: "drawing-request", 
    value: lastItem.value, 
    timeout: this.waitForUsersFor 
  }, player.clientId);      
```
They each contain a `kind` of `instruction`, which will allow our clients to process these messages differently than the standard `connection` messages. And they also each have a `type` - which varies depending on the phase of the game currently playing.

The `Handlers` control which message `types` they send, but they'll always also contain a `value`.

This value, when we're in a drawing phase of the game, is going to be the `hint` the player is using to draw from, and if we're in the `captioning` phase of the game, it'll contain the `url` of the image they need to caption so our players browser can render it in the UI.

The messages can also feature an optional `timeout` value - some of our steps have a time limit on the length of time they'll wait for users to reply with a drawing or caption, so including this `timeout` in the `instruction` means we can render a timer bar on the client side.

Let's dive into a few of our steps and take a look at what they do.

### StartHandler

Generates and shuffles the various `Game Hint Cards` that it imports from `DepictIt.cards.js`

There is no user input.

### DealHandler

For every player in the collection `state.players` (that we'll need our web ui to populate), it creates an empty `game stack`, and adds a `hint` to the top of it.

There is no user input.

### GetUserDrawingHandler

For each of the `state.players`, it sends an `instruction` of type `drawing-request`, along with the hint card that's currently on the top of the `Game stack`.

Once the `Handler` has sent a message to each player with their hint, it waits until either all the players have responded, or 180 seconds has elapsed. If a player hasn't submitted a drawing in that time, a placeholder is put in their stack, and the game progresses.

The input that this handler expects is the `url` of an image stored somewhere publically accessible. We're going to use `Azure storage buckets` for this later on.

When player input is received, an `instruction` is sent to the player, prompting them to `wait`.

### GetUserCaptionHandler

For each of the `state.players`, it sends an `instruction` of type `caption-request`, along with the hint card that's currently on the top of the `Game stack`.

Once the `Handler` has sent a message to each player with their hint, it waits until either all the players have responded, or 180 seconds has elapsed. If a player hasn't submitted a drawing in that time, a placeholder is put in their stack, and the game progresses.

The input that this handler expects is the `url` of an image stored somewhere publically accessible. We're going to use `Azure storage buckets` for this later on.

When player input is received, an `instruction` is sent to the player, prompting them to `wait`.

### PassStacksAroundHandler
### GetUserScoresHandler
### EndHandler



- State Machine that executes game steps
- Collecting input using ably and async / await
  - P2P sample code passing on messages to state machine


## Designing a browser based game

We've outlined the basics of our Vue app, and the P2PClient and Server architecture we're using - but we need to put our game logic inside of this skeleton.

[Maybe a diargram here?!]



- Vue app
- Player that starts the game hosts the game
- The host starting the game triggers messages sent to the players
- The games UI responds to the last received instruction of a specific type, forwarding on that message to a state machine that keeps track of "what phase of the game are we in"


## Building our UI with Vue

- Building our UI with Vue
- Basic boilerplate
- JavaScript that goes with it


## Splitting our game phases into Vue componenets

- Vue components
  - Spliting our game phases into vue componenets

## Drawing using HTML5 Canvas

- Mouse stuff
- Finger painting
- Adjustments for scrolling / finger touching


## Capturing input from players

- Using async / await
- Extra function in handlers to gather input or timeout
- Wait on ably messages
- Host can skip steps

## Storing images into Azure Blob Storage via an Azure Function

... for when you've not got enough Azure in Your Azure for your Azure Static Web App


## Running on your machine

While this whole application runs inside a browser, to host it anywhere people can use, we need some kind of backend to keep our `Ably API key` safe. The running version of this app is hosted on `Azure Static Web Apps (preview)` and provides us a `serverless` function that we can use to implement Ably `Token Authentication`.

The short version is - we need to keep the `Ably API key` on the server side, so people can't grab it and use up your usage quota. The client side SDK knows how to request a temporary key from an API call, we just need something to host it. In the `api` directory, there's code for an `Azure Functions` API that implements this `Token Authentication` behaviour.

`Azure Static Web Apps` automatically hosts this API for us, because there are a few .json files in the right places that it's looking for and understands. To have this same experience locally, we'll need to use the `Azure Functions Core Tools`.

### Local dev pre-requirements

We'll use live-server to serve our static files and Azure functions for interactivity

```bash
npm install -g live-server
npm install -g azure-functions-core-tools
```

Set your API key for local dev:

```bash
cd api
func settings add ABLY_API_KEY Your-Ably-Api-Key
```

Running this command will encrypt your API key into the file `/api/local.settings.json`.
You don't need to check it in to source control, and even if you do, it won't be usable on another machine.

### How to run for local dev

Run the bingo app:

```bash
npx live-server --proxy=/api:http://127.0.0.1:7071/api
```

And run the APIs

```bash
cd api
npm run start
```

## Hosting on Azure

We're hosting this as a Azure Static Web Apps - and the deployment information is in [hosting.md](hosting.md).