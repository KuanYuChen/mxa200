<template>
  <v-main :class="Setup.stopAnimation ? '' : 'show-animation'" style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;padding: 15px;">
      <v-card style="min-height: 700px;border: 1px solid #dbd7d7; border-radius: 10px;">
        <!-- ========================================================== 畫布內容 ========================================================== -->
          <v-layout :style="{'background': svgBGColor}">
            <v-app-bar :color="emap_headerbar['background']">
              <v-app-bar-nav-icon variant="text" @click.stop="svgNavCtrl = !svgNavCtrl"></v-app-bar-nav-icon>
              <h3 :style="{'margin': '0px 20px', 'color': emap_headerbar['color'], 'cursor': 'pointer'}" @click="openHeaderbar()">{{ emap_headerbar['title'] }}</h3>
              <v-btn v-for="(button, index) in emap_headerbar['btn']" :key="index" :color="button['color']"><h3>{{ button['text'] }}</h3></v-btn>
              <v-spacer></v-spacer>
              <v-menu :close-on-content-click="false">
                <template v-slot:activator="{ props }">
                  <v-icon style="margin: 0px 15px 0px 0px;font-size: 40px;" v-bind="props" icon="mdi-cog" />
                </template>
                <v-card style="border: 1px solid #c9c9c9;">
                  <v-tabs v-model="tabnow" grow>
                    <v-tab :value="0"><h3> {{ emap_list[emapIdx] ? 'E-map資訊' : '新增E-map'}}</h3></v-tab>
                  </v-tabs>
                  <v-tabs-window v-model="tabnow">
                    <v-tabs-window-item :value="0" style="width: 500px;">
                      <v-card>
                        <div v-if="svgBGFile == ''" style="display: flex; margin: 20px 10px 0px 20px;">
                          <v-file-input accept=".jpg,.png" variant="outlined" prepend-icon="" label="新增底圖" hide-details @change="uploadImg" />
                          <v-btn style="margin: 10px 0px 0px 10px;" variant="outlined" @click="addImage()"><h3>新增圖片</h3></v-btn>
                        </div>
                        <div style="display: flex; margin: 20px 10px 0px 20px;">
                          <v-select v-model="selectGroup" :items="group_item" item-title="value" return-object variant="outlined" label="選擇群組" hide-details/>
                          <v-btn style="margin: 10px 0px 0px 10px;" variant="outlined" @click="openComponent('ADD')"><h3>新增組件</h3></v-btn>
                        </div>
                        <div class="basemap-menu">
                          <div v-for="(item, index) in svg_nodes" :key="index">
                            <div v-if="item['groupstate']" style="display: flex; margin: 10px 0px;">
                              <h3 :style="{cursor: 'pointer', color: dragitem_list.includes(item) ? 'blue' : 'black'}" @click="focusNode(item)">{{ item.text || 'Default' }}</h3>
                              <v-spacer></v-spacer>
                              <v-btn variant="outlined" @click="openComponent('EDIT', item)"><h3>修改資訊</h3></v-btn>
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
                  <div :style="{ color: nav['color'], 'display': 'flex' }">
                    <v-icon style="margin-right: 15px;">{{ nav["icon"] }}</v-icon>
                    <h3>{{ nav["text"] }}</h3>
                  </div>
                </v-list-item>
              </v-list>
              <v-icon style="margin: 10px;" @click="openNavbar()">mdi-pen</v-icon>
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
                    <image v-if="svgBGFile" 
                      :href="`data:image/jpeg;base64,${svgBGFile}`" width="100%" height="100%" 
                      preserveAspectRatio="xMidYMid meet" :clip-path="cropMode ? '' : 'url(#clip)'"
                    />
                    <!-- 定義裁剪區域 -->
                    <defs>
                      <clipPath v-if="!cropMode" id="clip">
                        <rect :x="clipBox.x" :y="clipBox.y" :width="clipBox.width" :height="clipBox.height" />
                      </clipPath>
                    </defs>
                    <!-- 裁剪框 (僅在裁剪模式開啟時顯示) -->
                    <g v-if="cropMode">
                      <rect :x="clipBox.x" :y="clipBox.y"
                        :width="clipBox.width" :height="clipBox.height"
                        fill="none" stroke="red" stroke-width="2" stroke-dasharray="5,5"
                        style="cursor: move"
                      />
                      <!-- 角落控制點 (縮放) -->
                      <circle v-for="(point, index) in resizeClipBoxHandles()" :key="'corner' + index"
                        :cx="point.x" :cy="point.y" r="5"
                        fill="blue" style="cursor: nwse-resize"
                        @mousedown.stop="startResizeClipBox(index, $event)"
                      />
                    </g>
                    
                    <!-- 選取框 -->
                    <rect v-if="selecting"
                      class="select-rect"
                      :x="selectionBox.x"
                      :y="selectionBox.y"
                      :width="selectionBox.width"
                      :height="selectionBox.height"
                    />
                    <!-- 組件 Group -->
                    <g v-for="(item, index) in svg_nodes" :key="index" class="group-item">
                      <foreignObject v-if="item['groupstate']" :style="{ 'width': `${item.width}px`, 'height': `${item.height}px`, 'transform': 'translateZ(0)', 'position': 'absolute', 'z-index': 1 }" :x="item.n_x" :y="item.n_y">
                        <component :is="emapComponentType(item)" v-bind="emapComponentProps(item)" />
                      </foreignObject>
                    </g>
                  </g>
                </svg>
                <!-- 右鍵Menu設定 -->
                <div v-if="emapEditMenu.show" 
                  class="context-menu"
                  :style="{ top: emapEditMenu.y + 'px', left: emapEditMenu.x + 'px' }"
                  @contextmenu.prevent>
                  <h2 style="margin-left: 15px;">選單設定</h2>
                  <v-list v-if="emapEditMenu.type == 'items'"  :lines="false" density="compact" @click="hideContextMenu">
                    <v-list-item @click="openComponent('EDIT', emapEditMenu.item)">
                      <template v-slot:prepend><v-icon icon="mdi-cog" /></template>
                      <h3>編輯</h3>
                    </v-list-item>
                    <v-list-item @click="copyItems()">
                      <template v-slot:prepend><v-icon icon="mdi-content-copy" /></template>
                      <h3>複製</h3>
                    </v-list-item>
                    <v-list-item @click="deleteItems()">
                      <template v-slot:prepend><v-icon icon="mdi-trash-can" /></template>
                      <h3>刪除</h3>
                    </v-list-item>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'top-left')">左上</v-btn>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'top-center')">中上</v-btn>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'top-right')">右上</v-btn>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'middle-left')">左中</v-btn>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'center')">中心</v-btn>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'middle-right')">右中</v-btn>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'bottom-left')">左下</v-btn>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'bottom-center')">中下</v-btn>
                    <v-btn @click="setItemPosition(emapEditMenu.item, 'bottom-right')">右下</v-btn>
                  </v-list>
                  <v-list v-else-if="emapEditMenu.type == 'background'"  :lines="false" density="compact" @click="hideContextMenu">
                    <v-list-item @click="openBackground(emapEditMenu.item)">
                      <template v-slot:prepend><v-icon icon="mdi-cog" /></template>
                      <h3>編輯</h3>
                    </v-list-item>
                    <v-list-item v-if="svgBGFile" @click="toggleCropMode()">
                      <template v-slot:prepend><v-icon icon="mdi-content-cut" /></template>
                      <h3>裁剪</h3>
                    </v-list-item>
                    <v-list-item @click="openComponent('ADD')">
                      <template v-slot:prepend><v-icon icon="mdi-attachment-plus" /></template>
                      <h3>新增組件</h3>
                    </v-list-item>
                  </v-list>
                </div>
              </v-card>
            </v-main>
          </v-layout>
      </v-card>
    </div>
  </v-main>
  <!-- ============================================== 組件設定Dialog ============================================== -->
  <ComponentDialog
    :component="component"
    :group_item="group_item"
    @uploadImg="uploadImg"
    @addGroup="addGroup"
    @closeComponent="closeComponent"
    @addComponent="addComponent"
    @editComponent="editComponent"
  />
  <!-- ============================================== 背景資訊設定Dialog ============================================== -->
  <BackgroundDialog 
    :bg="bg"
    @editImage="editImage"
    @removeBg="removeBg"
    @closeBackground="closeBackground"
    @editBackground="editBackground"
  />
  <!-- ============================================== 設定 Headerbar Dialog ============================================== -->
  <HeaderbarDialog
    :headerbar="headerbar"
    @editHeaderbar="editHeaderbar"
    @closeHeaderbar="closeHeaderbar"
  />
  <!-- ============================================== 設定 Navbar Dialog ============================================== -->
  <NavbarDialog
    :navbar="navbar"
    @editNavbar="editNavbar"
    @closeNavbar="closeNavbar"
  />
