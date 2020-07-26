export const PlayfieldDrawing = {
  props: [ 'state', 'client' ],

  methods: {      
    sendImage: async function(base64EncodedImage) {
      await this.client.sendImage(base64EncodedImage);
    }     
  },

  template: `
      
  <div v-if="state?.lastInstruction?.type == 'drawing-request'">
    <h1>Drawing time!</h1>          
    <div class="drawing-hint">{{ state.lastInstruction.value }}</div>
    <drawable-canvas v-on:drawing-finished="sendImage"></drawable-canvas>
  </div>

  `
};