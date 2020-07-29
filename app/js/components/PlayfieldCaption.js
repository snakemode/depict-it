export const PlayfieldCaption = {
  props: [ 'state', 'client' ],

  data: function() {
    return {
      caption: "",
    }
  },
  
  methods: {      
    sendCaption: async function(evt) {
      await this.client.sendCaption(this.caption);
      this.caption = "";
    }    
  },

  template: `
      
  <section v-if="state?.lastInstruction?.type == 'caption-request'">
    <h2 class="section-heading">Caption this</h2>              
    <img class="image-frame" :src="state?.lastInstruction?.value" />
    <input type="text" name="caption" v-model="caption" class="input">            
    <button v-on:click="sendCaption" class="form-button">Send Caption</button>
  </section>

  `
};