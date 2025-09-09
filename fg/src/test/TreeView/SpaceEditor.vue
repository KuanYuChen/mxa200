<template>
  <!-- Header Bar內容 -->
  <v-app-bar color="white" flat class="border-b">
    <v-app-bar-nav-icon style="color: black;" @click="drawer = !drawer" /> 
    <v-app-bar-title>
      <span class="font-weight-bold text-orange">Devices</span>
      <span class="font-weight-bold text-grey-darken-3 ml-6">space 2</span>
    </v-app-bar-title>
    <v-spacer></v-spacer>
    <v-btn icon="mdi-cog-outline"></v-btn>
    <v-btn icon="mdi-view-grid-outline"></v-btn>
    <v-btn icon="mdi-format-font"></v-btn>
  </v-app-bar>

  <!-- 抽屜欄內容 -->
  <v-navigation-drawer style="width: none; min-width: 13%;" v-model="drawer" >
    <div class="pa-2">
      <!-- 搜尋框 (過濾Tree Node用) -->
      <v-text-field v-model="searchText" density="compact" variant="outlined" label="Search" prepend-inner-icon="mdi-magnify" single-line hide-details clearable />
    </div>

    <!-- Navigation Tree List -->
    <v-list style="user-select: none;" v-model:selected="selected" density="compact" color="blue" nav :opened="filteredTreeData.opened">
      <TreeviewNode v-for="node in filteredTreeData.tree" :key="node.id" :node="node" :depth="0" @select-node="handleNodeSelect" />
    </v-list>
  </v-navigation-drawer>

  <!-- 主畫面 -->
  <v-main style="padding: 0px;">
    <div class="grid-bg">
      <div class="content">
        <div class="zone-shape">
          <div class="handle top-left"></div>
          <div class="handle top-right"></div>
          <div class="handle bottom-left"></div>
          <div class="handle bottom-right"></div>
          <span class="dimension horizontal-top">13.04 ft</span>
          <span class="dimension vertical-left">12.71 ft</span>
          <span class="dimension horizontal-bottom">13.04 ft</span>
          <span class="dimension vertical-right">12.71 ft</span>
        </div>
      </div>
    </div>
  </v-main>
</template>

<script>
import TreeviewNode from './TreeviewNode.vue';

export default {
  name: 'SpaceEditor',
  components: {
    TreeviewNode,
  },
  data() {
    return {
      drawer: false,
      searchText: '',     // 過濾搜尋Tree
      selected: [],       // 存放選中項的 value (id)
      initiallyOpen: [],  // 預設展開某些群組的 id
      deviceTree: [
        { id: 'ben2', name: 'Ben 2', icon: 'mdi-domain' },
        { id: 'mercedes', name: 'Mercedes BLDG One', icon: 'mdi-domain' },
        { id: 'accm', name: 'AcceptanceIMBuilding', icon: 'mdi-domain' },
        { id: 'acp', name: 'AcceptanceMonitoring', icon: 'mdi-domain' },
        {
          id: 'acr', name: 'AcceptanceReporting', icon: 'mdi-domain', children: [
            {
              id: 'testfloor1', name: 'TestCompleteFloor1', icon: 'mdi-test-tube', children: [
                {
                  id: 'space', name: 'space', icon: 'mdi-image-area', children: [
                    { id: 'pc1', name: '40PC25020AGPC', icon: 'mdi-desktop-classic' },
                    { id: 'card1', name: 'Card 1', icon: 'mdi-credit-card-outline' },
                    { id: 'card2', name: 'Card 2', icon: 'mdi-credit-card-outline' },
                    { id: 'rack1', name: 'DeviceChangesbyRack1', icon: 'mdi-server-network' },
                    { id: 'optiplex', name: 'OPTIPLEX 745', icon: 'mdi-desktop-tower-monitor' },
                    { id: 'poweredge', name: 'POWEREDGE RACK 421', icon: 'mdi-server' },
                  ]
                }
              ]
            },
            {
              id: 'testfloor2', name: 'TestCompleteFloor2', icon: 'mdi-test-tube', children: [
                {
                  id: 'space-2', name: 'space', icon: 'mdi-image-area', children: [
                    { id: 'pc1-2', name: '40PC25020AGPC', icon: 'mdi-desktop-classic' },
                    { id: 'card1-2', name: 'Card 1', icon: 'mdi-credit-card-outline' },
                  ]
                }
              ]
            }
          ]
        },
      ],
    };
  },
  computed: {
    filteredTreeData() {
      // 如果搜尋框是空的，直接返回原始資料和預設展開狀態
      if (!this.searchText) return { tree: this.deviceTree, opened: this.initiallyOpen };

      const searchTerm = this.searchText.toLowerCase();
      // 使用 Set 來存放需要展開的父節點 ID，避免重複且效能好
      const openedNodes = new Set();

      // 遞迴過濾函式
      const filterNodes = (nodes) => {
        return nodes.reduce((acc, node) => {
          const nodeName = node.name.toLowerCase();
          let filteredChildren = [];

          // 如果有子節點，先遞迴過濾子節點
          if (node.children) filteredChildren = filterNodes(node.children);
          // 保留節點的條件：
          // 1. 節點本身匹配搜尋詞
          // 2. 或者，它有匹配的子節點
          if (nodeName.includes(searchTerm) || filteredChildren.length > 0) {
            // 如果它有子節點，代表它是個需要展開的父節點
            if (filteredChildren.length > 0) openedNodes.add(node.id);
            // 建立一個新節點（避免修改原始資料），並帶上過濾後的子節點
            acc.push({ ...node, children: filteredChildren });
          }
          return acc;
        }, []);
      };

      const filteredTree = filterNodes(this.deviceTree);

      return {
        tree: filteredTree,
        // 將 Set 轉換為陣列，傳給 v-list
        opened: Array.from(openedNodes),
      };
    },
  },
  methods: {
    handleNodeSelect(node) { console.log('Selected Node:', node.name, 'with ID:', node.id); }
  },
};
</script>

<style lang="scss" scoped>
.grid-bg {
  height: 90vh;
  background: #c0c0c0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.4) .1em, transparent .1em), linear-gradient(90deg, rgba(255, 255, 255, 0.4) .1em, transparent .1em);
  background-size: 3em 3em;
}

.content {
  padding: 30px;
  font-size: 18px;
  color: #333;
}


// ===============================================================
.zone-shape {
  position: relative;
  width: 300px;
  height: 280px;
  border: 2px solid #3498db;
  background-color: rgba(52, 152, 219, 0.1);
}

.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid #3498db;
  border-radius: 50%;
}

.handle.top-left {
  top: -6px;
  left: -6px;
}

.handle.top-right {
  top: -6px;
  right: -6px;
}

.handle.bottom-left {
  bottom: -6px;
  left: -6px;
}

.handle.bottom-right {
  bottom: -6px;
  right: -6px;
}

.dimension {
  position: absolute;
  padding: 0 5px;
  font-size: 12px;
  color: #555;
}

.horizontal-top {
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
}

.horizontal-bottom {
  bottom: -20px;
  left: 50%;
  transform: translateX(-50%);
}

.vertical-left {
  left: -50px;
  top: 50%;
  transform: translateY(-50%) rotate(-90deg);
}

.vertical-right {
  right: -50px;
  top: 50%;
  transform: translateY(-50%) rotate(90deg);
}
</style>