<template>
  <v-main>
    <v-card style="width: 100%; height: 700px; margin: 30px; display: flex; flex-direction: column;">
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
            <v-select v-model="selectType" :items="selecttype_list" item-title="title" item-value="value" variant="outlined" density="compact" />
          </div>
          <v-btn style="margin: 30px 0px 0px 10px;" variant="outlined" :loading=getChartLoading @click="generateChartList()"><h3>搜尋</h3></v-btn>
        </div>
      </v-card-title>
      <!-- 圖表內容的內部包裹器，用於 flex 佈局和 tooltip 定位 -->
      <div class="chart-wrapper-inside-card">
        <!-- SVG 的直接容器，ResizeObserver 會監聽這個元素的尺寸變化，繪製 SVG 圖表 -->
        <div ref="chartContainerWrapper" class="chart-container-wrapper"></div>
        <!-- Tooltip 元素，當鼠標懸停在圖表上時顯示 -->
        <div v-if="tooltip.visible && tooltip.data.length > 0" class="tooltip"
          :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }">
          <div v-for="item in tooltip.data" :key="item.seriesName" class="tooltip-item">
            <h3 class="tooltip-color-indicator" :style="{ backgroundColor: item.color }"></h3>
            <h3 class="tooltip-series-name">{{ item.seriesName }}:</h3>
            <h3 class="tooltip-value">{{ item.value }}</h3>
          </div>
          <div v-if="tooltip.data.length > 0 && tooltip.data[0].time" class="tooltip-time">
            <h3>時間: {{ tooltip.data[0].time }}</h3>
          </div>
        </div>
        <!-- 切換系列可見性的按鈕 -->
        <div class="legend-controls">
          <button v-for="series in chartSeriesData" :key="series.id" @click="toggleSeriesVisibility(series.id)"
            :class="{ active: series.visible }"
            :style="{ backgroundColor: series.visible ? series.color : '#ccc', borderColor: series.color }">
            {{ series.name }}
          </button>
        </div>
      </div>
    </v-card>
  </v-main>
</template>

<script>
import * as d3 from 'd3';
import { useSetup } from '@/store/module/setup';
import { initVueInfo, removeSVG, createChart, updateChart, handleMouseLeave } from "@/views/Linechart/linechart.js"