</template>

<script>
  import ComponentDialog from '@/components/Emap/Dialog/Component.vue';
  import BackgroundDialog from '@/components/Emap/Dialog/Background.vue';
  import HeaderbarDialog from '@/components/Emap/Dialog/Headerbar.vue';
  import NavbarDialog from '@/components/Emap/Dialog/Navbar.vue';

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
    toggleCropMode, startResizeClipBox, resizeClipBoxHandles, 
    onWheelZoom, initZoom, 
    hideContextMenu, setItemPosition, 
    handleKeydown, copyItems, deleteItems,  
  } from '@/views/func/emap.js'
  export default {
    components: { 
      ComponentDialog, BackgroundDialog, HeaderbarDialog, NavbarDialog, 
      ImageBox, IconBox, ButtonBox, InputBox, TimerBox, MarqueeBox, LinechartBox 
    },
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
        tabnow: 0,
        imgImport: null,
        selectGroup: {},
        // ========================== SVG畫布操作
        componentChange: false, // 啟用/禁用修改
        svgNavCtrl: false, // svg內的navbar開關
        svgBGFile: "",
        svgBGColor: "#FFFFFF",
        svgViewBox: { x: 0, y: 0, width: 1000, height: 600 },
        // 裁剪背景圖片
        cropMode: false, // 是否開啟裁剪模式
        clipBox: { x: 0, y: 0, width: 1000, height: 600 }, // 裁剪框資訊
        // 拖拉組件列表
        dragitem_list: [],
        // 選取框
        selecting: false, // 是否正在框選
        selectionBox: { x: 0, y: 0, width: 0, height: 0 }, // 框選區域
        emapEditMenu: { show: false, x: 0, y: 0, target: null }, // 右鍵菜單
        svgOffset: { x: 0, y: 0, scale: 1 }, // 畫布縮放、偏移
        // ========================== 設定組件Dialog
        component: {
          dialog: false,
          state: "ADD",
          item: {
            width: 100, // 組件寬度
            height: 50, // 組件高度
            type: "",   // 組件類型
            image: "",  // 組件類型為圖片時的圖片名稱
            text: "",   // 組件文字
            point: "",  // 組件點位
            color: "#000000", // 組件顏色(預設黑色)
            icon: "",         // 組件類型為ICON時的ICON名稱
            group: "All",     // 組件群組分類
            func: "",     // 組件功能
          },
        },
        bg: {
          dialog: false,
          item: {},
        },
        headerbar: {
          dialog: false,
          item: {},
        },
        navbar: {
          dialog: false,
          item: {},
        },
        group_item: [], // 群組選單內容
      };
    },
    watch: {
      selectGroup(val) {
        this.setGroupState(val); // 選擇要查看的群組
      },
    },
    created() {
      this.getVueInfo(this); //取得Vue 資訊
      this.getEmapData();
    },
    beforeUnmount() {
      window.removeEventListener("keydown", this.handleKeydown);
      window.removeEventListener("mousemove", this.onMouseMove);
      window.removeEventListener("mouseup", this.onMouseUp);
      window.removeEventListener("mousemove", this.onResize);
      window.removeEventListener("mouseup", this.onResizeMouseUp);
    },
    mounted() {
      window.addEventListener("keydown", this.handleKeydown);
      window.addEventListener("mousemove", this.onMouseMove);
      window.addEventListener("mouseup", this.onMouseUp);
    },
    methods: {
      getVueInfo,
      // Drag函數
      onBackgroundMouseDown, onItemsMouseDown, onMouseMove, onMouseUp, 
      // Resize函數
      onResizeMouseDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText, 
      toggleCropMode, startResizeClipBox, resizeClipBoxHandles, 
      // Zoom函數
      onWheelZoom, initZoom, 
      // 右鍵Menu函數
      hideContextMenu, setItemPosition, 
      // 鍵盤函數
      handleKeydown, copyItems, deleteItems, 
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
        };
      },
      // ==================================================================
      // 取得E-map資料
      getEmapData() {
        this.paginationID = this.$route.params.pathnow
        useSetup().getEmap().then((res)=>{
          // Emap總資料
          this.emap_list = res["data"]["data"] ? res["data"]["data"] : []
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
          // 新增初始Emap資訊
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
      updateEmap(type) {
        console.log("Edit Event Type: ", type)
        var save_json = []
        var remove_key = ['edit', 'groupstate','imagefile'] // 更新資料時移除不要更新的 OBJ Key
        for (let i in this.emap_list) {
          var nodes = this.emap_list[i]["content"].nodes ? this.emap_list[i]["content"].nodes : []
          const filterNodes = nodes.map(node => 
            Object.keys(node).reduce((acc, key) => {
              if (!remove_key.includes(key)) acc[key] = node[key];
              return acc;
            }, {})
          );
          var info = {
            "id": this.emap_list[i].id,
            "content": {
              "image": this.emap_list[i]["content"].image,
              "background": this.emap_list[i]["content"].background,
              "nodes": filterNodes,
            },
            "headerbar": this.emap_list[i].headerbar,
            "navbar": this.emap_list[i].navbar,
          }
          save_json.push(info)
        }
        if (save_json.length != this.emap_list.length) return // 不符合修改資料
        return new Promise((resolve, reject) => {
          useSetup().setEmap(save_json)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
        });
      },
      // ======================================= 設定操作(Menu) =======================================
      // 新增圖片
      uploadImg(event) {
        var input = event.target;
        this.imgImport = null;
        if (input.files && input.files[0]) this.imgImport = input.files[0]
      },
      addImage() {
        if (this.imgImport) {
          let formData = new FormData();
          formData.append("id", this.paginationID);
          formData.append("file", this.imgImport);
          formData.append("filename", this.imgImport["name"]);
          var Query = { file: formData }
          useSetup().editEmapImg(Query).then(()=>{
            useSetup().showAlertDialog({ icon: "success", title: "新增底圖" })
            this.getEmapData();
          })
        } else useSetup().showAlertDialog({ icon: "error", title: "沒有選擇圖片" })
      },
      // 確認是否為同群組的Node(更新Group狀態)
      setGroupState(value) {
        for (let i in this.svg_nodes) {
          // Group All
          if (value['id'] == -1) this.svg_nodes[i]["groupstate"] = true
          else this.svg_nodes[i]["groupstate"] = this.svg_nodes[i]['group'] === value['value'] ? true : false
        }
      },
      // 選擇的Node
      focusNode(item) {
        this.dragitem_list = [item];
      },
      // =================================== 組件設定(Dialog) ===================================
      openComponent(state, item) {
        this.component["dialog"] = true;
        this.component["state"] = state;
        if (state == "EDIT") {
          this.component["item"] = JSON.parse(JSON.stringify(item));
        }
      },
      addGroup(event) {
        const newGroup = event.target.value.trim(); // 取得輸入框的值
        if (newGroup && !this.group_item.some(item => item.value === newGroup)) {
          var g = { id: Math.floor(Math.random() * 10000), value: newGroup }
          if (g["value"] != "All") this.group_item.push(g); // 新增到選單
          this.component['item']['group'] = newGroup; // 設置為當前選擇的值
        }
      },
      addComponent() {
        var emap = this.emap_list[this.emapIdx]
        var items = this.component['item']
        var ID =  Math.floor(Math.random() * 10000000);
        const { width, height, type, text, point, color, group, icon } = items;
        const info = { 
          id: ID, 
          n_x: 10, n_y: 10, 
          width, height, 
          type, text, point, color, group, icon 
        };
        info["func"] = items["func"]
        // 確認物件的寬高是否為正確格式
        info["width"] = parseInt(items['width'])
        info["height"] = parseInt(items['height'])
        if (items['type'] != "") {
          // type為圖片則上傳圖片
          if (items['type'] == 'image') {
            if (this.imgImport) {
              info['image'] = this.imgImport["name"]
              let formData = new FormData();
              formData.append("file", this.imgImport);
              useSetup().uploadImage({ file: formData })
            } else {
              useSetup().showAlertDialog({ icon: "error", title: "沒有選擇圖片" })
              return
            }
          }
          emap["content"]["nodes"] = emap["content"]["nodes"] ? emap["content"]["nodes"] : []
          emap["content"]["nodes"].push(info)
          this.updateEmap("Add Component").then(()=> {
            this.getEmapData()
            this.closeComponent()
          });
        } else {
          useSetup().showAlertDialog({ icon: "error", title: "請選擇組件類型" })
        }
      },
      editComponent() {
        var emap = this.emap_list[this.emapIdx]["content"]['nodes']
        var items = this.component['item']
        for (let i in emap) {
          if (emap[i].id == items.id) {
            Object.keys(items).forEach(key => (emap[i][key] = items[key]));
            // 確認物件的寬高是否為正確格式
            emap[i]['width'] = parseInt(items['width'])
            emap[i]['height'] = parseInt(items['height'])
            // type為圖片則上傳圖片
            if (items["type"] == "image") {
              items['image'] = this.imgImport ? this.imgImport["name"] : items["image"]
              emap[i]['image'] = items['image']
              if (this.imgImport) {
                let formData = new FormData();
                formData.append("file", this.imgImport);
                useSetup().uploadImage({ file: formData })
              }
              if (this.imgImport == null && items['image'] == undefined) {
                useSetup().showAlertDialog({ icon: "error", title: "沒有選擇圖片" })
                return
              }
            }
            this.updateEmap("Edit Component").then(()=>{
              this.getEmapData()
              this.closeComponent();
            });
          }
        }
      },
      closeComponent() {
        this.component['dialog'] = false;
        setTimeout(() => {
          this.imgImport = null;
          this.component = {
            dialog: false,
            state: "ADD",
            item: {
              width: 100,
              height: 50,
              type: "",
              image: "",
              text: "",
              point: "",
              color: "#000000",
              group: "All",
              icon: "",
              func: "",
            },
          }
        }, 100);
      },
      // =================================== 背景資訊設定(Dialog) ===================================
      openBackground(item) {
        this.bg["dialog"] = true;
        this.bg["item"] = JSON.parse(JSON.stringify(item));
        console.log(this.bg, item)
      },
      triggerFileUpload() {
        this.$refs.fileInput.click();
      },
      editImage(event) {
        const file = event.target.files[0];
        if (file) {
          console.log("選擇的檔案:", file);
          // 這裡可以上傳文件，例如使用 FormData 發送到 API
          let formData = new FormData();
          formData.append("id", this.paginationID);
          formData.append("file", file);
          formData.append("filename", file["name"]);
          var Query = { file: formData }
          useSetup().editEmapImg(Query).then(()=>{
            useSetup().showAlertDialog({ icon: "success", title: "修改底圖" })
            this.getEmapData();
          })
        }
      },
      removeBg() {
        this.emap_list[this.emapIdx]["content"]["image"] = ""
        this.updateEmap("Remove Background Image").then(()=>{ 
          useSetup().showAlertDialog({ icon: "success", title: "刪除底圖" })
          this.getEmapData() 
        })
      },
      editBackground() {
        this.emap_list[this.emapIdx]["content"]["background"] = this.bg["item"]["background"]
        this.updateEmap("Edit Background Image").then(()=>{
          this.closeBackground();
          this.getEmapData();
        })
      },
      closeBackground() {
        this.bg["dialog"] = false;
      },
      // =================================== Headerbar設定(Dialog) ===================================
      openHeaderbar() {
        this.headerbar['dialog'] = true;
        this.headerbar['item'] = JSON.parse(JSON.stringify(this.emap_headerbar));
      },
      editHeaderbar() {
        this.emap_headerbar = this.headerbar['item'];
        this.emap_list[this.emapIdx]["headerbar"] = this.emap_headerbar;
        this.updateEmap("Headerbar").then(()=>{ this.closeHeaderbar() });
      },
      closeHeaderbar() {
        this.headerbar['dialog'] = false;
      },
      // =================================== Navbar設定(Dialog) ===================================
      openNavbar() {
        this.navbar['dialog'] = true;
        this.navbar['item'] = JSON.parse(JSON.stringify(this.emap_navbar));
        console.log(this.navbar)
      },
      editNavbar() {
        this.emap_navbar = this.navbar['item'];
        this.emap_list[this.emapIdx]["navbar"] = this.emap_navbar;
        this.updateEmap("Navbar").then(()=>{ this.closeNavbar() });
      },
      closeNavbar() {
        this.navbar['dialog'] = false;
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

.select-rect {
  fill:rgba(0, 0, 255, 0.15);
  stroke:blue;
  stroke-dasharray: 4;
}

// 右鍵選單
.context-menu {
  width: 250px;
  position: sticky;
  background: white;
  border: 2px solid #ccc;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

// Dialog Btn
.actions-btn {
  min-width:100px;
  margin: 0px 15px;
}
</style>