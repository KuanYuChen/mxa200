<template>
  <v-main :class="Setup.stopAnimation ? '' : 'show-animation'" style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;padding: 15px;">
      <v-card style="min-height: 700px;border: 1px solid #dbd7d7; border-radius: 10px;">
        <v-card-title style="display: flex;margin: 20px 0px;">
          <div v-if="bgfile">
            <v-btn @click="openComponent('ADD')" variant="outlined">
              <h3>新增組件</h3>
            </v-btn>
            <v-switch v-model="componentChange" color="primary" hide-details>
              <template v-slot:label>
                <h3 style="font-size: 25px;">{{ componentChange ? '禁用修改' : '啟用修改' }}</h3>
              </template>
            </v-switch>
          </div>
          <v-spacer></v-spacer>
          <v-menu :close-on-content-click="false">
            <template v-slot:activator="{ props }">
              <v-icon style="margin: 0px 0px 5px 10px;font-size: 40px;" v-bind="props">
                mdi-cog
              </v-icon>
            </template>
            
            <v-card style="border: 1px solid #c9c9c9;">
              <v-tabs v-model="tabnow" grow>
                <v-tab :value="0"><h3>選擇E-map</h3></v-tab>
                <v-tab :value="1"><h3>新增E-map</h3></v-tab>
              </v-tabs>
              <v-tabs-window v-model="tabnow">
                <v-tabs-window-item :value="0" style="width: 500px;">
                  <v-card v-if="emap_list.length > 0">
                    <div style="display: flex;">
                      <div style="width: 100%;margin: 20px 20px 0px;">
                        <v-select v-model="bgIdx" :items="emap_list" item-title="image" item-value="id" variant="outlined" label="選擇E-Map"></v-select>
                      </div>
                      <div style="margin: 30px 15px 0px 0px;">
                        <input type="file" accept=".jpg,.png" ref="fileInput" @change="editImage" style="display: none" />
                        <v-btn color="primary" @click="triggerFileUpload">
                          <h3>修改底圖</h3>
                        </v-btn>
                      </div>
                    </div>
                    <div>
                      <v-select v-model="selectGroup" style="margin: 0px 10px 0px 20px;" :items="group_item" item-title="value" return-object variant="outlined" label="選擇群組" />
                    </div>
                    <div class="basemap-menu">
                      <div v-for="(item, index) in emap_node" :key="index">
                        <div v-if="item['groupstate']" style="display: flex;margin: 10px 0px;">
                          <h3 :style="{cursor: 'pointer', color: dragitem_list.includes(item) ? 'blue' : 'black'}" @click="focusNode(item)">
                            {{ item.text || 'Default' }}
                          </h3>
                          <v-spacer></v-spacer>
                          <v-btn variant="outlined" @click="openComponent('EDIT', item)">
                            <h3>修改資訊</h3>
                          </v-btn>
                        </div>
                      </div>
                    </div>
                  </v-card>
                </v-tabs-window-item>
                <v-tabs-window-item :value="1" style="width: 500px;">
                  <v-card>
                    <div style="margin: 20px 20px 0px;">
                      <span>新增底圖</span>
                      <v-file-input accept=".jpg,.png" variant="outlined" prepend-icon="" @change="uploadImg" />
                    </div>
                    <v-card-actions>
                      <div style="width: 100%;display: flex;justify-content: end;">
                        <v-spacer></v-spacer>
                        <v-btn color="primary" @click="addImage()">
                          <h3>新增</h3>
                        </v-btn>
                      </div>
                    </v-card-actions>
                  </v-card>
                </v-tabs-window-item>
              </v-tabs-window>
            </v-card>
          </v-menu>
        </v-card-title>
        <!-- <h3 style="user-select:none;">{{ selectionBox }}</h3> -->
        <!-- ========================================================== 畫布內容 ========================================================== -->
        <v-card class="emap-views" ref="container" elevation="3" style="height: 650px;">
          <svg v-if="bgfile" class="svg-content" ref="svgContent"
            :viewBox="`${scgViewBox.x} ${scgViewBox.y} ${scgViewBox.width} ${scgViewBox.height}`"
            preserveAspectRatio="xMidYMid meet"
            width="100%" height="100%"
            @mousedown="onBackgroundMouseDown($event)"
            @wheel.prevent="onWheelZoom($event)"
            @contextmenu.prevent
          >
            <g :transform="`translate(${offset.x}, ${offset.y}) scale(${offset.scale})`">
              <!-- 背景圖片 -->
              <image :href="`data:image/jpeg;base64,${bgfile}`" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"/>
              <!-- 選取框 -->
              <rect v-if="selecting"
                class="select-rect"
                :x="selectionBox.x"
                :y="selectionBox.y"
                :width="selectionBox.width"
                :height="selectionBox.height"
              />
              <!-- Node Group -->
              <g v-for="(item, index) in emap_node" :key="index" class="group-item">
                <foreignObject v-if="item['groupstate']" :style="{ 'width': `${item.width}px`, 'height': `${item.height}px`, 'will-change':'transform' }" :x="item.x" :y="item.y">
                  <component :is="getComponentType(item)" v-bind="getComponentProps(item)" />
                </foreignObject>
              </g>
            </g>
          </svg>
          <!-- 右鍵Menu設定 -->
          <div v-if="contextMenu.show" 
            class="context-menu"
            :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
            @contextmenu.prevent>
            <h2 style="margin-left: 15px;">選單設定</h2>
            <v-list :lines="false" density="compact" @click="hideContextMenu">
              <v-list-item @click="openComponent('EDIT', contextMenu.item)">
                <template v-slot:prepend>
                  <v-icon icon="mdi-cog"></v-icon>
                </template>
                <v-list-item-title><h3>編輯</h3></v-list-item-title>
              </v-list-item>
              <v-list-item @click="copyItems(contextMenu.item)">
                <template v-slot:prepend>
                  <v-icon icon="mdi-content-copy"></v-icon>
                </template>
                <v-list-item-title><h3>複製</h3></v-list-item-title>
              </v-list-item>
              <v-list-item @click="deleteItems()">
                <template v-slot:prepend>
                  <v-icon icon="mdi-trash-can"></v-icon>
                </template>
                <v-list-item-title><h3>刪除</h3></v-list-item-title>
              </v-list-item>
              <v-btn @click="setNodePosition(contextMenu.item, 'top-left')">左上</v-btn>
              <v-btn @click="setNodePosition(contextMenu.item, 'top-center')">中上</v-btn>
              <v-btn @click="setNodePosition(contextMenu.item, 'top-right')">右上</v-btn>
              <v-btn @click="setNodePosition(contextMenu.item, 'middle-left')">左中</v-btn>
              <v-btn @click="setNodePosition(contextMenu.item, 'center')">中心</v-btn>
              <v-btn @click="setNodePosition(contextMenu.item, 'middle-right')">右中</v-btn>
              <v-btn @click="setNodePosition(contextMenu.item, 'bottom-left')">左下</v-btn>
              <v-btn @click="setNodePosition(contextMenu.item, 'bottom-center')">中下</v-btn>
              <v-btn @click="setNodePosition(contextMenu.item, 'bottom-right')">右下</v-btn>
            </v-list>
          </div>
        </v-card>
      </v-card>
    </div>
  </v-main>

  <!-- ============================================== 組件設定Dialog ============================================== -->
  <v-dialog v-model="component['dialog']" width="700" persistent>
    <v-card>
      <v-card-title>
        <h2 style="text-align: center;margin: 10px;font-size: 40px;">{{ component['state'] == 'ADD' ? '新增' : '修改' }}組件</h2>
      </v-card-title>
      <v-select v-model="component['item']['type']" style="margin: 0px 30px;" :items="component_type" item-title="name" item-value="value" variant="outlined" label="選擇組件類型" />
      <v-text-field v-model="component['item']['text']" style="margin: 0px 30px;" label="自訂組件Label" variant="outlined" />
      <v-text-field v-model="component['item']['width']" style="margin: 0px 30px;" label="寬度" variant="outlined" type="number" hide-spin-buttons />
      <v-text-field v-model="component['item']['height']" style="margin: 0px 30px;" label="高度" variant="outlined" type="number" hide-spin-buttons />
      <v-autocomplete
        v-model="component['item']['group']"
        style="margin: 0px 30px;"
        :items="group_item"
        item-title="value"
        item-value="value"
        label="選擇或輸入群組"
        variant="outlined"
        @blur="addGroup"
        @keyup.enter="addGroup"
      />
      <v-menu :close-on-content-click="false" min-width="300px">
        <template #activator="{ props }">
          <v-text-field
            style="margin: 0px 30px;"
            v-model="component['item']['color']"
            readonly
            label="自訂組件顏色"
            variant="outlined"
            v-bind="props"
          />
        </template>
        <v-color-picker v-model="component['item']['color']" />
      </v-menu>
      <v-textarea v-if="component['item']['type'] == 'button'"
        v-model="component['item']['function']"
        style="margin: 0px 30px;" variant="outlined"
        label="按鈕功能"
      />
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 20px 0px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeComponent()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn v-if="component['state'] == 'ADD'" class="actions-btn" style="color: black;" variant="outlined" @click="addComponent()">
            <h3>新增</h3>
          </v-btn>
          <v-btn v-else-if="component['state'] == 'EDIT'" class="actions-btn" style="color: black;" variant="outlined" @click="editComponent()">
            <h3>修改</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
  import IconBox from '@/components/Emap/IconBox.vue';
  import ButtonBox from '@/components/Emap/ButtonBox.vue';
  import InputBox from '@/components/Emap/InputBox.vue';

  import { useSetup } from '@/store/module/setup.js' // Pinia
  import { 
    getVueInfo,
    onBackgroundMouseDown, onItemsMouseDown, onMouseMove, onMouseUp, onResizeMouseDown, 
    onResize, onResizeMouseUp, dbclickEditText, blurEditText, 
    onWheelZoom, initZoom,
    hideContextMenu, handleKeydown, copyItems, deleteItems,
  } from '@/views/func/emap.js'
  export default {
    components: {
      IconBox, ButtonBox, InputBox
    },
    data() {
      return {
        Setup: useSetup().$state,
        scgViewBox: { x: 0, y: 0, width: 1000, height: 600 },
        // ========================= Data
        bgIdx: 0,
        bgfile: "",
        emap_list: [],
        emap_node: [],
        // ========================= 設定Menu
        tabnow: 0,
        imgImport: null,
        selectGroup: {},
        // ========================== SVG畫布操作
        componentChange: false, // 啟用/禁用修改
        // 拖拉
        dragging: false, // 拖拉組件
        draggingCanvas: false, // 拖拉畫布
        dragitem_list: [], // 拖拉組件列表
        initDrag: { x: 0, y: 0 },
        // 可拉選擇框
        selecting: false, // 是否正在框選
        selectionBox: { x: 0, y: 0, width: 0, height: 0 }, // 框選區域
        selectionStart: { x: 0, y: 0 }, // 框選起點
        // 右鍵菜單
        contextMenu: { show: false, x: 0, y: 0, target: null },
        // 鍵盤操作
        copy_items: [], //複製貼上用
        history: [], // 歷史狀態
        historyIndex: -1, // 當前狀態位置
        // Resize
        resizing: false, // Resize組件
        resizeItem: null,
        initResize: { x: 0, y: 0, width: 0, height: 0 },
        // 畫布縮放、偏移
        offset: { x: 0, y: 0, scale: 1 },
        // ========================== 設定組件Dialog
        component: {
          dialog: false,
          state: "ADD",
          item: {
            width: 100,
            height: 50,
            type: "",
            text: "",
            color: "#000000",
            group: "All",
            function: "",
          },
        },
        group_item: [], // 群組選單內容
        component_type: [
          { name: "ICON", value: "icon" },
          { name: "輸入框", value: "input" },
          { name: "按鈕", value: "button" },
        ]
      };
    },
    watch: {
      bgIdx() {
        this.initZoom(this);
        this.getEmapNodeList();
        useSetup().setEmapIndex({ index: this.bgIdx })
      },
      selectGroup(val) {
        this.setGroupState(val);
      },
    },
    created() {
      this.getVueInfo(this);
      this.getEmapData();
    },
    mounted() {
      window.addEventListener("keydown", this.handleKeydown);
      window.addEventListener("mousemove", (e) => this.onMouseMove(e));
      window.addEventListener("mouseup", (e) => this.onMouseUp(e));

      window.addEventListener("mousemove", (e) => this.onResize(e), { passive: false });
      window.addEventListener("mouseup", (e) => this.onResizeMouseUp(e), { once: true });
    },
    beforeUnmount() {
      window.removeEventListener("keydown", this.handleKeydown);
      window.removeEventListener("mousemove", (e) => this.onMouseMove(e));
      window.removeEventListener("mouseup", (e) => this.onMouseUp(e));
      
      window.removeEventListener("mousemove", (e) => this.onResize(e), { passive: false });
      window.removeEventListener("mouseup", (e) => this.onResizeMouseUp(e), { once: true });
    },
    methods: {
      getVueInfo,
      // Drag、Resize、Zoom、Keybord func
      onBackgroundMouseDown, onItemsMouseDown, onMouseMove, onMouseUp,
      onResizeMouseDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText,
      onWheelZoom, initZoom,
      hideContextMenu, handleKeydown, copyItems, deleteItems,
      // 取得組件類型
      getComponentType(item) {
        switch (item.type) {
          case "icon": return "IconBox";
          case "input": return "InputBox";
          case "button": return "ButtonBox";
          default: return "div";
        }
      },
      // 傳遞參數、func
      getComponentProps(item) {
        return {
          item,
          'dragitem': this.dragitem_list,
          onDblclick: () => this.dbclickEditText(item),
          onMousedown: (event) => this.onItemsMouseDown(event, item),
          onResizedown: (event) => this.onResizeMouseDown(event, item),
          blurEditText: () => this.blurEditText(item),
          execFunc: () => this.execFunc(item.function)
        };
      },
      // ==================================================================
      // 取得E-map資料
      getEmapData() {
        useSetup().getEmap().then((res)=>{
          this.emap_list = res["data"]["data"] ? res["data"]["data"] : []
          this.Setup.emapInterval = null;
          clearInterval(this.Setup.emapInterval)
          this.getEmapIndex();
          // this.Setup.emapInterval = setInterval(() => {
          //   this.getEmapIndex();
          // }, 5000);
        })
      },
      getEmapIndex() {
        useSetup().getEmapIndex().then((res)=>{
          var data = res["data"]["index"]
          this.bgIdx = data
          if (this.bgIdx >= 0) this.getEmapNodeList();
        })
      },
      getEmapNodeList() {
        const index = this.emap_list.findIndex(obj => obj.id == this.bgIdx);
        if (index != -1) {
          this.bgfile = this.emap_list[index]["file"]
          this.emap_node = this.emap_list[index]["nodes"]
        } else {
          this.bgfile = "";
          this.emap_node = [];
        }
        // 新增Group列表
        var group = []
        for (let i in this.emap_node) {
          if (this.emap_node[i]['group'] != "All") group.push(this.emap_node[i]['group'])
        }
        this.group_item = [{ id: -1, value: "All" }, ...[...new Set(group)].map((item) => ({ id: Math.floor(Math.random() * 10000), value: item }))];
        this.selectGroup = this.group_item[0]
      },
      // 更新Emap資料
      updateEmap() {
        var save_json = []
        var remove_key = ['edit', 'groupstate'] // 移除不要更新的 OBJ Key
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
        this.setGroupState(this.selectGroup);
        return new Promise((resolve, reject) => {
          useSetup().setEmap(save_json)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
        });
      },
      setGroupState(value) {
        if (value['id'] == -1) {
          this.emap_node = this.emap_list[this.bgIdx]["nodes"]
          for (let i in this.emap_node) this.emap_node[i]["groupstate"] = true
        } else {
          for (let i in this.emap_node) 
            this.emap_node[i]["groupstate"] = this.emap_node[i]['group'] === value['value'] || this.emap_node[i]['group'] === "All" ? true : false
        }
      },
      // ======================================= 新增圖片 =======================================
      uploadImg(event) {
        var input = event.target;
        if (input.files && input.files[0]) this.imgImport = input.files[0]
      },
      addImage() {
        let formData = new FormData();
        formData.append("id", this.emap_list.length);
        formData.append("file", this.imgImport);
        formData.append("filename", this.imgImport["name"]);
        formData.append("nodes", JSON.stringify([]))
        var Query = { file: formData }
        useSetup().addEmapImg(Query).then(()=>{
          useSetup().showAlertDialog({ icon: "success", title: "新增底圖" })
          this.getEmapData();
        })
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
          formData.append("id", this.bgIdx);
          formData.append("file", file);
          formData.append("filename", file["name"]);
          var Query = { file: formData }
          useSetup().editEmapImg(Query).then(()=>{
            useSetup().showAlertDialog({ icon: "success", title: "修改底圖" })
            this.getEmapData();
          })
        }
      },
      // ======================================= 畫布內操作 =======================================
      execFunc(func) {
        try {
          if (this.componentChange) {
            console.log("FUNCTION: \r\n",func)
            eval(`(${func})`);
          }
        } catch (error) {
          console.log("ERROR FUNCTION: ",error)
        }
      },
      // ======================================= 組件設定 =======================================
      // 選擇的Node
      focusNode(item) {
        this.dragitem_list = [item];
      },
      // 設定Node固定位置
      setNodePosition(item, position) {
        const w = this.scgViewBox['width']
        const h = this.scgViewBox['height']
        let target_cx, target_cy;
        switch (position) {
          case "top-left":
            target_cx = 0;
            target_cy = 0;
            break;
          case "top-center":
            target_cx = w / 2;
            target_cy = 0;
            break;
          case "top-right":
            target_cx = w;
            target_cy = 0;
            break;
          case "middle-left":
            target_cx = 0;
            target_cy = h / 2;
            break;
          case "center":
            target_cx = w / 2;
            target_cy = h / 2;
            break;
          case "middle-right":
            target_cx = w;
            target_cy = h / 2;
            break;
          case "bottom-left":
            target_cx = 0;
            target_cy = h;
            break;
          case "bottom-center":
            target_cx = w / 2;
            target_cy = h;
            break;
          case "bottom-right":
            target_cx = w;
            target_cy = h;
            break;
        }
        const cx = target_cx - item.width / 2
        const cy = target_cy - item.height / 2
        item.x = cx;
        item.y = cy;
        this.updateEmap();
      },
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
        var emap = this.emap_list[this.bgIdx]
        var items = this.component['item']
        var ID =  Math.floor(Math.random() * 10000000);
        const { width, height, type, text, color, group } = items;
        const info = { 
          id: ID, 
          x: 10, y: 10, 
          width, height, 
          type, text, color, group, 
        };
        if (items['type'] != "") {
          if (items['type'] == 'button') info["function"] = items["function"]
          emap["nodes"] = emap["nodes"] ? emap["nodes"] : []
          emap["nodes"].push(info)
          this.updateEmap().then(()=>{
            // this.getEmapData()
            this.closeComponent();
          });
        } else {
          useSetup().showAlertDialog({ icon: "error", title: "請選擇組件類型" })
        }
      },
      editComponent() {
        var emap = this.emap_list[this.bgIdx]['nodes']
        var items = this.component['item']
        for (let i in emap) {
          if (emap[i].id == items.id) {
            // Object.keys(items).forEach(key => emap[i].hasOwnProperty(key) && (emap[i][key] = items[key]));
            Object.keys(items).forEach(key => (emap[i][key] = items[key]));
            this.updateEmap().then(()=>{
              // this.getEmapData()
              this.closeComponent();
            });
          }
        }
      },
      closeComponent() {
        this.component['dialog'] = false;
        setTimeout(() => {
          this.component = {
            dialog: false,
            state: "ADD",
            item: {
              width: 100,
              height: 50,
              type: "",
              text: "",
              color: "#000000",
              group: "All",
              function: "",
            },
          }
        }, 100);
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