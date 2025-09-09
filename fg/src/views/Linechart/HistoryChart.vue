<template>
  <v-main>
    <v-card style="width: 100%; height: 85vh; margin: 0px 30px; display: flex; flex-direction: column;">
      <v-card-title style="flex-shrink: 0;">
        <div :style="{ 'display': 'flex', 'width': Setup.isPhone ? '100%' : '50%', 'margin-top': '10px' }">
          <div style="width: 100%;margin-left: 10px;">
            <h4>開始日期</h4>
            <DatePickerInput v-model="sDate"
              label="" color="black" variant="outlined" density="compact"
              :withTime="true" :withSeconds="true"
              :max="eDate"
            />
          </div>
          <div style="width: 100%;margin-left: 10px;">
            <h4>結束日期</h4>
            <DatePickerInput v-model="eDate"
              label="" color="black" variant="outlined" density="compact"
              :withTime="true" :withSeconds="true"
              :min="sDate" :max="new Date()"
            />
          </div>
          <div style="width: 100%;margin-left: 10px;">
            <h4>查詢方法</h4>
            <v-select v-model="selectType" :items="selecttype_list" item-title="title" item-value="value" variant="outlined" density="compact" />
          </div>
          <v-btn style="margin: 30px 0px 0px 10px;" variant="outlined" @click="generateChartList()">
            <h3>搜尋</h3>
          </v-btn>
        </div>
      </v-card-title>
      <!-- 圖表內容的內部包裹器，用於 flex 佈局和 tooltip 定位 -->
      <div class="chart-wrapper-inside-card">
        <!-- D3 SVG 的直接容器，ResizeObserver 會監聽這個元素的尺寸變化 -->
        <div ref="chartContainerWrapper" class="chart-container-wrapper">
          <!-- D3 會在這裡繪製 SVG 圖表 -->
          <v-icon v-if="zoomOffset && zoomOffset.k != 1"
            style="position: absolute; left: 70px; top: 30px; cursor: pointer;" @click="resetZoom()">mdi-reload</v-icon>
        </div>
        <!-- Tooltip 元素，當鼠標懸停在圖表上時顯示 -->
        <div v-if="tooltip.visible && tooltip.data.length > 0" class="tooltip"
          :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }">
          <div v-for="item in tooltip.data" :key="item.seriesName" class="tooltip-item">
            <h2 class="tooltip-color-indicator" :style="{ backgroundColor: item.color }"></h2>
            <h2 class="tooltip-series-name">{{ item.seriesName }}:</h2>
            <h2 class="tooltip-value">{{ item.value.toFixed(2) }}</h2>
          </div>
          <div v-if="tooltip.data.length > 0 && tooltip.data[0].time" class="tooltip-time">
            <h2>時間: {{ tooltip.data[0].time }}</h2>
          </div>
        </div>
        <!-- 圖例控件區域，包含切換系列可見性的按鈕 -->
        <div class="legend-controls">
          <button v-for="series in chartSeriesData" :key="series.id" @click="toggleSeriesVisibility(series.id)"
            :class="{ active: series.visible }"
            :style="{ backgroundColor: series.visible ? series.color : '#ccc', borderColor: series.color, color: series.visible ? 'white' : '#555' }">
            {{ series.name }}
          </button>
        </div>
        <!-- Brush 區域的容器 -->
        <div ref="brushContainerWrapper" class="brush-container-wrapper" style="display: none;"></div>
      </div>
    </v-card>
    <loadingAnimation :loading="setChartLoading" />
  </v-main>
</template>

<script>
import * as d3 from 'd3';
import { useSetup } from '@/store/module/setup';
import { initVueInfo,
  updateOriginalScalesDomain,
  resampleAndUpdate,
  createChart,
  createBrushChart,
  zoomIng,
  zoomEnd,
  resetZoom,
  handleMouseLeave,
  toggleSeriesVisibility } from '@/views/Linechart/index'
import loadingAnimation from '@/components/animation/loadingAnimation.vue';
import DatePickerInput from '@/components/Module/DatePickerInput.vue';


