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