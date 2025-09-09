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
              <v-btn style="color: red;" variant="outlined" @click="removeProtocol(item)">
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
                <div v-if="item.protocol == 'modbus'">
                  <h2 style="margin-top: 10px;">Modbus TCP 詳細資訊:</h2>
                  <table class="protocol_info" style="margin: 10px 0px 20px 0px; width: 100%;" border="1">
                    <tr>
                      <th style="background: #000000;">狀態(副)</th>
                      <th style="background: #000000;">副網路位置</th>
                      <th style="background: #000000;">副Port</th>
                      <th style="background: #000000;">逾時時間</th>
                      <th style="background: #000000;">Retry 次數</th>
                      <th style="background: #000000;">間隔時間</th>
                    </tr>
                    <tr>
                      <td :style="{ color: item['senable'] ? 'green' : 'red' }">{{ item['senable'] ? '啟用' : '禁用' }}</td>
                      <td>{{ item['sip'] }}</td>
                      <td>{{ item['sport'] }}</td>
                      <td>{{ item["timeout"] }}</td>
                      <td>{{ item["retry"] }}</td>
                      <td>{{ item["interval"] }}</td>
                    </tr>
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
                      <th style="background: #145f82;">SNMPv3</th>
                      <th style="background: #145f82;">帳號</th>
                      <th style="background: #145f82;">隱私</th>
                      <th style="background: #145f82;">協定</th>
                    </tr>
                    <tr>
                      <td>{{ item["community"] }}</td>
                      <td :style="{ color: item['v3enable'] ? 'green' : 'red' }">{{ item["v3enable"] ? '啟用' : '禁用' }}</td>
                      <td>{{ item["v3account"] }}</td>
                      <td :style="{ color: item['v3privacyenable'] ? 'green' : 'red' }">{{ item["v3privacyenable"] ? '啟用' : '禁用' }}</td>
                      <td>{{ item["v3privacyencryption"] }}</td>
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
    <v-card>
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
          <v-text-field v-model="config['item']['deviceName']" variant="outlined" density="comfortable" />
          <div style="width: 5%;"></div>
        </div>
        <div style="display: flex; margin: 0px 30px;">
          <div style="width: 10%;"></div>
          <h2 style="margin-top: 10px;">設備說明</h2>
          <div style="width: 5%;"></div>
          <v-text-field v-model="config['item']['deviceDescription']" variant="outlined" density="comfortable" />
          <div style="width: 5%;"></div>
        </div>

        <div v-if="config['item']['protocol'] == 'modbus_rtu'">
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
            <v-switch style="margin-bottom: 15px;" v-model="config['item']['menable']" color="primary" inset hide-details>
              <template v-slot:label>
                <h2 style="font-size: 25px;">{{ config['item']['menable'] ? '啟用' : '禁用' }}</h2>
              </template>
            </v-switch>
            <div style="width: 3%;"></div>
            <v-text-field 
              v-model="config['item']['mip']" 
              :disabled="!config['item']['menable'] || !config['item']['enable']" 
              variant="outlined" density="comfortable" label="主網路位址" 
            />
            <div style="width: 2%;"></div>
            <v-text-field 
              v-model="config['item']['mport']" 
              :disabled="!config['item']['menable'] || !config['item']['enable']" 
              variant="outlined" density="comfortable" label="主Port" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 5%;"></div>
          </div>

          <div style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <v-switch style="margin-bottom: 15px;" v-model="config['item']['senable']" color="primary" inset hide-details>
              <template v-slot:label>
                <h2 style="font-size: 25px;">{{ config['item']['senable'] ? '啟用' : '禁用' }}</h2>
              </template>
            </v-switch>
            <div style="width: 3%;"></div>
            <v-text-field 
              v-model="config['item']['sip']" 
              :disabled="!config['item']['senable'] || !config['item']['enable']" 
              variant="outlined" density="comfortable" label="次網路位址" 
            />
            <div style="width: 2%;"></div>
            <v-text-field 
              v-model="config['item']['sport']" 
              :disabled="!config['item']['senable'] || !config['item']['enable']" 
              variant="outlined" density="comfortable" label="次Port" 
              type="number" hide-spin-buttons @keydown="blockInvalidNumber" 
            />
            <div style="width: 5%;"></div>
          </div>
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

        <div v-if="config['item']['protocol'] == 'snmp'">
          <h2 style="margin: 10px 0px 30px 40px;">SNMP進階設定</h2>
          <div style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <h2 style="margin-top: 10px;">社群名稱</h2>
            <div style="width: 5%;"></div>
            <v-text-field v-model="config['item']['community']" variant="outlined" density="comfortable" placeholder="(請避免輸入public跟private)" />
            <div style="width: 5%;"></div>
          </div>
          <v-switch style="margin: 0px 40px;" v-model="config['item']['v3enable']" color="primary" inset hide-details>
            <template v-slot:label>
              <h2 style="font-size: 25px;">{{ config['item']['v3enable'] ? '啟用' : '禁用' }}SNMPv3服務</h2>
            </template>
          </v-switch>
          <v-form :disabled="!config['item']['v3enable']" style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <v-text-field v-model="config['item']['v3account']" variant="outlined" density="comfortable" label="使用者帳號" />
            <div style="width: 2%;"></div>
            <v-text-field 
              v-model="config['item']['v3password']" 
              variant="outlined" density="comfortable" label="密碼" 
              :type="config['item']['v3showpwd'] ? 'text' : 'password'" 
              :append-inner-icon="config['item']['v3showpwd'] ? 'mdi-eye' : 'mdi-eye-off'" 
              @click:append-inner="config['item']['v3showpwd'] = !config['item']['v3showpwd']"
            />
            <div style="width: 2%;"></div>
            <v-select v-model="config['item']['v3encryption']" :items="snmpv3_protocol" variant="outlined" density="comfortable" label="通訊協定" />
            <div style="width: 5%;"></div>
          </v-form>


          <v-switch style="margin: 0px 40px;" v-model="config['item']['v3privacyenable']" color="primary" inset hide-details>
            <template v-slot:label>
              <h2 style="font-size: 25px;">{{ config['item']['v3privacyenable'] ? '啟用' : '禁用' }}SNMP隱私權</h2>
            </template>
          </v-switch>
          <v-form :disabled="!config['item']['v3privacyenable']" style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <h2 style="margin-top: 10px;">通訊協定</h2>
            <div style="width: 5%;"></div>
            <v-select v-model="config['item']['v3privacyencryption']" :disabled="!config['item']['v3privacyenable']" :items="snmpprivacy_protocol" variant="outlined" density="comfortable" label="通訊協定" />
            <div style="width: 5%;"></div>
          </v-form>
          <div style="display: flex; margin: 0px 30px;">
            <div style="width: 10%;"></div>
            <h2 style="margin-top: 10px;">密碼</h2>
            <div style="width: 11%;"></div>
            <v-text-field 
              v-model="config['item']['v3privacypassword']" 
              variant="outlined" density="comfortable" 
              :disabled="!config['item']['v3privacyenable']" 
              :type="config['item']['v3privacyshowpwd'] ? 'text' : 'password'" 
              :append-inner-icon="config['item']['v3privacyshowpwd'] ? 'mdi-eye' : 'mdi-eye-off'" 
              @click:append-inner="config['item']['v3privacyshowpwd'] = !config['item']['v3privacyshowpwd']"
            />
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
        { title: "設備名稱", key: "deviceName", align: "center" },
        { title: "主網路位址", key: "mip", align: "center" },
        { title: "主Port", key: "mport", align: "center" },
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
        { label: "Modbus TCP", value: "modbus" },
        { label: "Modbus RTU", value: "modbus_rtu" },
        { label: "SNMP", value: "snmp" },
      ],
      baudrate_list: ['1200', '2400', '4800', '9600', '14400', '19200', '38400', '57600', '115200', '230400'],
      parity_list: ['none', 'even', 'odd'],
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
          initConfig['baudrate'] = "9600"   // 波特率
          initConfig['parity'] = "none"     // 奇偶校驗
          initConfig['databits'] = 8        // 資料位元
          initConfig['stopbits'] = 1        // 停止位元
        }
        // SNMP V3 、隱私權設定
        if (type == 'snmp') {
          initConfig['community'] = ""              // 社群名稱
          initConfig['v3enable'] = false            // SNMP V3服務啟用
          initConfig['v3account'] = ""              // 使用者帳號
          initConfig['v3password'] = ""             // 密碼
          initConfig['v3encryption'] = "MD5"        // 通訊協定
          initConfig['v3privacyenable'] = false     // SNMP隱私權啟用
          initConfig['v3privacypassword'] = ""      // 密碼
          initConfig['v3privacyencryption'] = "DES" // 通訊協定
        }
      }
    }
  },
  methods: {
    // 取得通訊協議列表 (先以假資料代替)
    getProtocols() {
      this.protocol_list = generateDevices(5000); // 產生大量假資料測試
      function generateDevices(count = 5000) {
        const protocolTemplates = {
          modbus: () => ({
            uuid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            protocol: "modbus",
            enable: true,
            deviceName: "TCP_Device_" + Math.floor(Math.random() * 10000),
            deviceDescription: "TCP設備",
            menable: true,
            mip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            mport: (1000 + Math.floor(Math.random() * 9000)).toString(),
            senable: Math.random() > 0.5,
            sip: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            sport: (1000 + Math.floor(Math.random() * 9000)).toString(),
            timeout: 1000 + Math.floor(Math.random() * 2000),
            retry: 1 + Math.floor(Math.random() * 5),
            interval: 1000
          }),

          modbus_rtu: () => ({
            uuid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            protocol: "modbus_rtu",
            enable: true,
            deviceName: "RTU_Device_" + Math.floor(Math.random() * 10000),
            deviceDescription: "RTU設備",
            timeout: (1000 + Math.floor(Math.random() * 2000)).toString(),
            retry: (1 + Math.floor(Math.random() * 5)).toString(),
            interval: 1000,
            com: "COM" + (1 + Math.floor(Math.random() * 5)),
            baudrate: ["9600", "19200", "38400"][Math.floor(Math.random() * 3)],
            parity: ["none", "even", "odd"][Math.floor(Math.random() * 3)],
            databits: [7, 8][Math.floor(Math.random() * 2)],
            stopbits: [1, 2][Math.floor(Math.random() * 2)]
          }),

          snmp: () => ({
            uuid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            protocol: "snmp",
            enable: true,
            deviceName: "SNMP_Device_" + Math.floor(Math.random() * 10000),
            deviceDescription: "SNMP設備",
            menable: true,
            mip: `172.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            mport: (1000 + Math.floor(Math.random() * 9000)).toString(),
            senable: Math.random() > 0.5,
            sip: `192.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
            sport: (1000 + Math.floor(Math.random() * 9000)).toString(),
            timeout: (1000 + Math.floor(Math.random() * 2000)).toString(),
            retry: (1 + Math.floor(Math.random() * 6)).toString(),
            interval: 1000,
            community: "snmp_" + Math.floor(Math.random() * 1000),
            v3enable: Math.random() > 0.5,
            v3account: "acc" + Math.floor(Math.random() * 100),
            v3password: Math.random().toString(36).slice(2, 8),
            v3encryption: ["MD5", "SHA"][Math.floor(Math.random() * 2)],
            v3privacyenable: Math.random() > 0.5,
            v3privacypassword: Math.random().toString(36).slice(2, 8),
            v3privacyencryption: ["DES", "AES"][Math.floor(Math.random() * 2)]
          })
        };

        const protocols = Object.keys(protocolTemplates);
        const result = [];

        for (let i = 0; i < count; i++) {
          const type = protocols[Math.floor(Math.random() * protocols.length)]; // 隨機分配
          result.push(protocolTemplates[type]());
        }

        return result;
      }

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
        return val == 'modbus' ? 'Modbus TCP' : val == 'modbus_rtu' ? 'Modbus RTU' : 'SNMP'
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
      var repeatKey = this.protocol_list.findIndex(h => h.deviceName == this.config['item']['deviceName'])
      if (repeatKey != -1) {
        useSetup().showAlertDialog({ icon: "warn", title: "名稱重複，請重新輸入！" })
        return
      }
      var info = { uuid: crypto.randomUUID(), ...this.config['item'] }
      this.protocol_list.push(info)
      console.log("Add Protocol: ", this.protocol_list)
      this.closeProtocol();
    },
    // 修改協議
    editProtocol() {
      for (let i in this.protocol_list) {
        if (this.protocol_list[i]["uuid"] == this.config["item"]["uuid"]) {
          this.protocol_list[i] = this.config['item']
          console.log("Edit Protocol: ", this.protocol_list[i], this.config)
          this.closeProtocol();
        }
      }
    },
    // 移除協議
    removeProtocol(item) {
      for (let i in this.protocol_list) {
        if (this.protocol_list[i]["uuid"] == item["uuid"]) {
          this.protocol_list.splice(i, 1)
          console.log("Remove Protocol: ", this.protocol_list)
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
        protocol: "modbus",           // 預設協議類型
        enable: true,                 // 啟用協議
        deviceName: "",               // 設備名稱
        deviceDescription: "",        // 設備說明
        menable: true,                // 主迴路啟用狀態
        mip: "",                      // TCP Main Host
        mport: "",                    // TCP Main Port
        senable: true,                // 次迴路啟用狀態
        sip: "",                      // TCP Sub Host
        sport: "",                    // TCP Sub Port
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



<!-- this.protocol_list = [
  {
    "uuid": "7e226034-cd48-4a57-b813-a2b87f8ca4ab",
    "protocol": "modbus",
    "enable": true,
    "deviceName": "TCP_Device",
    "deviceDescription": "TCP設備",
    menable: true,
    mip: "",
    mport: "",
    senable: true,
    sip: "",
    sport: "",
    "timeout": 1000,
    "retry": 2,
    "interval": 1000
  },
  {
    "uuid": "cd4b311c-7882-4bb0-841c-a726e71f2a21",
    "protocol": "modbus_rtu",
    "enable": true,
    "deviceName": "RTU_Device",
    "deviceDescription": "RTU設備",
    "timeout": "2000",
    "retry": "3",
    "interval": 1000,
    "com": "COM1",
    "baudrate": "9600",
    "parity": "none",
    "databits": 8,
    "stopbits": 1
  },
  {
    "uuid": "60f7fc19-28b7-4e7f-a3e1-1392ec3ac596",
    "protocol": "snmp",
    "enable": true,
    "deviceName": "SNMP_Device",
    "deviceDescription": "SNMP設備",
    menable: true,
    mip: "",
    mport: "",
    senable: true,
    sip: "",
    sport: "",
    "timeout": "2000",
    "retry": "6",
    "interval": 1000,
    community: "",
    v3enable: false,
    v3account: "",
    v3password: "",
    v3encryption: "MD5",
    v3privacyenable: false,
    v3privacypassword: "",
    v3privacyencryption: "DES",
  }
] -->
