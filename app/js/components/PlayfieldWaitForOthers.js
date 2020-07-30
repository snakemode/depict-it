export const PlayfieldWaitForOthers = {
  props: [ 'state' ],

    template: `
        <h2 v-if="state?.lastInstruction?.type == 'wait'" class="section-heading">
          Wait for other players to finish.
        </h2>
    `
};