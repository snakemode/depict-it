export const StackItem = {
    props: ['item'],
    methods: {
      emitIdOfClickedElement: async function() {
        this.$emit('click', this.item.id);
      }
    },
    template: `    
<span v-if="item.type == 'string'"
      v-on:click="emitIdOfClickedElement"
      style="width: 150px; height: 50px;">{{ item.value }}</span>

<img  v-else      
      v-bind:src="item.value"
      v-on:click="emitIdOfClickedElement"
      style="width: 150px; height: 150px;" />
`
};