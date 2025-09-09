<template>
  <!-- Group Node -->
  <v-list-group v-if="node.child">
    <template v-slot:activator="{ props, isOpen }">
      <v-list-item v-bind="props" :prepend-icon="node.icon" :title="node.title" :value="node.id" 
        :style="{ 'color': focusFirstPage(node.path), 'padding-inline-start': indentStyle }" :class="{ 'text-blue': isOpen }" 
        @click="gotoTargetPath(node.path)" @mousedown="$emit('open-navmenu', $event, node, node.value)" 
      />
    </template>

    <NavbarTree v-for="child in node.child" :key="child.id" :node="child" :depth="depth + 1"  @open-navmenu="(...args) => $emit('open-navmenu', ...args)" />
    
    <div v-if="node.value == 'Mod' || node.value == 'AssetManagement'" style="display: flex; justify-content: center; align-items: center; padding: 20px 0px;" @click="$emit('open-mod', 'ADD')">
      <v-icon style="cursor: pointer;" icon="mdi-plus-circle" />
    </div>
    <div v-if="node.value == 'Organize'" style="display: flex; justify-content: center; align-items: center; padding: 20px 0px;" @click="$emit('open-organize', 'ADD')">
      <v-icon style="cursor: pointer;" icon="mdi-plus-circle" />
    </div>
  </v-list-group>

  <!-- Leaf Node -->
  <v-list-item v-else :prepend-icon="node.icon" :title="node.title" :value="node.id" 
    :style="{ 'color': focusFirstPage(node.path), 'padding-inline-start': indentStyle, 'background': getFocusPageBgcolor(node.path) }" 
    @click="gotoTargetPath(node.path)" @mousedown="$emit('open-navmenu', $event, node, node.value)" 
  />
</template>

<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, required: true },
  },
  emits: ['open-navmenu', 'open-mod', 'open-organize'],
  data() {
    return { Setup: useSetup().$state }
  },
  computed: {
    // 1. 使用 'padding-inline-start' 來對應 Vuetify 的內部樣式。
    // 2. 加上 '!important' 來確保我們的樣式擁有最高優先級，從而覆蓋 Vuetify 的預設值。
    indentStyle() {
      const padding = 10 + this.depth * 14;
      return `${padding}px !important`;
    },
  },
  methods: {
    // 標記哪一頁為首頁 (透過編輯頁面設定)
    focusFirstPage(p) {
      return p == `/edit/${this.Setup.viewFirstPage}` ? "#8a81d3" : "black"
    },
    // 取得現在Focus的路徑位置並更改背景顏色
    getFocusPageBgcolor(p) {
      return p == this.$route.path ? "#d3cfcf" : ""
    },
    gotoTargetPath(p) {
      if (p == undefined) return;
      // 確保資料都更新完畢
      if (this.Setup.editCount > 0) {
        useSetup().showAlertDialog({ icon: "warn", title: "請先更新資料" });
        return;
      }
      // 當在查看預覽頁面Emap的時候要確認設為首頁的ID
      this.$router.push(p == "/view" ? `/view/${this.Setup.viewFirstPage}` : p)
    },
  }
};
</script>



<style lang="scss" scoped>
:deep(.v-list-item-title) {
  font-size: 20px !important;
  padding: 10px;
}
</style>