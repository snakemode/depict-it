export const PlayfieldPickOne = {
  props: ['state', 'client'],

  methods: {
    sendVote: async function (id) {
      await this.client.logVote(id);
    }
  },

  template: `
    <section v-if="state?.lastInstruction?.type == 'pick-one-request'" class="gallery">
      <h2 class="section-heading">Pick a Winner!</h2>
      <div v-for="item in state?.lastInstruction?.stack.items" class="gallery-item">
        <stack-item :item="item" v-on:click="sendVote"></stack-item>
      </div>
    </section>
    `
};
