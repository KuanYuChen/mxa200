<template>
  <!-- Navbar 主要抽屜資訊 -->
  <v-navigation-drawer style="background: rgb(233, 233, 233)" v-model="Setup.settingDrawer" class="setting-drawer" width="300" temporary @click="closeNavMenu">
    <template v-slot:prepend><v-list-item class="nav-border"><h3>功能設定</h3></v-list-item></template>

    <v-list style="user-select: none;" :opened="opened_setting_group">
      <NavbarTree v-for="node in setting_path_list" :key="node.path" :node="node" :depth="0"
        @open-navmenu="openNavMenu" @open-table="openTablePageConfig" @open-normal="openNormalPageConfig" 
      />
    </v-list>
  </v-navigation-drawer>

  <v-navigation-drawer v-if="Setup.systemInfo['Module'] != 'MXA-200'" style="background: rgb(233, 233, 233)" v-model="Setup.pageDrawer" class="path-drawer" width="300" temporary @click="closeNavMenu">
    <template v-slot:prepend><v-list-item class="nav-border"><h3>頁面編輯</h3></v-list-item></template>

    <v-list style="user-select: none;" :opened="opened_page_group">
      <NavbarTree v-for="node in edit_path_list" :key="node.path" :node="node" :depth="0"
        @open-navmenu="openNavMenu" @open-table="openTablePageConfig" @open-normal="openNormalPageConfig" 
      />
    </v-list>
  </v-navigation-drawer>

  <!-- NavBar 右鍵Menu設定 -->
  <div v-if="navMenu.show" class="nav-menu" :style="{ top: `${navMenu.y}px`, left: `${navMenu.x}px`, 'position': 'absolute', 'z-index': '99999' }" @contextmenu.prevent>
    <div style="display: flex;justify-content: right;">
      <v-icon style="margin: 10px 10px 0px 0px;" @click="navMenu.show = false">mdi-close-circle</v-icon>
    </div>
    <v-list :lines="false" density="compact" @click="navMenu.show = false">
      <!-- 編輯頁面可使用 -->
      <div v-if="navMenu.type == 'Config'">
        <v-list-item @click="setViewFirstPage(navMenu)">
          <template v-slot:prepend><v-icon icon="mdi-cog" /></template>
          <v-list-item-title><h2>設為首頁</h2></v-list-item-title>
        </v-list-item>
        <v-list-item @click="copyPageInfo(navMenu)">
          <template v-slot:prepend><v-icon icon="mdi-content-copy" /></template>
          <v-list-item-title><h2>複製資訊</h2></v-list-item-title>
        </v-list-item>
        <v-list-item @click="pastePageInfo(navMenu)">
          <template v-slot:prepend><v-icon icon="mdi-content-paste" /></template>
          <v-list-item-title><h2>貼上資訊</h2></v-list-item-title>
        </v-list-item>
      </div>
      <v-list-item @click="navMenu.type == 'Mod' ? openTablePageConfig('EDIT', navMenu) : openNavDialog(navMenu)">
        <template v-slot:prepend><v-icon icon="mdi-pen" /></template>
        <v-list-item-title><h2>修改頁面資訊</h2></v-list-item-title>
      </v-list-item>
      <v-list-item v-if="navMenu.type == 'Mod' || navMenu.type == 'AssetManagement'" @click="removeTablePage(navMenu)">
        <template v-slot:prepend><v-icon icon="mdi-trash-can-outline" /></template>
        <v-list-item-title><h2>刪除模組頁面</h2></v-list-item-title>
      </v-list-item>
      <v-list-item v-if="navMenu.type == 'Organize' || navMenu.type == 'HistoryChart'" @click="removeNormalPage(navMenu)">
        <template v-slot:prepend><v-icon icon="mdi-trash-can-outline" /></template>
        <v-list-item-title><h2>刪除模組頁面</h2></v-list-item-title>
      </v-list-item>
    </v-list>
  </div>
  <!-- ======================================= 右鍵修改Navbar參數 Dialog ======================================= -->
  <ConfigDialog :icon_list="Setup.icon_list" :config="config" @editNavInfo="editNavInfo" @closeNavDialog="closeNavDialog" />
  <!-- ======================================= 設定模組Navbar Dialog ======================================= -->
  <TableDialog :icon_list="Setup.icon_list" :mod="mod" @addTablePage="addTablePage" @editTablePage="editTablePage" @closeTablePage="closeTablePage" />
  <!-- ======================================= 設定組織Navbar Dialog ======================================= -->
  <NormalDialog :org="org" @addNormalPage="addNormalPage" @editNormalPage="editNormalPage" @closeNormalPage="closeNormalPage" />
