<!-- ====================================== Data Table V3模板 ====================================== -->
<template>
  <v-main>
    <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
        <v-card-title style="padding: 30px 0px 10px 30px;">
          <div style="display: flex;">
            <v-spacer></v-spacer>
            <div>
              <v-btn style="margin-right: 10px;" variant="text"><h3>設定</h3></v-btn>
              <v-btn style="margin-right: 10px;" variant="text"><h3>匯入</h3></v-btn>
            </div>
            <v-btn style="margin-right: 10px;" variant="text"><h3>匯出</h3></v-btn>
            <v-text-field
              style="max-width: 15%; margin: 0px 20px 10px 0px;"
              v-model="tableSearch"
              variant="outlined" density="compact" label="搜尋"
              append-inner-icon="mdi-magnify" single-line hide-details
            />
          </div>
        </v-card-title>
        <v-data-table
          class="group_table_class"
          :search="debouncedSearch" :headers="group_header" :items="group_list"
          v-model:page="tablePageNow"
          v-model:items-per-page="itemsPerPage"
          v-model:expanded="expand_group"
          :mobile="Setup.isPhone" hover
          item-value="uuid"
          :custom-filter="customSearch"
          hide-default-footer
        >
          <template #no-data><h3>無資料</h3></template>
          <template #item.groupNo="{ item, index }">
            <div :style="{ 'border-left': Setup.isPhone ? '' : expand_group.includes(item.uuid) ? '5px solid red' : '' }">
              <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ ((tablePageNow - 1) * itemsPerPage) + index + 1 }}</span>
            </div>
          </template>
          <template #item.enable="{ item }">
            <span :style="{ 'font-size': '20px', color: item['enable'] ? 'green' : 'red'}">{{ formatValue('enable', item['enable']) }}</span>
          </template>
          <template #item.protocolID="{ item }">
            <span>{{ formatValue('protocolID', item['protocolID']) }}</span>
          </template>
          
          <template #item.actions="{ item }">
            <div class="test" style="display: flex;justify-content: end; gap: 10px;">
              <v-btn style="color: green; font-size: 18px;" variant="outlined" @click="openGroup('EDIT', item)">編輯</v-btn>
              <v-btn style="color: red; font-size: 18px;" variant="outlined" @click="openGroup('DELETE', item)">刪除</v-btn>
            </div>
          </template>
          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" style="padding: 20px;">
                <div style="padding: 20px;border: 2px solid #b9b7b7;">
                  <table class="group_point_info" border="1">
                    <tr style="user-select: none;">
                      <th v-for="(title, index) in ['點位位址', '點位名稱', '初始值', '校正值', '保存型態', 'R-Expr', 'E-Expr', '點位說明']" :key="index">
                        {{ title }}
                      </th>
                      <th style="width: 10%;"></th>
                    </tr>
                    <tr v-for="(info, index) in item['datapoint']" :key="index">
                      <td>{{ info['address'] }} </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['name']" hide-details variant="plain" />
                        <div v-else>{{ info['name'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px', 'width': '10%'}">
                        <v-text-field v-if="info['edit']" 
                          class="edit_datapoint" 
                          v-model="info['initValue']" 
                          hide-details variant="plain" type="number" hide-spin-buttons 
                          @keydown="$utils.blockInvalidKeys($event)" 
                        />
                        <div v-else>{{ info['initValue'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px', 'width': '10%'}">
                        <v-text-field v-if="info['edit']" 
                          class="edit_datapoint"
                          v-model="info['correctionValue']"
                          hide-details variant="plain" type="number" hide-spin-buttons
                          @keydown="$utils.blockInvalidKeys($event)"
                        />
                        <div v-else>{{ info['correctionValue'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-select v-if="info['edit']" class="edit_datapoint" v-model="info['saveType']" :items="save_type" hide-details variant="plain" />
                        <div v-else>{{ info['saveType'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['RExpr']" hide-details variant="plain" />
                        <div v-else>{{ info['RExpr'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['EExpr']" hide-details variant="plain" />
                        <div v-else>{{ info['EExpr'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['description']" hide-details variant="plain" />
                        <div v-else>{{ info['description'] }}</div>
                      </td>
                      <td>
                        <v-btn variant="text" @click="changeEditType(info)">
                          <v-icon style="font-size: 30px;" :icon="info['edit'] ? 'mdi-pen' : 'mdi-eye'" />
                        </v-btn>
                      </td>
                    </tr>
                  </table>
                </div>
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
  </v-main>
</template>



<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  data() {
    return {
      Setup: useSetup().$state,
      tableSearch: null,
      debouncedSearch: '',
      // ======================== 群組 ========================
      expand_group: [], // 資料表擴展資料
      group_header: [
        { title: "群組編號", key: "groupNo", align: "center" },
        { title: "設備群組", key: "deviceGroup", align: "center" },
        { title: "設備", key: "selectDevice.title", align: "center" },
        { title: "位址", key: "deviceAddress", align: "center" },
        { title: "功能碼", key: "functioncode", align: "center" },
        { title: "資料型態", key: "datatype", align: "center" },
        { title: "數量", key: "datapointCount", align: "center" },
        { title: "狀態", key: "enable", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      group_list: [],
      // ========================
      isThrottled: false,         // 用於節流的標記
      tableSearch: null,          // Table表搜尋輸入框
      debouncedSearch: '',        // 防抖動後的搜尋文字
      tablePageNow: 1,            // 資料表現在的頁數
      isEditingPagenation: false, // 是否正在編輯頁數
      jumpToPageInput: null,      // 跳轉到的頁數輸入框
      itemsPerPage: 10,           // 單頁顯示筆數
    }
  },
  computed: {
    // 過濾搜尋文字對應欄位
    filteredData() {
      var table_list = this.group_list
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
    // 點位總覽之外頁面Table重置頁數
    tableSearch(newValue) {
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      // 如果使用者快速輸入，舊的計時器會被清除，只有最後一次輸入會生效
      this.searchTimeout = setTimeout(() => this.debouncedSearch = newValue, 300);
    },
  },
  created() {
    this.getGroupList()
  },
  methods: {
    // 取得點位群組列表 (先以假資料代替)
    getGroupList() {
      this.group_list = generateMockData()
      function generateMockData(count = 5000) {
        const protocols = ["ModbusTCP", "ModbusRTU", "SNMP"];
        const result = [];

        for (let i = 0; i < count; i++) {
          // 隨機挑選 protocol
          const protocol = protocols[i % protocols.length]; // 也可以用 random
          const deviceAddressBase = 1000 + i;               // base

          // 建立 datapoint 陣列（每筆 3~6 個點位）
          const datapointCount = 3 + Math.floor(Math.random() * 4); // 3 ~ 6
          const datapoints = [];

          for (let d = 0; d < datapointCount; d++) {
            const address = protocol === "SNMP" ? `1.2.3.${deviceAddressBase}.${d + 1}` : String(deviceAddressBase + d);
            datapoints.push({
              uuid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
              address: address,
              name: `${protocol.toLowerCase()}-point${d + 1}`,
              description: `說明${d + 1}`,
              initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}"
            });
          }
          result.push({
            uuid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            protocoltype: protocol,
            deviceGroup: `Group_${i}`,
            enable: true,
            protocolID: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            deviceAddress: protocol === "SNMP" ? `1.2.3.${deviceAddressBase}` : String(deviceAddressBase),
            functioncode: protocol === "SNMP" ? "GET" : "01",
            datatype: "INT",
            datapoint: datapoints,
            datapointCount: String(datapoints.length),
          });
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
    // ========================================== 資料表資訊 ==========================================
    // 統一欄位顯示邏輯
    formatValue(key, val) {
      if (key === 'enable') return val ? '啟用' : '禁用';
      if (key === 'temp') {
        if (val < 30) return '過低';
        if (val > 50) return '過高';
        return '正常';
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
    // 修改點位模式(編輯、預覽)
    changeEditType(item) {
      if (item.edit == undefined) { item.edit = true; return }
      item.edit = !item.edit
      // TODO API  ==>  item.edit == false (關閉編輯模式時更新)
    },
    // 翻頁處理
    handlePageClick(isActive, page) {
      let cleanedString = page.replace(/,/g, ''); 
      let finalNumber = parseInt(cleanedString, 10);
      if (isActive) {
        this.isEditingPagenation = true;
        this.jumpToPageInput = finalNumber;
        this.$nextTick(() => {
          this.$refs.pageInput?.focus();
        });
      } else this.tablePageNow = finalNumber;
    },
    jumpFromInlineInput() {
      if (this.jumpToPageInput === null || this.jumpToPageInput === '') {
        this.isEditingPagenation = false;
        return;
      }
      const pageNumber = parseInt(this.jumpToPageInput);
      if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= this.totalPages) {
        this.tablePageNow = pageNumber;
      }
      this.isEditingPagenation = false;
    },
  }
}
</script>


<style lang="scss" scoped>
// 群組CSS
.group_table_class {
  height: 70vh;
}
.group_point_info {
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

// 編輯點位時的select下拉選單文字置中
:deep(.edit_datapoint.v-select .v-field__input) {
  left: 15px;
}
// 編輯點位時的內部padding
:deep(.edit_datapoint .v-field__append-inner) {
  padding-top: 12px !important;
}
// 編輯點位時的內部Text Field文字框文字置中
:deep(.edit_datapoint .v-field__input) {
  padding: 0px !important;
  justify-content: center !important;
  text-align: center !important;
}
</style>