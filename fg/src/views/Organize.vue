<!-- =================================================== 帳戶設定頁面 =================================================== -->
<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;padding: 15px;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
        <v-card-title style="padding: 30px 0px 0px 30px;">
          <div style="display: flex;">
            <v-btn variant="outlined" @click="openAccount('ADD')"><h3>新增帳戶</h3></v-btn>
            <v-spacer></v-spacer>
            <v-text-field
              style="max-width: 15%; margin: 0px 20px 10px 0px;"
              v-model="accountSearch"
              variant="outlined"
              density="compact"
              label="搜尋"
              single-line
              hide-details
            >
              <template v-slot:append-inner><v-icon icon="mdi-magnify" /></template>
            </v-text-field>
          </div>
        </v-card-title>
        <v-data-table
          class="account-scroll"
          :search="accountSearch"
          :headers="account_header"
          :items="account_list"
          :mobile="Setup.isPhone"
          item-value="username"
          :expanded="expandedItems"
        >
          <template #no-data><h3>無帳戶資料</h3></template>
          <template v-slot:item.actions="{ item }">
            <div class="test" style="display: flex;justify-content: center;">
              <v-btn :style="{color: item.enable ? '#ff7a29' : 'gray', margin: '0px 10px'}" variant="outlined" @click="item.enable = !item.enable">
                <h3>{{ item.enable ? '啟用' : '禁用' }}</h3>
              </v-btn>
              <v-btn style="color: #4040e9; margin: 0px 10px;" variant="outlined">
                <h3>紀錄</h3>
              </v-btn>
              <v-btn style="color: green; margin: 0px 10px;" variant="outlined" @click="openAccount('EDIT', item)">
                <h3>編輯</h3>
              </v-btn>
              <v-btn style="color: red; margin: 0px 10px;" variant="outlined" @click="openAccount('DELETE', item)">
                <h3>刪除</h3>
              </v-btn>
            </div>
          </template>
          <template v-slot:item.data-table-expand="{ item }">
            <v-btn
              variant="plain"
              :icon="isExpanded(item) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="toggleExpand(item)"
            />
          </template>
          <template v-slot:expanded-row="{ columns, item }">
            <h3>{{ item }}</h3>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </v-main>
  <v-dialog v-model="account['dialog']" width="900" persistent>
    <v-card v-if="account['state'] != 'DELETE'">
      <v-card-title>
        <h2 style="margin: 10px 0px 10px 10px;">{{ account['state'] == 'ADD' ? '新增' : '修改' }}帳戶</h2>
      </v-card-title>
      <div style="display: flex;">
        <v-text-field
          style="margin: 0px 0px 0px 30px;"
          v-model="account['item']['username']"
          label="帳戶名稱"
          variant="outlined"
        ></v-text-field>
        <v-text-field
          style="margin: 0px 30px;"
          v-model="account['item']['password']"
          label="密碼"
          variant="outlined"
          type="password"
        ></v-text-field>
      </div>

      <div style="display: flex;">
        <v-select 
          style="margin: 0px 0px 0px 30px; width: 7%;"
          v-model="account['item']['permission']" 
          :items="permission_list" 
          item-title="title" 
          item-value="value" 
          variant="outlined" 
          label="選擇權限" 
        />
        <v-autocomplete
          style="margin: 0px 30px; width: 7%;"
          v-model="account['item']['group']"
          :items="group_item"
          item-title="value"
          item-value="value"
          label="選擇或輸入群組"
          variant="outlined"
          @blur="customizeGroup"
          @keyup.enter="customizeGroup"
        >
          <template v-slot:no-data>
            <h3 style="text-align: center;">沒有群組資料</h3>
          </template>
        </v-autocomplete>
      </div>
      <v-select v-if="account['item']['permission'] != 'admin'"
        style="margin: 0px 30px;"
        v-model="account['item']['auth_select']"
        :items="auth_list"
        label="頁面權限"
        item-text="title"
        item-value="value"
        variant="outlined"
        multiple
        return-object
      >
        <template v-slot:prepend-item>
          <v-list-item style="padding: 0px 15px;">
            <v-list-item-action @click="selectAllAuthPath">
              <v-checkbox v-model="selectAll" label="全選 " hide-details />
            </v-list-item-action>
          </v-list-item>
          <v-divider ></v-divider>
        </template>
      </v-select>
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="clickToCloseAccount()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="account['state'] == 'ADD' ? addAccount() : editAccount()">
            <h3>{{ account['state'] == 'ADD' ? '新增' : '修改' }}</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
    <v-card v-else>
      <v-card-title>
        <h2 style="margin: 10px 0px;text-align: center;">確定要刪除使用者{{ account['item']['username'] }}?</h2>
      </v-card-title>
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="clickToCloseAccount()">
            <h3>取消</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="removeAccount()">
            <h3>刪除</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  data() {
    return {
      Setup: useSetup().$state,
      accountSearch: null,
      account_header: [
        { title: "帳戶", key: "username", align: "center", width: "40%" },
        { title: "權限", key: "permission", align: "center", width: "40%" },
        { title: "群組", key: "group", align: "center", width: "40%" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      account_list: [], // 帳戶列表
      expandedItems: [], // 資料表擴展資料
      // =========== 帳戶參數 ===========
      account: {
        state: "ADD",
        dialog: false,
        item: {
          username: "",         // 用戶
          password: "",         // 密碼
          permission: "user",   // 權限
          group: "",            // 群組
          enable: true,         // 啟用狀態
          auth_select: [],      // 頁面權限選擇
        }
      },
      selectAll: false, // 授權頁面全選
      auth_list: [],    // 授權頁面列表
      // =========== 群組設定 ===========
      orgGroup: [],
      group_item: [],
      permission_list: [
        { title: "Admin", value: "admin"},
        { title: "User", value: "user"},
        { title: "Viewer", value: "viewer"},
      ]
    }
  },
  mounted() {
    this.getTotalRoute()
  },
  methods: {
    // 取得要授權頁面路徑總表
    getTotalRoute() {
      setTimeout(() => {
        // console.log(this.Setup.path_list, this.$route)
        var that = this
        this.auth_list = []
        function traverse(items) {
          for (const item of items) {
            if (item.path) that.auth_list.push({ title: item.title, value: item.path })
            if (item.child && item.child.length > 0) traverse(item.child)
          }
        }
        traverse(this.Setup.path_list)
        // console.log(this.auth_list)
      }, 100);
    },
    // ========================================== 資料表擴展資訊 ==========================================
    // 展開/收合資料表
    toggleExpand(item) {
      const name = item.username;
      const index = this.expandedItems.indexOf(name);
      if (index !== -1) {
        this.expandedItems.splice(index, 1); // 關閉
      } else {
        this.expandedItems.push(name); // 展開
      }
    },
    // 判斷資料表是否展開
    isExpanded(item) {
      return this.expandedItems.includes(item.username);
    },
    // ========================================== 設定用戶 ==========================================
    openAccount(state, item) {
      this.account["dialog"] = true;
      this.account["state"] = state;
      this.orgGroup = JSON.parse(JSON.stringify(this.group_item))
      console.log(this.group_item)
      if (state == 'EDIT' || state == 'DELETE') {
        this.account["item"] = JSON.parse(JSON.stringify(item))
      }
    },
    // 全選頁面授權列表
    selectAllAuthPath() {
      this.selectAll = !this.selectAll
      this.account['item']['auth_select'] = []
      if (this.selectAll) this.account['item']['auth_select'] = [...this.auth_list]
    },
    // 自訂群組用
    customizeGroup(event) {
      const newGroup = event.target.value.trim(); // 取得輸入框的值
      if (newGroup && !this.group_item.some(item => item.value === newGroup)) {
        var g = { id: Math.floor(Math.random() * 10000), value: newGroup }
        if (g["value"] != "All") this.group_item.push(g); // 新增到選單
        this.account['item']['group'] = newGroup; // 設置為當前選擇的值
      }
    },
    // 新增用戶
    addAccount() {
      var emptyUsername = this.account["item"]["username"] === "" || this.account["item"]["username"] === null || this.account["item"]["username"] === undefined;
      if (emptyUsername) {
        useSetup().showAlertDialog({ icon: "warn", title: "使用者資訊沒有填寫" })
        return
      }
      var emptyPassword = this.account["item"]["password"] === "" || this.account["item"]["password"] === null || this.account["item"]["password"] === undefined;
      if (emptyPassword) {
        useSetup().showAlertDialog({ icon: "warn", title: "密碼不能為空" })
        return
      }
      var repeatUsername = this.account_list.filter((item) => item['username'] === this.account["item"]["username"]);
      if (repeatUsername.length != 0) {
        useSetup().showAlertDialog({ icon: "warn", title: "重複的使用者資訊" })
        return
      }
      this.account["item"]["id"] = Math.floor(Math.random() * 10000000)
      this.account_list.push(this.account["item"])
      this.closeAccount();
    },
    // 修改用戶資訊
    editAccount() {
      var emptyUsername = this.account["item"]["username"] === "" || this.account["item"]["username"] === null || this.account["item"]["username"] === undefined;
      if (emptyUsername) {
        useSetup().showAlertDialog({ icon: "warn", title: "使用者資訊沒有填寫" })
        return
      }
      var emptyPassword = this.account["item"]["password"] === "" || this.account["item"]["password"] === null || this.account["item"]["password"] === undefined;
      if (emptyPassword) {
        useSetup().showAlertDialog({ icon: "warn", title: "密碼不能為空" })
        return
      }
      // 修改狀態要過濾掉自己的資訊
      var repeatUsername = this.account_list.filter((item) => item['username'] === this.account["item"]["username"] && item['id'] != this.account["item"]["id"]);
      if (repeatUsername.length != 0) {
        useSetup().showAlertDialog({ icon: "warn", title: "重複的使用者資訊" })
        return
      }
      for (let i in this.account_list) {
        if (this.account_list[i]['id'] == this.account["item"]['id']) {
          Object.assign(this.account_list[i], this.account["item"])
          useSetup().showAlertDialog({ icon: "success", title: "修改帳戶資訊" })
          this.closeAccount();
        }
      }
    },
    // 移除用戶
    removeAccount() {
      for (let i in this.account_list) {
        if (this.account_list[i]["id"] == this.account["item"]["id"]) {
          this.account_list.splice(i, 1)
          this.closeAccount();
        }
      }
    },
    clickToCloseAccount() {
      this.group_item = this.orgGroup;
      this.closeAccount();
    },
    closeAccount() {
      this.account["dialog"] = false;
      setTimeout(() => {
        this.account["item"] = {
          username: "",
          password: "",
          permission: "user",
          group: "",
          enable: true,
          auth_select: []
        }
      }, 200);
    },
  }
}
</script>

<style lang="scss" scoped>
.account-scroll {
  height: 80vh;
}

// Data Table Header 
:deep(.v-data-table-header__content span) {
  font-size: 20px;
  color: rgb(36, 35, 34);
}

// Data Table Content 
:deep(.v-data-table__tr td) {
  font-size: 18px;
  color: rgb(36, 35, 34);
}
</style>