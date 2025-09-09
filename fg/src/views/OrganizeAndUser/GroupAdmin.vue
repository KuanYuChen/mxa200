<!-- 組織Admin專用，設定該組織下的user、viewer -->
<template>
  <div style="width: 100%;padding: 15px;">
    <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
      <v-card-title style="padding: 30px 0px 10px 30px;">
        <div style="display: flex;">
          <v-btn style="margin-right: 10px;" variant="text" :color="tableType == 'Organize' ? '#4E95D9' : '#153d63'" @click="changeTableType('Organize')"><h2>組織</h2></v-btn>
          <v-btn style="margin-right: 10px;" variant="text" :color="tableType == 'User' ? '#ed8730' : '#153d63'" @click="changeTableType('User')"><h2>用戶</h2></v-btn>
          <v-spacer></v-spacer>
          <v-btn v-if="tableType == 'User'" style="margin-right: 10px;" variant="text" @click="openUser('ADD')"><h3>新增用戶</h3></v-btn>
          <v-btn style="margin-right: 10px;" variant="text"><h3>匯出</h3></v-btn>
          <v-text-field
            style="max-width: 15%; margin: 0px 20px 10px 0px;"
            v-model="tableSearch"
            variant="outlined" density="compact" label="搜尋"
            append-inner-icon="mdi-magnify" single-line hide-details
          />
        </div>
      </v-card-title>
      <div v-if="tableType == 'Organize'">
        <v-data-table
          class="organize_table_class"
          :search="tableSearch"
          :headers="organize_header"
          :items="organize_list"
          :mobile="Setup.isPhone"
          hover item-value="uuid"
          :expanded="expand_group"
          :custom-filter="customSearch"
        >
          <template v-slot:item.name="{ item }">
            <div :style="{ 'border-left': Setup.isPhone ? '' : expand_group.includes(item.uuid) ? '5px solid red' : '' }">
              <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ item.name }}</span>
            </div>
          </template>
          <template v-slot:item.permission="{ item }">
            <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ setPermissionText(item) }}</span>
          </template>
          <template v-slot:item.enable="{ item }">
            <span :style="{ fontSize: '20px', color: item.enable ? 'green' : 'red' }">{{ formatValue('enable', item['enable']) }}</span>
          </template>
          <template v-slot:item.data-table-expand="{ item }">
            <v-btn variant="plain" :icon="expand_group.includes(item.uuid) ? 'mdi-chevron-up' : 'mdi-chevron-down'" @click="toggleExpand(item)" />
          </template>
          <template v-slot:expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" style="padding: 20px;">
                <div style="padding: 20px;border: 2px solid #b9b7b7;">
                  <table class="organize_expanded" border="1">
                    <tr style="user-select: none;">
                      <th>組織負責人</th>
                      <th>組織電話</th>
                      <th>啟用日</th>
                      <th>到期日</th>
                    </tr>
                    <tr>
                      <td>{{ item['leader'] }} </td>
                      <td>{{ item['phone'] }} </td>
                      <td>{{ formatDate(item['activationDate']) }} </td>
                      <td>{{ formatDate(item['expirationDate']) }} </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>
      </div>
      <div v-else-if="tableType == 'User'">
        <v-data-table
          class="organize_table_class"
          :search="tableSearch"
          :headers="user_header"
          :items="user_list"
          :mobile="Setup.isPhone"
          hover item-value="uuid"
          :custom-filter="customSearch"
        >
          <template v-slot:item.permission="{ item }">
            <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ setPermissionText(item) }}</span>
          </template>
          <template v-slot:item.enable="{ item }">
            <span :style="{ fontSize: '20px', color: item.enable ? 'green' : 'red' }">{{ formatValue('enable', item['enable']) }}</span>
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="test" style="display: flex; justify-content: end; gap: 10px;">
              <v-btn style="color: green; font-size: 18px;" variant="outlined" @click="openUser('EDIT', item)">編輯</v-btn>
              <v-btn style="color: red; font-size: 18px;" variant="outlined" @click="openUser('DELETE', item)">刪除</v-btn>
            </div>
          </template>
        </v-data-table>
      </div>
    </v-card>
  </div>
  <!-- ============================================== 使用者設定 ============================================== -->
  <v-dialog v-model="user['dialog']" width="1000" persistent>
    <v-card v-if="user['state'] != 'DELETE'" style="background: #f2f2f2;">
      <v-card-title>
        <h1 style="text-align: center; margin: 20px;">新增用戶</h1>
      </v-card-title>
      <div style="display: flex; margin: 0px 30px 10px">
        <h2 style="margin-top: 3px; color: #4e6187;">用戶設定</h2>
      </div>
      <div :style="{ display: `${Setup.isPhone ? 'block' : 'flex'}`, margin: '0px 30px' }">
        <h2 style="width: 50%; margin-top: 5px;">用戶帳號</h2>
        <v-text-field style="width: 100%;" v-model="user['item']['userAccount']" variant="outlined" density="comfortable" />
        <div style="width: 10%;"></div>
        <h2 style="width: 50%; margin-top: 5px;">用戶密碼</h2>
        <v-text-field style="width: 100%;" v-model="user['item']['userPassword']"
          variant="outlined" density="comfortable" 
          :type="user['checkpwd'] ? 'text' : 'password'" 
          :append-inner-icon="user['checkpwd'] ? 'mdi-eye' : 'mdi-eye-off'" 
          @click:append-inner="user['checkpwd'] = !user['checkpwd']"
        />
      </div>

      <div :style="{ display: `${Setup.isPhone ? 'block' : 'flex'}`, margin: '0px 30px' }">
        <h2 style="width: 50%; margin-top: 5px;">使用者名稱</h2>
        <v-text-field style="width: 100%;" v-model="user['item']['name']" variant="outlined" density="comfortable" />
        <div style="width: 10%;"></div>
        <h2 style="width: 50%; margin-top: 5px;">帳號狀態</h2>
        <v-select style="width: 100%;" v-model="user['item']['enable']" :items="enable_list" item-title="title" item-value="value" variant="outlined" density="comfortable" />
      </div>

      <div :style="{ display: `${Setup.isPhone ? 'block' : 'flex'}`, margin: '0px 30px' }">
        <h2 style="width: 50%; margin-top: 5px;">啟用日</h2>
        <v-menu :close-on-content-click="false">
          <template #activator="{ props }">
            <v-text-field style="width: 100%;" :value="formatDate(user['item']['activationDate'])" variant="outlined" density="compact" hide-details readonly v-bind="props" >
              <template v-slot:append-inner><v-icon color="black" icon="mdi-calendar-range" /></template>
            </v-text-field>
          </template>
          <v-card style="border: 2px solid #dbdbdb;">
            <div style="display: flex;">
              <v-date-picker v-model="user['item']['activationDate']" :min="sdateMinValue">
                <template v-slot:title><h2 style="margin-top: 10px;">日期</h2></template>
              </v-date-picker>
            </div>
          </v-card>
        </v-menu>
        <div style="width: 10%;"></div>
        <h2 style="width: 50%; margin-top: 5px;">到期日</h2>
        <v-menu :close-on-content-click="false">
          <template #activator="{ props }">
            <v-text-field style="width: 100%;" :value="formatDate(user['item']['expirationDate'])" variant="outlined" density="compact" hide-details readonly v-bind="props" >
              <template v-slot:append-inner><v-icon color="black" icon="mdi-calendar-range" /></template>
            </v-text-field>
          </template>
          <v-card style="border: 2px solid #dbdbdb;">
            <div style="display: flex;">
              <v-date-picker v-model="user['item']['expirationDate']" :min="user['item']['activationDate']">
                <template v-slot:title><h2 style="margin-top: 10px;">日期</h2></template>
              </v-date-picker>
            </div>
          </v-card>
        </v-menu>
      </div>

      <v-divider style="margin: 30px 20px; color: white;" thickness="5px"></v-divider>
      <div style="display: flex; margin: 0px 30px 20px;">
        <h2 style="margin-top: 3px; color: #4e6187;">頁面權限設定</h2>
        <v-btn style="margin: 2px 0px 10px 20px;" variant="text" @click="addUserPermission()">
          <v-icon style="font-size: 30px;">mdi-plus</v-icon>
        </v-btn>
      </div>
      <div v-for="(per, index) in user['item']['permission']" :key="index" style="display: flex; margin: 0px 30px;">
        <h3 style="width: 10%; margin: 10px 0px 0px 0px;">{{ parseInt(index) + 1 }}</h3>
        <v-select style="width: 50%;" v-model="per['page']" :items="getAvailablePermissions(index)" variant="outlined" density="comfortable" />
        <div style="width: 4%;"></div>
        <v-select style="width: 50%;" v-model="per['purview']" :items="auth_list" item-title="title" item-value="value" variant="outlined" density="comfortable"/>
        <v-icon style="font-size: 30px; margin: 10px 0px 0px 15px;" icon="mdi-trash-can" @click="delUserPermission(index)" />
      </div>

      <v-card-actions>
        <div style="width: 100%; display: flex; margin: 10px 0px 20px;">
          <v-btn class="actions-btn" style="font-size: 18px;" variant="text" @click="closeUserDialog()">取消</v-btn>
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="margin-right: 15%; font-size: 18px;" variant="text" @click="user['state'] == 'ADD' ? addUser() : editUser()">設定完成</v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
    <v-card v-else style="background: #f2f2f2;">
      <v-card-title>
        <h2 style="text-align: center;">刪除用戶</h2>
      </v-card-title>
      <h2 style="text-align: center; margin: 20px 0px;">是否刪除該用戶?</h2>
      <v-card-actions>
        <div style="width: 100%; display: flex; margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="font-size: 18px;" variant="text" @click="closeUserDialog()">取消</v-btn>
          <v-btn class="actions-btn" style="font-size: 18px;" variant="text" @click="removeUser()">確定</v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
