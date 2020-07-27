export const CopyableTextBox = {
    props: ['value'], 

    data: function() {
      return {
        componentStyle: `
          display: flex;
          justify-content: flex-start;
        `,
        textBoxStyle: `
        width: calc(100% - 150px);
        margin: 0;
        padding: 15px;
        border-top-left-radius: 4px;
        border-bottom-left-radius: 4px;
        font-size: 0.8em;
        white-space: nowrap;
        overflow: hidden;
        color: #666;
        text-overflow: ellipsis;
        background-color: white;
        `
      }
    },    
    
    methods: {
      copyLink: async function() {
        navigator.clipboard.writeText(this.value);
      }
    },

    template: `
    <div v-bind:style="componentStyle">
      <span id="copyLinkInputBox" v-bind:style="textBoxStyle">{{ value }}</span>
      <input type="button" v-on:click="copyLink" class="copy-link" value="Copy link" />
    </div>
`
};