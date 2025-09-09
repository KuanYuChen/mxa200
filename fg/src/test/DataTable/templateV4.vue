<template>
  <v-main>
    <div id="app">
      <h1>我的資料表格</h1>
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th
                v-for="(column, index) in columns"
                :key="column.key"
                :style="{ width: column.width + 'px' }"
                @mousedown="startResizing($event, index)"
              >
                <div class="header-content">
                  <div class="title-and-sort" @click="sortBy(column.key)">
                    <span>{{ column.title }}</span>
                    <span v-if="column.sortable" class="sort-icon">
                      <span v-if="sortKey === column.key">
                        <span v-if="sortDirection === 'asc'">&#9650;</span> <!-- 上箭頭 升序 -->
                        <span v-else-if="sortDirection === 'desc'">&#9660;</span> <!-- 下箭頭 降序 -->
                      </span>
                      <span v-else>&#9674;</span> <!-- 菱形 預設無排序 -->
                    </span>
                  </div>

                  <div v-if="column.filterable" class="filter-controls">
                    <!-- 字串類型過濾 -->
                    <input
                      v-if="column.filterType === 'string'"
                      type="text"
                      :placeholder="`篩選 ${column.title}`"
                      v-model="filters[column.key].value"
                      @input="applyFiltersAndSort"
                      @mousedown.stop
                    />
                    <!-- 數字類型過濾 -->
                    <div v-if="column.filterType === 'number'" class="number-filter">
                      <input
                        type="number"
                        :placeholder="`最小 ${column.title}`"
                        v-model.number="filters[column.key].min"
                        @input="applyFiltersAndSort"
                        @mousedown.stop
                      />
                      <input
                        type="number"
                        :placeholder="`最大 ${column.title}`"
                        v-model.number="filters[column.key].max"
                        @input="applyFiltersAndSort"
                        @mousedown.stop
                      />
                    </div>
                  </div>
                </div>
                <div class="resizer" @mousedown.stop="startResizing($event, index)"></div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, rowIndex) in paginatedData" :key="rowIndex">
              <td v-for="column in columns" :key="column.key">
                {{ row[column.key] }}
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="paginatedData.length === 0" class="no-data-message">
          沒有符合篩選條件的資料。
        </div>

        <!-- **更新後的分頁控制項** -->
        <div v-if="showPagination && totalPages > 1" class="pagination-controls">
          <button @click="goToPage(1)" :disabled="currentPage === 1">第一頁</button>
          <button @click="prevPage" :disabled="currentPage === 1">上一頁</button>
          
          <span class="page-numbers">
            <button
              v-for="page in paginationRange"
              :key="page"
              @click="goToPage(page)"
              :class="{ active: page === currentPage, ellipsis: page === '...' }"
              :disabled="page === '...' || page === currentPage"
            >
              {{ page }}
            </button>
          </span>
          
          <button @click="nextPage" :disabled="currentPage === totalPages">下一頁</button>
          <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages">最後一頁</button>
          
          <select v-model.number="itemsPerPage" @change="applyPagination">
            <option v-for="option in [5, 10, 20, 50]" :key="option" :value="option">
              每頁顯示 {{ option }} 條
            </option>
          </select>
        </div>
      </div>
    </div>
  </v-main>
</template>

