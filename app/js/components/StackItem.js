export const StackItem = {
  props: ['item'],
  methods: {
    emitIdOfClickedElement: async function () {
      this.$emit('click', this.item.id);
    }
  },
  template: `    
<div>
  <span v-if="item.type == 'string'"
        v-on:click="emitIdOfClickedElement"
        class="stack-item stack-text">{{ item.value }}</span>

  <img  v-else      
        v-bind:src="item.value"
        v-on:click="emitIdOfClickedElement"
        class="stack-item" />

  <div style="display:none;">
    <!-- Author names here -->
    <span v-if="item.systemGenerated">🤖 SYSTEM</span>
    <span v-else>💻 {{ item.authorName }}</span>
  </div>
</div>
`
};