export default {
  data() {
    return {
      Setup: useSetup().$state,
      // ====================== 搜尋曲線區間 ======================
      dateS: { dday: "", dtime: null, value: null },
      dateE: { dday: "", dtime: null, value: null },
      selectType: "5min",
      selecttype_list: [
        { value: 'sec', title: '每秒一筆' },
        { value: '5min', title: '每五分鐘一筆' },
        { value: 'hour_average', title: '每小時一筆/平均' },
        { value: 'day_average', title: '每日平均' },
        { value: 'season_average', title: '每季(3個月)平均' },
        { value: 'year', title: '每年一筆' },
      ],
      getChartLoading: false,
      // ====================== 繪製曲線資料 ======================
      chartSeriesData: [], // 存儲所有圖表系列數據的數組
      svg: null, // D3 SVG 根元素的引用
      xScale: null, // D3 X軸比例尺
      yScale: null, // D3 Y軸比例尺
      hoverElementsGroup: null, // 存儲所有懸停圓點的 <g> 元素
      // Tooltip 相關數據
      tooltip: {
        visible: false, // Tooltip 是否可見
        x: 0, // Tooltip 的 X 坐標
        y: 0, // Tooltip 的 Y 坐標
        data: [], // Tooltip 中顯示的數據數組
      },
      chartMargin: { top: 20, right: 40, bottom: 50, left: 60 }, // 圖表的邊距設置
      currentWidth: 0, // chartContainerWrapper 的當前寬度
      currentHeight: 0, // chartContainerWrapper 的當前高度
      updateInterval: null, // setInterval 的 ID，用於定時更新數據
      resizeObserver: null, // ResizeObserver 的實例，用於監聽容器尺寸變化
      colorScale: null, // D3 顏色比例尺，用於為不同系列生成顏色 (在 setLinechartColor 中初始化)

      zoomBehavior: null, // 存儲 d3.zoom() 實例
      originalXScale: null, // 存儲未縮放的 X 比例尺副本
      originalYScale: null, // 存儲未縮放的 Y 比例尺副本
    };
  },
  // 計算屬性
  computed: {
    // 圖表內部繪圖區域的寬度 (容器寬度 - 左右邊距)
    innerWidth() {
      if (this.currentWidth > 0 && this.chartMargin) {
        const val = this.currentWidth - this.chartMargin.left - this.chartMargin.right;
        return Math.max(0, val); // 確保不為負值
      }
      return 0;
    },
    // 圖表內部繪圖區域的高度 (容器高度 - 上下邊距)
    innerHeight() {
      if (this.currentHeight > 0 && this.chartMargin) {
        const val = this.currentHeight - this.chartMargin.top - this.chartMargin.bottom;
        return Math.max(0, val); // 確保不為負值
      }
      return 0;
    },
  },
  created() {
    this.initVueInfo(this)
  },
  mounted() {
    this.getDatetimeNow();
    this.setupResizeObserver(); // 設置 ResizeObserver 來監聽容器尺寸變化
  },
  beforeUnmount() {
    if (this.updateInterval) clearInterval(this.updateInterval); // 清除定時器
    // 停止觀察尺寸變化並清理 ResizeObserver
    if (this.resizeObserver && this.$refs.chartContainerWrapper) this.resizeObserver.unobserve(this.$refs.chartContainerWrapper);
    // 移除 window resize 事件監聽器 (備用方案)
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    initVueInfo, removeSVG, createChart, updateChart, handleMouseLeave,
    // ============================================== 曲線圖資料操作 ==============================================
    // 生成圖表數據列表
    generateChartList() {
      this.getChartLoading = true;
      var Query = {
        start: `${this.dateS['dday']}T${this.dateS['dtime']}Z`,
        end: `${this.dateE['dday']}T${this.dateE['dtime']}Z`,
      }
      useSetup().queryLinechartData(Query).then((res)=> {
        var d = res["data"]
        const data = [];
        for (let i in res["data"]) {
          var rawData = res["data"][i]
          const iso = rawData["tgroup"].replace(" ", "T") + ":00:00";

          const timestamp = new Date(iso);
          Object.entries(rawData).forEach(([key, value]) => {
            if (key === "tgroup" || key === "id_avg") return; // 跳過時間欄
            if (i == 0) {
              data.push({
                id: key, name: key, visible: key < 1 ? true : false,
                values: [{ time: timestamp,value: value }]
              });
            } else {
              var findIndex = data.findIndex((d)=> d.id == key)
              data[findIndex]['values'].push({ time: timestamp, value: value })
            }
          });
        }
        this.chartSeriesData = data
        for (let i in this.chartSeriesData) {
          this.chartSeriesData[i]["visible"] = i == 0 ? true : false;
        }
        console.log("Total Chart Data: ", this.chartSeriesData)
        this.setLinechartColor()
        this.removeSVG();
        this.createChart(); // 使用新的 innerWidth/Height 重新定義 clipPath
        this.getChartLoading = false;
      }).catch(()=> {
        useSetup().showAlertDialog({ icon: "error", title: "獲取曲線圖資料失敗!" });
        this.getChartLoading = false;
      })
      
      // // 定義包含20個系列的數據結構
      // this.getChartLoading = true;
      // setTimeout(() => {
      //   this.getChartLoading = false;
      //   this.chartSeriesData = Array.from({ length: 20 }, (_, i) => ({
      //     id: `series${i + 1}`, name: `系列 ${i + 1}`,
      //     visible: i < 1 ? true : false, // 初始時只顯示第一筆資料
      //     values: [],    // 數據點數組，初始為空
      //   }));
      //   const now = new Date(); // 當前時間
      //   // 初始數據
      //   this.chartSeriesData.forEach(series => {
      //     series.values = [];
      //     for (let i = 0; i < 500; i++) {
      //       series.values.push({
      //         time: new Date(now.getTime() - (100 - 1 - i) * 1000), // 從過去到現在的時間點
      //         value: Math.floor(Math.random() * 1000), // 0到999之間的隨機整數值
      //       });
      //     }
      //   });
      //   console.log("Total Chart Data: ", this.chartSeriesData)
      //   this.setLinechartColor()
      //   this.removeSVG();
      //   this.createChart(); // createChart 會使用新的 innerWidth/Height 重新定義 clipPath
      // }, 500);
    },
    // 設置圖表線條的顏色
    setLinechartColor() {
      // 使用 D3 的分類顏色方案 (schemeCategory10 提供10種不同顏色)
      this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      // 遍歷 chartSeriesData，為每個系列分配顏色
      this.chartSeriesData.forEach((series) => {
        series.color = this.colorScale(series.id); // 使用系列ID作為顏色比例尺的輸入，確保顏色一致性
      });
    },
    
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
        // 創建 ResizeObserver 實例，當監聽的元素尺寸變化時調用 handleResize
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
      newHeight = Math.max(newHeight, minHeight);

      if (newWidth > 0 && newHeight > 0 && (this.currentWidth !== newWidth || this.currentHeight !== newHeight)) {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        this.removeSVG(); // 移除舊的 SVG，然後重新創建
        // 在重新創建圖表之前，先更新 innerWidth/Height
        // this.innerWidth 和 this.innerHeight 是 computed properties, 會自動更新
        if (this.innerWidth > 0 && this.innerHeight > 0) {
          // 更新 zoom behavior 的範圍
          if (this.zoomBehavior) {
            this.zoomBehavior
              .extent([[0, 0], [this.innerWidth, this.innerHeight]])
              .translateExtent([[0, 0], [this.innerWidth, this.innerHeight]]);
          }
          // 更新原始比例尺的 range
          if(this.originalXScale) this.originalXScale.range([0, this.innerWidth]);
          if(this.originalYScale) this.originalYScale.range([this.innerHeight, 0]);
          this.createChart(); // 使用新的 innerWidth/Height 重新定義 clipPath
        }
        this.handleMouseLeave();
      }
    },

    // ============================================== 按鈕操作 ==============================================
    // 切換系列的顯示/隱藏狀態
    toggleSeriesVisibility(seriesId) {
      const series = this.chartSeriesData.find(s => s.id === seriesId); // 找到對應的系列
      if (series) {
        series.visible = !series.visible; // 翻轉其可見狀態
        // 如果 SVG 和繪圖區域有效，則更新圖表以反映變化
        if (this.svg && this.innerWidth > 0 && this.innerHeight > 0) this.updateChart();
        
        // 如果 tooltip 當前可見，需要更新其內容和懸停點
        if (this.tooltip.visible) {
          // 過濾掉已隱藏系列的 tooltip 數據
          const newTooltipData = this.tooltip.data.filter(td => {
            const ts = this.chartSeriesData.find(s => s.name === td.seriesName);
            return ts && ts.visible;
          });
          if (newTooltipData.length === 0) this.handleMouseLeave(); // 如果沒有可顯示的 tooltip 數據，則隱藏
          else {
            this.tooltip.data = newTooltipData; // 更新 tooltip 數據
            // 更新懸停圓點，只顯示可見系列的圓點
            const visibleHoverPoints = newTooltipData.map(td => {
              const s = this.chartSeriesData.find(ser => ser.name === td.seriesName);
              // 嘗試找到對應的原始數據點以計算圓點位置
              const pointInSeries = s.values.find(v => d3.timeFormat("%Y-%m-%d %H:%M:%S")(v.time) === td.time);
              if (pointInSeries && this.xScale && this.yScale) {
                return { seriesId: s.id, cx: this.xScale(pointInSeries.time), cy: this.yScale(pointInSeries.value), color: s.color };
              } return null;
            }).filter(Boolean); // 過濾掉 null 值

            if (this.hoverElementsGroup) {
              // 使用 D3 data join 更新圓點
              this.hoverElementsGroup.selectAll('.hover-point-circle').data(visibleHoverPoints, d => d.seriesId)
                .join(
                  enter => enter.append('circle').attr('class', 'hover-point-circle').attr('r', 5).style('stroke', 'white').style('stroke-width', '1.5px').attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1),
                  update => update.attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1),
                  exit => exit.remove()
                );
            }
          }
        } else if (!this.chartSeriesData.filter(s => s.visible).some(s => s.values.length > 0)) {
          // 如果所有系列都隱藏了，則隱藏 tooltip 和懸停點
          this.handleMouseLeave();
        }
      }
    },

    // ========================================= 搜尋 =========================================
    // 取得當前時間並格式化
    getDatetimeNow() {
      var today = new Date();
      this.dateS = {
        value: today,
        dday: this.formatDate(today),
        dtime: "00:00:00"
      }
      this.dateE = {
        value: today,
        dday: this.formatDate(today),
        dtime: this.formatTime(today)
      }
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

// 針對 D3 生成的 SVG 元素 (使用 :deep 穿透 scoped CSS)
:deep(svg) {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

// Tooltip 樣式
.tooltip {
  position: absolute;
  background-color: rgba(40, 40, 40, 0.92);
  color: white;
  border: 1px solid #222;
  border-radius: 6px;
  padding: 10px 15px;
  font-size: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  pointer-events: none;
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

.tooltip-item:last-child {
  margin-bottom: 0;
}

// Tooltip 中系列的顏色指示標籤
.tooltip-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 3px;
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
  font-weight: bold;
  color: white;
  border-width: 1px;
  border-style: solid;
  transition: background-color 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

// 圖例按鈕鼠標懸停時的樣式
.legend-controls button:hover {
  opacity: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
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

// D3 X軸和Y軸路徑樣式 (使用 :deep 穿透)
:deep(.x-axis path),
:deep(.y-axis path) {
  stroke: #555;
}

// D3 X軸和Y軸刻度線樣式
:deep(.x-axis .tick line),
:deep(.y-axis .tick line) {
  stroke: #e0e0e0;
  stroke-dasharray: 2, 2;
}

// D3 X軸和Y軸刻度文本樣式
:deep(.x-axis .tick text),
:deep(.y-axis .tick text) {
  font-size: 13px;
  fill: #333;
}

// D3 X軸和Y軸 Grid線條樣式
:deep(.x-grid .tick line),
:deep(.y-grid .tick line) {
  stroke: rgb(184, 182, 182);
}
</style>