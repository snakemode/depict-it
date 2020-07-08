export function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export class Identity {
  constructor(friendlyName) {
    this.clientId = uuidv4();
    this.friendlyName = friendlyName;
  }
}

export class PubSubClient {
  constructor(onMessageReceivedCallback) {  
    this.connected = false;
    this.onMessageReceivedCallback = onMessageReceivedCallback;
  }

  async connect(identity, uniqueId) {
    if(this.connected) return;

    this.metadata = { uniqueId: uniqueId, ...identity };

    const ably = new Ably.Realtime.Promise({ authUrl: '/api/createTokenRequest' });
    this.channel = await ably.channels.get(`p2p-sample-${uniqueId}`, { params: { rewind: '1m' } });  

    this.channel.subscribe((message) => {
      this.onMessageReceivedCallback(message.data, this.metadata);
    });

    this.connected = true;
  }
  
  sendMessage(message, targetClientId) {
    if (!this.connected) { 
      throw "Client is not connected"; 
    }

    message.metadata = this.metadata;
    message.forClientId = targetClientId ? targetClientId : null;
    this.channel.publish({ name: "myMessageName", data: message});
  }
}