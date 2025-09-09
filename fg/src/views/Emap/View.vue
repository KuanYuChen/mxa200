<!-- =================================================== 預覽頁面 =================================================== -->
<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 0px;">
        <loadingAnimation v-if="!initLoading" />
        <v-layout v-else>
          <v-app-bar :color="emap_headerbar['background']">
            <v-app-bar-nav-icon variant="text" :color="emap_headerbar['color']" icon="mdi-menu-down" @click.stop="ctrlNavbar('svgNavCtrl')"></v-app-bar-nav-icon>
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
            <v-icon style="font-size: 40px; margin-right: 20px;" :icon="guidedNavCtrl ? 'mdi-menu-down' : 'mdi-menu-up'" @click="ctrlNavbar('guidedNavCtrl')"></v-icon>
            <v-icon style="font-size: 40px; margin-right: 20px;" icon="mdi-bell-outline" @click="ctrlNavbar('alarmNavCtrl')"></v-icon>
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

          <!-- 導覽抽屜欄 -->
          <v-navigation-drawer v-model="guidedNavCtrl" temporary location="top" width="500">
            <v-card style="width: 100%; height: 100%; background: #E97132; border-radius: 0px;">
              <v-card-title style="display: flex; gap: 10px; margin: 5px 0px;">
                <v-spacer></v-spacer>
                <!-- 之後要修正正確路徑名稱 -->
                <v-btn variant="text" @click="$router.push('/access_control')"><h2 style="color: white;">門禁</h2></v-btn>
                <v-btn variant="text" @click="$router.push('/record_history')"><h2 style="color: white;">日誌</h2></v-btn>
                <v-btn variant="text" @click="$router.push('/event')"><h2 style="color: white;">通知</h2></v-btn>
                <v-btn variant="text" @click="$router.push('/notify')"><h2 style="color: white;">推播</h2></v-btn>
                <v-btn variant="text" @click="$router.push('/organize_user_setting')"><h2 style="color: white;">用戶</h2></v-btn>
              </v-card-title>
            </v-card>
          </v-navigation-drawer>

          <!-- 警告抽屜欄 -->
          <v-navigation-drawer v-model="alarmNavCtrl" temporary location="right" width="500">
            <v-card style="width: 100%; height: 100%;">
              <v-card-title>
                <h3>即時事件</h3>
              </v-card-title>
            </v-card>
          </v-navigation-drawer>

          <v-main style="line-height: 0;">
            <v-icon v-show="svgOffset.x != 0 && svgOffset.y != 0 || svgOffset.scale != 1" 
              style="position: absolute;z-index: 999999; margin: 10px;" icon="mdi-reload" 
              @click="initZoom()"
            />
            <ModuleTable v-if="routeType == 'mod'" :tableInfo="moduleTable" />
            <v-card v-else ref="canvasCard" class="interactive-canvas"
              :style="{'position': 'relative', 'background-color': svgBG.color, 'overflow': 'hidden'}"
              width="100%" height="93vh" flat rounded="0"
              @wheel.prevent="onWheelZoom"
              @contextmenu.prevent
            >
              <svg ref="adaptiveSvgContainer"
                :viewBox="`0 0 ${initViewBox.width} ${initViewBox.height}`"
                preserveAspectRatio="none" 
                style="width: 100%; height: 100%;"
              >
                <foreignObject x="0" y="0" :width="initViewBox.width" :height="initViewBox.height">
                  <div xmlns="http://www.w3.org/1999/xhtml" style="width: 100%; height: 100%; position: relative; line-height: 1.5">
                    <div ref="transformer" class="canvas-transformer" :style="transformerStyle">
                        <div v-if="svgBG.image" class="canvas-background-image" :style="backgroundDivStyle"></div>
                        
                        <template v-for="(item, index) in svg_nodes" :key="item.id">
                          <div class="draggable-item-wrapper" :style="getItemStyle(item, index)">
                            <template v-if="item.type === 'Group'">
                              <div class="group-background">
                                <div v-for="node in item.nodes" :key="node.id" class="draggable-item-wrapper group-child-wrapper" :style="getGroupChildStyle(node)">
                                  <component v-show="node.showComponent" :is="emapComponentType(node)" v-bind="emapComponentProps(node, 'GroupChild')" />
                                </div>
                              </div>
                            </template>
                            <template v-else>
                              <component v-show="item.showComponent" :is="emapComponentType(item)" v-bind="emapComponentProps(item, 'Component')" />
                            </template>
                          </div>
                        </template>
                    </div>
                  </div>
                </foreignObject>
              </svg>
            </v-card>
          </v-main>
        </v-layout>
      </v-card>
    </div>
  </v-main>
