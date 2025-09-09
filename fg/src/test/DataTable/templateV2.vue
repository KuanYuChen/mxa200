<!-- ====================================== Data Table V2模板 ====================================== -->
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
        <div class="datapoint_list_class">
          <table class="total_point_list">
            <tr style="user-select: none;">
              <th v-for="(header, index) in point_header" :key="index" @click="sortPointList(header['value'])">
                <span>{{ header['title'] }}</span>
                <span v-if="sortKey === header['value']">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th style="width: 18%;"></th>
            </tr>
            <tbody>
              <tr v-for="(info, index) in pagedData" :key="index" :style="{background: index % 2 ? '#e4e4e4' : '#d1d1d1' }">
                <td>{{ info['id'] }}</td>
                <td>{{ info['name'] }}</td>
                <td :style="{ color: info['userauth'] ? 'green' : 'red' }">{{ formatValue('userauth', info['userauth']) }}</td>
                <td>{{ info['organize'] }}</td>
                <td>{{ info['pageauth'] }}</td>
                <td :style="{ color: info['userauth'] ? 'green' : 'red' }">{{ formatValue('enable', info['enable']) }}</td>
                <td style="margin: 0px 10px;">
                  <v-btn style="margin: 2px 5px;" variant="outlined" color="orange"><h3>查看</h3></v-btn>
                  <v-btn style="margin: 2px 5px;" variant="outlined" color="green"><h3>編輯</h3></v-btn>
                  <v-btn style="margin: 2px 5px;" variant="outlined" color="gray"><h3>停用</h3></v-btn>
                  <v-btn style="margin: 2px 5px;" variant="outlined" color="red"><h3>刪除</h3></v-btn>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="d-flex justify-center my-2">
            <v-pagination v-model="datapointPageNow" :length="totalPages" total-visible="7" color="black" />
          </div>
        </div>
      </v-card>
  </v-main>
</template>

<script>
export default {
  data() {
    return {
      tableSearch: null,
      total_datapoint: [],  // 點位全部資料
      datapointPageNow: 1,  // 點位總覽現在的頁數
      itemsPerPage: 10,     // 1頁顯示筆數
      sortKey: null,        // 排序的Key名稱 (null為不排序)
      sortOrder: null,      // 排序方式 ===> asc (升序) → desc (降序) → null（重置）
      point_header: [
        { title: '編號', value: 'id'},
        { title: '用戶帳號', value: 'name'},
        { title: '用戶權限', value: 'userauth'},
        { title: '組織名稱', value: 'organize'},
        { title: '頁面權限', value: 'pageauth'},
        { title: '啟用狀態', value: 'enable'},
      ],
    }
  },
  computed: {
    // 過濾搜尋文字對應欄位
    filteredData() {
      if (!this.tableSearch) return this.total_datapoint;
      const keyword = this.tableSearch.trim().toLowerCase();
      return this.total_datapoint.filter((item) => {
        const rowText = Object.entries(item).filter(([key]) => key !== 'id').map(([key, val]) => this.formatValue(key, val)).join(' ').toLowerCase();
        return rowText.includes(keyword);
      });
    },
    // 排序處理
    sortedData() {
      if (!this.sortKey || !this.sortOrder) return this.filteredData;
      return [...this.filteredData].sort((a, b) => {
        // ID為數字不用轉string
        const aVal = this.sortKey == "id" ? a[this.sortKey] : String(a[this.sortKey]).toLowerCase();
        const bVal = this.sortKey == "id" ? b[this.sortKey] : String(b[this.sortKey]).toLowerCase();
        if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    },
    // 分頁顯示的資料
    pagedData() {
      const start = (this.datapointPageNow - 1) * this.itemsPerPage;
      return this.sortedData.slice(start, start + this.itemsPerPage);
    },
    // 分頁總數
    totalPages() {
      return Math.ceil(this.sortedData.length / this.itemsPerPage);
    },
  },
  created() {
    this.getGroupList()
  },
  methods: {
    // 取得點位群組列表 (先以假資料代替)
    getGroupList() {
      this.total_datapoint = [
        {
          "uuid": "3d5ce825-6f85-4372-bce1-e2c09bf4ee84",
          "name": "使用者1",
          "userauth": true,
          "organize": "LJTEK",
          "pageauth": "",
          "enable": true,
        },
        {
          "uuid": "1c5ce825-6f85-4372-bde1-e2c09bf4ee87",
          "name": "使用者2",
          "userauth": false,
          "organize": "JQTEK",
          "pageauth": "",
          "enable": false,
        },
        {
          "uuid": "1ccce825-6f85-4372-bde1-e2c09bf4ee87",
          "name": "使用者3",
          "userauth": false,
          "organize": "LEONTON",
          "pageauth": "",
          "enable": false,
        },
      ]
    },
    // 統一顯示轉換邏輯
    formatValue(key, val) {
      if (key === 'enable') return val ? '啟用' : '禁用';
      if (key === 'userauth') return val ? '啟用' : '禁用';
      if (key === 'temp') {
        if (val < 30) return '過低';
        if (val > 50) return '過高';
        return '正常';
      }
      return val ?? '';
    },
    // 排序列表資料
    sortPointList(key) {
      if (this.sortKey !== key) { // 換欄位 → 從 asc 開始
        this.sortKey = key;
        this.sortOrder = 'asc';
      } else { // 同欄位：asc (升序) → desc (降序) → null（重置）
        if (this.sortOrder === 'asc') this.sortOrder = 'desc';
        else if (this.sortOrder === 'desc') {
          this.sortKey = null;
          this.sortOrder = null;
        } else this.sortOrder = 'asc';
      }
    },
  }
}
</script>


<style lang="scss" scoped>
// 群組CSS
.group_table_class {
  height: 80vh;
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


// 點位總覽 CSS
.datapoint_list_class {
  height: 80vh; 
  overflow: auto;
}
.total_point_list {
  width: 100%;
  margin: 10px 0px 20px 0px;
  border: 1px solid rgb(212, 212, 212);
  border-collapse: collapse;
  th, td {
    border: 2px solid white;
    padding: 10px 0px;
    font-size: 18px;
    text-align: center;
  }
  th {
    background: #E97132;
    color: #FFFFFF;
    font-weight: bold;
  }
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