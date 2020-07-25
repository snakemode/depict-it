import { LinkGenerator } from "../util.js";

export const InviteLink = {
    props: ['gameId' ],

    computed: {      
      inviteLink: function () {
        const linkGenerator = new LinkGenerator(window.location);
        return linkGenerator.linkTo({ gameId: this.gameId, join: true }); 
      },
    }, 
        
    template: `
    <div>
      <h3>Share this link to invite people to play</h3>
      <copyable-text-box :value="inviteLink"></copyable-text-box>
    </div>
`
};