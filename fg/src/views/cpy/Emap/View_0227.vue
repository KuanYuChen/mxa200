<template>
  <v-main :class="Setup.stopAnimation ? '' : 'show-animation'" style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;padding: 15px;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
        <v-layout :style="{'background': svgBGColor}">
          <v-app-bar :color="emap_headerbar['background']">
            <v-app-bar-nav-icon variant="text" @click.stop="svgNavCtrl = !svgNavCtrl"></v-app-bar-nav-icon>
            <h3 :style="{'margin': '0px 20px', 'color': emap_headerbar['color']}">{{ emap_headerbar['title'] }}</h3>
            <v-btn v-for="(button, index) in emap_headerbar['btn']" :key="index" :color="button['color']" @click="execFunc(button['func'])"><h3>{{ button['text'] }}</h3></v-btn>
            <v-spacer></v-spacer>
            <v-menu v-model="configMenu" :close-on-content-click="false">
              <template v-slot:activator="{ props }">
                <v-icon style="margin: 0px 15px 0px 0px;font-size: 40px;" v-bind="props"  icon="mdi-cog" />
              </template>
              <v-card style="border: 1px solid #c9c9c9;">
                <v-tabs v-model="tabnow" grow>
                  <v-tab :value="0"><h3>E-map資訊</h3></v-tab>
                </v-tabs>
                <v-tabs-window v-model="tabnow">
                  <v-tabs-window-item :value="0" style="width: 500px;">
                    <v-card v-if="emap_list[emapIdx]">
                      <div style="display: flex; margin: 20px 10px 0px 20px;">
                        <v-select v-model="selectGroup" :items="group_item" item-title="value" return-object variant="outlined" label="選擇群組"  hide-details/>
                      </div>
                      <div class="basemap-menu">
                        <div v-for="(item, index) in svg_nodes" :key="index">
                          <div v-if="item['groupstate']" style="display: flex; margin: 10px 0px;">
                            <h3 :style="{cursor: 'pointer', color: dragitem_list.includes(item) ? 'blue' : 'black'}" @click="focusNode(item)">{{ item.text || 'Default' }}</h3>
                          </div>
                        </div>
                      </div>
                    </v-card>
                  </v-tabs-window-item>
                </v-tabs-window>
              </v-card>
            </v-menu>
          </v-app-bar>

          <v-navigation-drawer v-model="svgNavCtrl" temporary :style="{'background': emap_navbar['background']}">
            <v-list>
              <v-list-item v-for="(nav, index) in emap_navbar['btn']" :key="index">
                <div :style="{ color: nav['color'], 'display': 'flex', 'cursor': 'pointer' }" @click="execFunc(nav['func'])">
                  <v-icon style="margin-right: 15px;">{{ nav["icon"] }}</v-icon>
                  <h3>{{ nav["text"] }}</h3>
                </div>
              </v-list-item>
            </v-list>
          </v-navigation-drawer>

          <v-main>
            <v-card class="emap-views" ref="container" elevation="0" :style="{'height': '650px', 'background': svgBGColor}">
              <v-icon v-if="svgOffset.x != 0 && svgOffset.y != 0 || svgOffset.scale != 1" style="z-index: 99999; margin: 10px;" @click="initZoom()">mdi-reload</v-icon>
              <svg class="svg-content" ref="svgContent"
                :viewBox="`${svgViewBox.x} ${svgViewBox.y} ${svgViewBox.width} ${svgViewBox.height}`"
                preserveAspectRatio="xMidYMid meet"
                width="100%" height="100%"
                @mousedown="onBackgroundMouseDown($event)"
                @wheel.prevent="onWheelZoom($event)"
                @contextmenu.prevent
              >
                <g :transform="`translate(${svgOffset.x}, ${svgOffset.y}) scale(${svgOffset.scale})`">
                  <!-- 背景圖片 -->
                  <image v-if="svgBGFile" :href="`data:image/jpeg;base64,${svgBGFile}`" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
                  <!-- 組件 Group -->
                  <g v-for="(item, index) in svg_nodes" :key="index" class="group-item">
                    <foreignObject v-if="item['groupstate']" :style="{ 'width': `${item.width}px`, 'height': `${item.height}px`, 'will-change':'transform', 'transform': 'translateZ(0)' }" :x="item.n_x" :y="item.n_y">
                      <component :is="emapComponentType(item)" v-bind="emapComponentProps(item)" />
                    </foreignObject>
                  </g>
                </g>
              </svg>
            </v-card>
          </v-main>
        </v-layout>
      </v-card>
    </div>
  </v-main>
