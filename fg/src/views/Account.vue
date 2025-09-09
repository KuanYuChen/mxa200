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
          mobile-breakpoint="md"
        >
          <template #no-data><h3>無帳戶資料</h3></template>
          <template v-slot:item.actions="{ item }">
            <div class="test" style="display: flex; justify-content: end; gap: 10px;">
              <v-btn style="color: green;" variant="outlined" @click="openAccount('EDIT', item)">
                <h3>編輯</h3>
              </v-btn>
              <v-btn style="color: red;" variant="outlined" @click="removeAccount(item)">
                <h3>刪除</h3>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </v-main>
  <v-dialog v-model="account['dialog']" width="900" persistent>
    <v-card>
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
          @blur="addGroup"
          @keyup.enter="addGroup"
        >
          <template v-slot:no-data>
            <h2 style="text-align: center;">沒有群組資料</h2>
          </template>
        </v-autocomplete>
      </div>
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
      ],
      account_list: [],
      account: {
        state: "ADD",
        dialog: false,
        item: {
          username: "",
          password: "",
          permission: "user",
          group: "",
        }
      },
      orgGroup: [],
      group_item: [],
      permission_list: [
        { title: "Admin", value: "admin"},
        { title: "User", value: "user"},
        { title: "Viewer", value: "viewer"},
      ]
    }
  },
  methods: {
    openAccount(state, item) {
      this.account["dialog"] = true;
      this.account["state"] = state;
      this.orgGroup = JSON.parse(JSON.stringify(this.group_item))
      console.log(this.group_item)
      if (state == 'EDIT') {
        this.account["item"] = JSON.parse(JSON.stringify(item))
      }
    },
    addGroup(event) {
      const newGroup = event.target.value.trim(); // 取得輸入框的值
      if (newGroup && !this.group_item.some(item => item.value === newGroup)) {
        var g = { id: Math.floor(Math.random() * 10000), value: newGroup }
        if (g["value"] != "All") this.group_item.push(g); // 新增到選單
        this.account['item']['group'] = newGroup; // 設置為當前選擇的值
      }
    },
    addAccount() {
      this.account_list.push(this.account["item"])
      this.closeAccount();
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
        }
      }, 200);
    },
    removeAccount(item) {
      for (let i in this.account_list) {
        if (this.account_list[i]["id"] == item["id"]) {
          this.account_list.splice(i, 1)
          console.log("Remove Account: ", this.account_list)
        }
      }
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