<script>
export default {
  data() {
    return {
      columns: [
        { key: 'id', title: '編號', width: 80, filterable: true, filterType: 'number', sortable: true },
        { key: 'name', title: '姓名', width: 150, filterable: true, filterType: 'string', sortable: true },
        { key: 'age', title: '年齡', width: 100, filterable: true, filterType: 'number', sortable: true },
        { key: 'city', title: '城市', width: 200, filterable: true, filterType: 'string', sortable: true },
        { key: 'occupation', title: '職業', width: 250, filterable: true, filterType: 'string', sortable: true },
        { key: 'email', title: '電子郵件', width: 300, filterable: true, filterType: 'string', sortable: false }, // 此列不可排序
      ],
      rawData: [], // 原始資料，用於篩選和排序
      currentProcessedData: [], // 經過篩選和排序後的數據 (未分頁)

      filters: {}, // 儲存各列的篩選條件

      // 排序相關的數據
      sortKey: '', // 當前排序的列的 key
      sortDirection: '', // 'asc' 升序, 'desc' 降序, '' 無排序

      // 列寬調整相關的數據
      resizingColumnIndex: -1,
      startX: 0,
      startWidth: 0,

      // 分頁相關的數據
      currentPage: 1,
      itemsPerPage: 5, // 為了更容易看到分頁效果，預設值改為5
      showPagination: true, // 是否顯示分頁控制項
    };
  },
  computed: {
    totalPages() {
      if (this.currentProcessedData.length === 0) return 1;
      return Math.ceil(this.currentProcessedData.length / this.itemsPerPage);
    },
    paginatedData() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      return this.currentProcessedData.slice(start, end);
    },
    // **新增的計算屬性，用於生成頁碼列表**
    paginationRange() {
      const range = [];
      const maxVisiblePages = 7; // 最多顯示的頁碼按鈕數（建議奇數）
      
      if (this.totalPages <= maxVisiblePages) {
        // 如果總頁數不多，全部顯示
        for (let i = 1; i <= this.totalPages; i++) range.push(i);
      } else {
        const half = Math.floor(maxVisiblePages / 2);
        let start = this.currentPage - half;
        let end = this.currentPage + half;

        if (start < 1) {
          start = 1;
          end = maxVisiblePages;
        }

        if (end > this.totalPages) {
          end = this.totalPages;
          start = this.totalPages - maxVisiblePages + 1;
        }

        // 處理前面的省略號
        if (start > 1) {
          range.push(1);
          if (start > 2) range.push('...');
        }

        // 生成中間的頁碼
        for (let i = start; i <= end; i++) range.push(i);
        
        // 處理後面的省略號
        if (end < this.totalPages) {
          if (end < this.totalPages - 1) range.push('...');
          range.push(this.totalPages);
        }
      }
      return range;
    },
  },
  created() {
    // 初始化篩選器
    this.columns.forEach(column => {
      if (column.filterable) {
        if (column.filterType === 'string') {
          this.filters[column.key] = { value: '' };
        } else if (column.filterType === 'number') {
          this.filters[column.key] = { min: null, max: null };
        }
      }
    });
    this.rawData = []
    for (let i = 0; i < 100; i++) {
      this.rawData.push({
        id: i+1,
        name: `姓名${i+1}`,
        age: Math.floor(Math.random() * 50) + 20,
        city: ['臺北', '新北', '桃園', '臺中', '臺南', '高雄'][Math.floor(Math.random() * 6)],
        occupation: ['工程師', '設計師', '產品經理', '銷售總監', '專案經理', '高級架構師'][Math.floor(Math.random() * 6)],
        email: `emailtest${i+1}@gmail.com`,
      })
    }
    // 初始載入時應用篩選和排序
    this.applyFiltersAndSort();
  },
  methods: {
    // --- 篩選和排序的整合方法 ---
    applyFiltersAndSort() {
      let data = [...this.rawData];
      // 1. 應用篩選 (程式碼省略，與之前相同)
      Object.keys(this.filters).forEach(key => {
        const filter = this.filters[key];
        const column = this.columns.find(col => col.key === key);
        if (!column || !column.filterable) return;
        if (column.filterType === 'string') {
          const searchTerm = filter.value ? String(filter.value).toLowerCase() : '';
          if (searchTerm) {
            data = data.filter(row => String(row[key]).toLowerCase().includes(searchTerm));
          }
        } else if (column.filterType === 'number') {
          const min = filter.min;
          const max = filter.max;
          if (min !== null && min !== '') data = data.filter(row => row[key] >= min);
          if (max !== null && max !== '') data = data.filter(row => row[key] <= max);
        }
      });
      // 2. 應用排序 (程式碼省略，與之前相同)
      if (this.sortKey && this.sortDirection) {
        data.sort((a, b) => {
          const aValue = a[this.sortKey];
          const bValue = b[this.sortKey];
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return this.sortDirection === 'asc' ? aValue.localeCompare(bValue, 'zh-TW') : bValue.localeCompare(aValue, 'zh-TW');
          } else {
            return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
          }
        });
      }
      this.currentProcessedData = data;
      this.currentPage = 1;
      this.showPagination = this.currentProcessedData.length > 0;
    },
    // --- 排序相關方法 ---
    sortBy(key) {
      const column = this.columns.find(col => col.key === key);
      if (!column || !column.sortable) return;
      if (this.sortKey === key) {
        if (this.sortDirection === 'asc') this.sortDirection = 'desc';
        else if (this.sortDirection === 'desc') {
          this.sortDirection = '';
          this.sortKey = '';
        } else this.sortDirection = 'asc';
      } else {
        this.sortKey = key;
        this.sortDirection = 'asc';
      }
      this.applyFiltersAndSort();
    },
    // --- 列寬調整相關方法 ---
    startResizing(event, index) {
      if (event.target.closest('.filter-controls') || event.target.closest('.title-and-sort')) return;
      this.resizingColumnIndex = index;
      this.startX = event.clientX;
      this.startWidth = this.columns[index].width;
      document.addEventListener('mousemove', this.resizeColumn);
      document.addEventListener('mouseup', this.stopResizing);
    },
    resizeColumn(event) {
      if (this.resizingColumnIndex === -1) return;
      const newWidth = this.startWidth + (event.clientX - this.startX);
      this.columns[this.resizingColumnIndex].width = Math.max(50, newWidth);
    },
    stopResizing() {
      this.resizingColumnIndex = -1;
      document.removeEventListener('mousemove', this.resizeColumn);
      document.removeEventListener('mouseup', this.stopResizing);
    },
    // --- 分頁相關方法 ---
    prevPage() { if (this.currentPage > 1) this.currentPage--; },
    nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; },
    // **新增的方法，用於跳轉到指定頁面**
    goToPage(page) {
      if (typeof page === 'number' && this.currentPage !== page) this.currentPage = page;
    },
    applyPagination() {
      this.currentPage = 1;
    }
  },
};
</script>