</template>

<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

import ConfigDialog from "@/components/Navbar/ConfigDialog.vue"
import TableDialog from "@/components/Navbar/TableDialog.vue"
import NormalDialog from "@/components/Navbar/NormalDialog.vue"
import NavbarTree from './Navbar/NavbarTree.vue';

import NavPath from "./json/path.json"
import IconList from "./json/icon.json"

export default {
  components: { ConfigDialog, TableDialog, NormalDialog, NavbarTree },
  data() {
    return {
      Setup: useSetup().$state,
      // 抽屜列表 (分為功能設定、頁面編輯)
      setting_path_list: [],
      edit_path_list: [],
      // 抽屜開啟狀態 (分為功能設定、頁面編輯)
      opened_setting_group: [],
      opened_page_group: [],
      
      pathMap: new Map(), // 查詢路徑用
      navMenu: { show: false, x: 0, y: 0, item: {} }, // 右鍵菜單
      cpyEmapInfo: {}, // 拿來複製、貼上Emap畫面用
      // 右鍵修改Navbar參數 Dialog
      config: { dialog: false, item: {} },
      // 設定模組、資產管理Navbar Dialog
      mod: {
        dialog: false, state: "ADD", 
        item: { title: "", icon: "mdi-blank", routename: "", header: [] }
      },
      // 設定組織Navbar Dialog
      org: {
        dialog: false, state: "ADD", 
        item: { title: "", icon: "mdi-blank", routename: "" }
      }
    }
  },
  watch: {
    'Setup.settingDrawer'(isOpen) { if (!isOpen) this.closeNavDrawer('setting') },
    'Setup.pageDrawer'(isOpen) { if (!isOpen) this.closeNavDrawer('page') },
    $route(r) {
      var idx = this.checkEditPath(r["path"])
      if (idx != -1) this.Setup.settingDrawer = false;
      this.Setup.headerTitle = this.getHeaderbarTitle(this.Setup.path_list, r["path"])
      // 清除全部Interval
      for (let i in this.Setup.interval_list) {
        clearInterval(this.Setup[this.Setup.interval_list[i]])
        this.Setup[this.Setup.interval_list[i]] = null;
      }
    },
  },
  mounted() {
    setTimeout(() => {
      this.getInitInfo();
      this.closeRightclickEvent();
    }, 100);
  },
  methods: {
    // 關閉功能設定、頁面編輯右鍵原始功能
    closeRightclickEvent() {
      var settingClass = document.querySelector(".setting-drawer")
      if (settingClass) settingClass.addEventListener("contextmenu", (e) => e.preventDefault());
      var pathClass = document.querySelector(".path-drawer")
      if (pathClass) pathClass.addEventListener("contextmenu", (e) => e.preventDefault());
    },
    // =========================================== 取得初始設定 ===========================================
    getInitInfo() {
      var that = this;
      this.Setup.icon_list = IconList
      useSetup().getRouterPath()
        .then((res)=> {
          var setPath = navInfoDiff(res["data"]["Path"])
          this.setting_path_list = setPath['setting']
          this.edit_path_list = setPath['edit']
          this.Setup.path_list = res["data"]["Path"]
        })
        .catch(()=> {
          var setPath = navInfoDiff(NavPath["Path"])
          this.setting_path_list = setPath['setting']
          this.edit_path_list = setPath['edit']
          this.Setup.path_list = NavPath["Path"]
        })
        .finally(()=> {
          // 確認預覽頁的首頁
          useSetup().getEmapHomepage().then((res)=>{
            var data = res["data"]["index"]
            this.Setup.viewFirstPage = data == 0 ? 1 : data
          }).catch(() => this.Setup.viewFirstPage = 1)
          var idx = this.checkEditPath(this.$route.path)
          if (idx != -1) this.Setup.settingDrawer = false;
          this.Setup.headerTitle = this.getHeaderbarTitle(this.Setup.path_list, this.$route.path)
          this.buildPathMap(this.Setup.path_list);
        })
        // 區分抽屜內資訊
        function navInfoDiff(path_list) {
          var setting_path = [] // 功能設定
          var edit_path = []    // 頁面編輯
          if (that.Setup.systemInfo['Module'] != 'MXA-200') {
            for (let i in path_list) {
              // 只有編輯、預覽、模組頁面在頁面編輯抽屜內
              if (path_list[i]['path'] == '/view' || path_list[i]['value'] == 'Config' || path_list[i]['value'] == 'Mod' || path_list[i]['value'] == 'HistoryChart') {
                edit_path.push(path_list[i])
                continue
              }
              setting_path.push(path_list[i])
            }
          } else {
            setting_path.push(that.$utils.findObjectByKey(path_list, 'value', 'Data'))
          }
          return { setting: setting_path, edit: edit_path }
        }
    },
    // =========================================== 關閉抽屜欄位 ===========================================
    closeNavDrawer(type) {
      this.navMenu.show = false
      if (type === 'setting') this.opened_setting_group = []
      else if (type === 'page') this.opened_page_group = []
    },
    // =========================================== 修改Navbar參數 ===========================================
    openNavDialog(context) {
      this.config["dialog"] = true
      this.config["item"] = {}
      this.config["item"] = JSON.parse(JSON.stringify(context.item))
    },
    editNavInfo() {
      var findPath = this.findAndUpdateNode(this.Setup.path_list, this.config["item"]["path"] || this.config["item"]["value"], this.config["item"]);
      if (findPath) {
        var Query = { data: { 'Path': this.Setup.path_list } }
        useSetup().setRouterPath(Query).then(()=> this.closeNavDialog())
      }
    },
    closeNavDialog() {
      this.config["dialog"] = false;
    },
    // =========================================== Table表頁面設定 ===========================================
    openTablePageConfig(state, nav) {
      this.mod["dialog"] = true;
      this.mod["state"] = state;
      if (state == "EDIT") {
        this.mod["item"] = JSON.parse(JSON.stringify(nav['item']))
        var moduleQuery = { id: 1, table: `${nav['item']['routename']}` }
        useSetup().getIDData(moduleQuery).then((res)=>{
          var header = JSON.parse(res["data"]["header"])
          var content = JSON.parse(res["data"]["content"])
          this.mod["item"]['header'] = header
          this.mod["item"]['content'] = content
        })
      }
    },
    addTablePage() {
      var moduleItem = this.mod['item']
      if (moduleItem['routename'] == "") {
        useSetup().showAlertDialog({ icon: "warn", title: "請設定路徑名稱" })
        return
      }
      var findEmptyKey = moduleItem['header'].filter(item => item["key"] === "" || item["key"] === null || item["key"] === undefined);
      if (findEmptyKey.length != 0) {
        useSetup().showAlertDialog({ icon: "warn", title: "有Key沒有填寫" })
        return
      }
      var repeatKeyList = moduleItem['header'].filter((item, index, self) =>self.findIndex(t => t["key"] === item["key"]) !== index);
      if (repeatKeyList.length != 0) {
        useSetup().showAlertDialog({ icon: "warn", title: "有重複的Key" })
        return
      }
      for (let i in this.Setup.path_list) {
        var path = this.Setup.path_list[i]
        if (path['value'] == 'Mod') {
          var addPath = {
            "icon": moduleItem['icon'],
            "title": moduleItem['title'],
            "routename": moduleItem['routename'],
            "path": `/mod/${moduleItem['routename']}`
          }
          const exists = path['child'].some(item => item['path'] === addPath['path'])
          if (exists) {
            useSetup().showAlertDialog({ icon: "warn", title: "找到重複路徑名稱" })
            return
          }
          path['child'].push(addPath)
        }
        if (path['value'] == 'AssetManagement') {
          var addPath = {
            "icon": moduleItem['icon'],
            "title": moduleItem['title'],
            "routename": moduleItem['routename'],
            "path": `/assetmanagement/${moduleItem['routename']}`
          }
          const exists = path['child'].some(item => item['path'] === addPath['path'])
          if (exists) {
            useSetup().showAlertDialog({ icon: "warn", title: "找到重複路徑名稱" })
            return
          }
          path['child'].push(addPath)
        }
      }
      var pathQuery = { data: { 'Path': this.Setup.path_list } }
      console.log(pathQuery)
      var moduleQuery = {
        table: `${moduleItem['routename']}`,
        data: { header: JSON.stringify(moduleItem['header']), content: JSON.stringify([]) }
      }
      var api_list = [useSetup().setRouterPath(pathQuery), useSetup().addData(moduleQuery)]
      Promise.all(api_list).finally(()=> this.closeTablePage())
    },
    editTablePage() {
      var findPath = this.findAndUpdateNode(this.Setup.path_list, this.mod["item"]["path"], this.mod["item"]);
      if (findPath) {
        var moduleItem = this.mod['item']
        if (moduleItem['routename'] == "") {
          useSetup().showAlertDialog({ icon: "warn", title: "請設定路徑名稱" })
          return
        }
        var findEmptyKey = moduleItem['header'].filter(item => item["key"] === "" || item["key"] === null || item["key"] === undefined);
        if (findEmptyKey.length != 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "有Key沒有填寫" })
          return
        }
        var repeatKeyList = moduleItem['header'].filter((item, index, self) =>self.findIndex(t => t["key"] === item["key"]) !== index);
        if (repeatKeyList.length != 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "有重複的Key" })
          return
        }
        var pathQuery = { data: { 'Path': this.Setup.path_list } }
        var moduleQuery = {
          id: 1,
          table: `${moduleItem['routename']}`,
          data: { header: JSON.stringify(moduleItem['header']), content: JSON.stringify(moduleItem['content']) }
        }
        var api_list = [useSetup().setRouterPath(pathQuery), useSetup().editIDData(moduleQuery)]
        Promise.all(api_list).finally(()=> this.closeTablePage())
      }
    },
    removeTablePage(info) {
      for (let i in this.Setup.path_list) {
        var path = this.Setup.path_list[i]
        if (path['value'] == 'Mod') {
          const index = path['child'].findIndex(item => item.path === info['item']['path']);
          if (index !== -1) {
            path['child'].splice(index, 1);
            var pathQuery = { data: { 'Path': this.Setup.path_list } }
            useSetup().setRouterPath(pathQuery)
          }
        }
      }
    },
    closeTablePage() {
      this.mod["dialog"] = false;
      setTimeout(() => {
        this.mod['item'] = {
          title: "",
          icon: "mdi-blank",
          routename: "",
          header: []
        }
      }, 200);
    },
    // =========================================== 一般頁面路徑設定 ===========================================
    openNormalPageConfig(state, item) {
      this.org["dialog"] = true;
      this.org["state"] = state;
      if (state == "EDIT") {
        this.org["item"] = JSON.parse(JSON.stringify(item))
      }
    },
    addNormalPage() {
      var orgItem = this.org['item']
      if (orgItem['routename'] == "") {
        useSetup().showAlertDialog({ icon: "warn", title: "請設定路徑名稱" })
        return
      }
      for (let i in this.Setup.path_list) {
        var path = this.Setup.path_list[i]
        if (path['value'] == 'Organize') {
          var addPath = {
            "icon": orgItem['icon'],
            "title": orgItem['title'],
            "routename": orgItem['routename'],
            "path": `/organize/${orgItem['routename']}`
          }
          const exists = path['child'].some(item => item['path'] === addPath['path'])
          if (exists) {
            useSetup().showAlertDialog({ icon: "warn", title: "找到重複路徑名稱" })
            return
          }
          path['child'].push(addPath)
        }
        if (path['value'] == 'HistoryChart') {
          var addPath = {
            "icon": orgItem['icon'],
            "title": orgItem['title'],
            "routename": orgItem['routename'],
            "path": `/historychart/${orgItem['routename']}`
          }
          const exists = path['child'].some(item => item['path'] === addPath['path'])
          if (exists) {
            useSetup().showAlertDialog({ icon: "warn", title: "找到重複路徑名稱" })
            return
          }
          path['child'].push(addPath)
        }
      } 
      var pathQuery = { data: { 'Path': this.Setup.path_list } }
      var api_list = [useSetup().setRouterPath(pathQuery)]
      Promise.all(api_list).finally(()=> this.closeNormalPage())
    },
    editNormalPage() {
      var findPath = this.findAndUpdateNode(this.Setup.path_list, this.mod["item"]["path"], this.mod["item"]);
      if (findPath) {
        var orgItem = this.org['item']
        if (orgItem['routename'] == "") {
          useSetup().showAlertDialog({ icon: "warn", title: "請設定路徑名稱" })
          return
        }
        if (orgItem['routename'] == "") {
          useSetup().showAlertDialog({ icon: "warn", title: "請設定路徑名稱" })
          return
        }
        var findEmptyKey = orgItem['header'].filter(item => item["key"] === "" || item["key"] === null || item["key"] === undefined);
        if (findEmptyKey.length != 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "有Key沒有填寫" })
          return
        }
        var repeatKeyList = orgItem['header'].filter((item, index, self) =>self.findIndex(t => t["key"] === item["key"]) !== index);
        if (repeatKeyList.length != 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "有重複的Key" })
          return
        }
        var pathQuery = { data: { 'Path': this.Setup.path_list } }
        var organizeQuery = {
          id: 1,
          table: `${orgItem['routename']}`,
          data: { header: JSON.stringify(orgItem['header']) }
        }
        var api_list = [useSetup().setRouterPath(pathQuery), useSetup().editIDData(organizeQuery)]
        Promise.all(api_list).finally(()=> this.closeNormalPage())
      }
    },
    removeNormalPage(info) {
      for (let i in this.Setup.path_list) {
        var path = this.Setup.path_list[i]
        if (path['value'] == 'Organize' || path['value'] == 'HistoryChart') {
          const index = path['child'].findIndex(item => item.path === info['item']['path']);
          if (index !== -1) {
            path['child'].splice(index, 1);
            var pathQuery = { data: { 'Path': this.Setup.path_list } }
            useSetup().setRouterPath(pathQuery)
          }
        }
      }
    },
    closeNormalPage() {
      this.org["dialog"] = false;
      setTimeout(() => {
        this.org['item'] = {
          title: "",
          icon: "mdi-blank",
          routename: "",
          header: []
        }
      }, 200);
    },
    // =========================================== Navbar右鍵菜單 ===========================================
    openNavMenu(event, item, type) {
      this.navMenu["show"] = false;
      if (event.button === 2) {
        // 設定右鍵菜單的位置
        this.navMenu = {
          show: true,
          type: this.getParentValueByPath(item.path) || "Default",
          x: event.clientX + 20, // 滑鼠點擊位置
          y: event.clientY >= 700 ? event.clientY - parseInt(event.clientY*0.3) : event.clientY + 20,
          item: item, // 存儲當前選擇的物件
        };
        return;
      }
    },
    // 設定View 的首頁
    setViewFirstPage(context) {
      var path = context.item["path"]
      var idx = this.checkEditPath(path)
      if (idx != -1) {
        useSetup().setEmapHomepage({ index: idx }).then(()=> this.Setup.viewFirstPage = idx)
      }
    },
    // 複製選擇頁
    copyPageInfo(context) {
      var path = context.item["path"]
      var idx = this.checkEditPath(path)
      if (idx != -1) {
        useSetup().getPageInfo({idx: idx}).then((res)=> {
          this.cpyEmapInfo = res["data"]
        }).catch(()=> {
          this.cpyEmapInfo = {}
          useSetup().showAlertDialog({ icon: "warn", title: "該頁沒有資訊" })
        })
      }
    },
    // 貼上選擇頁
    pastePageInfo(context) {
      if (Object.keys(this.cpyEmapInfo).length === 0) return; // 沒有複製的值則離開
      var path = context.item["path"]
      var idx = this.checkEditPath(path)
      if (idx != -1) {
        this.cpyEmapInfo["id"] = idx
        var Query = { idx: idx, data: this.cpyEmapInfo }
        useSetup().setPageInfo(Query).finally(()=> {
          this.cpyEmapInfo = {}
          this.$router.push(path)
          // location.reload()
        })
      }
    },
    // 關閉Menu
    closeNavMenu(event) {
      if (event.target.closest(".setting-drawer") != null) {
        if (this.navMenu["show"]) this.navMenu["show"] = false;
      }
      if (event.target.closest(".path-drawer") != null) {
        if (this.navMenu["show"]) this.navMenu["show"] = false;
      }
    },
    // =============================================== Function ===============================================
    /**
     * @description 取得Header Bar 標題
     * @param {Array} nodes - 當前要遍歷的節點陣列
     * @param {string|null} target - 目標路徑名稱
    */
    getHeaderbarTitle(nodes, target) {
      for (const item of nodes) {
        if (item["path"] == target) return item["title"];
        if (item.child) {
          const found = this.getHeaderbarTitle(item.child, target);
          if (found) return found; 
        }
      }
      return "";
    },
    /**
     * @description 確認編輯頁面路徑
     * @param {string|null} target - 目標路徑名稱
     */
    checkEditPath(target) {
      const parts = target.split('/').map(s => s.trim());
      if (parts.length == 3 && parts[1] == "edit") return parts[2] // 確認路徑為/edit/:pathnow
      else return -1
    },
    /**
     * @description 遞迴函式，建立路徑查找表
     * @param {Array} nodes - 當前要遍歷的節點陣列
     * @param {string|null} parentValue - 來自父層的 value，用於傳承
     */
    buildPathMap(nodes, parentValue = null) {
      nodes.forEach(node => {
        // 節點有 path，加入查找表
        if (node.path) this.pathMap.set(node.path, { node: node, parentValue: parentValue });
        // 節點有子節點，遞迴進去並將當前節點的 value (如果存在) 作為新的 parentValue 傳下去
        if (node.child && node.child.length > 0) {
          // 如果當前節點有 value，就用它；否則，繼續沿用上層的 parentValue
          this.buildPathMap(node.child, node.value || parentValue);
        }
      });
    },
    /**
     * @description 路徑查詢方法，根據 path 取得父層的 value
     * @param {string} p - 要查詢的路由路徑
     * @returns {string|null} - 找到的父層 value，或 null
     */
    getParentValueByPath(p) {
      if (!this.pathMap.has(p)) return null;
      // 從 Map 中取得資訊並回傳 parentValue
      return this.pathMap.get(p).parentValue;
    },
    /**
     * @description 遞迴遍歷路徑節點並更新節點資訊
     * @param {Array} nodes - 要搜尋的節點陣列
     * @param {string} identifier - 要尋找的目標標識符，可以是 path(路徑) 或 value(下拉選單)
     * @param {object} updates - 包含要更新的屬性的物件
     * @returns {boolean} - 如果找到並成功更新，返回 true；否則返回 false。
    */
    findAndUpdateNode(nodes, identifier, updates) {
      for (const node of nodes) {
        if (node.path === identifier || node.value === identifier) { Object.assign(node, updates); return true; }
        if (node.child && node.child.length > 0) {
          const foundInChildren = this.findAndUpdateNode(node.child, identifier, updates);
          if (foundInChildren) return true;
        }
      }
      return false;
    },
  }
};
</script>

