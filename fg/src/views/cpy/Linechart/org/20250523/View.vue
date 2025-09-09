<template>
  <v-main>
    <v-card style="width: 100%; height: 85vh; margin: 30px; display: flex; flex-direction: column;">
      <v-card-title style="flex-shrink: 0;">
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
                  <template v-slot:append-inner><v-icon color="black" icon="mdi-calendar-range" /></template>
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
                  <template v-slot:append-inner><v-icon color="black" icon="mdi-calendar-range" /></template>
                </v-text-field>
              </template>
              <v-card style="border: 2px solid #dbdbdb;">
                <div style="display: flex;">
                  <v-date-picker v-model="dateE.value" :min="dateS.value" :max="new Date()" @click="dateE.dday = formatDate(dateE.value)">
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
            <v-select v-model="selectType" :items="selecttype_list" item-title="title" item-value="value" variant="outlined" density="compact" />
          </div>
          <v-btn style="margin: 35px 0px 0px 20px;" variant="outlined" :loading=getChartLoading @click="generateChartList()"><h3>搜尋</h3></v-btn>
        </div>
      </v-card-title>
      <div class="chart-wrapper-inside-card">
        <!-- 曲線圖容器 -->
        <div ref="chartContainerWrapper" class="chart-container-wrapper">
          <v-icon v-if="zoomOffset && zoomOffset.k != 1" style="position: absolute; left: 70px; top: 30px; cursor: pointer;" @click="resetZoom()" icon="mdi-reload" />
        </div>
        <!-- Tooltip 元素 -->
        <div v-if="tooltipInfo.visible && tooltipInfo.data.length > 0" class="tooltip"
          :style="{ top: tooltipInfo.y + 'px', left: tooltipInfo.x + 'px' }">
          <div v-for="item in tooltipInfo.data" :key="item.seriesName" class="tooltip-item">
            <h2 class="tooltip-color-indicator" :style="{ backgroundColor: item.color }"></h2>
            <h2 class="tooltip-series-name">{{ item.seriesName }}:</h2>
            <h2 class="tooltip-value">{{ item.value.toFixed(2) }}</h2>
          </div>
          <div v-if="tooltipInfo.data.length > 0 && tooltipInfo.data[0].time" class="tooltip-time">
            <h2>時間: {{ tooltipInfo.data[0].time }}</h2>
          </div>
        </div>
        <!-- 圖例控件區域，包含切換系列可見性的按鈕 -->
        <div class="legend-controls">
          <!-- <div v-for="series in chartSeriesData" :key="series.id" @click="toggleSeriesVisibility(series.id)" style="display: flex;">
            <h2 class="tooltip-color-indicator" :style="{ backgroundColor: series.color }"></h2>
            <span class="tooltip-series-name">{{ series.name }}</span>
          </div> -->
          <button v-for="series in chartSeriesData" :key="series.id" @click="toggleSeriesVisibility(series.id)"
            :class="{ active: series.visible }"
            :style="{ backgroundColor: series.visible ? series.color : '#ccc', borderColor: series.color, color: series.visible ? 'white' : '#555' }">
            {{ series.name }}
          </button>
        </div>
      </div>
    </v-card>
    <!-- <v-container>
      <div v-for="(item, index) in chartSeriesData" :key="index">
        <h3>{{ item.originalValues.length }}, {{ item.displayValues.length }}</h3>
      </div>
    </v-container> -->
  </v-main>
</template>

<script>
import { useSetup } from '@/store/module/setup';
import { 
  initVueInfo, 
  clearChartSVG, setLinechartColor, setChartTimeFormate, 
  updateOriginalScalesDomain, resampleAndUpdate,
  createChart, updateChart, resetZoom, updateScale, handleMouseMove, handleMouseLeave, toggleSeriesVisibility 
} from "@/views/Linechart/index"

