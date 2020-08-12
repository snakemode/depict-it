Depict-It
===========

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

## This document

If you're just interested on running this on your own machines, or on Azure, scroll all the way down to the bottom of this document.
The rest of this readme is a teardown, and an explaination of how this game hangs together.

# Contents

- [Depict-It](#depict-it)
  - [The rules of the game](#the-rules-of-the-game)
  - [This document](#this-document)
- [Contents](#contents)
  - [What are we going to build?](#what-are-we-going-to-build)
- [Our dependencies](#our-dependencies)
  - [A brief introduction to Vue.js](#a-brief-introduction-to-vuejs)
  - [Ably Channels for pub-sub](#ably-channels-for-pub-sub)
  - [Ably channels and API keys](#ably-channels-and-api-keys)
  - [Making sure we send consistent messages by wrapping our Ably client](#making-sure-we-send-consistent-messages-by-wrapping-our-ably-client)
- [The game as a web app](#the-game-as-a-web-app)
  - [HandleMessageFromAbly](#handlemessagefromably)
  - [P2PClient](#p2pclient)
  - [P2PServer](#p2pserver)
- [Designing our game](#designing-our-game)
  - [The GameStateMachine](#the-gamestatemachine)
    - [Defining a game](#defining-a-game)
    - [Defining a handler](#defining-a-handler)
  - [How the GameStateMachine works](#how-the-gamestatemachine-works)
  - [The GameStateMachine and our game](#the-gamestatemachine-and-our-game)
    - [StartHandler](#starthandler)
    - [DealHandler](#dealhandler)
    - [GetUserDrawingHandler](#getuserdrawinghandler)
    - [GetUserCaptionHandler](#getusercaptionhandler)
    - [PassStacksAroundHandler](#passstacksaroundhandler)
    - [GetUserScoresHandler](#getuserscoreshandler)
    - [EndHandler](#endhandler)
  - [Handlers and async / await](#handlers-and-async--await)
- [The game UI](#the-game-ui)
  - [Building our UI with Vue](#building-our-ui-with-vue)
  - [Inside P2PServer](#inside-p2pserver)
  - [Inside P2PClient](#inside-p2pclient)
  - [Splitting our game phases into Vue componenets](#splitting-our-game-phases-into-vue-componenets)
  - [The DepictIt Client](#the-depictit-client)
  - [Storing images into Azure Blob Storage via an Azure Function](#storing-images-into-azure-blob-storage-via-an-azure-function)
  - [Drawing using HTML5 Canvas](#drawing-using-html5-canvas)
    - [How does the snake canvas work](#how-does-the-snake-canvas-work)
    - [Touch support](#touch-support)
- [Recap](#recap)
- [Running on your machine](#running-on-your-machine)
  - [Local dev pre-requirements](#local-dev-pre-requirements)
  - [How to run for local dev](#how-to-run-for-local-dev)
- [Hosting on Azure](#hosting-on-azure)

## What are we going to build?

We're going to build `Depict-It` as a browser game.

To do this, we're going to create a `web application` using `Vue.js`, some code derived from this [Ably Peer to Peer sample](https://github.com/thisisjofrank/p2p-demo-ably) and `ably` to send messages between our players.

We'll be hosting the application on `Azure Static Web Applications` and we'll use `Azure Blob Storage` to store user generated content.

# Our dependencies

We're going to be working with `Vue.js` and `Ably`.

## A brief introduction to Vue.js

> Vue (pronounced /vjuː/, like view) is a progressive framework for building user interfaces. It is designed from the ground up to be incrementally adoptable, and can easily scale between a library and a framework depending on different use cases. It consists of an approachable core library that focuses on the view layer only, and an ecosystem of supporting libraries that helps you tackle complexity in large Single-Page Applications. 
> <cite>-- [vue.js Github repo](https://github.com/vuejs/vue)</cite>

[Vue.js](https://vuejs.org/) is a single page app framework, and we will use it to build the UI of our app. Our Vue code lives in [index.js](index.js) - and handles all of the user interactions. We're using Vue because it doesn't require a toolchain and it provides simple binding syntax for updating the UI when data changes.

A Vue app looks a little like this abridged sample:

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

# The game as a web app

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

## HandleMessageFromAbly

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

Then, it sends a `game-state` message, with a copy of the latest `this.state` object, that will in turn trigger all the clients to update their internal state.

There's a little more that happens in our server class (you might notice the currently commented `stateMachine` line) but let's talk about how our game logic works first. We'll revisit expanded versions of `P2PClient` and `P2PServer` later in this article.

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

| Phase                                   | Message kind            | Example                                                                                  |
| --------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------- |
| Dealing and setup                       | No messages             |                                                                                          |
| Collecting image input                  | `drawing-request`       | { kind: "instruction", type: "drawing-request", value: lastItem.value, timeout: 30_000 } |
| Collecting image input response         | `drawing-response`      | { kind: "drawing-response", imageUrl: "http://some/url" }                                |
| Collecting caption input                | `caption-request`       | { kind: "instruction", type: "caption-request", value: lastItem.value, timeout: 30_000 } |
| Collecting caption input response       | `caption-response`      | { kind: "caption-response", caption: "a funny caption" }                                 |
| Collecting scores from players input    | `pick-one-request`      | { kind: "instruction", type: "pick-one-request", stack: stack }                          |
| Collecting scores from players response | `pick-one-response`     | { kind: "pick-one-response", id: "stack-item-id" }                                       |
|                                         | `skip-scoring-forwards` | { kind: "skip-scoring-forwards" }                                                        |
| Displaying scores                       | `show-scores`           | { kind: "instruction", type: "show-scores", playerScores: state.players }                |
|                                         | `wait`                  | { kind: "instruction", type: "wait" }                                                    |

Each of these messages will be sent through our `PubSubClient` class, that'll add some identifying information (the id of the player that sent each message) into the message body for us to filter by in our code.

As our game runs, and sends these messages to each individual client, it can collect their responses and move the `game state` forwards.

Luckily, there isn't very much logic in the game, it has to:

- Ensure when a player sends a response to a request, it's placed on the correct `game stack` of items
- Keep track of scores when players vote on items
- Keep track of which stack each player is currently holding

We need to make sure we write code for each of our game phases to send these `p2p messages` at the right time, and then build a web UI that responds to the last message received to add our gameplay experience.

There's a pattern in software called a `State Machine` - a way to model a system that can exist in one of several known states, and we're going to build a `State Machine` to run our game logic.

## The GameStateMachine

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

### Defining a game

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

### Defining a handler

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


## The GameStateMachine and our game

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

**On execute**

* Creates hint deck imported from  `DepictIt.cards.js`
* Shuffles deck
* Transitions to `DealHandler`

**On handleInput**

* There is no user input.

### DealHandler

**On execute**

* Creates `Game Stack` for every player in `state.players`
* Adds hint to the top of the `Game Stack`
* Transitions to `GetUserDrawingHandler`

**On handleInput**

* There is no user input.

### GetUserDrawingHandler

**On execute**

* Sends `drawing-request` for every player in `state.players`
* Request contains `hint` from the top of that players `Game Stack`
* Waits for players to respond, or 180 seconds have elapsed
* Adds placeholder images to `Game Stack` if players do not respond.
* Transitions to `PassStacksAroundHandler`


**On handleInput**

* Handler expects a `url` property in player response message.
* `url` points to image stored somewhere publically accessible. 
* We're going to use `Azure storage buckets` for this later on.
* When player input is received, an `instruction` is sent to the player, prompting them to `wait`.

### GetUserCaptionHandler

**On execute**

* Sends `caption-request` for every player in `state.players`
* Request contains `url` from the top of that players `Game Stack`
* Waits for players to respond, or 60 seconds have elapsed
* Adds "Answer not submitted" to `Game Stack` if players do not respond.
* Transitions to `PassStacksAroundHandler`


**On handleInput**

* Handler expects a `caption` property in player response message.
* When player input is received, an `instruction` is sent to the player, prompting them to `wait`.

### PassStacksAroundHandler

**On execute**

* Moves the `Game Stacks` forward to the next player that is required to contribute
* If the `Game Stacks` have been moved to their original owner, transitions to `GetUserScoresHandler`
* Otherwise, picks either `GetUserDrawingHandler` or `GetUserCaptionHandler`
* Picks `GetUserDrawingHandler` when the top item in the `Game Stack` is a `Caption`
* Picks `GetUserCaptionHandler` when the top item in the `Game Stack` is a `Drawing`

### GetUserScoresHandler

**On execute**

* Sends a `pick-one-request` for each `Game Stack`
* Waits for all users to submit a score for that specific `Game Stack`
* Sends the next `pick-one-request` until all `Game Stacks` have been scored.

**On handleInput**

* Assigns a vote to the author of each picked `Game Stack Item`
* Also handles admin input to progress the game forward and skip the user scoring, to prevent games hanging.

### EndHandler

**On execute**

* Sends a `show-scores` message with the final scores of the `Game round`

## Handlers and async / await

The interesting thing about these handlers, is we're using `async/await` and an `unresolved Promise` to pause the execution while we wait for user input.
This is a fun trick, allowing us to represent our game's control flow `linearly` while waiting for messages to arrive over our `p2p channel`.

Lets take a look at our `GetUserDrawingHandler` as an example of this.

First we setup our execute method, creating an instance variable `submitted` (scoped to `this`). 
We know that when the number of `submitted` drawings, is equal to the total number of `players`, every player has sent an image.

```js
async execute(state, context) {
    this.submitted = 0;
    ...
```

Next, we send an `instruction` to each player, in this case a `drawing-request`

```js
    for (let player of state.players) {
        ...
        context.channel.sendMessage({ kind: "instruction", type: "drawing-request", ...);
    }
```
Then we begin waiting for responses.
We use the syntax `await waitUntil(() => some condition)` here to do this.

```js
    const result = { transitionTo: "PassStacksAroundHandler" };

    try {
        await waitUntil(() => this.submitted == state.players.length, this.waitForUsersFor);
    }
    catch (exception) {
        result.error = true;
        ... /* error handling */
    }

    return result;
}
```

What this does, is create an `unresolved Promise` that in the background is `polling` and executing the `function` passed to it.
This function can contain anything, and when it returns `true`, we continue our execution as the `Promise` will resolve.

While our code is `paused` here `awaiting` the unresolved `Promise`, further user input can be provided by calling `handleInput` from our `Ably client callback`.

```js
async handleInput(state, context, message) {
    if (message.kind == "drawing-response") {
        const stackItem = new StackItem("image", message.imageUrl);
        const stack = state.stacks.filter(s => s.heldBy == message.metadata.clientId)[0];

        stack.add({ ...stackItem, author: message.metadata.clientId, id: createId() });
        context.channel.sendMessage({ kind: "instruction", type: "wait" }, message.metadata.clientId);

        this.submitted++;
    }
}
```

You'll notice the code here increments `this.submitted` - each time our `waitUntil` condition runs, it's checking what the current value of `this.submitted` is, and when `this.submitted` finally reaches the target `state.players.length`.

Our `waitUntil` call, also takes a timeout value - in this example it's the `instance variable` `this.waitForUsersFor` which is prvoided in our constructor. If our `callback condition` hasn't been reached by the time we reach this `timeout` value, the `Promise` will be rejected, and an `exception` will be thrown.

In the real handler, we have some code there to make sure that each of our `Game Stacks` is in a valid state.

Each of the handlers that require user input follows this pattern.


# The game UI

We've outlined the basics of our Vue app, and the P2PClient, and the way out GameStateMachine works to orchestrate our game, but we need to tie all these pieces together into a web application.

We're going to build

- A Vue app, split out into `Vue Components`
- Each `Vue component` will respond to a specific `Game State Instruction` message.
- There will be additional code in the `Vue app` for creating and joining games.
- We'll need to build UI componenets for drawing on the screen with a mouse, and fingers on touch screen devices.
- We need to wire up the `Game State Machine` and have the Vue app forward on messages it receives from `Ably` so our `Game Handlers` can respond to events.
- We need to hook up some server side functionality to save user created `Images`.

## Building our UI with Vue

Our Vue UI markup is deceptively simple at the top level, because we're going to make `Vue Components` for all of our game phases.

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8" />
  <title>Depict-it</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="//cdn.ably.io/lib/ably-1.js" defer></script>
  <script src="//cdn.jsdelivr.net/npm/vue/dist/vue.js"></script>

  <script src="/index.js" type="module"></script>
  <link href="https://fonts.googleapis.com/css2?family=Sora&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css" />
</head>
```

First we're defining our head, which references the `Ably` JavaScript SDK, along with the `Vue` library from the `Vue CDN`.
We're also referencing our `Index.js` file as a `module` - this means we can use native browser `import` and `export` module syntax.
We finally reference our `style.css` stylesheet for our UI.

```html
<body>
  <main id="app">
    <div class="debug">
      {{ state?.status == undefined ? "disconnected" : state?.status }}
    </div>
```

We're going to quickly add a `debug` element to help us keep track of our `Ably` connection, and then define the majority of the Game UI.

```html
    <h1 v-bind:class="{ hide: state?.lastInstruction?.type == 'drawing-request'}">Depict-it</h1>

    <div v-if="!joinedOrHosting" class="join-container">
      <create-game-form v-on:create="host" v-on:join="join"></create-game-form>
    </div>
```
We have a `CreateGameForm` that we're importing from `/app/js/components/CreateGameForm.js` for when a game hasn't been started or joined.
And then the `activeGame` portion of the application that contains the components that trigger when the game is running.

This is split into two parts - first the `game-lobby`...

```html
    <div v-else id="activeGame" class="game-info">
      <div class="game-lobby" v-if="gameCanBeStarted">
        <invite-link :game-id="gameId"></invite-link>
        <connected-players-summary :state="transmittedServerState"></connected-players-summary>
        <ready-or-waiting-prompt :is-host="isHost" :state="transmittedServerState" v-on:startgame="startGame">
        </ready-or-waiting-prompt>
      </div>
      <div v-if="!gameCanBeStarted && !state?.lastInstruction">
        <loader></loader>
      </div>
```
The game lobby references components to render our invite links, connected players and any player prompts.

Next we have a timer bar component that binds to any `timeouts` sent from the `host`

```html
      <timer-bar v-if="state?.lastInstruction?.timeout != null" :countdown="state?.lastInstruction?.timeout">
      </timer-bar>
```

And finally the markup components for the different `instructions` sent from the `host`. You'll spot familiar names here as they line up with the various `Handlers` we defined earlier - one component per game phase.

```html
      <div v-if="state?.lastInstruction" class="playfield">
        <playfield-wait-for-others :state="state"></playfield-wait-for-others>

        <playfield-drawing :state="state" :client="depictItClient"></playfield-drawing>
        <playfield-caption :state="state" :client="depictItClient"></playfield-caption>
        <playfield-pick-one :state="state" :client="depictItClient" :is-host="isHost"></playfield-pick-one>

        <playfield-show-scores :state="state" :is-host="isHost" v-on:nextround="nextRound"></playfield-show-scores>
      </div>
    </div>
  </main>
</body>

</html>
```

Throughout all this markup we're using the `Vue` syntax `:state=` and `:is-host` - these `attributes` are `Vue bindings` that pass values from our main `Vue app` down to the `Vue compnents` so the components can use them. Likewise the `v-on:` event handlers bind functions in our `Vue` app to `events` that our components can raise.

We touched on the layout of our `index.js` file briefly at the start of this piece - but let's take a look at it here in full.

```js
export var app = new Vue({
  el: '#app',
  data: {
    p2pClient: null,
    p2pServer: null,

    gameId: null,
    friendlyName: null,
  },
```

First we're defining our data properties - `Vue` will make these properties `observable` so we can bind them to our UI.
Whenever anything changes in these properties, our `UI` will update.

Next we're defining some computed properties to make our HTML binding code more succinct.

```js
  computed: {
    state: function () { return this.p2pClient?.state; },
    transmittedServerState: function () { return this.p2pClient?.serverState; },
    joinedOrHosting: function () { return this.p2pClient != null || this.p2pServer != null; },
    isHost: function () { return this.p2pServer != null; },
    hasMessage: function () { return this.message != null; },
    gameCanBeStarted: function () { return this.transmittedServerState && !this.transmittedServerState.started },
    depictItClient: function () { return this.p2pClient?.depictIt; }
  },
```

These computed properties are used in our markup above - you can see where we use `depictItClient` in our HTML, that it's this computed property that it's referencing - because anything you bind to either needs to be in your `Vue data` or your `Vue computed` properties.

Finally we're going to define our `host` and `join` methods, to bind to clicks, along with `startGame` and `nextRound` equally, to bind to events emitted by our `Vue components`.

```js
  methods: {
    host: async function (context) {
      this.gameId = context.gameId;
      this.friendlyName = context.friendlyName;

      const pubSubClient = new PubSubClient((message, metadata) => {
        handleMessagefromAbly(message, metadata, this.p2pClient, this.p2pServer);
      });

      const identity = new Identity(this.friendlyName);
      this.p2pServer = new P2PServer(identity, this.gameId, pubSubClient);
      this.p2pClient = new P2PClient(identity, this.gameId, pubSubClient);

      await this.p2pServer.connect();
      await this.p2pClient.connect();
    },
    join: async function (context) {
      this.gameId = context.gameId;
      this.friendlyName = context.friendlyName;

      const pubSubClient = new PubSubClient((message, metadata) => {
        handleMessagefromAbly(message, metadata, this.p2pClient, this.p2pServer);
      });

      const identity = new Identity(this.friendlyName);
      this.p2pClient = new P2PClient(identity, this.gameId, pubSubClient);

      await this.p2pClient.connect();
    },
    startGame: async function (evt) {
      this.p2pServer?.startGame();
    },
    nextRound: async function (evt) {
      this.p2pServer?.nextRound();
    }
  }
});
```

This is the entire outline of the top level of our `Vue app`, but most of the display logic is hidden in our `Vue components`.

Remember, when a user joins or hosts a game, a `p2pclient` or `p2pserver` instance are created - and the state managed inside of them becomes observable, so we can bind any properties on these objects into our `Vue app`.

At the bottom of `Index.js` is also our `handleMessagefromAbly` function - that passes messages received over our `p2p channel` onto our `p2pServer` and `p2pClient` instances. Let's take a quick look inside those classes again to see how this all works.

## Inside P2PServer

P2PServer is really where most of the game is managed.

When the host creates a game, a new instance of `P2PServer` is created, in turn, creating an instance of the `GameStateMachine` with an empty `this.state` object.

```js
import { DepictIt } from "../game/DepictIt.js";

export class P2PServer {
  constructor(identity, uniqueId, ably) {
    this.identity = identity;
    this.uniqueId = uniqueId;
    this.ably = ably;

    this.stateMachine = DepictIt({
      channel: ably
    });

    this.state = {
      players: [],
      hostIdentity: this.identity,
      started: false
    };
  }
```
Notice that when we call the imported `DepictIt` function, we're passing a `context object` with the property `channel` set to our `ably` parameter.

By providing this channel to our `GameStateMachine` instance, we're making sure that every time one of our `Handlers` executes, it has access to this `Ably` channel, and can use it to send `p2p messages` to all the other clients.

Next we're going to define `connect` and `startGame`

```js
  async connect() {
    await this.ably.connect(this.identity, this.uniqueId);
  }

  async startGame() {
    this.state.started = true;

    this.ably.sendMessage({ kind: "game-start", serverState: this.state });
    this.stateMachine.state.players = this.state.players;
    this.stateMachine.run();
  }
```
These two functions are bound into our `Vue components`, and crucially both assign the currently connected players to the `stateMachine.state` property, and trigger `stateMachine.run();` - starting the game of DepictIt.

We'll also define `nextRound` used to progress the game - a function that calls `resetCurrentStepKeepingState` on our `stateMachine` before invoking `run` again - a function that moves the current handler back to the start without clearing player scores.

```js
  async nextRound() {
    this.stateMachine.resetCurrentStepKeepingState();
    this.stateMachine.run();
  }
```

And finally, the vitally important `onReceiveMessage` handler.

```js
  onReceiveMessage(message) {
    switch (message.kind) {
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
}  
```

You can see in this version of the handler, that we treat clients connecting as a special case - replying with `connection-acknowledged` - we use this to update our debug `connected` UI element.

Most importantly however, is that any *other* messages are passed to the `this.stateMachine.handleInput()` function.

What we're doing here is delegating responsibility for processing our messages to whichever `handler` is currently active, routed via the `GameStateMachine` instance. This is the glue that takes a message received by our `Ably connection`, and passes it through our `GameStateMachine` to the currently active `Handler`.

## Inside P2PClient

The P2PClient that gets created when anyone joins a game follows the same general pattern as the `P2PServer`.

First we have a constructor that creates some state, and a few properties that our game is gonna use - `depictIt` is going to store a client wrapper that we'll later bind into some `Vue componenets`, and the `this.state` object contains both an `instructionHistory` and `lastInstruction` for us to track all the messages this client has received from the `host`.

```js
import { DepictItClient } from "../game/DepictIt.js";

export class P2PClient {
  constructor(identity, uniqueId, ably) {
    this.identity = identity;
    this.uniqueId = uniqueId;
    this.ably = ably;

    this.depictIt = null;
    this.serverState = null;

    this.state = {
      status: "disconnected",
      instructionHistory: [],
      lastInstruction: null
    };
  }
```
Next, much like in `P2PServer` we define our `connect` function - that sends a message to the `host` and waits for `acknowledgement`.
We're also creating an instance of `DepictItClient` - this client is a class that offers a function for each response the `client` has to send back to the `host`. We'll bind this to our `Vue components` so they can reply to the `host` when they have player input.

```js
  async connect() {
    await this.ably.connect(this.identity, this.uniqueId);
    this.ably.sendMessage({ kind: "connected" });
    this.state.status = "awaiting-acknowledgement";
    this.depictIt = new DepictItClient(this.uniqueId, this.ably);
  }
```
And finally we have the `onReceiveMessage` function.

The most important piece here, is that when the `p2pclient` receives a message with the `kind` of `instruction`, it'll store a copy of it into the `instructionHistory` along with assigning the most recent message to the property `this.lastInstruction`.

```js

  onReceiveMessage(message) {
    if (message.serverState) {
      this.serverState = message.serverState;
    }

    switch (message.kind) {
      case "connection-acknowledged":
        this.state.status = "acknowledged";
        break;
      case "instruction":
        this.state.instructionHistory.push(message);
        this.state.lastInstruction = message;
        break;
      default: { };
    }
  }
}
```

Practically all of our UI is going to be bound-up to the values in the `lastInstruction` property. 
It's the most important piece of data in the entire application.

## Splitting our game phases into Vue componenets

`Vue components` let you split out parts of your functionality into what looks like tiny little `Vue apps`.
They follow practically the same syntax, but contain both the UI template and the JavaScript.

Our application is split into a bunch of smaller componenets:

```bash
base-components/CopyableTextBox.js
base-components/DrawableCanvas.js

ConnectedPlayersSummary.js
CreateGameForm.js
InviteLink.js
Loader.js
PlayfieldCaption.js
PlayfieldDrawing.js
PlayfieldPickOne.js
PlayfieldShowScores.js
PlayfieldWaitForOthers.js
ReadyOrWaitingPrompt.js
StackItem.js
TimerBar.js
```
We're following some relatively obvious conventions here - the componet name tends to have the phase of the game it's associated with in the filename!

We're going to look inside `StackItem` as an example, as it's a simple component

```js
export const StackItem = {
  props: ['item'],
  methods: {
    emitIdOfClickedElement: async function () {
      this.$emit('click', this.item.id);
    }
  },
  template: `    
<span v-if="item.type == 'string'"
      v-on:click="emitIdOfClickedElement"
      class="stack-item stack-text">{{ item.value }}</span>

<img  v-else      
      v-bind:src="item.value"
      v-on:click="emitIdOfClickedElement"
      class="stack-item" />
`
};
```
`Vue Components`
- Can Have named `props` that you can bind in `HTML` using the `:prop-name="something"` syntax
- Can Have methods
- Can have computed properties
- Have a template string.

In the example of the `StackItem`, we have a `v-if` and `v-else` statement displaying a `span` if the item is a `string` (a caption), or an `img` tag when the item is a `drawing`.

All of the components follow a similar pattern - capturing bits of interaction.

The other piece of syntax you'll see here is the `this.$emit` function call.

Doing this allows us to define custom events that can be bound in the consuming `vue component` or `vue app` - so if we emit an event, in our parent we can use the `v-on` syntax to listen and respond to it. In this case, we're creating an event called `click`, and passing the `item.id` of the selected `Stack Item` to whatever subscribes to our event.

It would be exhausting to walk through the code of each `Vue Component` but lets take a look at the `PlayfieldDrawing` component to see how we handle sending data back from the server.

```js
export const PlayfieldDrawing = {
  props: ['state', 'client'],

  methods: {
    sendImage: async function (base64EncodedImage) {
      await this.client.sendImage(base64EncodedImage);
    }
  },

  template: `      
  <section v-if="state?.lastInstruction?.type == 'drawing-request'">
    <div class="drawing-hint">
      <div class="hint-front">Draw This</div>
      <div class="hint-back">
        {{ state.lastInstruction.value }}
      </div>
    </div>
    <drawable-canvas v-on:drawing-finished="sendImage"></drawable-canvas>
  </section>
  `
};
```
This `Vue component` is typical of the others that require interactivity. Remember when we walked through `P2PClient` and we created an instance of `DepictItClient` - well we've bound that client into the `vue component` here as the property `client`. What this means, is that when our `sendImage` function is triggered by the `DrawableCanvas` raising the `drawing-finished` event, we can use that client to send an image back to our `host`.

This general pattern holds for collecting captions, and scoring our game.

## The DepictIt Client

Our `DepictIt Client` is a small wrapper class around all of our components interactions with the `host`.
This client is responsible for sending data and little else.

All those messages that are expected? They're all defined here.

```js
export class DepictItClient {
  constructor(gameId, channel) {
    this.gameId = gameId;
    this.channel = channel;
  }

  async sendImage(base64EncodedImage) {
    ...
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
```
There is one extra interesting function in here though - and that's `sendImage`.

```js
  async sendImage(base64EncodedImage) {
    const result = await fetch("/api/storeImage", {
      method: "POST",
      body: JSON.stringify({ gameId: this.gameId, imageData: base64EncodedImage })
    });

    const savedUrl = await result.json();
    this.channel.sendMessage({ kind: "drawing-response", imageUrl: savedUrl.url });
  }
```

`sendImage` has to POST the `base64EncodedImage` that's created by our `DrawableCanvas` component to an `API` running on our instance of `Azure Functions`, before it sends a message back to the `host`.


## Storing images into Azure Blob Storage via an Azure Function

To make our images work work, we've added an extra function to the directory `/api/storeImage/index.js`

```js
const { StorageSharedKeyCredential } = require("@azure/storage-blob");
const { BlobServiceClient } = require("@azure/storage-blob");
    
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}  

module.exports = async function (context, req) {
    
    const defaultAzureCredential = new StorageSharedKeyCredential(process.env.AZURE_ACCOUNT, process.env.AZURE_KEY);
    const blobServiceClient = new BlobServiceClient(process.env.AZURE_BLOBSTORAGE, defaultAzureCredential);
    const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_CONTAINERNAME);

    const unique = `game_${req.body.gameId}_${uuidv4()}.png`;
    const url = `${process.env.AZURE_BLOBSTORAGE}/${process.env.AZURE_CONTAINERNAME}/${unique}`;
    const fileData = req.body.imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = new Buffer(fileData, 'base64');

    const blockBlobClient = containerClient.getBlockBlobClient(unique);
    const uploadBlobResponse = await blockBlobClient.upload(buffer, buffer.length || 0);

    context.res = { 
        headers: { "content-type": "application/json" },
        body: { url: url }
    };    
};
```

This is pretty boiler-plate-ey, but it's the standard `Azure Blob Storage SDK` code to upload a file to a storage bucket.
This `Azure function` is mounted by the `Azure functions runtime` to the path `/api/storeImage` so we can call it using our browsers `Fetch API`.

The function returns an `absolute url` of the stored image - which is stored in a bucket that supports `unauthenticated reads`.
The bucket is also configured to auto-delete items after 24-hours to keep our storage costs really low.

This is a super quick way to add a little bit of statefulness to our app - especially because the average size of our images is over the message size cap for `Ably messages`.

## Drawing using HTML5 Canvas

We have a `Vue component` that we use to handle drawing with a mouse, or "finger painting" on touch devices.

```js
export const DrawableCanvas = {
  ...

  mounted: function () {
    const element = document.getElementById(this.canvasId);
    if (element && !this.canvas) {
      this.canvas = new DrawableCanvasElement(this.canvasId).registerPaletteElements(this.paletteId);
    }
  },

  ...

  template: `
  <div class="drawable-canvas">
    <div class="canvas-and-paints">
      <canvas v-bind:id="canvasId" class="image-frame paint-canvas" width="400" height="400"></canvas>  
      <div v-bind:id="paletteId" class="palette">
        <div style="background-color: black;" v-on:click="colorSelected"></div>
        <div style="background-color: red;" v-on:click="colorSelected"></div>
        <div style="background-color: green;" v-on:click="colorSelected"></div>
        <div style="background-color: blue;" v-on:click="colorSelected"></div>
        <div style="background-color: white;" v-on:click="eraserSelected"></div>
      </div>
    </div>
    <button v-on:click="$emit('drawing-finished', canvas.toString())" class="form-button finished-drawing">I'm finished!</button>
  </div>`
};
```

There are two important things about this `component`
- We use the class `DrawableCanvasElement` from the npm package [`@snakemode/snake-canvas`](https://github.com/snakemode/snake-canvas) (This package was built while writing this game)
- We emit an event called `drawing-finished` when the user clicks the `I'm finished` button in the template.

This event is listened to in the consuming `Vue component` - in this case the `PlayfieldDrawing` component that deals with the drawing phase of the game.

As an event, we pass the result of the function call `canvas.toString()` - this is a thin wrapper around the native browser call to convert a HTML Canvas element to a base64 encoded PNG. The consuming component then uses this to upload images to our `Azure Blob Storage` account.

### How does the snake canvas work

There's not too much too the snake-canvas - it takes an element Id (that it presumes is of a HTML Canvas Element), and adds some click handlers on mouse up/down/move. Whenever the mouse is moved, a line between the last position and the current one is drawn, and a 1px blur applied to smooth out the aliasing in the image.

You might notice that we're also calling the function `registerPaletteElements` - this adds a click handler to each child element of the passed in element Id, so that when you click on any of them, the active colour is set to the background colour of that element.

This means we can add and remove colours to our drawable canvas at will.

### Touch support

The canvas also has touch support - we have to do a little bit of maths to make sure we're using the correct x and y coordinates in our canvas to support both mouse and touch. Multi-touch isn't supported.

```js    
getLocationFrom(e) {
  const location = { x: 0, y: 0 };

  if (e.constructor.name === "TouchEvent") {
      const bounds = e.target.getBoundingClientRect();
      const touch = e.targetTouches[0];

      location.x = touch.clientX - bounds.left;
      location.y = touch.clientY - bounds.top;
  } else {
      location.x = e.offsetX;
      location.y = e.offsetY;
  }

  return location;
}
```
This function is used to work out where we're drawing on our canvas - using either our mouse position, or the position of the first touch event.


# Recap

We've spoken at length about how the core pieces of this game hangs together.

If you want a deeper understanding, the code is all here, and you can run it locally by pulling this repo, and executing npm run start, once you've added API keys for Ably, and Azure Blob Storage into the `/api/local.settings.json` file.


# Running on your machine

While this whole application runs inside a browser, to host it anywhere people can use, we need some kind of backend to keep our `Ably API key` safe. The running version of this app is hosted on `Azure Static Web Apps (preview)` and provides us a `serverless` function that we can use to implement Ably `Token Authentication`.

The short version is - we need to keep the `Ably API key` on the server side, so people can't grab it and use up your usage quota. The client side SDK knows how to request a temporary key from an API call, we just need something to host it. In the `api` directory, there's code for an `Azure Functions` API that implements this `Token Authentication` behaviour.

`Azure Static Web Apps` automatically hosts this API for us, because there are a few .json files in the right places that it's looking for and understands. To have this same experience locally, we'll need to use the `Azure Functions Core Tools`.

## Local dev pre-requirements

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

Next you'll need to [Create an Azure Blob Storage Account](https://azure.microsoft.com/en-gb/services/storage/blobs/?&OCID=AID2100128_SEM_XqK-bwAAAfw50RTJ:20200812092318:s&msclkid=3cef80961050146d866fdfa5a5531dc2&ef_id=XqK-bwAAAfw50RTJ:20200812092318:s&dclid=CLKMy-irlesCFTwWBgAdZdYGKA), create a container, and a storage bucket, and generate an API key.

Please refer to the Azure docs for this. Once you know all your Azure configuration, you can either edit your `local.settings.json` file by hand, or add to it using the `func` command as above. You'll need to add the following keys:

```bash
AZURE_ACCOUNT
AZURE_CONTAINERNAME
AZURE_BLOBSTORAGE
AZURE_KEY
```

An example, unencrypted, settings file looks like this:

```js
{
  "IsEncrypted": false,
  "Values": {
    "ABLY_API_KEY": "ably-api-key-here",
    "AZURE_ACCOUNT": "scrawlimages",
    "AZURE_CONTAINERNAME": "gameimages",
    "AZURE_BLOBSTORAGE": "https://scrawlimages.blob.core.windows.net",
    "AZURE_KEY": "some-azure-access-token-from-the-storage-account",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  },
  "ConnectionStrings": {}
}
```

## How to run for local dev

Run the bingo app:

```bash
npx live-server --proxy=/api:http://127.0.0.1:7071/api
```

And run the APIs

```bash
cd api
npm run start
```

# Hosting on Azure

We're hosting this as a Azure Static Web Apps - and the deployment information is in [hosting.md](hosting.md).