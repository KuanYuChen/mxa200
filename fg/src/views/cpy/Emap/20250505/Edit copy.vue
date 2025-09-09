<template>
  <v-main :class="Setup.stopAnimation ? '' : 'show-animation'" style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 0px;">
        <!-- ========================================================== 畫布內容 ========================================================== -->
          <v-layout>
            <!-- 操作提示Snack Bar -->
            <div class="snackbar-stack-container">
              <div v-for="(snack, i) in snackbar_list" :key="snack.id" class="snackbar-wrapper">
                <v-snackbar v-model="snack.show" timeout="-1" :color="snack.bgcolor" location="bottom end" transition="slide-x-reverse-transition">
                  {{ snack.text }}
                  <template #actions><v-btn icon @click="closeSnackbar(i)"><v-icon>mdi-close</v-icon></v-btn></template>
                </v-snackbar>
              </div>
            </div>
            <!-- 修改頁面Header Bar -->
            <v-app-bar class="emap-headerbar-drawer" :color="emap_headerbar['background']">
              <v-app-bar-nav-icon variant="text" :color="emap_headerbar['color']" icon="mdi-menu-down" @click.stop="svgNavCtrl = !svgNavCtrl"></v-app-bar-nav-icon>
              <h3 :style="{'margin': '0px 20px', 'color': emap_headerbar['color'], 'cursor': 'pointer', 'user-select': 'none'}" @click="openHeaderbar()">
                {{ emap_headerbar['title'] }}
              </h3>
              <div v-if="$vuetify.display.mdAndUp">
                <v-btn v-for="(button, index) in emap_headerbar['btn']" readonly :key="index" :color="button['color']"><h3>{{ button['text'] }}</h3></v-btn>
              </div>
              <div v-else>
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn v-bind="props" :color="emap_headerbar['color']" icon="mdi-dots-vertical" />
                  </template>
                  <v-btn v-for="(button, index) in emap_headerbar['btn']" readonly :key="index" :color="button['color']"><h3>{{ button['text'] }}</h3></v-btn>
                </v-menu>
              </div>
              <v-spacer></v-spacer>
              <div :style="{'color': emap_headerbar['color']}">
                <v-menu>
                  <template v-slot:activator="{ props }">
                    <v-btn style="margin-right: 20px;" :color="emap_headerbar['color']" v-bind="props">
                      <h3>操作選單</h3>
                    </v-btn>
                  </template>
                  <v-list style="width: 200px;padding: 10px; text-align: center;">
                    <v-list-item @click="componentLevel('front')">
                      <v-list-item-title><h3>最上層</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="componentLevel('back')">
                      <v-list-item-title><h3>最下層</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="componentOneLevel('up')">
                      <v-list-item-title><h3>上一層</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="componentOneLevel('down')">
                      <v-list-item-title><h3>下一層</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="distributedAlignment(this, 'horizontal')">
                      <v-list-item-title><h3>水平均分</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="distributedAlignment(this, 'vertical')">
                      <v-list-item-title><h3>垂直均分</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="centerComponents(this, 'horizontal')">
                      <v-list-item-title><h3>水平置中</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="centerComponents(this, 'vertical')">
                      <v-list-item-title><h3>垂直置中</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="setItemPosition(this, 'top')">
                      <v-list-item-title><h3>靠上對齊</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="setItemPosition(this, 'bottom')">
                      <v-list-item-title><h3>靠下對齊</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="setItemPosition(this, 'left')">
                      <v-list-item-title><h3>靠左對齊</h3></v-list-item-title>
                    </v-list-item>
                    <v-list-item @click="setItemPosition(this, 'right')">
                      <v-list-item-title><h3>靠右對齊</h3></v-list-item-title>
                    </v-list-item>
                    <!-- <v-list-item @click="distributeEvenly(this, 'horizontal')">
                      <template v-slot:prepend><v-icon icon="mdi-distribute-horizontal-center" /></template>
                      <h3>水平均分 (暫時隱藏)</h3>
                    </v-list-item>
                    <v-list-item @click="distributeEvenly(this, 'vertical')">
                      <template v-slot:prepend><v-icon icon="mdi-distribute-horizontal-center" /></template>
                      <h3>垂直均分 (暫時隱藏)</h3>
                    </v-list-item> -->
                  </v-list>
                </v-menu>
                <v-icon v-show="Setup.editCount > 0" style="margin-right: 30px; font-size: 40px;" @click="checkToSave(true)" icon="mdi-cloud-download-outline" />
                <!-- <v-icon style="margin-right: 30px; font-size: 40px;" @click="gotoViewPage()" icon="mdi-home-map-marker" /> -->
                <v-icon style="margin-right: 20px; font-size: 30px;" @click.stop="configNavCtrl = !configNavCtrl" icon="mdi-dots-horizontal" />
              </div>
            </v-app-bar>

            <!-- 修改頁面Navigation Bar -->
            <v-navigation-drawer v-model="svgNavCtrl" class="emap-nav-drawer" temporary :style="{'background': emap_navbar['background']}">
              <v-list>
                <v-list-item v-for="(nav, index) in emap_navbar['btn']" :key="index">
                  <div :style="{ color: nav['color'], 'display': 'flex' }">
                    <!-- <v-icon style="margin-right: 15px;">{{ nav["icon"] }}</v-icon> -->
                    <h3 style="margin-left: 15px;white-space: nowrap;">{{ nav["text"] }}</h3>
                  </div>
                </v-list-item>
              </v-list>
              <v-icon style="margin: 10px;" @click="openNavbar()">mdi-border-color</v-icon>
            </v-navigation-drawer>

            <!-- 設定資訊Navigation Bar -->
            <v-navigation-drawer v-model="configNavCtrl" class="config-nav-drawer" temporary location="right" width="500">
              <v-card variant="text" style="border: 1px solid #c9c9c9; user-select:none;">
                <v-tabs v-model="configNavTab" grow>
                  <v-tab :value="0"><h3> 選取組件窗格</h3></v-tab>
                  <v-tab :value="1"><h3> 匯入/匯出</h3></v-tab>
                </v-tabs>
                <v-tabs-window v-model="configNavTab">
                  <v-tabs-window-item :value="0" style="width: 500px;">
                    <v-card variant="text">
                      <div class="emap-menu">
                        <div v-for="(item, index) in sortMenuGroup" :key="item.id">
                          <div v-if="item.type != 'Group'" style="display: flex; margin: 10px 0px;">
                            <h3 :style="{'max-width': '200px', cursor: 'pointer', color: selectcomponent_list.includes(item) ? 'blue' : 'black', 'margin-top': '7px'}" @click="focusComponent(item)">
                              {{ item.idname || 'Default' }}
                            </h3>
                            <v-spacer></v-spacer>
                            <v-btn variant="text" @click="openComponent('EDIT', item)"><h3>修改</h3></v-btn>
                            <v-btn variant="text" color="red" @click="removeComponent(item)"><h3>刪除</h3></v-btn>
                            <v-btn style="cursor: pointer" variant="text" :color="item.lock ? 'blue' : 'black'" @click="lockComponent([item])"><h3>鎖定</h3></v-btn>
                          </div>
                          <div v-else>
                            <v-list>
                              <v-list-group>
                                <template v-slot:activator="{ props }"><v-list-item v-bind="props" :title="item.idname" /></template>
                                <v-list-item v-for="(node, idx) in item.nodes" :key="node.id">
                                  <div style="display: flex;">
                                    <h3 :style="{'max-width': '200px', cursor: 'pointer', color: selectcomponent_list.includes(node) ? 'blue' : 'black', 'margin-top': '7px'}" @click="focusComponent(node)">
                                      {{ node.idname || 'Default' }}
                                    </h3>
                                    <v-spacer></v-spacer>
                                    <v-btn variant="text" @click="openComponent('EDIT', node)"><h3>修改</h3></v-btn>
                                    <v-btn variant="text" color="red" @click="removeComponent(node)"><h3>刪除</h3></v-btn>
                                    <v-btn variant="text" color="red" @click="cancelGroup('Menu', node)"><h3>解除群組</h3></v-btn>
                                  </div>
                                </v-list-item>
                              </v-list-group>
                            </v-list>
                          </div>
                        </div>
                      </div>
                    </v-card>
                  </v-tabs-window-item>
                  <v-tabs-window-item :value="1" style="width: 500px;">
                    <v-card variant="text" class="emap-menu">
                      <v-file-input style="margin: 20px 20px 0px;" accept=".json" variant="outlined" prepend-icon="" label="選擇Emap檔案" hide-details @change="uploadEmapJSON" />
                      <div style="display: flex; margin: 20px;">
                        <v-btn variant="outlined" @click="exportEmapData()"><h3>匯出</h3></v-btn>
                        <v-spacer></v-spacer>
                        <v-btn variant="outlined" @click="importEmapData()"><h3>匯入</h3></v-btn>
                      </div>
                    </v-card>
                  </v-tabs-window-item>
                </v-tabs-window>
              </v-card>
            </v-navigation-drawer>

            <v-main class="emap-main-contain" style="line-height: 0;">
              <v-card class="emap-views" elevation="0" :style="{'height': '85vh', 'background': svgBG['color']}">
                <v-icon v-show="svgOffset.x != 0 && svgOffset.y != 0 || svgOffset.scale != 1" 
                  style="position: absolute;z-index: 999; margin: 10px;" icon="mdi-reload" 
                  @click="initZoom()"
                />
                <div style="width: 100%; height: 100%; overflow: auto;">
                  <!-- ===================================== SVG組件顯示 ===================================== -->
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
                        preserveAspectRatio="none" :clip-path="cropMode ? '' : 'url(#clip_area)'"
                      />
                      <!-- 定義裁剪區域 -->
                      <defs>
                        <clipPath v-show="!cropMode" id="clip_area">
                          <rect :x="clipBox.x" :y="clipBox.y" :width="clipBox.width" :height="clipBox.height" />
                        </clipPath>
                      </defs>
                      <!-- 裁剪框 (僅在裁剪模式開啟時顯示) -->
                      <g v-show="cropMode">
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
                      <!-- SVG組件 (舊方法，會導致按鈕組件陰影錯誤) -->
                      <!-- <g v-for="(item, index) in svg_nodes" :key="item.id" class="group-item">
                        <template v-if="item.type === 'Group'">
                          <foreignObject v-for="(node, idx) in item.nodes" :key="node.id" :x="node.n_x" :y="node.n_y" :width="node.width" :height="node.height">
                            <div v-show="node['showComponent']" :style="getItemStyle(node)">
                              <component :is="emapComponentType(node)" v-bind="emapComponentProps(node, 'Group')" />
                            </div>
                          </foreignObject>
                          <rect
                            :x="item.n_x" :y="item.n_y"
                            :width="item.width" :height="item.height"
                            fill="rgba(255, 255, 255, 0.1)"
                            :stroke="selectcomponent_list.includes(item) ? 'blue' : setGroupColor(item)"
                            stroke-dasharray="5,5"
                            stroke-width="3"
                            @dblclick="dbclickEditText(item)"
                            @mousedown.stop="handleItemsMouseDown($event, item, 'Component')"
                          />
                          <foreignObject v-if="item.edit" :x="item.n_x" :y="item.n_y" :width="item.width" :height="item.height" @dblclick="dbclickEditText(item)">
                            <div class="edit-box">
                              <div class="resize-handle" id="top-left" @mousedown.stop.prevent="handleItemsResizeDown($event, item)" />
                              <div class="resize-handle" id="top-right" @mousedown.stop.prevent="handleItemsResizeDown($event, item)" />
                              <div class="resize-handle" id="bottom-left" @mousedown.stop.prevent="handleItemsResizeDown($event, item)" />
                              <div class="resize-handle" id="bottom-right" @mousedown.stop.prevent="handleItemsResizeDown($event, item)" />
                            </div>
                          </foreignObject>
                        </template>
                        <template v-else>
                          <foreignObject v-show="item['showComponent']" :x="item.n_x" :y="item.n_y" :width="item.width" :height="item.height">
                            <div :style="getItemStyle(item)" @dblclick="dbclickEditText(item)" @mousedown.stop="handleItemsMouseDown($event, item, 'Component')">
                              <component :is="emapComponentType(item)" v-bind="emapComponentProps(item, 'Component')" />
                            </div>
                          </foreignObject>
                        </template>
                      </g> 
                      <rect v-show="selectingBox"
                        class="select-rect"
                        :x="selectBoxArea.x"
                        :y="selectBoxArea.y"
                        :width="selectBoxArea.width"
                        :height="selectBoxArea.height"
                      /> -->
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
                      <div
                        class="group-border"
                        :style="{
                          position: 'absolute',
                          left: `${item.n_x}px`,
                          top: `${item.n_y}px`,
                          width: `${item.width}px`,
                          height: `${item.height}px`,
                          border: '3px dashed',
                          borderColor: selectcomponent_list.includes(item) ? 'blue' : setGroupColor(item),
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }"
                        @dblclick="dbclickEditText(item)"
                        @mousedown.stop="handleItemsMouseDown($event, item, 'Component')"
                      >
                        <div v-if="item.edit" class="edit-box">
                          <div class="resize-handle" id="top-left" @mousedown.stop.prevent="handleItemsResizeDown($event, item)" />
                          <div class="resize-handle" id="top-right" @mousedown.stop.prevent="handleItemsResizeDown($event, item)" />
                          <div class="resize-handle" id="bottom-left" @mousedown.stop.prevent="handleItemsResizeDown($event, item)" />
                          <div class="resize-handle" id="bottom-right" @mousedown.stop.prevent="handleItemsResizeDown($event, item)" />
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
                  <div v-show="selectingBox"
                    :style="{
                      position: 'absolute', 
                      left: `${selectBoxArea.x}px`, top: `${selectBoxArea.y}px`,
                      width: `${selectBoxArea.width}px`, height: `${selectBoxArea.height}px`,
                      'zIndex': 9999,
                      background: 'rgba(0, 0, 255, 0.15)',
                      border: '2px dashed blue',
                    }"
                  />
                  <!-- ===================================== 右鍵Menu設定 ===================================== -->
                  <div v-if="rightclickMenu.show" class="right-click-menu"
                    :style="{ top: rightclickMenu.y + 'px', left: rightclickMenu.x + 'px', 'line-height': 1.5 }"
                    @contextmenu.prevent>
                    <h2 style="margin-left: 15px;">{{ rightclickMenu.type == 'items' ? '組件設定' : '頁面設定'}}</h2>
                    <v-list v-if="rightclickMenu.type == 'items'"  :lines="false" density="compact" @click="hideContextMenu">
                      <div v-if="rightclickMenu.item.length == 1">
                        <v-list-item v-if="!rightclickMenu.item[0].lock && rightclickMenu.item[0]['type'] != 'Group'" @click="openComponent('EDIT', rightclickMenu.item[0])">
                          <template v-slot:prepend><v-icon icon="mdi-cog" /></template>
                          <h3>編輯</h3>
                        </v-list-item>
                      </div>
                      <v-list-item @click="lockComponent(rightclickMenu.item)">
                        <template v-slot:prepend><v-icon :icon="checkLockComponent(rightclickMenu.item) ? 'mdi-lock-open' : 'mdi-lock'" /></template>
                        <h3>{{ checkLockComponent(rightclickMenu.item) ? '解鎖' : '鎖定' }}</h3>
                      </v-list-item>
                      <div v-if="!checkLockComponent(rightclickMenu.item)">
                        <v-list-item @click="copyItems()">
                          <template v-slot:prepend><v-icon icon="mdi-content-copy" /></template>
                          <h3>複製</h3>
                        </v-list-item>
                        <v-list-item @click="deleteItems()">
                          <template v-slot:prepend><v-icon icon="mdi-trash-can" /></template>
                          <h3>刪除</h3>
                        </v-list-item>
                      </div>
                      <!-- 能選多個組件，但不能有被鎖定組件 -->
                      <v-list-item v-if="rightclickMenu.item.length > 1 && !checkLockComponent(rightclickMenu.item)" @click="addComponentGroup(rightclickMenu.item)">
                        <template v-slot:prepend><v-icon icon="mdi-group" /></template>
                        <h3>群組</h3>
                      </v-list-item>
                      <!-- 只能選一個組件、並且為群組還不能鎖定 -->
                      <v-list-item v-if="rightclickMenu.item.length == 1 && rightclickMenu.item[0]['type'] == 'Group' && !rightclickMenu.item[0].lock" @click="cancelGroup('Right Click', rightclickMenu)">
                        <template v-slot:prepend><v-icon icon="mdi-ungroup" /></template>
                        <h3>解除群組</h3>
                      </v-list-item>
                    </v-list>
                    <v-list v-else-if="rightclickMenu.type == 'background'"  :lines="false" density="compact" @click="hideContextMenu">
                      <v-list-item @click="openBackground(rightclickMenu.item)">
                        <template v-slot:prepend><v-icon icon="mdi-cog" /></template>
                        <h3>編輯背景資訊</h3>
                      </v-list-item>
                      <!-- <v-list-item v-if="svgBG['image']" @click="toggleCropMode()">
                        <template v-slot:prepend><v-icon icon="mdi-content-cut" /></template>
                        <h3>裁剪</h3>
                      </v-list-item> -->
                      <v-list-item @click="pasteItems()">
                        <template v-slot:prepend><v-icon icon="mdi-content-paste" /></template>
                        <h3>貼上</h3>
                      </v-list-item>
                      <v-list-item @click="openComponent('ADD')">
                        <template v-slot:prepend><v-icon icon="mdi-attachment-plus" /></template>
                        <h3>新增組件</h3>
                      </v-list-item>
                    </v-list>
                  </div>
                </div>
              </v-card>
            </v-main>
          </v-layout>
      </v-card>
    </div>
  </v-main>
  <!-- ============================================== 組件設定Dialog ============================================== -->
  <ComponentDialog :component="componentItem"
    @uploadImg="uploadImg" @closeComponent="closeComponent"
    @addComponent="addComponent" @editComponent="editComponent"
  />
  <!-- ============================================== 背景資訊設定Dialog ============================================== -->
  <BackgroundDialog :bg="bgItem" :svgViewBox="svgViewBox" 
    @editImage="editImage" @removeBg="removeBg"
    @closeBackground="closeBackground" @editBackground="editBackground"
  />
  <!-- ============================================== 設定 Headerbar Dialog ============================================== -->
  <HeaderbarDialog :headerbar="headerbarItem" @editHeaderbar="editHeaderbar" @closeHeaderbar="closeHeaderbar" />
  <!-- ============================================== 設定 Navbar Dialog ============================================== -->
  <NavbarDialog :navbar="navbarItem" @editNavbar="editNavbar" @closeNavbar="closeNavbar" />
