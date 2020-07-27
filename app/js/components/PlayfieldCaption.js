export const PlayfieldCaption = {
  props: [ 'state', 'client' ],

  data: function() {
    return {
      caption: "",
    }
  },
  
  methods: {      
    sendCaption: async function(evt) {
      await this.client.scrawl.sendCaption(this.caption);
      this.caption = "";
    }    
  },

  template: `
      
  <div v-if="state?.lastInstruction?.type == 'caption-request'">
    <h1>Caption this</h1>              
    <img class="image-frame" :src="state?.lastInstruction?.value" />
    <input type="text" name="caption" v-model="caption" class="input">            
    <button v-on:click="sendCaption" class="form-button">Send Caption</button>
  </div>

  `
};