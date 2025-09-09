<template>
  <!-- Group Node -->
  <v-list-group v-if="node.children && node.children.length > 0">
    <template v-slot:activator="{ props, isOpen }">
      <v-list-item v-bind="props" :prepend-icon="node.icon" :title="computedTitle" :value="node.id" :style="indentStyle" :class="{ 'text-blue': isOpen }" @click="$emit('select-node', node)"></v-list-item>
    </template>

    <TreeviewNode v-for="child in node.children" :key="child.id" :node="child" :depth="depth + 1" @select-node="$emit('select-node', $event)" />
  </v-list-group>

  <!-- Leaf Node -->
  <v-list-item v-else :prepend-icon="node.icon" :title="computedTitle" :value="node.id" :style="indentStyle"
    @click="$emit('select-node', node)"></v-list-item>
</template>

<script>
export default {
  name: 'TreeviewNode',
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, required: true },
  },
  emits: ['select-node'],
  computed: {
    computedTitle() {
      return this.node.name;
    },
    indentStyle() {
      const padding = 16 + this.depth * 16;
      // 1. 使用 'padding-inline-start' 來對應 Vuetify 的內部樣式。
      // 2. 加上 '!important' 來確保我們的樣式擁有最高優先級，從而覆蓋 Vuetify 的預設值。
      return { 'padding-inline-start': `${padding}px !important` };
    },
  },
};
</script>