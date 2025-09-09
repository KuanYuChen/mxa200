<template>
  <!-- 可展開的群組節點 (有子項目) -->
  <v-list-group v-if="node.child">
    <template v-slot:activator="{ props, isOpen }">
      <v-list-item v-bind="props" :value="node.id" color="#E97132"
        @click="gotoTargetPath(node.path)" @mousedown="$emit('open-navmenu', $event, node, node.value)">
        <h2 class="group-node-navigation" :style="{ 'color': isOpen ? '#E97132' : 'black', 'padding-inline-start': indentStyle }">{{ node.title }}</h2>
      </v-list-item>
    </template>

    <NavbarTree v-for="child in node.child" :key="child.id" :node="child" :depth="depth + 1"  @open-navmenu="(...args) => $emit('open-navmenu', ...args)" />
    
    <div v-if="node.value == 'Mod' || node.value == 'AssetManagement'" style="display: flex; justify-content: center; align-items: center; padding: 20px 0px;" @click="$emit('open-table', 'ADD')">
      <v-icon style="cursor: pointer;" icon="mdi-plus-circle" />
    </div>
    <div v-if="node.value == 'Organize' || node.value == 'HistoryChart'" style="display: flex; justify-content: center; align-items: center; padding: 20px 0px;" @click="$emit('open-normal', 'ADD')">
      <v-icon style="cursor: pointer;" icon="mdi-plus-circle" />
    </div>
  </v-list-group>

  <!-- 子節點 (最底層的項目) -->
  <v-list-item v-else :value="node.id" :style="{ 'background': setPageNowBgColor(node.path) }" 
    @click="gotoTargetPath(node.path)" @mousedown="$emit('open-navmenu', $event, node, node.value)" >
    <h2 :style="{ 'color': focusViewFirstPage(node.path), 'padding-inline-start': indentStyle }" :class="`${depth == 0 ? 'group' : 'leaf' }-node-navigation`">{{ node.title }}</h2>
  </v-list-item>
</template>

<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  props: {
    node: { type: Object, required: true },
    depth: { type: Number, required: true },
  },
  emits: ['open-navmenu', 'open-table', 'open-normal'],
  data() {
    return { Setup: useSetup().$state }
  },
  computed: {
    // 使用 'padding-inline-start' 來對應 Vuetify 的內部樣式。
    indentStyle() {
      const padding = 10 + this.depth * 14;
      return `${padding}px !important`;
    },
  },
  methods: {
    // 標記哪一頁為首頁 (透過編輯頁面設定)
    focusViewFirstPage(p) { return p == `/edit/${this.Setup.viewFirstPage}` ? "#8a81d3" : "black" },
    // 設定現在的路徑並更改路徑對應背景顏色
    setPageNowBgColor(p) { return p == this.$route.path ? "#d3cfcf" : "" },
    // 前往目標路徑
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

.group-node-navigation {
  font-weight: 500 !important;
  font-size: 23px;
  // 讓顏色變化有平滑過渡效果
  transition: color 0.1s ease;
  // 當滑鼠懸停在此元素上時觸發
  &:hover {
    color: #E97132 !important;
  }
}

.leaf-node-navigation {
  font-weight: normal !important;
  font-size: 21px;
  transition: color 0.1s ease;
}

/* 當滑鼠懸停在 v-list-item 上時，改變其內部 h2 標籤的顏色 */
:deep(.v-list-item:hover) {
  .group-node-navigation {
    color: #E97132 !important;
  }
  .leaf-node-navigation {
    color: #E97132 !important;
  }
}
</style>