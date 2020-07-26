export const PlayfieldWaitForOthers = {
  props: [ 'state' ],

    template: `
        <div v-if="state?.lastInstruction?.type == 'wait'">
          Wait for other players to finish.
        </div>
    `
};