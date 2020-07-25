const fakeAblyChannel = {
  published: [],
  subscribe: function(callback) { 
      this.callback = callback 
  },
  publish: function(message, targetClientId) { 
      message.metadata = this.metadata;
      message.forClientId = targetClientId ? targetClientId : null;
      this.published.push(message); 
      this.callback(message);
  }
}

class AblyStub {
  fakeAblyChannel = fakeAblyChannel;
  connection = { on: function(string) { } };
  channels = { get: function(chName) { return fakeAblyChannel; } }
}

const globalAblyObject = { Realtime: { Promise: AblyStub } };

export default function() {
    window.Ably = globalAblyObject;
}
