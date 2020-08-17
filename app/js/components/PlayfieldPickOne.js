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
        <h2 class="section-heading">Which card is best?</h2>
        <div v-for="item in state?.lastInstruction?.stack.items" class="gallery-item">
          <stack-item :item="item" v-on:click="sendVote"></stack-item>
        </div>
        
        <div>
          Share this: {{ state?.lastInstruction?.gif }}
        </div>
      </section>
            

      <div v-if="displaySkipButtonForHost" class="form">
        <p>You are the host and can skip the scoring forwards.</p>
        <p>If a player drops out and the game won't move forwards, click the button below.</p>
        <button v-on:click="progressVote">Move vote forwards</button>
      </div>

    </div>
    `
};
