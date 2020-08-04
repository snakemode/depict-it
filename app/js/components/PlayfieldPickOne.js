export const PlayfieldPickOne = {
  props: ['state', 'client', 'isHost'],

  methods: {
    sendVote: async function (id) {
      await this.client.logVote(id);
    },
    progressVote: async function () {
      await this.client.hostProgressedVote();
    }
  },

  computed: {
    displaySkipButtonForHost: function () {
      const previousInstruction = this.state?.instructionHistory[this.state?.instructionHistory.length - 2];
      return this.isHost && (this.state?.lastInstruction?.type == 'wait' && previousInstruction.type == "pick-one-request");
    }
  },

  template: `
    <div>

      <section v-if="state?.lastInstruction?.type == 'pick-one-request'" class="gallery">
        <h2 class="section-heading">Pick a Winner!</h2>
        <div v-for="item in state?.lastInstruction?.stack.items" class="gallery-item">
          <stack-item :item="item" v-on:click="sendVote"></stack-item>
        </div>
      </section>
            

      <div v-if="displaySkipButtonForHost">
        You are the host and can skip the scoring forwards.<br/>
        If a player drops out and the game won't move forwards, click this.
        <button v-on:click="progressVote">Move vote forwards</button>
      </div>

    </div>
    `
};
