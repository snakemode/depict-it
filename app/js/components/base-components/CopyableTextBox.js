export const CopyableTextbox = {
    props: ['value'], 

    data: function() {
      return {
        componentStyle: `
          display: flex;
          justify-content: flex-start;
        `,
        textBoxStyle: `
          width: auto;
          flex-grow: 5;
        `,
        buttonStyle: `  
          width: auto;
          flex-grow: 1;
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
      <input id="copyLinkInputBox" v-bind:style="textBoxStyle" type="text" v-bind:value="value" />
      <input v-on:click="copyLink" v-bind:style="buttonStyle" type="button" value="Copy Link">
    </div>
`
};