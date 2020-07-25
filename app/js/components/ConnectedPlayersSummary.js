export const ConnectedPlayersSummary = {
    props: [ 'state' ],
        
    template: `
    <div clas="connected-players-summary">
      <h3>Players: {{ state?.players?.length }}</h3>
      <ul class="players">
        <li class="player" v-for="user in state?.players">
          <div>
            <div class="player-icon">👩‍🦱</div>            
            <div>{{ user.friendlyName }}</div>
          </div>
        </li>
      </ul>
    </div>
`
};