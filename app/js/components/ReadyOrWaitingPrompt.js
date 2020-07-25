export const ReadyOrWaitingPrompt = {
    props: [ 'isHost', 'gameReady' ],

    methods: {
      emitStartGameEvent: async function() {
        this.$emit('startgame');
      }
    },
        
    template: `
    <div v-if="gameReady" class="ready-or-waiting-prompt">
        <div v-if="isHost">
            <span>Everybody ready?</span>
            <button v-on:click="emitStartGameEvent" class="form-button">Start Game</button>
        </div>

        <div v-if="!isHost">
            <span>Waiting for #name to start the game.</span>
        </div>
    </div>
`
};