<style lang="scss" scoped>
/* ... (其他樣式保持不變) ... */
#app, .data-table-container, .data-table, th, td, .header-content, .title-and-sort, .sort-icon, .filter-controls, .number-filter, .resizer, .no-data-message {
  /* ... (此處省略與之前完全相同的樣式) ... */
}
/* 全局樣式 */
#app {
  font-family: 'Noto Sans TC', '微軟正黑體', Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
/* 表格容器 */
.data-table-container {
  overflow-x: auto;
  margin: 0 auto;
  max-width: 95%;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  border-radius: 8px;
}
/* 表格本體 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: fit-content;
}
th, td {
  border: 1px solid #e0e0e0;
  padding: 10px 15px;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}
th {
  background-color: #f8f8f8;
  color: #333;
  font-weight: bold;
  position: relative;
  user-select: none;
}
tbody tr:nth-child(even) { background-color: #fdfdfd; }
tbody tr:hover { background-color: #f0f8ff; }
/* 表頭內容 */
.header-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}
.title-and-sort {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding-right: 15px;
}
.title-and-sort:hover { color: #007bff; }
.sort-icon {
  font-size: 14px;
  color: #888;
  transition: color 0.2s;
}
.sort-icon span {
  display: inline-block;
  width: 1em;
  text-align: center;
}
/* 篩選器 */
.filter-controls {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}
.filter-controls input {
  width: calc(100% - 10px);
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}
.number-filter { display: flex; gap: 5px; }
.number-filter input { flex: 1; }
/* 拖動條 */
.resizer {
  position: absolute;
  right: -5px; top: 0; bottom: 0;
  width: 10px;
  cursor: col-resize;
  background-color: transparent;
  z-index: 2;
}
.resizer:hover { background-color: rgba(0, 123, 255, 0.2); }
/* 無資料提示 */
.no-data-message {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 16px;
  background-color: #fdfdfd;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

/* **更新後的分頁控制項樣式** */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 0; /* 與表格無縫連接 */
  gap: 8px; /* 調整間距 */
  padding: 15px;
  background-color: #f8f8f8;
  border-top: 1px solid #e0e0e0;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  flex-wrap: wrap; /* 在小螢幕上可以換行 */
}

.pagination-controls button, .pagination-controls .page-numbers button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #fff;
  color: #007bff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  min-width: 38px;
}

.pagination-controls button:disabled, .pagination-controls .page-numbers button:disabled {
  color: #6c757d;
  background-color: #f8f9fa;
  cursor: not-allowed;
  border-color: #ddd;
}

.pagination-controls button:hover:not(:disabled), .pagination-controls .page-numbers button:hover:not(:disabled) {
  background-color: #e9ecef;
  border-color: #ccc;
}

.pagination-controls .page-numbers {
  display: flex;
  gap: 5px;
}

/* 當前頁碼的高亮樣式 */
.pagination-controls .page-numbers button.active {
  background-color: #007bff;
  border-color: #007bff;
  color: white;
}

/* 省略號的樣式 */
.pagination-controls .page-numbers button.ellipsis {
  border: none;
  background: transparent;
  color: #6c757d;
  padding: 6px 0;
}

.pagination-controls select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}
</style>