</template>

<script>
  import ImageBox from '@/components/Emap/Box/Image.vue';
  import IconBox from '@/components/Emap/Box/Icon.vue';
  import ButtonBox from '@/components/Emap/Box/Button.vue';
  import InputBox from '@/components/Emap/Box/Input.vue';
  import TimerBox from '@/components/Emap/Box/Timer.vue';
  import MarqueeBox from '@/components/Emap/Box/Marquee.vue';
  import LinechartBox from '@/components/Emap/Box/Linechart.vue';

  import { useSetup } from '@/store/module/setup.js' // Pinia
  import { 
    getVueInfo,
    onBackgroundMouseDown, onItemsMouseDown, onMouseMove, onMouseUp, 
    onResizeMouseDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText, 
    onWheelZoom, initZoom, 
    handleKeydown 
  } from '@/views/func/emap.js'
  export default {
    components: { ImageBox, IconBox, ButtonBox, InputBox, TimerBox, MarqueeBox, LinechartBox },
    data() {
      return {
        Setup: useSetup().$state,
        // ========================= Data
        paginationID: 0, // 修改頁面 => 分頁ID
        emapIdx: -1, // Emap array ID
        emap_list: [],
        svg_nodes: [],
        emap_headerbar: {},
        emap_navbar: {},
        // ========================= 設定Menu
        configMenu: false,
        tabnow: 0,
        selectGroup: {},
        // ========================== SVG畫布操作
        componentChange: true, // 啟用/禁用修改
        svgNavCtrl: false, // svg內的navbar開關
        svgBGFile: "",
        svgBGColor: "#FFFFFF",
        svgViewBox: { x: 0, y: 0, width: 1000, height: 600 },
        // 拖拉
        dragitem_list: [], // 拖拉組件列表
        selectionBox: { x: 0, y: 0, width: 0, height: 0 }, // 框選區域
        // 右鍵菜單
        emapEditMenu: { show: false, x: 0, y: 0, target: null },
        // 畫布縮放、偏移
        svgOffset: { x: 0, y: 0, scale: 1 },
      };
    },
    watch: {
      configMenu(isOpen) {
        if (!isOpen) this.dragitem_list = []
      },
      selectGroup(val) {
        this.setGroupState(val);
      },
    },
    created() {
      this.getVueInfo(this);
      this.getEmapData();
    },
    beforeUnmount() {
      window.removeEventListener("keydown", this.handleKeydown);
      window.removeEventListener("mousemove", this.onResize);
      window.removeEventListener("mouseup", this.onResizeMouseUp);
      window.removeEventListener("mousemove", this.onMouseMove);
      window.removeEventListener("mouseup", this.onMouseUp);
    },
    mounted() {
      window.addEventListener("mousemove", (e) => this.onMouseMove(e));
      window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    },
    methods: {
      getVueInfo,
      // Drag函數
      onBackgroundMouseDown, onItemsMouseDown, onMouseMove, onMouseUp, 
      // Resize函數
      onResizeMouseDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText,
      // Zoom函數
      onWheelZoom, initZoom, 
      // 鍵盤函數
      handleKeydown, 
      // ======================================= 組件設定參數 =======================================
      // 取得組件類型
      emapComponentType(item) {
        switch (item.type) {
          case "image": return "ImageBox";
          case "icon": return "IconBox";
          case "input": return "InputBox";
          case "button": return "ButtonBox";
          case "timer": return "TimerBox";
          case "marquee": return "MarqueeBox";
          case "linechart": return "LinechartBox";
          default: return "div";
        }
      },
      // 傳遞參數、func
      emapComponentProps(item) {
        return {
          componentChange: this.componentChange,
          item,
          'dragitem': this.dragitem_list,
          onDblclick: () => this.dbclickEditText(item),
          onMousedown: (event) => this.onItemsMouseDown(event, item),
          onResizedown: (event) => this.onResizeMouseDown(event, item),
          blurEditText: () => this.blurEditText(item),
          execFunc: () => this.execFunc(item.func)
        };
      },
      // ==================================================================
      // 取得E-map資料
      getEmapData() {
        this.paginationID = this.$route.params.pathnow
        useSetup().getEmap().then((res)=>{
          this.emap_list = res["data"]["data"] ? res["data"]["data"] : []
          this.Setup.emapInterval = null;
          this.emapIdx = this.emap_list.findIndex(obj => obj.id == this.paginationID);
          this.getEmapNodeList();
        })
      },
      getEmapNodeList() {
        if (this.emapIdx != -1) {
          var emapInfo = this.emap_list[this.emapIdx]
          this.svgBGFile = emapInfo["content"]["file"]
          this.svgBGColor = emapInfo["content"]["background"]
          this.svg_nodes = emapInfo["content"]["nodes"]
          this.emap_headerbar = emapInfo["headerbar"]
          this.emap_navbar = emapInfo["navbar"]
        } else {
          // 新增Emap列表
          this.emap_list.push({
            id: this.paginationID,
            content: { image: "", background: "#FFFFFF", nodes: [] },
            headerbar: { title: "Default-Title", background: "#000000", color: "#FFFFFF", btn: [] },
            navbar: { background: "#FFFFFF", btn: [] },
          })
          this.emapIdx = this.emap_list.findIndex(obj => obj.id == this.paginationID);
          this.svgBGFile = this.emap_list[this.emapIdx]["content"]["image"];
          this.svgBGColor = this.emap_list[this.emapIdx]["content"]["background"];
          this.svg_nodes = this.emap_list[this.emapIdx]["content"]["nodes"];
          this.emap_headerbar = this.emap_list[this.emapIdx]["headerbar"];
          this.emap_navbar = this.emap_list[this.emapIdx]["navbar"];
        }
        // 新增Group列表
        var group = []
        for (let i in this.svg_nodes) {
          if (this.svg_nodes[i]['group'] != "All") group.push(this.svg_nodes[i]['group'])
        }
        this.group_item = [{ id: -1, value: "All" }, ...[...new Set(group)].map((item) => ({ id: Math.floor(Math.random() * 10000), value: item }))];
        this.selectGroup = this.group_item[0]
      },
      // 更新Emap資料
      updateEmap() {
        var save_json = []
        var remove_key = ['edit', 'groupstate'] // 更新資料時移除不要更新的 OBJ Key
        for (let i in this.emap_list) {
          var nodes = this.emap_list[i].nodes ? this.emap_list[i].nodes : []
          const filterNodes = nodes.map(node => 
            Object.keys(node).reduce((acc, key) => {
              if (!remove_key.includes(key)) acc[key] = node[key];
              return acc;
            }, {})
          );
          var info = {
            "id": this.emap_list[i].id,
            "image": this.emap_list[i].image,
            "nodes": filterNodes,
          }
          save_json.push(info)
        }
        if (save_json.length != this.emap_list.length) {
          console.log("不符合資訊")
          return
        }
        return new Promise((resolve, reject) => {
          useSetup().setEmap(save_json)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
        });
      },
      setGroupState(value) {
        for (let i in this.svg_nodes) {
          // Group All
          if (value['id'] == -1) this.svg_nodes[i]["groupstate"] = true
          else this.svg_nodes[i]["groupstate"] = this.svg_nodes[i]['group'] === value['value'] ? true : false
        }
      },
      // ======================================= 畫布內操作 =======================================
      execFunc(func) {
        const parts = func.split('-').map(s => s.trim());
        if (parts.length > 1) {
          switch (parts[0]) {
            // alert - error_錯誤資訊測試_test
            case "alert":
              var alertInfo = parts[1].split('_').map(s => s.trim());
              var alert = { state: alertInfo[0] }
              alertInfo.splice(0, 1) // 去掉Alert狀態
              alert["text"] = alertInfo.join("_")
              useSetup().showAlertDialog({ icon: alert['state'], title: alert['text'] })
              break;
            // route - /edit/1
            case "route":
              console.log(parts[1])
              this.$router.push(parts[1])
              break;
          }
        } else {
          useSetup().showAlertDialog({ icon: "warn", title: "未定義的功能" })
        }
      },
      // ======================================= 組件設定 =======================================
      // 選擇的Node
      focusNode(item) {
        this.dragitem_list = [item];
      },
    },
  };
</script>

<style lang="scss" scoped>
// 設定Menu
.basemap-menu {
  margin: 20px; 
  padding: 0px 10px 10px 10px;
  height: 50vh; 
  overflow: overlay;
}

// SVG畫布
.svg-content {
  position: absolute; 
  top: 0; 
  left: 0;
}

// Dialog Btn
.actions-btn {
  min-width:100px;
  margin: 0px 15px;
}
</style>