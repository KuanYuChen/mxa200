<!-- =================================================== 通訊協議設定頁面 =================================================== -->
<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;padding: 15px;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
        <v-card-title style="padding: 30px 0px 0px 30px;">
          <div style="display: flex;">
            <v-btn variant="outlined" @click="openProtocol('ADD')"><h3>協議設定</h3></v-btn>
            <v-spacer></v-spacer>
            <v-text-field
              style="max-width: 15%; margin: 0px 20px 10px 0px;"
              v-model="tableSearch"
              variant="outlined"
              density="comfortable"
              label="搜尋"
              single-line
              hide-details
            >
              <template v-slot:append-inner><v-icon icon="mdi-magnify" /></template>
            </v-text-field>
          </div>
        </v-card-title>
        <v-data-table
          class="protocol_scroll"
          :search="tableSearch" :headers="protocol_header" :items="protocol_list"
          v-model:page="tablePageNow"
          v-model:items-per-page="itemsPerPage"
          v-model:expanded="expandedItems"
          mobile-breakpoint="md"
          item-value="uuid"
          hide-default-footer
          :custom-filter="customSearch"
          hover
        >
          <template #no-data><h3>無資料</h3></template>
          <template v-slot:item.protocol="{ item }">
            <div :style="{ 'border-left': Setup.isPhone ? '' : expandedItems.includes(item.uuid) ? '5px solid red' : '' }">
              <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ formatValue('protocol', item['protocol']) }}</span>
            </div>
          </template>
          <template v-slot:item.enable="{ item }">
            <div :style="{ color: item.enable ? 'green' : 'red' }">{{ formatValue('enable', item['enable']) }}</div>
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="test" style="display: flex; justify-content: end; gap: 10px;">
              <v-btn style="color: green;" variant="outlined" @click="openProtocol('EDIT', item)">
                <h3>編輯</h3>
              </v-btn>
              <v-btn style="color: red;" variant="outlined" @click="openProtocol('DELETE', item)">
                <h3>刪除</h3>
              </v-btn>
            </div>
          </template>

          <template v-slot:item.data-table-expand="{ item }">
            <v-btn variant="plain" :icon="expandedItems.includes(item.uuid) ? 'mdi-chevron-up' : 'mdi-chevron-down'" @click="toggleExpand(item)" />
          </template>

          <template v-slot:expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length">
                <div v-if="item.protocol == 'modbus_tcp'">
                  <h2 style="margin-top: 10px;">Modbus TCP 詳細資訊:</h2>
                  <table class="protocol_info" style="margin: 10px 0px 20px 0px; width: 100%;" border="1">
                    
                  </table>
                </div>
                <div v-else-if="item.protocol == 'modbus_rtu'">
                  <h2 style="margin-top: 10px;">Modbus RTU 詳細資訊:</h2>
                  <table class="protocol_info" style="margin: 10px 0px 20px 0px; width: 100%;" border="1">
                    <tr>
                      <th style="background: #000000;">通訊埠</th>
                      <th style="background: #000000;">波特率</th>
                      <th style="background: #000000;">奇偶校驗</th>
                      <th style="background: #000000;">資料位元</th>
                      <th style="background: #000000;">停止位元</th>
                    </tr>
                    <tr>
                      <td>{{ item["com"] }}</td>
                      <td>{{ item['baudrate'] }}</td>
                      <td>{{ item["parity"] }}</td>
                      <td>{{ item["databits"] }}</td>
                      <td>{{ item["stopbits"] }}</td>
                    </tr>
                  </table>
                </div>
                <div v-else-if="item.protocol == 'snmp'">
                  <h2 style="margin-top: 10px;">SNMP 詳細資訊:</h2>
                  <table class="protocol_info" style="margin: 10px 0px 20px 0px; width: 100%;" border="1">
                    <tr>
                      <th style="background: #145f82;">社群名稱</th>
                    </tr>
                    <tr>
                      <td>{{ item["community"] }}</td>
                    </tr>
                  </table>
                </div>
                <v-divider></v-divider>
              </td>
            </tr>
          </template>
        </v-data-table>

        <!-- =================================================================== 分頁元件 =================================================================== -->
        <v-card-actions class="pa-4" style="user-select: none;" @wheel="handelTurnPageWheel">
          <v-row align="center" justify="center" class="w-100">
            <!-- 每頁筆數選擇器 -->
            <v-col cols="12" sm="auto" class="d-flex justify-center justify-sm-start">
              <v-select
                v-model="itemsPerPage"
                :items="[10, 20, 50, 100, 200]"
                label="每頁筆數"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 150px;"
              />
            </v-col>
            
            <!-- 響應式分頁元件 -->
            <v-col cols="12" sm="auto" class="d-flex justify-center">
              <v-pagination v-model="tablePageNow" :length="totalPages" :total-visible="Setup.isPhone ? 5 : 9" color="black">
                <template v-slot:item="{ page, isActive, props }">
                  <v-text-field v-if="isActive && isEditingPagenation" ref="pagenationInput"
                    style="width: 100px; text-align: center;"
                    v-model.number="jumpToPageInput"
                    variant="outlined" type="number" hide-spin-buttons density="compact" hide-details 
                    @keydown.enter="jumpFromInlineInput" @blur="isEditingPagenation = false" 
                  />
                  <v-btn v-else variant="text"
                    :color="isActive ? 'red' : ''"
                    :disabled="props.disabled" hide-details
                    @click="handlePageClick(isActive, page)"
                  >
                    {{ page }}
                  </v-btn>
                </template>
              </v-pagination>
            </v-col>
          </v-row>
        </v-card-actions>
      </v-card>
    </div>
  </v-main>
  <v-dialog v-model="config['dialog']" width="900" persistent>
    <v-card v-if="config['state'] != 'DELETE'">
      <v-card-title>
        <h2 style="margin: 10px 0px 10px 10px;">{{ config['state'] == 'ADD' ? '新增' : '修改' }}通訊設定</h2>
      </v-card-title>
      <v-select v-if="config['state'] == 'ADD'"
        style="margin: 0px 30px;"
        v-model="config['item']['protocol']"
        :items="protocol_type"
        item-title="label"
        item-value="value"
        label="選擇協議"
        variant="outlined"
      ></v-select>
      <v-switch style="margin: 0px 30px;" v-model="config['item']['enable']" color="primary" inset hide-details>
        <template v-slot:label><h2 style="font-size: 25px;">啟用/禁用協議</h2></template>
      </v-switch>

      <v-form :disabled="!config['item']['enable']">
        <div style="display: flex; margin: 0px 30px;">
          <div style="width: 10%;"></div>
          <h2 style="margin-top: 10px;">設備名稱</h2>
          <div style="width: 5%;"></div>
          <v-text-field v-model="config['item']['name']" variant="outlined" density="comfortable" />
          <div style="width: 5%;"></div>
        </div>
        <div style="display: flex; margin: 0px 30px;">
          <div style="width: 10%;"></div>
          <h2 style="margin-top: 10px;">設備說明</h2>
          <div style="width: 5%;"></div>
          <v-text-field v-model="config['item']['deviceDescription']" variant="outlined" density="comfortable" />
          <div style="width: 5%;"></div>
        </div>
        <div v-if="config['item']['protocol'] == 'modbus_tcp'">
          <div style="display: flex; margin: 0px 30px;">
          <div style="width: 10%;"></div>
            <v-text-field 
              v-model="config['item']['ip']" 
              variant="outlined" density="comfortable" label="網路位址" 
            />
            <div style="width: 2%;"></div>
            <v-text-field 
              v-model="config['item']['port']" 
              variant="outlined" density="comfortable" label="Port" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 5%;"></div>
          </div>
          <div style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <v-text-field 
              v-model="config['item']['timeout']" 
              variant="outlined" density="comfortable" label="逾時時間/ms" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 2%;"></div>
            <v-text-field 
              v-model="config['item']['retry']" 
              variant="outlined" density="comfortable" label="Retry/次數" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 2%;"></div>
            <v-text-field 
              v-model="config['item']['interval']" 
              variant="outlined" density="comfortable" label="間隔時間/ms" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 5%;"></div>
          </div>
        </div>
        <div v-else-if="config['item']['protocol'] == 'modbus_rtu'">
          <div style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <v-text-field  v-model="config['item']['com']" variant="outlined" density="comfortable" label="通訊埠" />
            <div style="width: 2%;"></div>
            <v-select v-model="config['item']['baudrate']" :items="baudrate_list" variant="outlined" density="comfortable" label="波特率" />
            <div style="width: 2%;"></div>
            <v-select v-model="config['item']['parity']" :items="parity_list" variant="outlined" density="comfortable" label="奇偶校驗" />
            <div style="width: 5%;"></div>
          </div>
          <div style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <v-text-field 
              v-model="config['item']['databits']" 
              variant="outlined" density="comfortable" label="資料位元" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 2%;"></div>
            <v-text-field 
              v-model="config['item']['stopbits']" 
              variant="outlined" density="comfortable" label="停止位元" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 5%;"></div>
          </div>
        </div>
        <div v-else>
          <div style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <v-text-field 
              v-model="config['item']['ip']" 
              variant="outlined" density="comfortable" label="網路位址" 
            />
            <div style="width: 2%;"></div>
            <v-text-field 
              v-model="config['item']['port']" 
              variant="outlined" density="comfortable" label="Port" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 5%;"></div>
          </div>
          <div style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <h2 style="margin-top: 10px;">社群名稱</h2>
            <div style="width: 5%;"></div>
            <v-text-field v-model="config['item']['community']" variant="outlined" density="comfortable" placeholder="(請避免輸入public跟private)" />
            <div style="width: 5%;"></div>
          </div>
        </div>
      </v-form>

      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: white; background: #a6c9eb; font-size: 18px;" variant="outlined" @click="closeProtocol()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: white; background: #1f5d97; font-size: 18px;" variant="outlined" @click="config['state'] == 'ADD' ? addProtocol() : editProtocol()">
            <h3>{{ config['state'] == 'ADD' ? '新增' : '修改' }}</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
    <v-card v-else>
      <v-card-title>
        <h2 style="margin: 20px; text-align: center;">確定要刪除通訊協議設定?</h2>
      </v-card-title>
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closeProtocol()">
            <h3>否</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="removeProtocol()">
            <h3>是</h3>
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
      expandedItems: [], // 資料表擴展資料
      protocol_header: [
        { title: "通訊協議類型", key: "protocol", align: "center" },
        { title: "設備名稱", key: "name", align: "center" },
        { title: "主網路位址", key: "ip", align: "center" },
        { title: "主Port", key: "port", align: "center" },
        { title: "啟用狀態", key: "enable", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      protocol_list: [],
      // ======================== Table表搜尋、頁數、排序參數 ========================
      isThrottled: false,         // 用於節流的標記
      tableSearch: null,          // Table表搜尋輸入框
      debouncedSearch: '',        // 防抖動後的搜尋文字
      tablePageNow: 1,            // 資料表現在的頁數
      isEditingPagenation: false, // 是否正在編輯頁數
      jumpToPageInput: null,      // 跳轉到的頁數輸入框
      itemsPerPage: 10,           // 單頁顯示筆數
      // ======================== Dialog操作框參數 ========================
      config: { dialog: false, state: "ADD", item: {} },
      protocol_type: [
        { label: "Modbus TCP", value: "modbus_tcp" },
        { label: "Modbus RTU", value: "modbus_rtu" },
        { label: "SNMP", value: "snmp" },
      ],
      baudrate_list: [1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200, 230400],
      parity_list: ['N', 'even', 'odd'],
      snmpv3_protocol: ['MD5', 'SHA'],
      snmpprivacy_protocol: ['DES', 'AES'],
    };
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.keyboardDialogEvent);
  },
  mounted() {
    this.getProtocols();
    window.addEventListener("keydown", this.keyboardDialogEvent);
  },
  computed: {
    // 過濾搜尋文字對應欄位
    filteredData() {
      var table_list = this.protocol_list
      // 沒有搜尋文字，回傳全部資料
      if (!this.tableSearch) return table_list
      const keyword = this.tableSearch.trim().toLowerCase();
      return table_list.filter((item, index) => {
        const rowText = Object.entries(item).filter(([key]) => key !== 'id').map(([, val]) => String(val).toLowerCase()).join(' ');
        return rowText.includes(keyword);
      });
    },
    // 分頁顯示的資料
    pagedData() {
      const start = (this.tablePageNow - 1) * this.itemsPerPage;
      return this.filteredData.slice(start, start + this.itemsPerPage);
    },
    // 分頁總數
    totalPages() { return Math.ceil(this.filteredData.length / this.itemsPerPage) },
  },
  watch: {
    'config.item.protocol'(type) {
      if (this.config['state'] == 'ADD') {
        var initConfig = this.config['item']
        if (type == 'modbus_rtu') {
          initConfig['com'] = "COM1"        // 通訊埠
          initConfig['baudrate'] = 9600     // 波特率
          initConfig['parity'] = "N"        // 奇偶校驗
          initConfig['databits'] = 8        // 資料位元
          initConfig['stopbits'] = 1        // 停止位元
        }
        // SNMP V3 、隱私權設定
        if (type == 'snmp') {
          initConfig['community'] = ""              // 社群名稱
        }
      }
    }
  },
  methods: {
    // 取得通訊協議列表
    getProtocols() {
      useSetup().getProtocolDevices().then((res)=> {
        var dev_list = Object.prototype.toString.call(res['data']) === '[object Object]' ? res['data'] : {}
        this.protocol_list = []
        for (let i in dev_list) {
          var info = { targetKey: i, ...dev_list[i] }
          this.protocol_list.push(info)
        }
        console.log(this.protocol_list, dev_list)
      })
    },
    // ========================================== 滾輪換頁事件 ==========================================
    handelTurnPageWheel(event) {
      event.preventDefault();
      if (this.isThrottled) return; // 正在節流冷卻中，則不執行
      this.isThrottled = true;      // 立即進入冷卻狀態
      if (event.deltaY > 0) this.nextPage();          // 向下滾動 -> 下一頁
      else if (event.deltaY < 0) this.prevPage();     // 向上滾動 -> 上一頁
      setTimeout(() => this.isThrottled = false, 50); // 50毫秒後解除冷卻
    },
    // 獨立的下一頁/上一頁方法
    nextPage() { if (this.tablePageNow < this.totalPages) this.tablePageNow++; },
    prevPage() { if (this.tablePageNow > 1) this.tablePageNow--; },
    // ========================================== 輸入框換頁方式 ==========================================
    handlePageClick(isActive, page) {
      let cleanedString = page.replace(/,/g, ''); 
      let pageNumber = parseInt(cleanedString, 10);
      if (isActive) {
        this.isEditingPagenation = true;
        this.jumpToPageInput = pageNumber;
        this.$nextTick(() => { this.$refs.pagenationInput?.focus() });
      } else this.tablePageNow = pageNumber;
    },
    jumpFromInlineInput() {
      if (this.jumpToPageInput === null || this.jumpToPageInput === '') {
        this.isEditingPagenation = false;
        return;
      }
      const pageNumber = parseInt(this.jumpToPageInput);
      // 有效頁數才跳轉
      if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= this.totalPages) {
        this.tablePageNow = pageNumber;
      }
      this.isEditingPagenation = false;
    },
    // 展開/收合資料表
    toggleExpand(item) {
      const id = item.uuid;
      const index = this.expandedItems.indexOf(id);
      if (index !== -1) this.expandedItems.splice(index, 1); // 關閉
      else this.expandedItems.push(id); // 展開
    },
    // 統一欄位顯示邏輯 (可擴充自訂文字)
    formatValue(key, val) {
      if (key === 'enable') return val ? '啟用' : '禁用';
      if (key === 'protocol') {
        return val == 'modbus_tcp' ? 'Modbus TCP' : val == 'modbus_rtu' ? 'Modbus RTU' : 'SNMP'
      }
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
    // 開啟協議設定Dialog
    openProtocol(state, item) {
      var protocolInfo = this.config
      protocolInfo["state"] = state;
      protocolInfo["dialog"] = true;
      if (state == "EDIT" || state == "DELETE") {
        protocolInfo["item"] = JSON.parse(JSON.stringify(item));
      } else {
        protocolInfo['item'] = this.protocolTemplate();
      }
    },
    // Dialog鍵盤事件
    keyboardDialogEvent(e) {
      if (!this.config['dialog']) return;
      if (e.key == "Escape") this.closeProtocol();
      if (e.key == "Enter") {
        if (this.config['state'] == 'ADD') this.addProtocol();
        else if (this.config['state'] == 'EDIT') this.editProtocol();
        else if (this.config['state'] == 'DELETE') this.removeProtocol();
      }
    },
    // 文字框為只限數字時禁止輸入 e、E、+、-
    blockInvalidNumber(e) {
      if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
    },
    // 新增協議
    addProtocol() {
      var repeatKey = this.protocol_list.findIndex(h => h.name == this.config['item']['name'])
      if (repeatKey != -1) {
        useSetup().showAlertDialog({ icon: "warn", title: "名稱重複，請重新輸入！" })
        return
      }
      this.config['item']['port'] = parseInt(this.config['item']['port'])
      var info = { ...this.config['item'], tasks: [] }
      useSetup().setProtalcolDevice(info).then((res)=> {
        console.log(res["data"])
        this.getProtocols();
      })
      // this.protocol_list.push(info)
      console.log("Add Protocol: ", info)
      this.closeProtocol();
    },
    // 修改協議
    editProtocol() {
      for (let i in this.protocol_list) {
        if (this.protocol_list[i]["targetKey"] == this.config["item"]["targetKey"]) {
          this.config['item']['port'] = parseInt(this.config['item']['port'])
          var editTarget = { 
            target: this.config['item']['targetKey'],
            data: this.config['item']
          }
          console.log(editTarget)
          useSetup().updateProtalcolDevice(editTarget).then(()=> {
            this.protocol_list[i] = this.config['item']
            console.log("Edit Protocol: ", this.protocol_list[i], this.config)
            this.closeProtocol();
          })
        }
      }
    },
    // 移除協議
    removeProtocol() {
      for (let i in this.protocol_list) {
        if (this.protocol_list[i]["targetKey"] == this.config["item"]["targetKey"]) {
          var removeTarget = { target: this.config["item"]['targetKey'] }
          useSetup().deleteProtalcolDevice(removeTarget).then(()=> {
            this.protocol_list.splice(i, 1)
            console.log("Remove Protocol: ", this.protocol_list)
            this.closeProtocol();
          })
        }
      }
    },
    // 關閉協議設定Dialog
    closeProtocol() {
      this.config["dialog"] = false;
      setTimeout(() => {
        this.config['state'] = 'ADD';
        this.config['item'] = this.protocolTemplate();
      }, 200);
    },
    // ================================ 模板Function ================================
    protocolTemplate() {
      return {
        protocol: "modbus_tcp",       // 預設協議類型
        enable: true,                 // 啟用協議
        name: "",                     // 設備名稱
        deviceDescription: "",        // 設備說明
        ip: "",                       // TCP Main Host
        port: 0,                      // TCP Main Port
        timeout: 1000,                // Timeout (微秒)
        retry: 2,                     // Retry次數
        interval: 1000,               // Interval (微秒)
      };
    }
  }
}
</script>


<style lang="scss" scoped>
.protocol_scroll {
  height: 65vh;
}

.protocol_info {
  width: 100%;
  border-collapse: collapse;
  th, td {
    border: 1px solid rgb(212, 212, 212);
    padding: 12px;
  }
  td {
    font-size: 17px;
    text-align: center;
    font-weight: 500;
  }

  th {
    color: white;
    font-size: 18px;
    font-weight: bold;
  }

  tr:nth-child(even) {
    background-color: #ffffff;
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
</style>