export default {
  components: { loadingAnimation, DatePickerInput },
  data() {
    return {
      Setup: useSetup().$state,
      // ====================== 搜尋曲線區間 ======================
      sDate: new Date(),
      eDate: new Date(),
      selectType: "hour",
      selecttype_list: [
        { value: 'minute', title: '每分鐘一筆' },
        { value: '15min', title: '每十五分鐘一筆' },
        { value: 'hour', title: '每小時平均' },
        { value: 'day', title: '每日平均' },
        { value: 'month', title: '每月平均' }
      ],
      setChartLoading: false,
      // ====================== 繪製曲線資料 ======================
      chartSeriesData: [], // 存儲所有圖表系列數據的數組 [{ id, name, color, visible, originalValues, displayValues }]
      svg: null, // D3 SVG <g> 元素 (應用了 margin transform)
      xScale: null, // D3 當前 X軸比例尺 (會被 zoom 影響)
      yScale: null, // D3 當前 Y軸比例尺 (會被 zoom 影響)
      originalXScale: null, // D3 原始未縮放 X軸比例尺 (domain 基於全部數據)
      originalYScale: null, // D3 原始未縮放 Y軸比例尺 (domain 基於全部數據)
      lineGenerator: null, // D3 線條生成器
      xAxisGroup: null, // D3 X軸 <g> 元素的引用
      yAxisGroup: null, // D3 Y軸 <g> 元素的引用
      xAxisGridGroup: null, // D3 X軸格線 <g> 元素的引用
      yAxisGridGroup: null, // D3 Y軸格線 <g> 元素的引用
      linesGroup: null, // D3 線條組 <g> 元素的引用 (應用 clip-path)
      hoverElementsGroup: null, // 存儲所有懸停圓點的 <g> 元素 (應用 clip-path)
      tooltip: { visible: false, x: 0, y: 0, data: [] }, // Tooltip 相關數據
      dimensions: { margin: { top: 20, right: 40, bottom: 50, left: 60 } }, // 圖表的邊距設置
      currentWidth: 0, // chartContainerWrapper 的當前寬度
      currentHeight: 0, // chartContainerWrapper 的當前高度
      limitDataPoint: 50, // 曲線最大數 (目前未使用，可移除或修改)
      resizeObserver: null, // ResizeObserver 的實例，用於監聽容器尺寸變化
      zoomBehavior: null, // D3 Zoom behavior 實例
      zoomOffset: null, // 當前 Zoom Transform 的狀態

      // ====================== Brush 相關新增資料 ======================
      brushSvg: null, // Brush 區域的 SVG <g> 元素
      brushXScale: null, // Brush 區域的 X軸比例尺
      brushYScale: null, // Brush 區域的 Y軸比例尺
      brushBehavior: null, // D3 Brush behavior 實例
      brushGroup: null, // Brush 行為應用的 <g> 元素
      brushHeight: 100, // Brush 區域的固定高度
      brushMargin: { top: 10, right: 40, bottom: 20, left: 60 }, // Brush 區域的邊距

      // 控制 brush 和 zoom 之間交互的旗標
      isBrushing: false, // 判斷是否由 brush 觸發 zoom
      isZooming: false, // 判斷是否由 zoom 觸發 brush
    };
  },
  computed: {
    // 內部繪圖寬度
    innerWidth() {
      if (this.currentWidth > 0 && this.dimensions && this.dimensions.margin) {
        const val = this.currentWidth - this.dimensions.margin.left - this.dimensions.margin.right;
        return Math.max(0, val);
      }
      return 0;
    },
    // 內部繪圖高度
    innerHeight() {
      if (this.currentHeight > 0 && this.dimensions && this.dimensions.margin) {
        // 主圖表的高度需要扣除 Brush 區域的高度和其間距
        // 修正：currentHeight 應該是 chartContainerWrapper 的高度，所以不需要再減去 brushHeight
        const val = this.currentHeight - this.dimensions.margin.top - this.dimensions.margin.bottom;
        return Math.max(0, val);
      }
      return 0;
    },
    // Brush 區域的內部繪圖高度
    brushInnerHeight() {
      if (this.brushHeight > 0 && this.brushMargin) {
        const val = this.brushHeight - this.brushMargin.top - this.brushMargin.bottom;
        return Math.max(0, val);
      }
      return 0;
    }
  },
  created() {
    this.initVueInfo(this);
  },
  mounted() {
    this.setupResizeObserver(); // 設置響應式監聽
  },
  beforeUnmount() {
    if (this.resizeObserver && this.$refs.chartContainerWrapper) this.resizeObserver.unobserve(this.$refs.chartContainerWrapper);
    window.removeEventListener('resize', this.handleResize); // 清理備用監聽
  },
  methods: {
    initVueInfo,
    updateOriginalScalesDomain,
    resampleAndUpdate,
    createChart,
    createBrushChart,
    zoomIng,
    zoomEnd,
    resetZoom,
    handleMouseLeave,
    toggleSeriesVisibility,
    // =========================================================================================================
    // 設定曲線圖顏色
    setLinechartColor() {
      var colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      // 遍歷 chartSeriesData，為每個系列分配顏色
      this.chartSeriesData.forEach((series) => {
        series.color = colorScale(series.id); // 使用系列ID作為顏色比例尺的輸入，確保顏色一致性
      });
    },
    setChartTimeFormate(timeFormat) {
      let base = timeFormat.trim();
      // 如果是只有日期
      if (/^\d{4}-\d{2}-\d{2}$/.test(base)) base += 'T00:00:00';
      // 如果是 日期+小時
      else if (/^\d{4}-\d{2}-\d{2} \d{2}$/.test(base)) base = base.replace(' ', 'T') + ':00:00';
      // 如果是 日期+小時:分鐘
      else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(base)) base = base.replace(' ', 'T') + ':00';
      // 如果已經是完整格式就不處理
      return base;
    },
    // ============================================== Resize Function ==============================================
    // 設置 ResizeObserver
    setupResizeObserver() {
      // $nextTick 確保在 DOM 更新後執行
      this.$nextTick(() => {
        const wrapper = this.$refs.chartContainerWrapper; // 獲取 D3 SVG 的容器
        if (!wrapper) {
          console.warn("Chart container wrapper not found for ResizeObserver. Falling back to window resize.");
          window.addEventListener('resize', this.handleResize);
          this.handleResize(); // 初始調用以繪製圖表
          return;
        }
        this.resizeObserver = new ResizeObserver(() => this.handleResize());
        this.resizeObserver.observe(wrapper); // 開始觀察主圖表容器
        // 同時觀察 Brush 容器，雖然我們給了固定高度，但寬度還是需要響應式
        if (this.$refs.brushContainerWrapper) {
          this.resizeObserver.observe(this.$refs.brushContainerWrapper);
        }
        this.handleResize(); // 初始調用以設置圖表初始尺寸並繪製
      });
    },
    // 處理容器尺寸變化的函數
    handleResize() {
      const mainChartWrapper = this.$refs.chartContainerWrapper;
      const brushChartWrapper = this.$refs.brushContainerWrapper;
      if (!mainChartWrapper || !brushChartWrapper) return;

      let newWidth = mainChartWrapper.clientWidth; // 主圖表和 Brush 共用寬度
      let newMainChartHeight = mainChartWrapper.clientHeight;
      // brushHeight 是固定的，但確保它不為 0
      let newBrushChartHeight = brushChartWrapper.clientHeight || this.brushHeight;

      const minWidth = 200; const minMainChartHeight = 150;
      newWidth = Math.max(newWidth, minWidth);
      newMainChartHeight = Math.max(newMainChartHeight, minMainChartHeight);

      // 如果寬度或高度有變化，則重新繪製
      if (this.currentWidth !== newWidth || this.currentHeight !== newMainChartHeight) {
        this.currentWidth = newWidth;
        this.currentHeight = newMainChartHeight; // 這邊的 currentHeight 是主圖表的高度

        // 確保內部繪圖區域有效
        if (this.innerWidth > 0 && this.innerHeight > 0 && this.brushInnerHeight > 0) {
          const currentTransform = this.svg ? d3.zoomTransform(this.svg.select('.zoom-rect').node()) : d3.zoomIdentity;

          // 清理舊的 SVG 元素
          d3.select(mainChartWrapper).select('svg').remove();
          this.svg = null;
          d3.select(brushChartWrapper).select('svg').remove();
          this.brushSvg = null;

          // 更新原始比例尺的 Range
          if (this.originalXScale) this.originalXScale.range([0, this.innerWidth]);
          if (this.originalYScale) this.originalYScale.range([this.innerHeight, 0]);

          // 重新創建圖表和 Brush
          this.createChart();
          this.createBrushChart();

          this.$nextTick(() => {
            if (this.svg && this.zoomBehavior && this.brushGroup && this.brushBehavior) {
              try {
                if (currentTransform && (currentTransform.k !== 1 || currentTransform.x !== 0 || currentTransform.y !== 0)) {
                  // 設定 isZooming 旗標，避免 Brush 反向觸發
                  this.isZooming = true;
                  this.svg.select('.zoom-rect').call(this.zoomBehavior.transform, currentTransform);
                  this.isZooming = false; // 重置旗標

                  // 同步更新 Brush 的選擇框（這會在 zoomIng 中處理）
                } else {
                  this.resampleAndUpdate();
                  // 設置 Brush 選區為整個範圍
                  this.brushGroup.call(this.brushBehavior.move, this.brushXScale.range());
                }
              } catch (e) {
                console.error("Error during initial chart drawing or applying zoom:", e);
                this.resampleAndUpdate();
                this.brushGroup.call(this.brushBehavior.move, this.brushXScale.range());
              }
            } else {
              this.resampleAndUpdate();
            }
          });
        } else {
          // 如果計算出的內部寬高無效，則移除 SVG
          d3.select(mainChartWrapper).select('svg').remove();
          this.svg = null;
          d3.select(brushChartWrapper).select('svg').remove();
          this.brushSvg = null;
        }
        this.handleMouseLeave();
      }
    },
    // 產生曲線圖資料格式
    generateChartList() {
      this.setChartLoading = true;
      var Query = {
        start: this.$utils.formatDate(this.sDate, "ISO"),
        end: this.$utils.formatDate(this.eDate, "ISO"),
        type: this.selectType,
      }
      setTimeout(() => {
        useSetup().queryLinechartData(Query).then((res)=> {
          var d = res["data"]
          console.log(d)
          if (d == null || d.length == 0) {
            this.setChartLoading = false;
            useSetup().showAlertDialog({ icon: "warn", title: "查無資料!" });
            return;
          }
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
          this.createBrushChart();
          this.setChartLoading = false;
        }).catch(()=> {
          useSetup().showAlertDialog({ icon: "error", title: "獲取曲線圖資料失敗!" });
          this.setChartLoading = false;
        })
      }, 500);
      // this.setTestChartData(); // 測試數據
    },
    // 定義包含20個系列的測試數據結構
    setTestChartData() {
      this.setChartLoading = true;
      setTimeout(() => {
        this.chartSeriesData = Array.from({ length: 20 }, (_, i) => ({
          id: `series${i + 1}`, name: `系列 ${i + 1}`,
          visible: i < 10 ? true : false, // 初始時只顯示第一筆資料
          originalValues: [],
          displayValues: [],
        }));
        const now = new Date();
        this.chartSeriesData.forEach(series => {
          for (let i = 0; i < 1000; i++) {
            series.originalValues.push({
              time: new Date(now.getTime() - (1000 - 1 - i) * 1000),
              value: Math.floor(Math.random() * 1000),
            });
          }
        });
        console.log("Total Chart Data: ", this.chartSeriesData)
        this.setLinechartColor();
        this.updateOriginalScalesDomain();
        // 在數據載入後，更新尺寸並創建圖表和 Brush
        // this.handleResize() 會處理這些，確保正確的順序和初始化
        this.$nextTick(() => { // 確保 DOM 更新後再調用 handleResize
          this.handleResize();
        })
        this.setChartLoading = false;
      }, 3000);
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

// D3 SVG 的直接容器 (主圖表)
.chart-container-wrapper {
  flex-grow: 1;
  /* 讓主圖表佔用剩餘空間 */
  width: 100%;
  min-height: 150px;
  position: relative;
  box-sizing: border-box;
}

// Brush 區域的容器
.brush-container-wrapper {
  flex-shrink: 0;
  /* 不讓 Brush 區域縮小 */
  width: 100%;
  height: 100px;
  /* 固定高度 */
  margin-top: 10px;
  /* 與上方元素的間距 */
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
  /* margin-left: 30px; */
  // 註釋掉，由 JS 精確定位
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
:deep(.y-axis .tick text),
:deep(.x-axis-brush .tick text) {
  /* 新增 Brush 軸文本樣式 */
  font-size: 13px;
  fill: #333;
  user-select: none;
}

// D3 X軸和Y軸 Grid線條樣式
:deep(.x-grid .tick line),
:deep(.y-grid .tick line) {
  stroke: rgb(184, 182, 182);
}

// Brush 選區樣式
:deep(.brush .selection) {
  fill-opacity: 0.2;
  stroke: #fff;
  stroke-dasharray: 2, 2;
}

:deep(.brush .handle) {
  fill: #666;
  stroke: #eee;
  stroke-width: 1.5px;
}

:deep(.brush .overlay) {
  pointer-events: all;
  /* 確保可以接收鼠標事件 */
  cursor: grab;
  /* 指示可以拖動 */
}

:deep(.brush .overlay:active) {
  cursor: grabbing;
}
</style>