export default {
  data() {
    return {
      Setup: useSetup().$state,
      // ====================== 搜尋曲線區間 ======================
      dateS: { dday: "", dtime: null, value: null },
      dateE: { dday: "", dtime: null, value: null },
      selectType: "hour",
      selecttype_list: [
        { value: 'minute', title: '每分鐘一筆' },
        { value: '15min', title: '每十五分鐘一筆' },
        { value: 'hour', title: '每小時平均' },
        { value: 'day', title: '每日平均' },
        { value: 'month', title: '每月平均' }
      ],
      getChartLoading: false,
      // ====================== 繪製曲線資料 ======================
      chartSeriesData: [], // 存儲所有圖表系列數據的數組 [{ id, name, color, visible, originalValues, displayValues }]
      svg: null, // D3 SVG <g> 元素 (應用了 margin transform)
      tooltipInfo: { visible: false, x: 0, y: 0, data: [] }, // Tooltip 相關數據
      chartMargin: { top: 20, right: 40, bottom: 50, left: 60 }, // 圖表的邊距設置
      currentWidth: 0, // chartContainerWrapper 的當前寬度
      currentHeight: 0, // chartContainerWrapper 的當前高度
      resizeObserver: null, // ResizeObserver 的實例，用於監聽容器尺寸變化
      zoomBehavior: null,   // D3 Zoom behavior 實例
      zoomOffset: null,     // D3 Zoom 當前縮放狀態
    };
  },
  computed: {
    // 內部繪圖寬度
    innerWidth() {
      if (this.currentWidth > 0 && this.chartMargin) {
        const val = this.currentWidth - this.chartMargin.left - this.chartMargin.right;
        return Math.max(0, val);
      }
      return 0;
    },
    // 內部繪圖高度
    innerHeight() {
      if (this.currentHeight > 0 && this.chartMargin) {
        const val = this.currentHeight - this.chartMargin.top - this.chartMargin.bottom;
        return Math.max(0, val);
      }
      return 0;
    },
  },
  created() {
    this.initVueInfo(this);
  },
  mounted() {
    this.getDatetimeNow();
    this.setupResizeObserver(); // 設置響應式監聽
  },
  beforeUnmount() {
    if (this.resizeObserver && this.$refs.chartContainerWrapper) this.resizeObserver.unobserve(this.$refs.chartContainerWrapper);
    window.removeEventListener('resize', this.handleResize); // 清理備用監聽
  },
  // 組件的方法
  methods: {
    // Vue 初始化this資料
    initVueInfo,
    // 曲線圖相關Function
    clearChartSVG,setLinechartColor,setChartTimeFormate,
    updateOriginalScalesDomain,resampleAndUpdate,
    createChart,updateChart,resetZoom,updateScale,handleMouseMove,handleMouseLeave,toggleSeriesVisibility,
    // ============================================== Resize Function ==============================================
    // 設置 ResizeObserver
    setupResizeObserver() {
      // $nextTick 確保在 DOM 更新後執行
      this.$nextTick(() => {
        const wrapper = this.$refs.chartContainerWrapper; // 獲取 D3 SVG 的容器
        if (!wrapper) {
          // 如果容器未找到，打印警告並使用 window resize 作為備用
          console.warn("Chart container wrapper not found for ResizeObserver. Falling back to window resize.");
          window.addEventListener('resize', this.handleResize);
          this.handleResize(); // 初始調用以繪製圖表
          return;
        }
        // 創建 ResizeObserver 實例，當監聽的元素尺寸變化時調用handleResize
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(wrapper); // 開始觀察容器
        this.handleResize(); // 初始調用以設置圖表初始尺寸並繪製
      });
    },
    // 處理容器尺寸變化的函數
    handleResize() {
      const wrapper = this.$refs.chartContainerWrapper;
      if (!wrapper) return;

      let newWidth = wrapper.clientWidth;
      let newHeight = wrapper.clientHeight;
      const minWidth = 200; const minHeight = 150;
      newWidth = Math.max(newWidth, minWidth);
      newHeight = Math.max(newHeight, newHeight); // 修正：這裡應該是 Math.max(newHeight, minHeight);

      if (newWidth > 0 && newHeight > 0 && (this.currentWidth !== newWidth || this.currentHeight !== newHeight)) {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        this.clearChartSVG(); // 清除舊的 SVG 元素
        if (this.innerWidth > 0 && this.innerHeight > 0) {
          this.createChart();
          // 使用 $nextTick 確保 Create Chart 添加的 SVG 元素已經在 DOM 中
          this.$nextTick(() => {
            // 再次檢查 SVG 和 zoom 是否存在
            if (this.svg) this.resampleAndUpdate();
          });
        } 
        this.handleMouseLeave(); // 尺寸變化後隱藏Tooltip
      }
    },
    // 產生曲線圖資料格式
    generateChartList() {
      this.getChartLoading = true;
      var Query = {
        start: `${this.dateS['dday']}T${this.dateS['dtime']}Z`,
        end: `${this.dateE['dday']}T${this.dateE['dtime']}Z`,
        type: this.selectType,
      }
      useSetup().queryLinechartData(Query).then((res)=> {
        var d = res["data"]
        console.log(d)
        const chart_data = [];
        for (let i in res["data"]) {
          var rawData = res["data"][i]
          const iso = rawData["tgroup"] ? this.setChartTimeFormate(rawData["tgroup"]) : rawData["timestamp"];
          const timestamp = new Date(iso);
          Object.entries(rawData).forEach(([key, value]) => {
            if (key === "tgroup" || key === "timestamp") return; // 跳過時間欄
            if (key === "id_avg" || key === "id") return;        // 跳過ID欄位
            // 建立初始Array格式
            if (i == 0) {
              chart_data.push({
                id: key, name: key, visible: false,
                originalValues: [{ time: timestamp,value: value }],
                displayValues: [],
              });
            } else {
              var idxPos = chart_data.findIndex((d)=> d.id == key)
              chart_data[idxPos]['originalValues'].push({ time: timestamp, value: value })
            }
          });
        }
        for (let i in chart_data) chart_data[i]["visible"] = i < 5 ? true : false; // 只顯示前5筆資料
        this.chartSeriesData = chart_data
        console.log("Total Chart Data: ", this.chartSeriesData)
        this.setLinechartColor();
        this.updateOriginalScalesDomain();
        this.createChart();
        this.getChartLoading = false;
      }).catch(()=> {
        useSetup().showAlertDialog({ icon: "error", title: "獲取曲線圖資料失敗!" });
        this.getChartLoading = false;
      })
      // this.setTestChartData();
    },
    // 定義包含20個系列的測試數據結構
    setTestChartData() {
      this.chartSeriesData = Array.from({ length: 20 }, (_, i) => ({
        id: `series${i + 1}`, name: `系列 ${i + 1}`,
        visible: i < 10 ? true : false, // 初始時只顯示第一筆資料
        originalValues: [],    // 數據點數組，初始為空
        displayValues: [],
      }));
      const now = new Date(); // 當前時間
      // 初始數據
      this.chartSeriesData.forEach(series => {
        for (let i = 0; i < 1000; i++) {
          series.originalValues.push({
            time: new Date(now.getTime() - (100 - 1 - i) * 1000), // 從過去到現在的時間點
            value: Math.floor(Math.random() * 1000), // 0到999之間的隨機整數值
          });
        }
      });
      console.log("Total Chart Data (測試數據): ", this.chartSeriesData)
      this.setLinechartColor();
      this.updateOriginalScalesDomain();
      this.createChart();
    },
    // ========================================= 搜尋 =========================================
    // 取得當前時間並初始化日期資訊
    getDatetimeNow() {
      var today = new Date();
      this.dateS = { value: today, dday: this.formatDate(today), dtime: "00:00:00" }
      this.dateE = { value: today, dday: this.formatDate(today), dtime: this.formatTime(today) }
    },
    // 組合日期時間 (格式為: YYYY-MM-DD HH:mm:ss)
    combinationDate(info) {
      if (info['dday'] == "") return ""
      if (info['dtime'] == null) return info['dday']
      return `${info['dday']} ${info['dtime']}`
    },
    // 格式化日期為 YYYY-MM-DD
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    // 格式化時間為 HH:mm:ss
    formatTime(date) {
      if (!date) return '';
      const d = new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    },
    // 驗證日期格式
    validateDate(item) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(item.dday)) item.dday = this.formatDate(item.value);
      else {
        const parsedDate = new Date(item.dday);
        if (!isNaN(parsedDate.getTime())) item.value = parsedDate;
        else item.dday = this.formatDate(item.value);
      }
    },
  }
};
</script>

