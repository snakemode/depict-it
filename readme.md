# Depict-It

Depict-It is a party game for 4+ players (ideally!) where you mutate a phrase through drawings and captions, to make funny scenarios up with your friends.

You can play this online here: https://lemon-forest-095442503.azurestaticapps.net

## The rules of the game

The game is played in rounds. When the game starts, each player will be sent a caption to draw, and given 180 seconds to draw something that best describes the hint they're provided.

Once they finish drawing, they press "I'm finished!" and wait for the rest of the party to finish their drawings.
When all the drawings are complete, each player will get another players drawing to write their own caption to, just describe what you see!

Once the starting player receives their "stack", the scoring round begins, where each completed stack, and all the mutations it has gone through as players have added and described drawings is presented to all players to score. Just click on the thing that's the best!

Once all the scores have been accepted, scores are shown, and the host can start the next round.

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

## Designing a browser based game

We've outlined the basics of our Vue app, and the P2PClient and Server architecture we're using - but we need to put our game logic inside of this framework somehow.

[Maybe a diargram here?!]

- Vue app
- Player that starts the game hosts the game
- The host starting the game triggers messages sent to the players
- The games UI responds to the last received instruction of a specific type, forwarding on that message to a state machine that keeps track of "what phase of the game are we in"

## The GameStateMachine and our handlers

- State Machine that executes game steps
- Collecting input using ably and async / await
  - P2P sample code passing on messages to state machine

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