import { useSetup } from '@/store/module/setup';

export default {
  data() {
    return {
      Setup: useSetup().$state,
      tableSearch: "",
      tableType: "Organize",
      expand_group: [],     // 資料表擴展資料
      // 組織Table
      organize_header: [
        { title: "組織名稱", key: "name", align: "center" },
        { title: "頁面權限", key: "permission", align: "center", width: "20%" },
        { title: "管理員帳號", key: "account", align: "center" },
        { title: "組織狀態", key: "enable", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      organize_list: [],
      // 用戶Table
      user_header: [
        { title: "用戶帳號", key: "userAccount", align: "center" },
        { title: "使用者名稱", key: "name", align: "center" },
        { title: "頁面權限", key: "permission", align: "center" },
        { title: "用戶狀態", key: "enable", align: "center" },
        { title: "最後使用時間", key: "last", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
      ],
      user_list: [],
      permission_select: [],
      // 使用者Dialog部分
      user: {
        dialog: false,
        state: "ADD",
        checkpwd: false,
        item: {
          userAccount: "",                // 用戶帳號
          userPassword: "",               // 用戶密碼
          name: "",                       // 用戶名稱
          enable: true,                   // 啟用狀態
          activationDate: new Date(),              // 啟用日 (預設今天)
          expirationDate: new Date('2099-12-31'),  // 結束日 (預設永久)
          permission: [],                 // 權限
        }
      },
      enable_list: [
        { title: "啟用", value: true },
        { title: "禁用", value: false },
      ]
    }
  },
  computed: {
    // 設定開始日期的最小值
    sdateMinValue() {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday
    },
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.keyboardDialogEvent);
  },
  mounted() {
    this.initPermissionList();
    window.addEventListener("keydown", this.keyboardDialogEvent);
  },
  methods: {
    initPermissionList() {
      this.permission_select = [];
      const page_list = this.Setup.path_list.filter(item => item.value === "Config");
      if (page_list[0]) {
        var config = page_list[0]['child']
        for (let i in config) {
          var path = config[i]['path']
          const match = path.match(/\/edit\/(\d+)/);
          const id = match ? match[1] : null;
          var obj = { title: `頁面${id}`, value: id}
          this.permission_select.push(obj)
        }
      }
      console.log(page_list[0])
      console.log(this.Setup.path_list)
    },
    getAvailablePermissions(index) {
      const current = this.user.item.permission[index].page;
      return this.permission_select.filter(item => {
        // 允許目前這一行選中的值，以及還沒被選中的值
        var selectUserPages = this.user.item.permission.map(p => p.page).filter(v => v !== '' && v !== null && v !== undefined);
        return !selectUserPages.includes(item.value) || item.value === current;
      });
    },
    // 更改Table模式 (組織、用戶)
    changeTableType(type) {
      this.tableSearch = ""
      this.tableType = type
    },
    // 格式化日期
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      var newDate = `${year}-${month}-${day}`
      return newDate == '2099-12-31' ? "永久" : newDate;
    },
    // =========================================== Table表設定函數 ===========================================
    // 展開/收合資料表
    toggleExpand(item) {
      const id = item.uuid;
      const index = this.expand_group.indexOf(id);
      if (index !== -1) this.expand_group.splice(index, 1); // 關閉
      else this.expand_group.push(id); // 展開
    },
    // 設定組織權限列表文字
    setPermissionText(item) {
      var permissionText = ""
      if (item.permission.length == this.permission_select.length) return "ALL"
      for (let i in item.permission) {
        if (item.permission[i]['page'] != '') {
          if (!isNaN(Number(item.permission[i]['page']))) permissionText += `頁面${item.permission[i]['page']}, `
          else {
            var pageInfo = this.permission_select.filter(p => p.value === item.permission[i]['page']);
            if (pageInfo[0]) permissionText += `${pageInfo[0]['title']}, `
          }
        }
      }
      return permissionText.replace(/,\s*$/, '');
    },
    // 統一欄位顯示邏輯 (可擴充自訂文字)
    formatValue(key, val) {
      if (key === 'enable') return val ? '啟用' : '禁用';
      return String(val ?? '');
    },
    // 自訂搜尋模式
    customSearch(value, query, item) {
      if (query == null || query.trim() === '') return true;
      const normalizedQuery = query.toLowerCase();
      const { uuid, protocolID, ...searchableData } = item.raw; 
      const simpleValues = Object.entries(searchableData).map(([key, val]) => this.formatValue(key, val)).join(' ');
      return simpleValues.toLowerCase().includes(normalizedQuery);
    },
    // =========================================== 使用者設定 ===========================================
    openUser(state, item) {
      this.user['dialog'] = true;
      this.user['state'] = state
      if (state != 'ADD') {
        this.user['item'] = JSON.parse(JSON.stringify(item))
        this.user['item']['activationDate'] = item['activationDate']
        this.user['item']['expirationDate'] = item['expirationDate']
      }
    },
    // Dialog鍵盤事件
    keyboardDialogEvent(e) {
      if (!this.user['dialog']) return;
      if (e.key == "Escape") this.closeUserDialog();
      if (e.key == "Enter") {
        const actions = { 'ADD': this.addUser, 'EDIT': this.editUser, 'DELETE': this.removeUser };
        actions[this.user['state']]?.call(this);
      }
    },
    addUserPermission() {
      this.user['item']['permission'].push({ page: "", purview: "viewer" })
    },
    delUserPermission(index) {
      this.user['item']['permission'].splice(index, 1)
    },
    addUser() {
      var ADD = { uuid: crypto.randomUUID(), ...this.user['item'] }
      this.user_list.push(ADD)
      this.closeUserDialog();
    },
    editUser() {
      for (let i in this.user_list) {
        if (this.user_list[i]['uuid'] == this.user['item']['iduuid']) {
          this.user_list[i] = this.user['item']
          this.closeUserDialog();
        }
      }
    },
    removeUser() {
      for (let i in this.user_list) {
        if (this.user_list[i]['uuid'] == this.user['item']['uuid']) {
          this.user_list.splice(i, 1)
          this.closeUserDialog();
        }
      }
    },
    closeUserDialog() {
      this.user['dialog'] = false;
      setTimeout(() => {
        this.user['state'] = 'ADD';
        this.user['checkpwd'] = false;
        this.user['item'] = {
          userAccount: "",
          userPassword: "",
          name: "",
          enable: true,
          activationDate: "",
          expirationDate: "",
          permission: [],
        }
      }, 100);
    },
  }
}
</script>



<style lang="scss" scoped>
.organize_table_class {
  height: 80vh;
}
.organize_expanded {
  width: 100%;
  margin: 10px 0px 20px 0px;
  border-collapse: collapse;
  border: 1px solid rgb(212, 212, 212);
  th, td {
    border: 2px solid rgb(212, 212, 212);
    padding: 12px;
    font-size: 18px;
    text-align: center;
  }
  th {
    background: #000000;
    color: #FFFFFF;
    font-weight: bold;
  }
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

:deep(.edit_datapoint .v-field__input) {
  padding: 0px !important;
  justify-content: center !important;
  text-align: center !important;
}
:deep(.edit_datapoint .v-field__append-inner) {
  padding-top: 12px !important;
}
</style>