</template>

<script>
  import ModuleTable from "@/components/Module/Table.vue"

  import ButtonBox from '@/components/Emap/Box/Button.vue';
  import InputBox from '@/components/Emap/Box/Input.vue';
  import TimerBox from '@/components/Emap/Box/Timer.vue';
  import MarqueeBox from '@/components/Emap/Box/Marquee.vue';
  import ImageBox from '@/components/Emap/Box/Image.vue';
  import IconBox from '@/components/Emap/Box/Icon.vue';
  import LinechartBox from '@/components/Emap/Box/Linechart.vue';
  import HistorychartBox from '@/components/Emap/Box/HistoryChart.vue';// 歷史曲線圖組件
  import Devtable from '@/components/Emap/Box/Devtable.vue';
  import Monitor from '@/components/Emap/Box/Monitor.vue';
  import GaugeChartV1 from '@/components/Emap/Box/GaugeChart/V1.vue';
  import GaugeChartV2 from '@/components/Emap/Box/GaugeChart/V2.vue';
  import GaugeChartV3 from '@/components/Emap/Box/GaugeChart/V3.vue';
  import GaugeChartV4 from '@/components/Emap/Box/GaugeChart/V4.vue';
  import GaugeChartV5 from '@/components/Emap/Box/GaugeChart/V5.vue';
  import Website from '@/components/Emap/Box/Website.vue';

  import loadingAnimation from '@/components/animation/loadingAnimation.vue';

  import { useSetup } from '@/store/module/setup.js' // Pinia
  import { 
    initVueInfo,
    handleBackgroundMouseDown, handleItemsMouseDown, onMouseMove, onMouseUp, 
    handleItemsResizeDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText, 
    onWheelZoom, initZoom, 
  } from '@/views/Emap/jsfile/emap.js'
  import { handleKeydown } from '@/views/Emap/jsfile/keyboard.js'

  export default {
    components: { 
      ModuleTable, 
      ButtonBox, InputBox, TimerBox, MarqueeBox, ImageBox, IconBox, LinechartBox, HistorychartBox, Devtable, Monitor, 
      GaugeChartV1, GaugeChartV2, GaugeChartV3, GaugeChartV4, GaugeChartV5, Website, 
      loadingAnimation
    },
    data() {
      return {
        Setup: useSetup().$state,
        initLoading: false, // 頁面初始載入
        routeType: "",
        moduleTable: "",
        guidedNavCtrl: false,
        alarmNavCtrl: false,
        // ========================= Data
        paginationID: 0, // 修改頁面 => 分頁ID
        emapInfo: {},
        pointInfo: {},
        // SVG 背景參數
        svgBG: { image: "", color: "#FFFFFF", imageopacity: 1 },
        // SVG Node列表
        svg_nodes: [],
        emap_headerbar: { title: "Default-Title", background: "#569981", color: "#FFFFFF", btn: [] },
        emap_navbar: { background: "#B5BDBC", btn: [] },
        // ========================== SVG畫布操作
        initViewBox: { x: 0, y: 0, width: 2560, height: 1080 }, // 初始View Box
        componentChange: true, // 啟用/禁用修改
        svgNavCtrl: false, // svg內的navbar開關
        selectcomponent_list: [], // 選擇組件列表
        // 畫布縮放、偏移
        svgOffset: { x: 0, y: 0, scale: 1 },
      };
    },
    computed: {
      // transformer div 樣式
      transformerStyle() {
        const { x, y, scale } = this.svgOffset;
        return {
          transform: `translate(${x}px, ${y}px) scale(${scale})`, 'transform-origin': '0 0',
          width: `${this.initViewBox.width}px`, height: `${this.initViewBox.height}px`,
          position: 'absolute', 'will-change': 'transform',
        };
      },
      // 背景圖 div 樣式
      backgroundDivStyle() {
        return {
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
          backgroundImage: `url(${this.bgImageURL})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          opacity: this.svgBG.imageopacity,
          pointerEvents: 'none',
        }
      },
      bgImageURL() {
        return `http://${window.location.hostname}:4456/image/${this.svgBG['image']}`
      },
    },
    watch: {},
    created() {
      this.initVueInfo(this);
      this.getEmapData();
    },
    mounted() {
      window.addEventListener("mousemove", (e) => this.onMouseMove(e));
      window.addEventListener("mouseup", (e) => this.onMouseUp(e));
      window.addEventListener("keydown", this.handleKeydown);
    },
    beforeUnmount() {
      window.removeEventListener("mousemove", this.onResize);
      window.removeEventListener("mouseup", this.onResizeMouseUp);
      window.removeEventListener("mousemove", this.onMouseMove);
      window.removeEventListener("mouseup", this.onMouseUp);
      window.removeEventListener("keydown", this.handleKeydown);
    },
    methods: {
      initVueInfo,
      // Drag函數
      handleBackgroundMouseDown, handleItemsMouseDown, onMouseMove, onMouseUp, 
      // Resize函數
      handleItemsResizeDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText,
      // Zoom函數
      onWheelZoom, initZoom, 
      handleKeydown, 
      // ======================================= 組件設定參數 =======================================
      // 取得組件類型
      emapComponentType(item) {
        const typeMap = {
          button: "ButtonBox",
          input: "InputBox",
          timer: "TimerBox",
          marquee: "MarqueeBox",
          image: "ImageBox",
          icon: "IconBox",
          linechart: "LinechartBox",
          historychart: "HistorychartBox",
          devtable: "Devtable",
          monitor: "Monitor",
          website: "Website",
        };
        // 儀表板有2種樣式
        if (item.type == 'gaugechart') {
          if (item.gaugechartStyle == 'gaugechartV1') return "GaugeChartV1"
          else if (item.gaugechartStyle == 'gaugechartV2') return "GaugeChartV2"
          else if (item.gaugechartStyle == 'gaugechartV3') return "GaugeChartV3"
          else if (item.gaugechartStyle == 'gaugechartV4') return "GaugeChartV4"
          else if (item.gaugechartStyle == 'gaugechartV5') return "GaugeChartV5"
        }
        return typeMap[item.type] || "div";
      },
      // 傳遞參數、func
      emapComponentProps(item) {
        return {
          componentChange: this.componentChange,
          item,
          'dragitem': this.selectcomponent_list,
          pointInfo: this.pointInfo,
          onResizedown: (event) => this.handleItemsResizeDown(event, item),
          blurEditText: () => this.blurEditText(item),
          execFunc: () => this.execFunc(item)
        };
      },
      // 組件CSS樣式
      getItemStyle(item, index) {
        var cssStyle = {
          position: 'absolute', left: `${item.n_x}px`, top: `${item.n_y}px`,
          width: `${item.width}px`, height: `${item.height}px`,
          zIndex: index + 100,
          border: `2px solid ${item.showBorder ? item.borderColor : "#00000000" }`, 
          'will-change':'transform', outlineOffset: '2px',
        }
        switch (item.type) {
          case "button":
            cssStyle['border-radius'] = `${item.btnRadius}px`;
            break;
          case "devtable":
            cssStyle['border-radius'] = '5px';
            cssStyle['user-select'] = 'none';
            break;
          case "input":
          case "timer": 
          case "marquee":
            cssStyle['border-radius'] = `${item.textRadius}px`;
            cssStyle['background'] = item.bgColor;
            cssStyle['overflow'] = 'hidden';
            break;
        }
        return cssStyle;
      },
      // 群組內組件CSS樣式
      getGroupChildStyle(node) {
        const parentGroup = this.svg_nodes.find(group => group.type === 'Group' && group.nodes?.some(n => n.id === node.id));
        let relativeX = 0;
        let relativeY = 0;
        if (parentGroup) {
          relativeX = node.n_x - parentGroup.n_x;
          relativeY = node.n_y - parentGroup.n_y;
        } else {
          relativeX = node.n_x;
          relativeY = node.n_y;
        }
        // 個別設定組件CSS參數
        var cssStyle = { 
          position: 'absolute', left: `${relativeX}px`, top: `${relativeY}px`, 
          width: `${node.width}px`, height: `${node.height}px`, zIndex: 2, outlineOffset: '1px', 
          border: node.showBorder ? `2px solid ${node.borderColor}` : 'none', 
          'will-change':'transform', outlineOffset: '2px' 
        }
        switch (node.type) {
          case "button":
            cssStyle['border-radius'] = `${node.btnRadius}px`;
            break;
          case "devtable":
            cssStyle['border-radius'] = '5px';
            cssStyle['user-select'] = 'none';
            break;
          case "input":
          case "timer": 
          case "marquee":
            cssStyle['border-radius'] = `${node.textRadius}px`;
            cssStyle['background'] = node.bgColor;
            cssStyle['overflow'] = 'hidden';
            break;
        }
        return cssStyle;
      },
      // ==================================================================
      // 取得E-map資料
      getEmapData() {
        this.initLoading = false;
        this.paginationID = this.$route.params.pathnow
        useSetup().getPageInfo({idx: this.paginationID}).then((res)=> {
          this.emapInfo = res["data"]
        }).catch(()=> {
          this.emapInfo = {
            id: this.paginationID,
            content: { image: "", background: "#FFFFFF", nodes: [] },
            headerbar: { title: "Default-Title", background: "#569981", color: "#FFFFFF", btn: [] },
            navbar: { background: "#B5BDBC", btn: [] },
          }
        }).finally(()=> {
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
        this.initLoading = true;
        this.Setup.emapInterval = setInterval(() => {
          this.getDatapoint();
        }, 1000);
      },
      // 停止掃描點位
      stopScanDatapoint() {
        clearInterval(this.Setup.emapInterval)
        this.Setup.emapInterval = null;
      },
      // 取得全部點位數值
      getDatapoint() {
        useSetup().getVirtualPoints().then((res)=> {
          this.pointInfo = Object.prototype.toString.call(res['data']) === '[object Object]' ? res['data'] : {}
          console.log("虛擬點位: ", this.pointInfo)
        }).catch((err)=> console.error(err))
      },
      // 回到編輯頁面(Ctrl + D)
      gotoEditPage() {
        this.stopScanDatapoint();
        this.$router.push(`/edit/${this.Setup.viewFirstPage}`)
      },
      // 控制抽屜欄位
      ctrlNavbar(target) {
        var navbar_list = ["svgNavCtrl", "alarmNavCtrl", "guidedNavCtrl"]
        for (let i in navbar_list) if (navbar_list[i] != target) this[navbar_list[i]] = false;
        this[target] = !this[target]
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
          console.log("未定義的功能: ", item.func)
          // useSetup().showAlertDialog({ icon: "warn", title: "未定義的功能" }) // 暫時隱藏
        }
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