<style lang="scss" scoped>
.nav-border {
  min-height: 65px;
  border-bottom-style: solid; 
  border-bottom-color: rgb(202, 202, 202);
  border-bottom-width: 1px;
  h3 {
    text-align: center;
    font-size: 35px;
    user-select:none;
  }
}

// 右鍵選單
.nav-menu {
  width: 300px;
  position: sticky;
  background: white;
  border: 2px solid #ccc;
  border-radius: 10px;
  padding: 1px 1px 5px 1px;
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  user-select:none;
}

:deep(.v-list-group__items .v-list-item) {
  padding-inline-start: calc(20px) !important
}

:deep(.v-list-item .thi-list) {
  padding-inline-start: calc(50px) !important
}

:deep(.v-list-item__spacer) {
  width: 20px !important;
}

/* Supports firefox */
.firefox-navigation {
  scrollbar-color: rgb(204, 204, 204) rgb(233, 233, 233);
}

.navigation {
  overflow-y: scroll;
  max-height: 100%;
}

*::-webkit-scrollbar {
  width: 8px;
}
 
*::-webkit-scrollbar-track {
  background-color: rgb(233, 233, 233);
  -webkit-border-radius: 1px;
  border-radius: 10px;
}

*::-webkit-scrollbar-thumb {
  -webkit-border-radius: 1px;
  border-radius: 1px;
  background: #6d6d6d; 
}

</style>
