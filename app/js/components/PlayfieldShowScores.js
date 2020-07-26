export const PlayfieldShowScores = {
  props: [ 'state', 'isHost' ],
  
  methods: {
    emitNextRoundEvent: async function() {
      this.$emit('nextround');
    }     
  },

  template: `
  <div v-if="state?.lastInstruction?.type == 'show-scores'">
    <h1>Scores</h1>
    <div v-for="player in state?.lastInstruction?.playerScores">
      {{ player.friendlyName }}: {{ player.score }}
    </div>

    <div v-if="isHost">
      <span>Next round</span>
      <button id="nextRoundButton" v-on:click="emitNextRoundEvent" class="form-button">Next Round</button>
    </div>

  </div>
  `
};