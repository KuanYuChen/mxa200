<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;padding: 15px;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
        <v-card-title style="padding: 30px 0px ㄅ0px 30px;">
          <div style="display: flex;">
            <v-btn>
              <h3>事件設定</h3>
            </v-btn>
            <v-spacer></v-spacer>
            <v-text-field
              style="max-width: 15%; margin: 0px 10px 10px 0px;"
              v-model="tableSearch"
              variant="outlined" density="compact" label="搜尋"
              append-inner-icon="mdi-magnify" single-line hide-details
            />
          </div>
        </v-card-title>
        <v-data-table
          class="group_table_class"
          :search="debouncedSearch" :headers="event_header" :items="event_list"
          v-model:page="tablePageNow"
          v-model:items-per-page="itemsPerPage"
          v-model:expanded="expand_list"
          :mobile="Setup.isPhone" hover
          item-value="uuid"
          :custom-filter="customSearch"
          hide-default-footer
        >
          <template #no-data><h3>無資料</h3></template>
          <template #item.no="{ item, index }">
            <div :style="{ 'border-left': Setup.isPhone ? '' : expand_list.includes(item.uuid) ? '5px solid red' : '' }">
              <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ ((tablePageNow - 1) * itemsPerPage) + index + 1 }}</span>
            </div>
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
                  <h3>擴展資訊 {{ item }}</h3>
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
    </div>
    
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
      expand_list: [], // 資料表擴展資料
      event_header: [
        { title: "NO", key: "no", align: "center", width: '10%' },
        { title: "事件名稱", key: "name", align: "center" },
        { title: "事件說明", key: "description", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      event_list: [],
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
      var table_list = this.event_list
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
    tableSearch(newValue) {
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      // 如果使用者快速輸入，舊的計時器會被清除，只有最後一次輸入會生效
      this.searchTimeout = setTimeout(() => this.debouncedSearch = newValue, 300);
    },
  },
  created() {
    this.getGroupList();
  },
  methods: {
    // 取得點位群組列表 (先以假資料代替)
    getGroupList() {
      this.event_list = generateMockData()
      function generateMockData(count = 5000) {
        const result = [];

        for (let i = 0; i < count; i++) {
          result.push({
            uuid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
            no: i + 1,
            name: `事件${i+1}`,
            description: `事件${i+1}說明`,
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