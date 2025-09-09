<!-- =================================================== 紀錄表歷史紀錄頁面 =================================================== -->
<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;">
      <v-card class="datatable-card" style="border: 1px solid #dbd7d7; border-radius: 0px; margin: 30px;">
        <v-card-title>
          <div :style="{ 'display': 'flex', 'width': Setup.isPhone ? '100%' : '40%', 'margin-top': '10px'}">
            <div style="width: 100%;margin-left: 10px;">
              <h4>開始日期</h4>
              <v-menu :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-text-field
                    :value="combinationDate(dateS)"
                    variant="outlined"
                    density="compact"
                    hide-details
                    readonly
                    v-bind="props"
                    @blur="validateDate(dateS)"
                  >
                    <template v-slot:append-inner>
                      <v-icon color="black" icon="mdi-calendar-range" />
                    </template>
                  </v-text-field>
                </template>
                <v-card style="border: 2px solid #dbdbdb;">
                  <div style="display: flex;">
                    <v-date-picker v-model="dateS.value" :max="dateE.value" @click="dateS.dday = formatDate(dateS.value)">
                      <template v-slot:title><h2 style="margin-top: 10px;">日期</h2></template>
                    </v-date-picker>
                    <v-time-picker v-model="dateS.dtime" format="24hr" use-seconds>
                      <template v-slot:title><h2>時間</h2></template>
                    </v-time-picker>
                  </div>
                </v-card>
              </v-menu>
            </div>
            <div style="width: 100%;margin-left: 10px;">
              <h4>結束日期</h4>
              <v-menu :close-on-content-click="false">
                <template #activator="{ props }">
                  <v-text-field
                    :value="combinationDate(dateE)"
                    variant="outlined"
                    density="compact"
                    hide-details
                    readonly
                    v-bind="props"
                    @blur="validateDate(dateE)"
                  >
                    <template v-slot:append-inner>
                      <v-icon color="black" icon="mdi-calendar-range" />
                    </template>
                  </v-text-field>
                </template>
                <v-card style="border: 2px solid #dbdbdb;">
                  <div style="display: flex;">
                    <v-date-picker v-model="dateE.value" :min="dateS.value" :max="today" @click="dateE.dday = formatDate(dateE.value)">
                      <template v-slot:title><h2 style="margin-top: 10px;">日期</h2></template>
                    </v-date-picker>
                    <v-time-picker v-model="dateE.dtime" format="24hr" use-seconds>
                      <template v-slot:title><h2>時間</h2></template>
                    </v-time-picker>
                  </div>
                </v-card>
              </v-menu>
            </div>
            <div style="width: 100%;margin-left: 10px;">
              <h4>查詢方法</h4>
              <v-select 
                v-model="selectType" :items="selecttype_list" 
                item-title="title" item-value="value" 
                variant="outlined" density="compact">
              </v-select>
            </div>
          </div>
          <v-row>
            <v-spacer></v-spacer>
            <v-text-field
              v-model="search"
              style="max-width: 300px;"
              label="搜索"
              class="pa-4"
              density="compact"
              variant="outlined"
              hide-details
            ></v-text-field>
          </v-row>
        </v-card-title>
        <v-data-table-server
          v-model:items-per-page="itemsPerPage"
          :items-per-page-options="[5, 10, 25, 50, 100]"
          :headers="table_header"
          :items-length="totalItems"
          :items="table_data"
          :loading="loading"
          :search="search"
          :mobile="mobile"
          hover
          class="elevation-1"
          @update:options="loadItems" 
        >
          <template v-slot:loading>
            <v-skeleton-loader type="table-row@5"></v-skeleton-loader>
          </template>
        </v-data-table-server>
      </v-card>
    </div>
  </v-main>
</template>


<script>
import csvData from "@/components/csv/data.csv?raw"
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  data() {
    return {
      search: null,
      Setup: useSetup().$state,
      total_data: [],
      // ======================
      itemsPerPage: 10,
      table_header: [],
      table_data: [],
      totalItems: 0,
      loading: false,
      mobile: false,
      // ======================
      dateS: {
        dday: "",
        dtime: null,
        value: null,
      },
      dateE: {
        dday: "",
        dtime: null,
        value: null,
      },
      selectType: null,
      selecttype_list: [
        { value: 'sec', title: '每秒一筆' },
        { value: '5min', title: '每五分鐘一筆' },
        { value: 'hour_average', title: '每小時一筆/平均' },
        { value: 'day_average', title: '每日平均' },
        { value: 'season_average', title: '每季(3個月)平均' },
        { value: 'year', title: '每年一筆' },
      ]
    }
  },
  created() {
    this.parseCSVData();
    this.getDatetimeNow();
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.checkTableWidth)
  },
  mounted() {
    this.checkTableWidth();
    window.addEventListener("resize", this.checkTableWidth)
  },
  methods: {
    // 確認資料表是否為適合手機模式
    checkTableWidth() {
      var tableWidth = document.querySelector(".datatable-card").clientWidth
      this.mobile = tableWidth > 600 ? false : true;
    },
    // 解析 CSV 資料
    parseCSVData() {
      const rows = csvData.split('\n');
      const keys = rows[0].split(','); // CSV標題(作為資料的key)
      this.totalItems = rows.length - 1; // 資料總數(去除Header標題)
      // 總資料
      this.total_data = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj = {};
        keys.forEach((key, i) => obj[key] = values[i]);
        return obj
      });
      this.total_data.splice(this.total_data.length-1, 1)
      // Data Table Header
      for (let i in keys) this.table_header.push({ title: keys[i], value: keys[i], align: 'center', sort: true })
    },
    // 載入數據
    loadItems({ page, itemsPerPage, sortBy }) {
      // this.loading = true;
      setTimeout(() => {
        let filteredData = this.total_data;
        // 有搜尋條件就先過濾資料
        if (this.search && this.search.trim() !== "") {
          const keyword = this.search.trim().toLowerCase();
          filteredData = this.total_data.filter(item =>Object.values(item).some(val => String(val).toLowerCase().includes(keyword)));
        }
        // 排序（如果有指定欄位）
        if (sortBy && sortBy.length > 0) {
          const sortKey = sortBy[0].key;
          const sortOrder = sortBy[0].order === 'desc' ? -1 : 1;
          filteredData.sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA < valB) return -1 * sortOrder;
            if (valA > valB) return 1 * sortOrder;
            return 0;
          });
        }
        // 分頁
        const start = (page - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        this.table_data = filteredData.slice(start, end);
        this.totalItems = filteredData.length; // 重設資料總筆數
        this.loading = false;
      }, 100);
    },

    // ========================================= 搜尋
    // 取得當前時間並格式化
    getDatetimeNow() {
      var today = new Date();
      this.dateS['value'] = today
      this.dateE['value'] = today
      this.dateS['dday'] = this.formatDate(today)
      this.dateE['dday'] = this.formatDate(today)
      this.dateS['dtime'] = "00:00:00"
      this.dateE['dtime'] = this.formatTime(today)
    },
    // 組合日期時間 (格式為: YYYY-MM-DD HH:mm:ss)
    combinationDate(info) {
      if (info['dday'] == "") return ""
      if (info['dtime'] == null) return info['dday']
      return `${info['dday']} ${info['dtime']}`
    },
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    formatTime(date) {
      if (!date) return '';
      const d = new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    },
    validateDate(item) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(item.dday)) 
        item.dday = this.formatDate(item.value);
      else {
        const parsedDate = new Date(item.dday);
        if (!isNaN(parsedDate.getTime())) item.value = parsedDate;
        else item.dday = this.formatDate(item.value);
      }
    },
  }
}
</script>