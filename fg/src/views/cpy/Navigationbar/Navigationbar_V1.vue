<template>
  <v-navigation-drawer v-model="Setup.settingDrawer" class="navigation-drawer" width="300" temporary app style="background-color: rgb(233, 233, 233);" @click="closeNavMenu">
    <template v-slot:prepend>
      <v-list-item class="nav-border">
        <h3 style="text-align: center;font-size: 35px;user-select:none;">資料收集系統</h3>
      </v-list-item>
    </template>
    
    <!---------------------------------------------------------------------------------------->
    <v-container :class="browser == 'Chrome' ? 'pa-0 pr-0 navigation' : 'pa-0 pr-0 firefox-navigation'">
      <v-list v-model:opened="open" class="container">
        <div v-for="(item, index) in Setup.path_list" :key="index" style="user-select:none;" >
          <v-list-group v-if="item.child" :value="item.value">
            <!-- ============================================= 第一層標題 ============================================= -->
            <template v-slot:activator="{ props }">
              <v-list-item v-bind="props" @mousedown="openNavMenu($event, item, 'first-child')">
                <div style="display: flex;">
                  <v-icon :icon="item.icon" style="color: rgb(150,150,150);margin-right: 30px;margin-top: 3px;"></v-icon>
                  <v-list-item-title v-text="item.title" style="color: rgb(150,150,150);font-size:20px;"></v-list-item-title>
                </div>
              </v-list-item>
            </template>

            <!-- ============================================= 第二層路徑 ============================================= -->
            <div v-if="item.value == 'Config'">
              <v-list-item v-for="(secItem, idx) in item.child" :key="idx">
                <v-list-item @mousedown="openNavMenu($event, secItem, 'Config')" @click="gotoRouter(secItem.path)" :style="{'background': focusPath(secItem.path)}">
                  <div style="display: flex;">
                    <v-icon :icon="secItem.icon" :style="{'color': focusFirstPage(secItem.path),'margin-right': '20px','margin-top': '3px'}"></v-icon>
                    <v-list-item-title v-text="secItem.title" :style="{'color': focusFirstPage(secItem.path),'font-size': '18px'}"></v-list-item-title>
                  </div>
                </v-list-item>
              </v-list-item>
            </div>
            <div v-else-if="item.value == 'Mod'">
              <v-list-item v-for="(secItem, idx) in item.child" :key="idx">
                <v-list-item @mousedown="openNavMenu($event, secItem, 'Mod')" @click="gotoRouter(secItem.path)" :style="{'background': focusPath(secItem.path)}">
                  <div style="display: flex;">
                    <v-icon :icon="secItem.icon" style="margin-right: 20px; margin-top: 3px"></v-icon>
                    <v-list-item-title v-text="secItem.title" style="font-size: 18px"></v-list-item-title>
                  </div>
                </v-list-item>
              </v-list-item>
              <h3 style="margin: 20px 0px;text-align: center;cursor: pointer;" @click="openModConfig('ADD')"><v-icon>mdi-plus-circle</v-icon></h3>
            </div>

            <div v-else-if="item.value == 'Organize'">
              <v-list-item v-for="(secItem, idx) in item.child" :key="idx">
                <v-list-item @mousedown="openNavMenu($event, secItem, 'Organize')" @click="gotoRouter(secItem.path)" :style="{'background': focusPath(secItem.path)}">
                  <div style="display: flex;">
                    <v-icon :icon="secItem.icon" style="margin-right: 20px; margin-top: 3px"></v-icon>
                    <v-list-item-title v-text="secItem.title" style="font-size: 18px"></v-list-item-title>
                  </div>
                </v-list-item>
              </v-list-item>
              <h3 style="margin: 20px 0px;text-align: center;cursor: pointer;" @click="openOrganizeConfig('ADD')"><v-icon>mdi-plus-circle</v-icon></h3>
            </div>
          </v-list-group>
          
          <div v-else>
            <!-- ============================================= 第一層路徑 ============================================= -->
            <v-list-item @mousedown="openNavMenu($event, item, 'first-nochild')" @click="gotoRouter(item.path)" :style="{'background': focusPath(item.path)}">
              <template v-slot:prepend>
                <v-icon :icon="item.icon" style="color: rgb(150,150,150);"></v-icon>
              </template>
              <v-list-item-title v-text="item.title" style="color: rgb(150,150,150);font-size:20px"></v-list-item-title>
            </v-list-item>
          </div>
        </div>
      </v-list>
    </v-container>

    <!-- <v-list style="user-select: none;" v-model:selected="open" color="blue" nav>
      <NavbarTree 
        v-for="node in Setup.path_list" :key="node.path" 
        :node="node" :depth="0" 
        @select-node="gotoRouter" @open-navmenu="openNavMenu" 
        @open-mod="openModConfig" @open-organize="openOrganizeConfig" 
      />
    </v-list> -->
  </v-navigation-drawer>
  <!-- NavBar 右鍵Menu設定 -->
  <div v-if="navMenu.show" 
    class="nav-menu"
    :style="{ top: navMenu.y + 'px', left: navMenu.x + 'px', 'position': 'absolute', 'z-index': '99999' }"
    @contextmenu.prevent>
    <div style="display: flex;justify-content: right;">
      <v-icon style="margin: 10px 10px 0px 0px;" @click="navMenu.show = false">mdi-close-circle</v-icon>
    </div>
    <v-list :lines="false" density="compact" @click="navMenu.show = false">
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
      <v-list-item @click="navMenu.type == 'Mod' ? openModConfig('EDIT', navMenu['item']) : openNavDialog(navMenu)">
        <template v-slot:prepend><v-icon icon="mdi-pen" /></template>
        <v-list-item-title><h2>修改頁面資訊</h2></v-list-item-title>
      </v-list-item>
      <v-list-item v-if="navMenu.type == 'Mod'" @click="removeMod(navMenu)">
        <template v-slot:prepend><v-icon icon="mdi-trash-can-outline" /></template>
        <v-list-item-title><h2>刪除模組頁面資訊</h2></v-list-item-title>
      </v-list-item>
      <v-list-item v-if="navMenu.type == 'Organize'" @click="removeOrganize(navMenu)">
        <template v-slot:prepend><v-icon icon="mdi-trash-can-outline" /></template>
        <v-list-item-title><h2>刪除組織頁面資訊</h2></v-list-item-title>
      </v-list-item>
    </v-list>
  </div>
  <!-- ======================================= 右鍵修改Navbar參數 Dialog ======================================= -->
  <ConfigDialog 
    :icon_list="Setup.icon_list"
    :config="config"
    @editNavInfo="editNavInfo"
    @closeNavDialog="closeNavDialog"
  />
  <!-- ======================================= 設定模組Navbar Dialog ======================================= -->
  <ModDialog 
    :icon_list="Setup.icon_list"
    :mod="mod"
    @addMod="addMod"
    @editMod="editMod"
    @closeModConfig="closeModConfig"
  />
  <!-- ======================================= 設定組織Navbar Dialog ======================================= -->
  <OrganizeDialog 
    :org="org"
    @addOrganize="addOrganize"
    @editOrganize="editOrganize"
    @closeOrganizeConfig="closeOrganizeConfig"
  />
