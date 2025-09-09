<template>
  <v-main :class="Setup.stopAnimation ? '' : 'show-animation'" style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 0px;">
        <v-layout>
          <v-app-bar :color="emap_headerbar['background']">
            <v-app-bar-nav-icon variant="text" :color="emap_headerbar['color']" icon="mdi-menu-down" @click.stop="svgNavCtrl = !svgNavCtrl"></v-app-bar-nav-icon>
            <h3 :style="{'margin': '0px 20px', 'color': emap_headerbar['color'], 'user-select': 'none'}">{{ emap_headerbar['title'] }}</h3>
            <div v-if="$vuetify.display.mdAndUp">
              <v-btn v-for="(button, index) in emap_headerbar['btn']" :key="index" :color="button['color']" @click="execFunc(button)"><h3>{{ button['text'] }}</h3></v-btn>
            </div>
            <div v-else>
              <v-menu>
                <template v-slot:activator="{ props }">
                  <v-btn v-bind="props" :color="emap_headerbar['color']" icon="mdi-dots-vertical" />
                </template>
                <v-btn v-for="(button, index) in emap_headerbar['btn']" :key="index" :color="button['color']" @click="execFunc(button)"><h3>{{ button['text'] }}</h3></v-btn>
              </v-menu>
            </div>
            <v-spacer></v-spacer>
            <!-- <h3 :style="{'margin-right': '10px', 'color': emap_headerbar['color'], 'user-select': 'none'}">{{ svgViewBox['width'] }} / {{ svgViewBox['height'] }}</h3> -->
          </v-app-bar>

          <v-navigation-drawer v-model="svgNavCtrl" temporary :style="{'background': emap_navbar['background']}">
            <v-list>
              <v-list-item v-for="(nav, index) in emap_navbar['btn']" :key="index">
                <div :style="{ color: nav['color'], 'display': 'flex', 'cursor': 'pointer', 'user-select': 'none' }" @click="execFunc(nav)">
                  <!-- <v-icon style="margin-right: 15px;">{{ nav["icon"] }}</v-icon> -->
                  <h3 style="margin-left: 15px;white-space: nowrap;">{{ nav["text"] }}</h3>
                </div>
              </v-list-item>
            </v-list>
          </v-navigation-drawer>

          <v-main style="line-height: 0;">
            <ModuleTable v-if="routeType == 'mod'" :tableInfo="moduleTable" />
            <v-card v-else class="emap-views" elevation="0" :style="{'height': '85vh', 'background': svgBG['color']}">
              <v-icon v-show="svgOffset.x != 0 && svgOffset.y != 0 || svgOffset.scale != 1" style="position: absolute;z-index: 99999; margin: 10px;" @click="initZoom()">mdi-reload</v-icon>
              <div style="width: 100%; height: 100%; overflow: auto;">
                <svg class="svg-content" ref="svgContent"
                  :viewBox="`${svgViewBox.x} ${svgViewBox.y} ${initViewBox.width} ${initViewBox.height}`"
                  preserveAspectRatio="xMidYMid meet"
                  :width="initViewBox.width" :height="initViewBox.height" 
                  @mousedown.stop="handleBackgroundMouseDown($event)"
                  @wheel="onWheelZoom($event)"
                  @contextmenu.prevent
                >
                  <g :transform="`translate(${svgOffset.x}, ${svgOffset.y}) scale(${svgOffset.scale})`">
                    <!-- 背景圖片 -->
                    <image v-if="svgBG['image']" :style="{ opacity: svgBG['imageopacity'] }" 
                      :href="bgImageURL" width="100%" height="100%" 
                      preserveAspectRatio="none"
                    />
                    <!-- SVG組件 (舊方法，會導致按鈕組件陰影錯誤) -->
                    <!-- <g v-for="(item, index) in svg_nodes" :key="index" class="group-item">
                      <template v-if="item.type === 'Group'">
                        <rect
                          :x="item.n_x" :y="item.n_y"
                          :width="item.width" :height="item.height"
                          :fill="componentChange ? 'none' : 'rgba(255, 255, 255, 0.1)'"
                          :stroke="componentChange ? 'none' : selectcomponent_list.includes(item) ? 'blue' : 'red'"
                          stroke-dasharray="5,5"
                        />
                        <foreignObject v-for="(node, idx) in item.nodes" :key="idx" :x="node.n_x" :y="node.n_y" :width="node.width" :height="node.height">
                          <div v-show="node['showComponent']" :style="getItemStyle(node)">
                            <component :is="emapComponentType(node)" v-bind="emapComponentProps(node, 'Group')" />
                          </div>
                        </foreignObject>
                      </template>
                      <template v-else>
                        <foreignObject v-show="item['showComponent']" :x="item.n_x" :y="item.n_y" :width="item.width" :height="item.height">
                          <div :style="getItemStyle(item)">
                            <component :is="emapComponentType(item)" v-bind="emapComponentProps(item, 'Component')" />
                          </div>
                        </foreignObject>
                      </template>
                    </g> -->
                  </g>
                </svg>
                <!-- html組件 -->
                <div v-for="(item, index) in svg_nodes" :key="item.id" class="group-item">
                  <template v-if="item.type === 'Group'">
                    <div v-for="(node, idx) in item.nodes" :key="node.id" :style="{position: 'absolute', left: `${node.n_x}px`, top: `${node.n_y}px`}" :width="node.width" :height="node.height">
                      <div v-show="node['showComponent']" :style="getItemStyle(node)">
                        <component :is="emapComponentType(node)" v-bind="emapComponentProps(node, 'Group')" />
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-show="item['showComponent']" :style="{position: 'absolute', left: `${item.n_x}px`, top: `${item.n_y}px`}" :width="item.width" :height="item.height">
                      <div :style="getItemStyle(item)" @dblclick="dbclickEditText(item)" @mousedown.stop="handleItemsMouseDown($event, item, 'Component')">
                        <component :is="emapComponentType(item)" v-bind="emapComponentProps(item, 'Component')" />
                      </div>
                    </div>
                  </template>
                </div>
              </div>
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
  import TextBox from '@/components/Emap/Box/Text.vue';
  import ButtonBox from '@/components/Emap/Box/Button.vue';
  import InputBox from '@/components/Emap/Box/Input.vue';
  import TimerBox from '@/components/Emap/Box/Timer.vue';
  import MarqueeBox from '@/components/Emap/Box/Marquee.vue';
  import LinechartBox from '@/components/Emap/Box/Linechart.vue';
  import Devtable from '@/components/Emap/Box/Devtable.vue';
  import Monitor from '@/components/Emap/Box/Monitor.vue';

  import ModuleTable from "@/components/Module/Table.vue"

  import { useSetup } from '@/store/module/setup.js' // Pinia
  import { 
    initVueInfo,
    handleBackgroundMouseDown, handleItemsMouseDown, onMouseMove, onMouseUp, 
    handleResizeWindow, handleItemsResizeDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText, 
    onWheelZoom, initZoom, 
  } from '@/views/Emap/emap.js'
  export default {
    components: { ImageBox, IconBox, TextBox, ButtonBox, InputBox, TimerBox, MarqueeBox, LinechartBox, Devtable, ModuleTable, Monitor },
    data() {
      return {
        Setup: useSetup().$state,
        routeType: "",
        moduleTable: "",
        // ========================= Data
        paginationID: 0, // 修改頁面 => 分頁ID
        emapInfo: {},
        // SVG 背景參數
        svgBG: { image: "", color: "#FFFFFF", imageopacity: 1 },
        // SVG Node列表
        svg_nodes: [],
        emap_headerbar: { title: "Default-Title", background: "#569981", color: "#FFFFFF", btn: [] },
        emap_navbar: { background: "#B5BDBC", btn: [] },
        // ========================== SVG畫布操作
        initViewBox: { x: 0, y: 0, width: 1000, height: 600 }, // 初始View Box
        componentChange: true, // 啟用/禁用修改
        svgNavCtrl: false, // svg內的navbar開關
        svgViewBox: { x: 0, y: 0, width: 1000, height: 600 }, // SVG View Box
        selectcomponent_list: [], // 選擇組件列表
        // 畫布縮放、偏移
        svgOffset: { x: 0, y: 0, scale: 1 },
      };
    },
    created() {
      this.initVueInfo(this);
      this.getEmapData();
    },
    beforeUnmount() {
      window.removeEventListener("resize", this.handleResizeWindow);
      window.removeEventListener("mousemove", this.onResize);
      window.removeEventListener("mouseup", this.onResizeMouseUp);
      window.removeEventListener("mousemove", this.onMouseMove);
      window.removeEventListener("mouseup", this.onMouseUp);
      window.removeEventListener("keydown", this.gotoEditPage);
    },
    mounted() {
      this.handleResizeWindow();
      window.addEventListener("resize", this.handleResizeWindow);
      window.addEventListener("mousemove", (e) => this.onMouseMove(e));
      window.addEventListener("mouseup", (e) => this.onMouseUp(e));
      window.addEventListener("keydown", this.gotoEditPage);
    },
    computed: {
      bgImageURL() {
        return `http://${window.location.hostname}:4456/image/${this.svgBG['image']}`
      },
    },
    methods: {
      initVueInfo,
      // Drag函數
      handleBackgroundMouseDown, handleItemsMouseDown, onMouseMove, onMouseUp, 
      // Resize函數
      handleResizeWindow, handleItemsResizeDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText,
      // Zoom函數
      onWheelZoom, initZoom, 
      // ======================================= 組件設定參數 =======================================
      // 取得組件類型
      emapComponentType(item) {
        const typeMap = {
          image: "ImageBox",
          icon: "IconBox",
          text: "TextBox",
          input: "InputBox",
          button: "ButtonBox",
          timer: "TimerBox",
          marquee: "MarqueeBox",
          linechart: "LinechartBox",
          devtable: "Devtable",
          monitor: "Monitor",
        };
        return typeMap[item.type] || "div";
      },
      // 傳遞參數、func
      emapComponentProps(item) {
        return {
          componentChange: this.componentChange,
          item,
          'dragitem': this.selectcomponent_list,
          onDblclick: () => this.dbclickEditText(item),
          onMousedown: (event) => this.handleItemsMouseDown(event, item),
          onResizedown: (event) => this.handleItemsResizeDown(event, item),
          blurEditText: () => this.blurEditText(item),
          execFunc: () => this.execFunc(item)
        };
      },
      // 組件CSS樣式
      getItemStyle(item) {
        var cssStyle = {
          width: `${item.width}px`,
          height: `${item.height}px`,
          border: this.selectcomponent_list.includes(item) ? '2px solid blue' : item.showBorder ? `2px solid ${item.borderColor}` : 'none', 
          'will-change':'transform',
        }
        switch (item.type) {
          case "button":
            cssStyle['border'] = this.selectcomponent_list.includes(item) ? '2px solid blue' : item.showBorder ? `none` : 'none'
            cssStyle['borderRadius'] = `${item.btnRadius}px`;
            cssStyle['padding'] = '10px';
            break;
          case "devtable":
            cssStyle['border-radius'] = '5px';
            cssStyle['user-select'] = 'none';
            break;
          case "input":
          case "timer": 
          case "marquee":
            cssStyle['background'] = item.bgColor;
            cssStyle['overflow'] = 'hidden';
            break;
        }
        return cssStyle;
      },
      // ==================================================================
      // 取得E-map資料
      getEmapData() {
        this.paginationID = this.$route.params.pathnow
        useSetup().getPageInfo({idx: this.paginationID}).then((res)=> {
          this.emapInfo = res["data"]
          this.initEmapData();
        }).catch((error)=> {
          this.emapInfo = {
            id: this.paginationID,
            content: { image: "", background: "#FFFFFF", nodes: [] },
            headerbar: { title: "Default-Title", background: "#569981", color: "#FFFFFF", btn: [] },
            navbar: { background: "#B5BDBC", btn: [] },
          }
          this.initEmapData();
        })
      },
      initEmapData() {
        this.svgBG = {
          image: this.emapInfo["content"]["image"] || "",
          color: this.emapInfo["content"]["background"] || "#FFFFFF",
          imageopacity: this.emapInfo["content"]["imageopacity"] || 1
        }
        this.svg_nodes = this.emapInfo["content"]["nodes"];
        this.emap_headerbar = this.emapInfo["headerbar"];
        this.emap_navbar = this.emapInfo["navbar"];
        this.getDatapoint();
        this.startScanDatapoint();
      },
      // 開始掃描點位
      startScanDatapoint() {
        this.stopScanDatapoint();
        this.Setup.emapInterval = setInterval(() => {
          this.getDatapoint();
        }, 3000);
      },
      // 停止掃描點位
      stopScanDatapoint() {
        clearInterval(this.Setup.emapInterval)
        this.Setup.emapInterval = null;
      },
      // 取得點位資料(有設定點位的才會抓取點位資料)
      getDatapoint() {
        this.svg_nodes.forEach((item) => {
          if (item.point != "" && item.point != undefined) {
            var Query = item.point
            useSetup().getDatapointInfo(Query).then((res) => {
              item.value = res["data"]["value"]
              console.log(item)
            }).catch(()=> item.value = "點位錯誤")
          }
        })
      },
      // 回到編輯頁面(Ctrl + D)
      gotoEditPage(ev) {
        if (ev.ctrlKey) {
          if (ev.key === "f" || ev.key === "F") {
            ev.preventDefault(); // 預覽頁面禁止Ctrl + F
            return;
          }
          if (ev.key === "d" || ev.key === "D"){
            ev.preventDefault();
            this.stopScanDatapoint();
            var editPageRoute = "/edit/1"
            useSetup().getEmapHomepage().then((res)=>{
              var data = res["data"]["index"]
              editPageRoute = `/edit/${data == 0 ? 1 : data}`
            })
            .catch(()=> editPageRoute = "/edit/1")
            .finally(()=> this.$router.push(editPageRoute))
          }
        }
      },
      // ======================================= 畫布內操作 =======================================
      execFunc(item) {
        var func = item.func || "";
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
            // route 路徑範例
            // 1. route - /view/1
            // 2. route - /mod/test
            case "route":
              console.log(parts[1])
              var route_list = parts[1].split('/').map(s => s.trim())
              var route = route_list[1]
              this.routeType = route
              if (route == "view") this.$router.push(parts[1])
              else if (route == "mod") {
                this.moduleTable = route_list[2]
              }
              break;
          }
        } else {
          // useSetup().showAlertDialog({ icon: "warn", title: "未定義的功能" }) // 暫時隱藏
        }
      },
      // ======================================= 組件設定 =======================================
      // 選擇的Node
      focusComponent(item) {
        this.selectcomponent_list = [item];
      },
    },
  };
</script>

<style lang="scss" scoped>
// 設定Menu
.emap-menu {
  margin: 20px; 
  padding: 0px 10px 10px 10px;
  height: 50vh; 
  overflow: overlay;
}

// SVG畫布
.svg-content {
  min-width: 100%;
  min-height: 100%;
}
</style>