</template>

<script>
  import ComponentDialog from '@/components/Emap/Dialog/Component.vue';
  import BackgroundDialog from '@/components/Emap/Dialog/Background.vue';
  import HeaderbarDialog from '@/components/Emap/Dialog/Headerbar.vue';
  import NavbarDialog from '@/components/Emap/Dialog/Navbar.vue';

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
  import Polyline from '@/components/Emap/Box/Polyline.vue';

  import { useSetup } from '@/store/module/setup.js' // Pinia
  import { initVueInfo, handleBackgroundMouseDown, handleItemsMouseDown, onMouseMove, onMouseUp, handleResizeWindow, handleItemsResizeDown, onResize, onResizeMouseUp, 
           dbclickEditText, blurEditText, toggleCropMode, startResizeClipBox, resizeClipBoxHandles, onWheelZoom, initZoom, hideContextMenu } from '@/views/Emap/emap.js'
  import { bringSelectedItems, moveItemsByOverlap, distributedAlignment, centerComponents, setItemPosition } from '@/views/Emap/operateMenu.js'
  import { handleKeydown, copyItems, pasteItems, deleteItems, saveHistory, setTypeCount } from '@/views/Emap/keyboard.js'

  export default {
    components: { 
      ComponentDialog, BackgroundDialog, HeaderbarDialog, NavbarDialog, 
      ImageBox, TextBox, IconBox, ButtonBox, InputBox, TimerBox, MarqueeBox, LinechartBox, Devtable, Monitor, Polyline
    },
    data() {
      return {
        Setup: useSetup().$state,
        // ========================= Snackbar Dialog參數設定
        snackbarID: 0,
        snackbar_list: [],
        // ========================= Data
        paginationID: 0, // 修改頁面 => 分頁ID
        emapInfo: {},
        // SVG 背景參數
        svgBG: { image: "", color: "#FFFFFF", imageopacity: 1 },
        // SVG Node列表
        svg_nodes: [],
        emap_headerbar: { title: "Default-Title", background: "#569981", color: "#FFFFFF", btn: [] },
        emap_navbar: { background: "#B5BDBC", btn: [] },
        edit_history: [], // 編輯歷史紀錄
        // ========================= 設定Menu
        configNavCtrl: false, // 設定Nav bar開關
        configNavTab: 0, // Nav bar Tab
        imgImport: null,
        emapImport: null, // 匯入Emap json資料
        // ========================== SVG畫布操作
        initViewBox: { x: 0, y: 0, width: 1000, height: 600 }, // 初始View Box
        componentChange: false, // 啟用/禁用修改
        svgNavCtrl: false, // svg內的navbar開關
        svgViewBox: { x: 0, y: 0, width: 1000, height: 600 }, // SVG View Box
        selectcomponent_list: [], // 選擇組件列表
        groupColor: new Map(), // 群組組件設定顏色(隨機顏色)
        // ========================= 裁剪背景圖片 (隱藏功能)
        cropMode: false, // 是否開啟裁剪模式
        clipBox: { x: 0, y: 0, width: 1000, height: 600 }, // 裁剪框資訊
        // ========================= 選取框
        selectingBox: false, // 是否正在框選
        selectBoxArea: { x: 0, y: 0, width: 0, height: 0 }, // 框選區域
        rightclickMenu: { show: false, x: 0, y: 0, target: null }, // 右鍵菜單
        svgOffset: { x: 0, y: 0, scale: 1 }, // 畫布縮放、偏移
        // ========================== 設定組件 Dialog (預設為按鈕組件)
        componentItem: {
          dialog: false,
          state: "ADD",
          info: {
            showComponent: true,    // 是否顯示組件
            type: "button",         // 組件類型
            width: 100,             // 組件寬度
            height: 50,             // 組件高度
            n_x: 10,                // 組件X軸
            n_y: 10,                // 組件Y軸
            title: "button_Default",// 組件標題
            point: "",              // 組件點位
            func: "",               // 組件功能

            // 功能區分
            textColor: "#FFFFFF",   // 文字顏色(預設白色)
            iconColor: "#000000",   // ICON顏色(預設黑色)
            bgColor: "#000000",     // 組件背景顏色(預設黑色)
            tableColor: "#000000",  // Table表顏色(預設黑色)
            tabletextColor: "#FFFFFF",// Table文字顏色(預設白色)
            borderColor: "#000000",   // 邊框顏色(預設黑色)
            showBorder: true,         // 顯示邊框
            fontSize: 20,             // 文字大小

            shadowColor: "#000000",   // 陰影顏色(預設黑色)
            shadowSize: 0,            // 陰影大小(預設0px)
            btnOpacity: 1,            // 按鈕透明度(預設1)
            btnRadius: 10,            // 按鈕圓角(預設10px)
            btnReadonly: false,       // 按鈕唯讀(預設false)
          },
        },
        // ========================== 設定背景資訊 Dialog
        bgItem: {
          dialog: false,
          info: {},
        },
        // ========================== 設定Headerbar Dialog
        headerbarItem: {
          dialog: false,
          info: {},
        },
        // ========================== 設定Navbar Dialog
        navbarItem: {
          dialog: false,
          item: {},
        },
      };
    },
    watch: {
      // 關閉設定抽屜時確認選擇的組件是否為鎖定，是則過濾
      configNavCtrl(isOpen) {
        if (!isOpen) this.selectcomponent_list = this.selectcomponent_list.filter(item => !item.lock)
      },
    },
    created() {
      this.initVueInfo(this);   // 取得Vue資訊
      this.getEmapData();       // 取得Emap資料
      this.getDatapointList();  // 取得點位資料
    },
    beforeUnmount() {
      window.removeEventListener("resize", this.handleResizeWindow);
      window.removeEventListener("keydown", this.handleKeydown);
      window.removeEventListener("mousemove", this.onMouseMove);
      window.removeEventListener("mouseup", this.onMouseUp);
      window.removeEventListener("mousemove", this.onResize);
      window.removeEventListener("mouseup", this.onResizeMouseUp);
    },
    mounted() {
      this.handleResizeWindow()
      window.addEventListener("resize", this.handleResizeWindow);
      window.addEventListener("keydown", this.handleKeydown);
      window.addEventListener("mousemove", this.onMouseMove);
      window.addEventListener("mouseup", this.onMouseUp);
    },
    computed: {
      bgImageURL() {
        if (!this.svgBG?.image) return ""
        return `http://${window.location.hostname}:4456/image/${this.svgBG['image']}`
      },
      // 排序Menu內部的組件 (層級: 其他 > 群組)
      sortMenuGroup() {
        const otherNodes = [], groupNodes = [];
        for (const node of this.svg_nodes) {
          if (node.type === 'Group') groupNodes.push(node);
          else otherNodes.push(node);
        }
        return [...otherNodes, ...groupNodes];
      }
    },
    methods: {
      // 測試最大數量用(250個組件)
      emapLimitTest() {
        for (let i=1; i <= 125; i++) {
          var test_x = Math.floor(Math.random() * 1900)
          var test_y = Math.floor(Math.random() * 600)
          var pictureinfo = {
            "borderColor": "#000000",
            "color": "#000000",
            "fontSize": 20,
            "func": "",
            "group": "All",
            "height": 200,
            "id": Math.floor(Math.random() * 100000000),
            "image": "1920_工作區域 1.png",
            "lock": false,
            "n_x": test_x,
            "n_y": test_y,
            "point": "",
            "showBorder": true,
            "showComponent": true,
            "title": "image_Default",
            "type": "image",
            "width": 200
          }
          var iconInfo = {
            "borderColor": "#000000",
            "color": "#000000",
            "fontSize": 20,
            "func": "",
            "group": "All",
            "height": 50,
            "icon": "mdi-account",
            "id": Math.floor(Math.random() * 100000000),
            "lock": false,
            "n_x": test_x,
            "n_y": test_y,
            "point": "",
            "showBorder": true,
            "showComponent": true,
            "title": "icon_Default",
            "type": "icon",
            "width": 50
          }
          var textinfo = {
            "borderColor": "#000000",
            "color": "#4BD3A7",
            "fontSize": 20,
            "func": "",
            "group": "All",
            "height": 100,
            "id": Math.floor(Math.random() * 100000000),
            "lock": false,
            "n_x": test_x,
            "n_y": test_y,
            "point": "",
            "showBorder": false,
            "showComponent": true,
            "title": "text_Default",
            "type": "text",
            "width": 200
          }
          this.svg_nodes.push(iconInfo)
          this.svg_nodes.push(textinfo)
        }
      },
      // ======================================= Emap Function =======================================
      initVueInfo,
      // Drag函數
      handleBackgroundMouseDown, handleItemsMouseDown, onMouseMove, onMouseUp, 
      // Resize函數
      handleResizeWindow, handleItemsResizeDown, onResize, onResizeMouseUp, dbclickEditText, blurEditText, 
      toggleCropMode, startResizeClipBox, resizeClipBoxHandles, 
      // Zoom函數、右鍵Menu函數
      onWheelZoom, initZoom, hideContextMenu, 
      // 操作選單函數
      bringSelectedItems, moveItemsByOverlap, distributedAlignment, centerComponents, setItemPosition, 
      // 鍵盤函數
      handleKeydown, copyItems, pasteItems, deleteItems, saveHistory, setTypeCount, 
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
          polyline: "Polyline",
        };
        return typeMap[item.type] || "div";
      },
      // 傳遞參數、func
      emapComponentProps(item, componentType) {
        return {
          componentChange: this.componentChange,
          item,
          'dragitem': this.selectcomponent_list,
          onDblclick: () => this.dbclickEditText(item),
          onMousedown: (event) => this.handleItemsMouseDown(event, item),
          onResizedown: (event) => this.handleItemsResizeDown(event, item),
          blurEditText: () => this.blurEditText(item),
          changeEmap: (type) => this.changeEmap(type)
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
      // 設定群組顏色
      setGroupColor(item) {
        if (!this.groupColor.has(item.idname)) this.groupColor.set(item.idname, getRandomHexColor());
        function getRandomHexColor() {
          const hex = Math.floor(Math.random() * 0xffffff).toString(16);
          return "#" + hex.padStart(6, "0");
        }
        return this.groupColor.get(item.idname);
      },
      // ======================================= Snack Bar Dialog訊息框 =======================================
      // Snackbar Dialog顯示訊息框
      addSnackbar(message, bg="black") {
        const newSnack = { id: this.snackbarID++, text: message, show: true, bgcolor: bg };
        this.snackbar_list.push(newSnack);
        setTimeout(() => {
          const index = this.snackbar_list.findIndex(s => s.id === newSnack.id);
          if (index !== -1) this.snackbar_list[index].show = false;
        }, 3000);
      },
      // 手動關閉按鈕
      closeSnackbar(index) {
        if (this.snackbar_list[index]) this.snackbar_list[index].show = false; // 觸發關閉動畫
      },
      // 計算當前 Snackbar 下面有多少個 Snackbar
      // calculateSnackbarStyle(index) {
      //   const SNACKBAR_HEIGHT = 60  // 估算的單個 Snackbar 高度 (px)
      //   const SNACKBAR_SPACING = 10 // Snackbar 之間的垂直間距 (px)
      //   const BOTTOM_OFFSET = 20    // 堆疊距離底部的初始偏移 (px)
      //   const itemsBelow = this.snackbar_list.length - 1 - index;
      //   // 計算垂直偏移量
      //   const verticalOffset = BOTTOM_OFFSET + itemsBelow * (SNACKBAR_HEIGHT + SNACKBAR_SPACING);
      //   return { bottom: `${verticalOffset}px`, position: 'absolute'};
      // },
      // ======================================= Emap資料操作 =======================================
      // 取得E-map資料
      getEmapData() {
        this.paginationID = this.$route.params.pathnow
        useSetup().getPageInfo({idx: this.paginationID}).then((res)=> {
          this.emapInfo = res["data"]
        }).catch(()=> {
          this.emapInfo = {
            id: this.paginationID,
            content: { image: "", background: "#FFFFFF", imageopacity: 1, nodes: [] },
            headerbar: { title: "Default-Title", background: "#569981", color: "#FFFFFF", btn: [] },
            navbar: { background: "#B5BDBC", btn: [] },
          }
        }).finally(()=> this.initEmapData())
      },
      initEmapData() {
        var initEmapInfo = JSON.parse(JSON.stringify(this.emapInfo))
        this.svgBG = {
          image: initEmapInfo["content"]["image"] || "",
          color: initEmapInfo["content"]["background"] || "#FFFFFF",
          imageopacity: initEmapInfo["content"]["imageopacity"] || 1
        }
        this.svg_nodes = initEmapInfo["content"]["nodes"];
        this.emap_headerbar = initEmapInfo["headerbar"];
        this.emap_navbar = initEmapInfo["navbar"];
        // this.emapLimitTest()
      },
      // 更新Emap資料 (未儲存資料)
      changeEmap(type, showsnackbar=true) {
        if (showsnackbar) this.addSnackbar(type)
        console.log("Edit Event Type: ", type)
        this.Setup.editCount += 1
        return Promise.resolve("ok");
      },
      // 更新Emap資料 (儲存資料)
      checkToSave(showdialog) {
        var remove_key = ['edit', 'imagefile', 'timenow', 'hover', 'max_val', 'max_x', 'min_val', 'min_x', 'dragOrigin'] // 更新資料時移除不要更新的 OBJ Key
        const filterNode = (node) => {
          const filtered = Object.keys(node).reduce((acc, key) => {
            if (!remove_key.includes(key)) acc[key] = node[key];
            return acc;
          }, {});
          // 如果type為 Group，處理內部 nodes
          if (node.type === 'Group' && Array.isArray(node.nodes)) filtered.nodes = node.nodes.map(child => filterNode(child)); // 遞迴處理
          return filtered;
        };
        const filterNodes = this.svg_nodes.map(node => filterNode(node));
        this.emapInfo = {
          headerbar: this.emap_headerbar,
          navbar: this.emap_navbar,
          content: {
            nodes: filterNodes,
            image: this.svgBG["image"],
            background: this.svgBG["color"],
            imageopacity: this.svgBG["imageopacity"],
          }
        }
        var Query = { idx: this.paginationID, data: this.emapInfo }
        useSetup().setPageInfo(Query).then(()=>{ 
          if (showdialog) useSetup().showAlertDialog({ icon: "success", title: "儲存當前頁面狀態" })
          this.Setup.editCount = 0;
          this.saveHistory()
          this.getEmapData()
        }).catch(()=> useSetup().showAlertDialog({ icon: "error", title: "儲存失敗" }))
      },
      // 取得點位列表資料
      getDatapointList() {
        useSetup().getDatapointList().then((res)=> {
          this.Setup.datapoint_list = [{name: "無", value: ""}]
          for (let i in res["data"]) this.Setup.datapoint_list.push({name: i, value: i})
        }).catch(()=> this.Setup.datapoint_list = [{name: "無", value: ""}])
      },
      // ======================================= 前往觀看頁面 =======================================
      gotoViewPage() {
        if (this.Setup.editCount > 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "請先更新資料" });
          return
        }
        var viewPageRoute = "/view/1"
        useSetup().getEmapHomepage().then((res)=>{
          var data = res["data"]["index"]
          viewPageRoute = `/view/${data == 0 ? 1 : data}`
        })
        .catch(()=> viewPageRoute = "/view/1")
        .finally(()=> this.$router.push(viewPageRoute))
      },
      // ======================================= 設定操作(Menu抽屜) =======================================
      // Focus組件
      focusComponent(item) {
        this.selectcomponent_list = [item];
      },
      // 刪除組件
      removeComponent(item) {
        if (item.lock) return;
        for (let i in this.svg_nodes) {
          var node = this.svg_nodes[i]
          if (node.type == "Group") {
            for (let j in node.nodes) {
              if (node.nodes[j].id == item.id) {
                this.setEmap(node.nodes, j)
                if (node.nodes.length == 0) this.svg_nodes.splice(i, 1)
                return;
              }
            }
          }
          if (node.id == item.id) {
            this.setEmap(this.svg_nodes, i)
            return;
          }
        }
      },
      // 確認多個組件中是否有鎖定之組件
      checkLockComponent(items) {
        for (let i in items) if (items[i].lock) return true;
        return false;
      },
      // 鎖定組件
      lockComponent(items) {
        var checkLock = this.checkLockComponent(items)
        for (let i in items) {
          items[i].lock = checkLock ? false : true
          if (items[i].type == "Group") for (let j in items[i].nodes) items[i].nodes[j].lock = checkLock ? false : true
        }
        this.changeEmap(`${checkLock ? '解鎖' : '鎖定'}組件`)
      },
      // =================================== 操作選單 ===================================
      // ============================= 組件層級設定 (最上層/最下層) =============================
      componentLevel(type) {
        if (this.selectcomponent_list.length === 0) return;
        if (this.selectcomponent_list.some(item => item.lock)) {
          this.addSnackbar(`選取的組件中含有鎖定組件，無法${type == 'front' ? '上' : '下'}移`, "red");
          return;
        }
        this.svg_nodes = this.bringSelectedItems(this.svg_nodes, this.selectcomponent_list, type);
        this.changeEmap(`組件移到最${type == 'front' ? '上' : '下'}層`);
      },
      // ============================= 組件層級設定 (上一層/下一層) =============================
      componentOneLevel(type) {
        if (this.selectcomponent_list.length === 0) return;
        if (this.selectcomponent_list.some(item => item.lock)) {
          this.addSnackbar(`選取的組件中含有鎖定組件，無法${type == 'up' ? '上' : '下'}移`, "red");
          return;
        }
        const newNodes = this.moveItemsByOverlap(this.svg_nodes, this.selectcomponent_list, type);
        if (newNodes) {
          this.svg_nodes = newNodes;
          this.changeEmap(`組件${type == 'up' ? '上' : '下'}移一層`);
        } else this.addSnackbar(`組件已在最${type == 'up' ? '上' : '下'}層`);
      },
      // =================================== 群組操作 ===================================
      // 將組件設為群組
      addComponentGroup(items) {
        // 收集所有要加入群組的元件（type為group 則展開 group 內的 nodes）
        const groupList = items.flatMap(item => {
          if (item.type === "Group") {
            this.svg_nodes = this.svg_nodes.filter(node => node.id !== item.id); // 移除舊 group
            return item.nodes;
          } else {
            return [item];
          }
        });
        // 計算群組邊界
        const minX = Math.min(...groupList.map(i => i.n_x));
        const minY = Math.min(...groupList.map(i => i.n_y));
        const maxX = Math.max(...groupList.map(i => i.n_x + i.width));
        const maxY = Math.max(...groupList.map(i => i.n_y + i.height));
        // 建立新群組
        const newGroup = {
          id: crypto.randomUUID(), //Math.floor(Math.random() * 10000000),
          type: "Group",
          n_x: minX, n_y: minY,
          width: maxX - minX, height: maxY - minY,
          lock: false,
          showComponent: true,
          nodes: groupList,
        };
        this.setTypeCount(newGroup);
        const groupedIds = new Set(groupList.map(i => i.id)); // 從 svg_nodes 中移除已經打包進群組的元件
        this.svg_nodes = this.svg_nodes.filter(node => !groupedIds.has(node.id));
        this.svg_nodes.push(newGroup); // 插入新群組
        this.changeEmap("新增群組");
      },
      // 取消群組
      cancelGroup(type, target) {
        if (type === 'Right Click') {
          const groupItem = target.item[0]; // 右鍵點到的群組
          groupItem.nodes.forEach(node => {
            this.svg_nodes.push(node);
          });
          this.svg_nodes = this.svg_nodes.filter(node => node.id !== groupItem.id); // 移除群組本身
          this.changeEmap("取消群組");
        } else {
          // 從群組中取消單一元件（Nav Bar 操作）
          for (let i = 0; i < this.svg_nodes.length; i++) {
            const component = this.svg_nodes[i];
            if (component.type === "Group") {
              const index = component.nodes.findIndex(n => n.id === target.id);
              if (index !== -1) {
                this.svg_nodes.push(target);
                component.nodes.splice(index, 1); // 從群組中移除
                // 若群組只剩一個元素，解散群組
                if (component.nodes.length === 1) {
                  this.svg_nodes.push(component.nodes[0]);
                  this.svg_nodes.splice(i, 1);
                }
                this.changeEmap("取消群組");
                return;
              }
            }
          }
        }
      },
      // =================================== 匯入/匯出組件檔案 ===================================
      // 匯入組件檔案
      uploadEmapJSON(event) {
        var input = event.target;
        this.emapImport = null;
        if (input.files && input.files[0]) this.emapImport = input.files[0]
      },
      importEmapData() {
        console.log(this.emapImport)
        const reader = new FileReader();
        reader.onload = (event) => {
          var data = event.target.result
          var parseData = JSON.parse(data)
          parseData["id"] = this.paginationID
          var Query = { idx: this.paginationID, data: parseData }
          useSetup().setPageInfo(Query).finally(()=>{ 
            useSetup().showAlertDialog({ icon: "success", title: "匯入完成" })
            this.emapImport = null;
            this.getEmapData();
          })
        };
        reader.readAsText(this.emapImport);
      },
      // 匯出組件檔案
      exportEmapData() {
        const jsonData = JSON.stringify(this.emapInfo, null, 2); // 格式化 JSON
        const blob = new Blob([jsonData], { type: "application/json" }); // 建立 Blob 物件
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "export.json";
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url); // 釋放 URL
        document.body.removeChild(a);
      },
      // =================================== 組件設定(Dialog) ===================================
      openComponent(state, item) {
        if (state == "EDIT" && item.lock) return;
        this.componentItem["dialog"] = true;
        this.componentItem["state"] = state;
        if (state == "EDIT") {
          this.componentItem["info"] = JSON.parse(JSON.stringify(item));
        }
      },
      // 上傳組件圖片
      uploadImg(event) {
        var input = event.target;
        this.imgImport = null;
        if (input.files && input.files[0]) this.imgImport = input.files[0]
      },
      // 新增組件
      addComponent() {
        var items = this.componentItem['info']
        this.setTypeCount(items);
        var ID =  crypto.randomUUID() //Math.floor(Math.random() * 10000000);
        const info = { id: ID, lock: false, ...items };
        // 確認物件是否為正確格式
        this.setFormate(info)
        // 沒有選擇類型時禁止新增
        if (items['type'] == ""){
          useSetup().showAlertDialog({ icon: "error", title: "請選擇組件類型" })
          return;
        }
        // type為圖片則上傳圖片
        if (items['type'] == 'image') {
          if (!this.imgImport) {
            useSetup().showAlertDialog({ icon: "error", title: "沒有選擇圖片" })
            return;
          }
          info['image'] = this.imgImport["name"]
          let formData = new FormData();
          formData.append("file", this.imgImport);
          useSetup().uploadImage({ file: formData }).finally(()=> {
            ADD(this, info);
            return;
          })
        } else ADD(this, info);
        function ADD(that, data) {
          that.svg_nodes.push(data)
          that.checkToSave(true);
          that.closeComponent();
        }
      },
      // 修改組件
      editComponent() {
        var items = this.componentItem['info']
        // 確認物件是否為正確格式
        this.setFormate(items)
        if (items['type'] == "Group") {
          for (let i in items['nodes']) {
            var nodes = items['nodes'][i]
            this.setFormate(nodes)
          }
        }
        for (let i in this.svg_nodes) {
          var node = this.svg_nodes[i]
          if (node.type == "Group") {
            for (let j in node.nodes) {
              if (node.nodes[j].id == items.id) {
                node.nodes[j] = items
                this.checkToSave(true);
                this.closeComponent();
                return;
              }
            }
          }
          if (node.id == items.id) {
            // 更新時確認2邊格式是否一樣
            Object.keys(node).forEach(key => { if (!(key in items)) delete node[key] });
            Object.assign(node, items);
            // type為圖片則上傳圖片
            if (items["type"] == "image") {
              if (this.imgImport == null && items['image'] == undefined) {
                useSetup().showAlertDialog({ icon: "error", title: "沒有選擇圖片" })
                return
              }
              let formData = new FormData();
              formData.append("file", this.imgImport);
              useSetup().uploadImage({ file: formData }).finally(()=> {
                items['image'] = this.imgImport ? this.imgImport["name"] : items["image"]
                node['image'] = items['image']
                EDIT(this);
                return;
              })
            } else EDIT(this);
          }
        }
        function EDIT(that) {
          that.checkToSave(true);
          that.closeComponent();
        }
      },
      // 關閉組件Dialog
      closeComponent() {
        this.componentItem['dialog'] = false;
        setTimeout(() => {
          this.imgImport = null;
          this.componentItem = {
            dialog: false,
            state: "ADD",
            info: {
              showComponent: true,
              type: "button",
              width: 100,
              height: 50,
              n_x: 10,
              n_y: 10,
              title: "button_Default",
              point: "",
              func: "",
              textColor: "#FFFFFF",
              iconColor: "#000000",
              bgColor: "#000000",
              tableColor: "#000000",
              tabletextColor: "#FFFFFF",
              borderColor: "#000000",
              showBorder: true,
              fontSize: 20,

              shadowColor: "#000000",
              shadowSize: 0,
              btnOpacity: 1,
              btnRadius: 10,
              btnReadonly: false,
            },
          }
        }, 100);
      },
      // =================================== 背景資訊設定(Dialog) ===================================
      openBackground(item) {
        this.bgItem["dialog"] = true;
        this.bgItem["info"] = item;
      },
      // 修改圖片
      editImage(event) {
        const file = event.target.files[0];
        if (file) {
          console.log("選擇的檔案:", file);
          // 這裡可以上傳文件，例如使用 FormData 發送到 API
          let formData = new FormData();
          formData.append("file", file);
          useSetup().uploadImage({ file: formData }).finally(()=> {
            this.svgBG["image"] = file["name"]
            this.emapInfo["content"]["image"] = file["name"]
            this.changeEmap("修改底圖");
          })
        }
      },
      removeBg() {
        this.svgBG["image"] = ""
        this.changeEmap("Remove Background Image", false).then(()=>{ 
          useSetup().showAlertDialog({ icon: "success", title: "刪除底圖" })
        })
      },
      editBackground() {
        this.svgBG["color"] = this.bgItem["info"]["background"]
        this.svgBG["imageopacity"] = this.bgItem["info"]["imageopacity"]
        this.svgBG["image"] = this.bgItem["info"]["image"]
        this.changeEmap("修改背景資訊").then(()=>{
          this.closeBackground();
        })
      },
      closeBackground() {
        this.bgItem["dialog"] = false;
      },
      // =================================== Headerbar設定(Dialog) ===================================
      openHeaderbar() {
        this.headerbarItem['dialog'] = true;
        this.headerbarItem['info'] = JSON.parse(JSON.stringify(this.emap_headerbar));
      },
      editHeaderbar() {
        if (this.headerbarItem['info']['title'] == "") this.headerbarItem['info']['title'] = "Default-Title"
        this.emap_headerbar = this.headerbarItem['info'];
        this.emapInfo["headerbar"] = this.emap_headerbar;
        this.changeEmap("Headerbar", false).then(()=>{ this.closeHeaderbar() });
      },
      closeHeaderbar() {
        this.headerbarItem['dialog'] = false;
      },
      // =================================== Navbar設定(Dialog) ===================================
      openNavbar() {
        this.navbarItem['dialog'] = true;
        this.navbarItem['info'] = JSON.parse(JSON.stringify(this.emap_navbar));
      },
      editNavbar() {
        this.emap_navbar = this.navbarItem['info'];
        this.emapInfo["navbar"] = this.emap_navbar;
        this.changeEmap("Navbar", false).then(()=>{ this.closeNavbar() });
      },
      closeNavbar() {
        this.navbarItem['dialog'] = false;
      },
      // =================================== Function ===================================
      // 確認物件是否為正確格式
      setFormate(item) {
        var int_list = ['fontSize', 'width', 'height', 'n_x', 'n_y', 'shadowSize', 'btnRadius']
        for (let i in int_list) {
          if (item[int_list[i]]) item[int_list[i]] = parseInt(item[int_list[i]])
        }
      },
      // 設定要刪除的組件
      setEmap(nodeData, idx) {
        nodeData.splice(idx, 1)
        this.changeEmap("移除組件")
      }
    },
  };
</script>

<style lang="scss" scoped>
// 設定Menu
.emap-menu {
  margin: 20px; 
  padding: 0px 10px 10px 10px;
  height: 75vh; 
  overflow: overlay;
}

// SVG畫布
.svg-content {
  min-width: 100%;
  min-height: 100%;
}

// 選取框
.select-rect {
  fill:rgba(0, 0, 255, 0.15);
  stroke:blue;
  stroke-dasharray: 4;
}

// 右鍵選單
.right-click-menu {
  width: 250px;
  max-height: 300px;
  overflow: auto;
  position: absolute;
  background: white;
  border: 2px solid #ccc;
  border-radius: 10px;
  padding: 15px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

// Resize 修改框
.edit-box {
  .resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: gray;
    cursor: pointer;
  }
  // 左上角
  #top-left {
    top: 0;
    left: 0;
    cursor: nw-resize;
  }
  // 右上角
  #top-right {
    top: 0;
    right: 0;
    cursor: ne-resize;
  }
  // 左下角
  #bottom-left {
    bottom: 0;
    left: 0;
    cursor: sw-resize;
  }
  // 右下角
  #bottom-right {
    bottom: 0;
    right: 0;
    cursor: se-resize;
  }
}
</style>