</template>

<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

import ConfigDialog from "@/components/Navbar/ConfigDialog.vue"
import ModDialog from "@/components/Navbar/TableDialog.vue"
import OrganizeDialog from "@/components/Navbar/NormalDialog.vue"

import NavPath from "./json/path.json"
import IconList from "./json/icon.json"

import NavbarTree from './Navbar/NavbarTree.vue';

export default {
  components: { ConfigDialog, ModDialog, OrganizeDialog, NavbarTree },
  data() {
    return {
      Setup: useSetup().$state,
      open: [],
      browser: "Chrome",
      navMenu: { show: false, x: 0, y: 0, item: {} }, // 右鍵菜單
      cpyEmapInfo: {},
      config: {
        dialog: false,
        item: {}
      },
      mod: {
        dialog: false,
        state: "ADD",
        item: {
          title: "",
          icon: "mdi-blank",
          routename: "",
          header: []
        }
      },
      org: {
        dialog: false,
        state: "ADD",
        item: {
          title: "",
          icon: "mdi-blank",
          routename: "",
        }
      }
    }
  },
  watch: {
    'Setup.settingDrawer'(d) {
      if (!d) this.navMenu["show"] = false;
    },
    $route(r) {
      var idx = this.checkEditPath(r["path"])
      if (idx != -1) this.Setup.settingDrawer = false;
      this.Setup.headerTitle = this.getHeaderbarTitle(this.Setup.path_list, r["path"])
      // 清除全部Interval
      for (let i in this.Setup.interval_list) {
        clearInterval(this.Setup[this.Setup.interval_list[i]])
        this.Setup[this.Setup.interval_list[i]] = null;
      }
    }
  },
  created() {
    this.getInitInfo()
    this.checkBrowser();
  },
  mounted() {
    var ev = document.querySelector(".navigation-drawer")
    ev.addEventListener("contextmenu", (e) => e.preventDefault());
  },
  methods: {
    // =========================================== 取得初始設定 ===========================================
    getInitInfo() {
      this.Setup.icon_list = IconList
      // this.Setup.path_list = NavPath["Path"]
      useSetup().getRouterPath()
        .then((res)=> this.Setup.path_list = res["data"]["Path"])
        .catch(()=> this.Setup.path_list = NavPath["Path"])
        .finally(()=> {
          // 確認View 的首頁
          useSetup().getEmapHomepage().then((res)=>{
            var data = res["data"]["index"]
            this.Setup.viewFirstPage = data == 0 ? 1 : data
          }).catch(() => this.Setup.viewFirstPage = 1)
          var idx = this.checkEditPath(this.$route.path)
          if (idx != -1) this.Setup.settingDrawer = false;
          this.Setup.headerTitle = this.getHeaderbarTitle(this.Setup.path_list, this.$route.path)
        })
    },
    // 確認瀏覽器
    checkBrowser() {
      var ua = navigator.userAgent;
      this.browser = ua.indexOf('Firefox') !== -1 ? "Firefox" : "Chrome"
    },
    checkEditPath(path) {
      const parts = path.split('/').map(s => s.trim());
      // 確認路徑為/edit/:pathnow
      if (parts.length == 3 && parts[1] == "edit") return parts[2]
      else return -1
    },
    // =========================================== 修改Navbar參數 ===========================================
    openNavDialog(context) {
      this.config["dialog"] = true
      this.config["item"] = {}
      this.config["item"] = JSON.parse(JSON.stringify(context.item))
    },
    editNavInfo() {
      var findPath = this.updatePathItem(this.Setup.path_list, this.config["item"]["path"], this.config["item"]);
      if (findPath) {
        var Query = { data: { 'Path': this.Setup.path_list } }
        useSetup().setRouterPath(Query).then(()=> this.closeNavDialog())
      }
    },
    closeNavDialog() {
      this.config["dialog"] = false;
    },
    // =========================================== 模組頁面、路徑設定 ===========================================
    openModConfig(state, item) {
      this.mod["dialog"] = true;
      this.mod["state"] = state;
      if (state == "EDIT") {
        this.mod["item"] = JSON.parse(JSON.stringify(item))
        var moduleQuery = { id: 1, table: `${item['routename']}` }
        useSetup().getIDData(moduleQuery).then((res)=>{
          var header = JSON.parse(res["data"]["header"])
          var content = JSON.parse(res["data"]["content"])
          this.mod["item"]['header'] = header
          this.mod["item"]['content'] = content
        })
      }
    },
    addMod() {
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
      var addPath = {
        "icon": moduleItem['icon'],
        "title": moduleItem['title'],
        "routename": moduleItem['routename'],
        "path": `/mod/${moduleItem['routename']}`
      }
      for (let i in this.Setup.path_list) {
        var path = this.Setup.path_list[i]
        if (path['value'] == 'Mod') {
          const exists = path['child'].some(item => item['path'] === addPath['path'])
          if (exists) {
            useSetup().showAlertDialog({ icon: "warn", title: "找到重複路徑名稱" })
            return
          }
          path['child'].push(addPath)
        } 
      } 
      var pathQuery = { data: { 'Path': this.Setup.path_list } }
      var moduleQuery = {
        table: `${moduleItem['routename']}`,
        data: { header: JSON.stringify(moduleItem['header']), content: JSON.stringify([]) }
      }
      var api_list = [useSetup().setRouterPath(pathQuery), useSetup().addData(moduleQuery)]
      Promise.all(api_list).finally(()=> this.closeModConfig())
    },
    editMod() {
      var findPath = this.updatePathItem(this.Setup.path_list, this.mod["item"]["path"], this.mod["item"]);
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
        Promise.all(api_list).finally(()=> this.closeModConfig())
      }
    },
    removeMod(info) {
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
    closeModConfig() {
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
    // =========================================== 組織列表頁面、路徑設定 ===========================================
    openOrganizeConfig(state, item) {
      this.org["dialog"] = true;
      this.org["state"] = state;
      if (state == "EDIT") {
        this.org["item"] = JSON.parse(JSON.stringify(item))
      }
    },
    addOrganize() {
      var organizeItem = this.org['item']
      if (organizeItem['routename'] == "") {
        useSetup().showAlertDialog({ icon: "warn", title: "請設定路徑名稱" })
        return
      }
      var addPath = {
        "icon": organizeItem['icon'],
        "title": organizeItem['title'],
        "routename": organizeItem['routename'],
        "path": `/organize/${organizeItem['routename']}`
      }
      for (let i in this.Setup.path_list) {
        var path = this.Setup.path_list[i]
        if (path['value'] == 'Organize') {
          const exists = path['child'].some(item => item['path'] === addPath['path'])
          if (exists) {
            useSetup().showAlertDialog({ icon: "warn", title: "找到重複路徑名稱" })
            return
          }
          path['child'].push(addPath)
        }
      } 
      var pathQuery = { data: { 'Path': this.Setup.path_list } }
      var organizeQuery = {
        table: `${organizeItem['routename']}`,
        data: { header: JSON.stringify(organizeItem['header']) }
      }
      var api_list = [useSetup().setRouterPath(pathQuery), useSetup().addData(organizeQuery)]
      Promise.all(api_list).finally(()=> this.closeOrganizeConfig())
    },
    editOrganize() {
      var findPath = this.updatePathItem(this.Setup.path_list, this.mod["item"]["path"], this.mod["item"]);
      if (findPath) {
        var organizeItem = this.org['item']
        if (organizeItem['routename'] == "") {
          useSetup().showAlertDialog({ icon: "warn", title: "請設定路徑名稱" })
          return
        }
        var pathQuery = { data: { 'Path': this.Setup.path_list } }
        var organizeQuery = {
          id: 1,
          table: `${organizeItem['routename']}`,
          data: { header: JSON.stringify(organizeItem['header']) }
        }
        var api_list = [useSetup().setRouterPath(pathQuery), useSetup().editIDData(organizeQuery)]
        Promise.all(api_list).finally(()=> this.closeOrganizeConfig())
      }
    },
    removeOrganize(info) {
      for (let i in this.Setup.path_list) {
        var path = this.Setup.path_list[i]
        if (path['value'] == 'Organize') {
          const index = path['child'].findIndex(item => item.path === info['item']['path']);
          if (index !== -1) {
            path['child'].splice(index, 1);
            var pathQuery = { data: { 'Path': this.Setup.path_list } }
            useSetup().setRouterPath(pathQuery)
          }
        }
      }
    },
    closeOrganizeConfig() {
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
          type: type,
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
          location.reload()
        })
      }
    },
    closeNavMenu(event) {
      if (event.target.closest(".navigation-drawer") != null) {
        if (this.navMenu["show"]) this.navMenu["show"] = false;
      }
    },
    // =========================================== 點擊切換路由 ===========================================
    gotoRouter(path) {
      // 確保資料都更新完畢
      if (this.Setup.editCount > 0) {
        useSetup().showAlertDialog({ icon: "warn", title: "請先更新資料" });
        return;
      }
      // 當在view查看Emap的時候要確認設為首頁的ID
      this.$router.push(path == "/view" ? `/view/${this.Setup.viewFirstPage}` : path)
    },
    // =========================================== FUNCTION ===========================================
    // 現在在哪一頁
    focusPath(p) {
      return p == this.$route.path ? "rgb(203 203 203)" : ""
    },
    // 標記哪一頁為首頁
    focusFirstPage(p) {
      return p == `/edit/${this.Setup.viewFirstPage}` ? "#8a81d3" : "rgb(150,150,150)"
    },
    // 取得Header Bar 標題
    getHeaderbarTitle(data, target) {
      for (const item of data) {
        if (item["path"] == target) return item["title"];
        if (item.child) {
          const found = this.getHeaderbarTitle(item.child, target);
          if (found) return found; 
        }
      }
      return "";
    },
    updatePathItem(data, target, newData) {
      for (const item of data) {
        // 設定帶有child的第一層標題參數
        if (item.hasOwnProperty("value")) {
          if (item["value"] == newData["value"]) {
            Object.assign(item, newData);
            return true;
          }
        } else {
          // 設定標題參數
          if (item["path"] == newData["path"]) {
            Object.assign(item, newData);
            return true;
          }
        }
        if (item.child) {
          const found = this.updatePathItem(item.child, target, newData);
          if (found) return true; 
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


// * {
//   scrollbar-color: rgb(204, 204, 204) rgb(233, 233, 233);
// }

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



// 取得抽屜現在的Group (暫時隱藏，Group有問題會一直打parent迴圈)
getNavGroup(path) {
  // setParent(this.Setup.path_list, null); // 設定路徑Parent項
  // const pathValue = findTopLevelValueByPath(this.Setup.path_list, path);
  // this.open = ['Config']
  // function setParent(item_list, parent) {
  //   item_list.forEach(item => {
  //     item.parent = parent;
  //     if (item.child) setParent(item.child, item);
  //   });
  // }
  // function findTopLevelValueByPath(item_list, targetPath) {
  //   for (let i = 0; i < item_list.length; i++) {
  //     const item = item_list[i];
  //     if (item.path === targetPath) {
  //       let topLevelItem = item;
  //       let groupList = []; // Group列表 (避免 var 造成全域變數問題)
  //       while (topLevelItem.parent) {
  //         topLevelItem = topLevelItem.parent;
  //         groupList.push(topLevelItem.value);
  //       }
  //       return groupList;
  //     } else if (item.child) {
  //       const topLevelValue = findTopLevelValueByPath(item.child, targetPath);
  //       if (topLevelValue) return topLevelValue;
  //     }
  //   }
  //   return null; // 如果没有找到对应路径，返回 null
  // }
},