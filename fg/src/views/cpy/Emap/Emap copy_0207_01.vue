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
                <v-tab :value="0"><h3>選擇圖片</h3></v-tab>
                <v-tab :value="1"><h3>新增圖片</h3></v-tab>
              </v-tabs>
              <v-tabs-window v-model="tabnow">
                <v-tabs-window-item :value="0" style="width: 500px;">
                  <v-card v-if="emap_list.length > 0">
                    <div style="display: flex;">
                      <div style="width: 100%;margin: 20px 20px 0px;">
                        <v-select v-model="bgIdx" :items="emap_list" item-title="image" item-value="id" variant="outlined" label="選擇bg"></v-select>
                      </div>
                      <div style="margin: 30px 15px 0px 0px;">
                        <input type="file" accept=".jpg,.png" ref="fileInput" @change="editImage" style="display: none" />
                        <v-btn color="primary" @click="triggerFileUpload">
                          <h3>修改底圖</h3>
                        </v-btn>
                      </div>
                    </div>
                    <div class="basemap-menu">
                      <div v-for="(item, index) in emap_node" :key="index">
                        <div style="display: flex;margin: 10px 0px;">
                          <h3 :style="{cursor: 'pointer', color: dragitem_list.includes(item) ? 'blue' : 'black'}" @click="focusNode(item)">
                            {{ item.text }}
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
        <!-- ========================================================== 畫布內容 ========================================================== -->
        <v-card class="emap-views" elevation="3" style="min-height: 650px">
          <svg v-if="bgfile" class="svg-content" ref="svgContent"
            viewBox="0 0 1000 600"
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
                :x="Math.min(selectionBox.x, selectionBox.x + selectionBox.width)"
                :y="Math.min(selectionBox.y, selectionBox.y + selectionBox.height)"
                :width="Math.abs(selectionBox.width)"
                :height="Math.abs(selectionBox.height)"
              />
              <!-- Node Group -->
              <g v-for="(item, index) in emap_node" :key="index" class="group-item">
                <foreignObject :x="item.x" :y="item.y" :style="{ 'width': `${item.width}px`, 'height': `${item.height}px`, 'will-change':'transform' }">
                  <!-- ============= ICON ============= -->
                  <div v-if="item['type'] == 'icon'" 
                    class="icon-box"
                    :style="{ width: `${item.width}px`, height: `${item.height}px`, border: setborder(item) }"
                    @dblclick="dbclickEditText(item)"
                    @mousedown.stop="onItemsMouseDown($event, item)"
                  >
                    <div v-if="item.edit" style="width: 100%;height: 100%;" class="edit-box">
                      <v-icon class="edit-input"
                        :style="{ 'fontSize': `${Math.min(item.width, item.height)}px` }"
                        :color="item.color"
                        icon="mdi-map-marker"
                        @blur="blurEditText(item)"
                        @dblclick.stop
                      />
                      <div class="resize-handle" @mousedown.stop.prevent="onResizeMouseDown($event, item)" />
                    </div>
                    <v-icon v-else
                      :style="{ 'fontSize': `${Math.min(item.width, item.height)}px` }"
                      :color="item.color"
                      icon="mdi-map-marker"
                      @mousedown.stop="onItemsMouseDown($event, item)"
                    />
                  </div>
                  <!-- ============= 輸入框 ============= -->
                  <div v-else-if="item['type'] == 'input'" 
                    class="input-box"
                    :style="{ width: `${item.width}px`, height: `${item.height}px`, border: setborder(item) }"
                    @dblclick="dbclickEditText(item)"
                    @mousedown.stop="onItemsMouseDown($event, item)"
                  >
                    <div v-if="item.edit" style="width: 100%;height: 100%;" class="edit-box">
                      <input class="edit-input" type="text"
                        v-model="item['text']"
                        @blur="blurEditText(item)"
                        @dblclick.stop
                      />
                      <div class="resize-handle" @mousedown.stop.prevent="onResizeMouseDown($event, item)" />
                    </div>
                    <h2 v-else :style="{'color': item.color}">{{ item['text'] || "Default" }}</h2>
                  </div>

                  <!-- ============= 按鈕 ============= -->
                  <div v-else-if="item['type'] == 'button'" 
                    :style="{ 'width': `${item.width}px`, 'height': `${item.height}px` }"
                    @dblclick="dbclickEditText(item)" 
                    @mousedown.stop="onItemsMouseDown($event, item)"
                  >
                    <div v-if="item.edit" style="width: 100%;height: 100%;" class="edit-box">
                      <input class="edit-input" type="text"
                        v-model="item['text']"
                        @blur="blurEditText(item)"
                        @dblclick.stop
                      />
                      <div class="resize-handle" @mousedown.stop.prevent="onResizeMouseDown($event, item)" />
                    </div>
                    <v-btn v-else 
                      :style="{ border: setborder(item), 'width': `${item.width}px`, 'height': `${item.height}px` }"
                      :color="item.color" 
                      @click="execFunc(item['function'])"
                    >
                      <h3>{{ item['text'] || "Default" }}</h3>
                    </v-btn>
                  </div>
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
      
      <v-menu :close-on-content-click="false" min-width="300px">
        <template #activator="{ props }">
          <v-text-field
            style="margin: 0px 30px;"
            v-model="component['item']['color']"
            readonly
            label="自訂組件顏色"
            variant="outlined"
            v-bind="props"
          >
          </v-text-field>
        </template>
        <v-color-picker v-model="component['item']['color']" />
      </v-menu>
      <v-textarea v-if="component['item']['type'] == 'button'"
        v-model="component['item']['function']"
        style="margin: 0px 30px;" variant="outlined"
        label="按鈕功能"
      >
      </v-textarea>
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
  import { useSetup } from '@/store/module/setup.js' // Pinia
  import { 
    getVueInfo,
    onBackgroundMouseDown, onItemsMouseDown, onMouseMove, onMouseUp, onResizeMouseDown, 
    onResize, onResizeMouseUp, dbclickEditText, blurEditText, 
    onWheelZoom, initZoom,
    hideContextMenu, handleKeydown, copyItems, deleteItems,
  } from '@/views/func/emap.js'
  export default {
    data() {
      return {
        Setup: useSetup().$state,
        tabnow: 0,
        imgImport: null,
        bgIdx: 0,
        bgfile: "",
        emap_list: [],
        emap_node: [],
        // ==========================
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
        // ==========================
        component: {
          dialog: false,
          state: "ADD",
          item: {
            type: "",
            text: "",
            width: 100,
            height: 50,
            function: "",
            color: "#000000",
          },
        },
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
        this.checkEmapInfo();
        useSetup().setEmapIndex({ index: this.bgIdx })
      }
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
      setborder(item) {
        return this.dragitem_list.includes(item) ? '2px solid blue' : 'none'
      },
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
          if (this.bgIdx >= 0) this.checkEmapInfo();
        })
      },
      checkEmapInfo() {
        const index = this.emap_list.findIndex(obj => obj.id == this.bgIdx);
        if (index != -1) {
          this.bgfile = this.emap_list[index]["file"]
          this.emap_node = this.emap_list[index]["nodes"]
        } else {
          this.bgfile = "";
          this.emap_node = [];
        }
      },
      updateEmap() {
        var save_json = []
        var remove_key = ['edit']
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
        return new Promise((resolve, reject) => {
          useSetup().setEmap(save_json)
            .then((response) => resolve(response))
            .catch((error) => reject(error));
        });
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
        // var result = ""
        // try {
        //   // 使用 new Function 動態創建函數，並將函數綁定 this 指向 Vue 實例
        //   const func = new Function('return ' + func).bind(this);
        //   result = func() || 'Function executed';
        // } catch (error) {
        //   result = 'Error: ' + error.message;
        // }
        // console.log("$##############", result)
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
      focusNode(item) {
        this.dragitem_list = [item];
      },
      openComponent(state, item) {
        this.component["dialog"] = true;
        this.component["state"] = state;
        if (state == "EDIT") {
          this.component["item"] = JSON.parse(JSON.stringify(item));
        }
      },
      addComponent() {
        var emap = this.emap_list[this.bgIdx]
        var items = this.component['item']
        var ID =  Math.floor(Math.random() * 10000000);
        var info = { 
          id: ID, 
          x: 10, y: 10, 
          width: items['width'], 
          height: items['height'],
          type: items['type'], 
          color: items['color'], 
          text: items['text'], 
        }
        if (items['type'] != "") {
          if (items['type'] == 'button') info["function"] = items["function"]
          emap["nodes"] = emap["nodes"] ? emap["nodes"] : []
          emap["nodes"].push(info)
          this.updateEmap().then(()=>{
            this.getEmapData()
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
              this.getEmapData()
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
              type: "",
              text: "",
              function: "",
              color: "#000000",
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
  stroke-dasharray: 4
}

// ICON格式
.icon-box {
  display: flex;
  justify-content: center;
  align-items: center;
}

// 輸入框文字格式
.input-box > h2 {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow-wrap: anywhere;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -moz-user-select: none;
  -ms-user-select: none; 
  user-select: none;
  border: black 1px solid;
}


// Resize 修改框
.edit-box {
  .edit-input {
    width: 100%;
    height: 100%;
    text-align: center;
    border: black 1px solid;
  }
  .resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 8px;
    height: 8px;
    background-color: gray;
    cursor: se-resize;
  }
}

// 右鍵選單
.context-menu {
  width: 250px;
  position: absolute;
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