<style lang="scss" scoped>
// 卡片內圖表區域的包裹器
.chart-wrapper-inside-card {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  overflow: hidden;
  position: relative;
  padding: 0 16px 16px 16px;
  box-sizing: border-box;
}

// D3 SVG 的直接容器
.chart-container-wrapper {
  flex-grow: 1;
  width: 100%;
  min-height: 150px;
  position: relative;
  box-sizing: border-box;
}

// Tooltip 樣式
.tooltip {
  position: fixed;
  background-color: rgba(40, 40, 40, 0.92);
  color: white;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 10px 15px;
  margin-left: 30px;
  font-size: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
  z-index: 20;
  transition: opacity 0.05s linear;
}

// Tooltip 內部每個系列的條目樣式
.tooltip-item {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

// Tooltip 中系列的顏色指示標籤
.tooltip-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 10px;
  flex-shrink: 0;
}

// Tooltip 中系列名稱的樣式
.tooltip-series-name {
  font-weight: bold;
  margin-right: 5px;
}

// Tooltip 中時間戳的樣式
.tooltip-time {
  margin-top: 8px;
  font-size: 0.9em;
  color: #ccc;
  border-top: 1px solid #666;
  padding-top: 8px;
  text-align: center;
}

// 圖例控件區域樣式
.legend-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 10px 0 5px 0;
  width: 100%;
  flex-shrink: 0;
  box-sizing: border-box;
}

// 圖例按鈕樣式
.legend-controls button {
  padding: 7px 14px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  font-weight: bold;
  color: white;
  border-width: 1px;
  border-style: solid;
  transition: background-color 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}


// 圖例按鈕非激活 (系列隱藏) 時的樣式
.legend-controls button:not(.active) {
  color: #555;
  opacity: 0.65;
}

// 圖例按鈕非激活且鼠標懸停時的樣式
.legend-controls button:not(.active):hover {
  opacity: 0.85;
}

// D3 X軸和Y軸刻度文本樣式
:deep(.x-axis .tick text),
:deep(.y-axis .tick text) {
  font-size: 13px;
  fill: #333;
  user-select: none;
}

// D3 X軸和Y軸 Grid線條樣式
:deep(.x-grid .tick line),
:deep(.y-grid .tick line) {
  stroke: rgb(184, 182, 182);
}
</style>