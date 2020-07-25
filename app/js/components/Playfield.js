export const Playfield = {
    props: [ 'state', 'client' ],

    data: function() {
      return {
        caption: ""
      }
    },

    methods: {
      sendImage: async function(base64EncodedImage) {
        await this.client.scrawl.sendImage(base64EncodedImage);
      },
      sendCaption: async function(evt) {
        await this.client.scrawl.sendCaption(this.caption);
        this.caption = "";
      },
      sendVote: async function(id) {
        await this.client.scrawl.logVote(id);
      }      
    },
    
    template: `
    <div class="playfield">
        <div v-if="state?.lastInstruction?.type == 'wait'">
          Wait for other players to finish.
        </div>

        <div v-if="state?.lastInstruction?.type == 'show-scores'">
          <h1>Show Scores</h1>
          <div v-for="player in state?.lastInstruction?.playerScores">
            {{ player.friendlyName }}: {{ player.score }}
          </div>
        </div>

        <div v-if="state?.lastInstruction?.type == 'pick-one-request'">
          <h1>Pick one!</h1>              
          <div v-for="item in state?.lastInstruction?.stack.items" style="border: 1px solid black;">
            <stack-item :item="item" v-on:click="sendVote"></stack-item>
          </div>
        </div>
        
        <div v-if="state?.lastInstruction?.type == 'drawing-request'">
          <h1>Draw Something!</h1>          
          <h2>Hint: {{ state.lastInstruction.value }}</h2>
          <drawable-canvas v-on:drawing-finished="sendImage" />
        </div>

        <div v-if="state?.lastInstruction?.type == 'caption-request'">
          <h1>Caption this</h1>              
          <img :src="state?.lastInstruction?.value" />
          <input type="text" name="caption" v-model="caption">            
          <button v-on:click="sendCaption" class="form-button">Send Caption</button>
        </div>
    </div>
`
};