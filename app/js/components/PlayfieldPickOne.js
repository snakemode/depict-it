export const PlayfieldPickOne = {
  props: [ 'state', 'client' ],

  methods: {      
    sendVote: async function(id) {
      await this.client.scrawl.logVote(id);
    }      
  },

    template: `
    <div v-if="state?.lastInstruction?.type == 'pick-one-request'">
      <h1>Pick one!</h1>
      <div v-for="item in state?.lastInstruction?.stack.items" style="border: 1px solid black;">
        <stack-item :item="item" v-on:click="sendVote"></stack-item>
      </div>
    </div>
    `
};