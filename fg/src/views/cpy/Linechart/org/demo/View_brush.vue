<template>
  <v-main>
    <v-card style="width: 100%; height: 85vh; margin: 30px; display: flex; flex-direction: column;">
      <v-card-title style="flex-shrink: 0;">
        <div :style="{ 'display': 'flex', 'width': Setup.isPhone ? '100%' : '40%', 'margin-top': '10px' }">
          <div style="width: 100%;margin-left: 10px;">
            <h4>開始日期</h4>
            <v-menu :close-on-content-click="false">
              <template #activator="{ props }">
                <v-text-field :value="combinationDate(dateS)" variant="outlined" density="compact" hide-details readonly
                  v-bind="props" @blur="validateDate(dateS)">
                  <template v-slot:append-inner><v-icon color="black" icon="mdi-calendar-range" /></template>
                </v-text-field>
              </template>
              <v-card style="border: 2px solid #dbdbdb;">
                <div style="display: flex;">
                  <v-date-picker v-model="dateS.value" :max="dateE.value" @click="dateS.dday = formatDate(dateS.value)">
                    <template v-slot:title>
                      <h2 style="margin-top: 10px;">日期</h2>
                    </template>
                  </v-date-picker>
                  <v-time-picker v-model="dateS.dtime" format="24hr" use-seconds>
                    <template v-slot:title>
                      <h2>時間</h2>
                    </template>
                  </v-time-picker>
                </div>
              </v-card>
            </v-menu>
          </div>
          <div style="width: 100%;margin-left: 10px;">
            <h4>結束日期</h4>
            <v-menu :close-on-content-click="false">
              <template #activator="{ props }">
                <v-text-field :value="combinationDate(dateE)" variant="outlined" density="compact" hide-details readonly
                  v-bind="props" @blur="validateDate(dateE)">
                  <template v-slot:append-inner><v-icon color="black" icon="mdi-calendar-range" /></template>
                </v-text-field>
              </template>
              <v-card style="border: 2px solid #dbdbdb;">
                <div style="display: flex;">
                  <v-date-picker v-model="dateE.value" :min="dateS.value" :max="new Date()"
                    @click="dateE.dday = formatDate(dateE.value)">
                    <template v-slot:title>
                      <h2 style="margin-top: 10px;">日期</h2>
                    </template>
                  </v-date-picker>
                  <v-time-picker v-model="dateE.dtime" format="24hr" use-seconds>
                    <template v-slot:title>
                      <h2>時間</h2>
                    </template>
                  </v-time-picker>
                </div>
              </v-card>
            </v-menu>
          </div>
          <div style="width: 100%;margin-left: 10px;">
            <h4>查詢方法</h4>
            <v-select v-model="selectType" :items="selecttype_list" item-title="title" item-value="value"
              variant="outlined" density="compact" />
          </div>
          <v-btn style="margin: 30px 0px 0px 10px;" variant="outlined" :loading=getChartLoading
            @click="generateChartList()">
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
        <div ref="brushContainerWrapper" class="brush-container-wrapper"></div>
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
import * as d3 from 'd3';
import { useSetup } from '@/store/module/setup';

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
  mounted() {
    this.getDatetimeNow();
    this.setupResizeObserver(); // 設置響應式監聽
  },
  beforeUnmount() {
    if (this.resizeObserver && this.$refs.chartContainerWrapper) this.resizeObserver.unobserve(this.$refs.chartContainerWrapper);
    window.removeEventListener('resize', this.handleResize); // 清理備用監聽
  },
  methods: {
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
      // this.setTestChartData(); // 測試數據
    },
    // 定義包含20個系列的測試數據結構
    setTestChartData() {
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
    },
    // 根據當前的全部原始數據，更新 original X、Y Scale 的 Domain
    updateOriginalScalesDomain() {
      const allOriginalValues = this.chartSeriesData.reduce((acc, series) => acc.concat(series.originalValues), []);
      if (allOriginalValues.length > 0) {
        if (!this.originalXScale) this.originalXScale = d3.scaleTime();
        if (!this.originalYScale) this.originalYScale = d3.scaleLinear();

        this.originalXScale.domain(d3.extent(allOriginalValues, d => d.time));

        const yExtent = d3.extent(allOriginalValues, d => d.value);
        let yMinDomain = 0, yMaxDomain = 100;
        if (yExtent[0] !== undefined && yExtent[1] !== undefined) {
          const dataRange = yExtent[1] - yExtent[0];
          const padding = dataRange * 0.1 || Math.abs(yExtent[0] * 0.1) || 5;
          yMinDomain = yExtent[0] - padding;
          yMaxDomain = yExtent[1] + padding;
          if (yMinDomain === yMaxDomain) {
            yMinDomain -= (Math.abs(yMinDomain * 0.2) || 10);
            yMaxDomain += (Math.abs(yMaxDomain * 0.2) || 10);
          }
        }
        this.originalYScale.domain([yMinDomain, yMaxDomain]);
      } else {
        if (!this.originalXScale) this.originalXScale = d3.scaleTime();
        if (!this.originalYScale) this.originalYScale = d3.scaleLinear();
        this.originalXScale.domain([new Date(), new Date(Date.now() + 1000)]);
        this.originalYScale.domain([0, 100]);
      }
    },
    // 圖表更新用 (根據當前 zoom 縮放、移動狀態變換更新 X/Y Scale 並計算顯示資料 displayValues 狀態後更新曲線)
    resampleAndUpdate() {
      // 如果圖表未就緒則離開
      if (!this.svg || !this.originalXScale || !this.originalYScale || this.innerWidth <= 0 || this.innerHeight <= 0) return;
      const currentTransform = d3.zoomTransform(this.svg.select('.zoom-rect').node());
      this.xScale = currentTransform.rescaleX(this.originalXScale);
      this.yScale = currentTransform.rescaleY(this.originalYScale);

      const visibleDomain = this.xScale.domain();
      const zoomK = currentTransform.k;

      // --- 判斷是否處於默認的未縮放視圖 ---
      // 判斷條件：縮放因子 k === 1 並且 平移量 x 和 y 都為 0
      // 通常只需要檢查 k === 1 即可，因為 translateExtent 限制了平移，且默認狀態是 (0,0)
      const isDefaultZoomView = currentTransform.k === 1 && currentTransform.x === 0 && currentTransform.y === 0;

      const initialSamplePoints = 200 // 初始狀態或縮放比例接近1時，每條線顯示的大致點數

      // 遍歷每個系列，計算並採樣其 displayValues
      this.chartSeriesData.forEach(series => {
        if (!series.visible || !series.originalValues || series.originalValues.length === 0) {
          series.displayValues = [];
          return;
        }
        // 超過最大數值則跳過
        if (series.originalValues.length <= initialSamplePoints) {
          series.displayValues = series.originalValues;
          return;
        }

        // 過濾出落在當前可見時間範圍內的原始點
        const visibleOriginalValues = series.originalValues.filter(d => d.time >= visibleDomain[0] && d.time <= visibleDomain[1]);
        const n = visibleOriginalValues.length; // 可見範圍內的原始點數 
        let actualKToDisplay; // 最終要顯示的點數

        // --- 決定最終要顯示的點數 ---

        if (isDefaultZoomView) {
          // Case 1: 處於默認未縮放的初始視圖
          // 強制只顯示初始設定的點數，即使 n 很大
          actualKToDisplay = initialSamplePoints;
        } else {
          // Case 2: 已縮放 (不處於默認視圖)
          // 計算在採樣模式下，基於密度和縮放因子期望的目標點數
          let targetKForDensity;
          const pointsPerPixel = 0.7; // 基礎密度
          targetKForDensity = Math.floor(this.innerWidth * pointsPerPixel * Math.sqrt(zoomK));
          targetKForDensity = Math.max(initialSamplePoints, targetKForDensity); // 不少於初始點數

          // 將基於密度的目標點數，應用最大顯示點數限制 (200筆)
          const cappedKByMaxDisplay = Math.min(targetKForDensity, initialSamplePoints);
          actualKToDisplay = cappedKByMaxDisplay
          actualKToDisplay = Math.min(n, actualKToDisplay); // 確保最終點數不超過可見原始點數 n
        }

        if (actualKToDisplay < 2 && n >= 2) actualKToDisplay = 2; // 至少有 2 個點才能畫線 (如果原始可見點數 >= 2)
        else if (actualKToDisplay < 1 && n > 0) actualKToDisplay = 1; // 至少有 1 個點如果原始可見點數 > 0

        console.log("actualKToDisplay: ", actualKToDisplay, n)

        // --- 執行數據採樣 ---
        const sampledData = [];
        if (n === 0) {
          series.displayValues = [];
          return;
        }
        if (actualKToDisplay >= n) {
          sampledData.push(...visibleOriginalValues);
        } else if (actualKToDisplay === 1) {
          sampledData.push(visibleOriginalValues[Math.floor(n / 2)]);
        } else {
          const usedIndices = new Set();
          for (let i = 0; i < actualKToDisplay; i++) {
            const idx = Math.floor(i * n / actualKToDisplay);
            if (!usedIndices.has(idx)) {
              sampledData.push(visibleOriginalValues[idx]);
              usedIndices.add(idx);
            }
          }
          // 確保第一點與最後一點被包含（畫線時較自然）
          if (sampledData[0] !== visibleOriginalValues[0]) {
            sampledData.unshift(visibleOriginalValues[0]);
          }
          if (sampledData[sampledData.length - 1] !== visibleOriginalValues[n - 1]) {
            sampledData.push(visibleOriginalValues[n - 1]);
          }
        }

        // --- 去重並賦值給displayValues ---
        // 這一步驟非常重要，用於確保最終的displayValues 數組中的點是唯一的 (基於時間)
        const uniqueSampledData = [];
        const timeSet = new Set();
        sampledData.forEach(p => {
          if (p && p.time instanceof Date && !isNaN(p.time.getTime())) {
            if (!timeSet.has(p.time.getTime())) {
              timeSet.add(p.time.getTime());
              uniqueSampledData.push(p);
            }
          }
        });
        series.displayValues = uniqueSampledData;
      });
      // 數據採樣完成後，更新繪圖
      this.updateChart();
    },

    // 創建曲線圖圖表 (SVG 結構，軸，格線，Zoom 和 ClipPath)
    createChart() {
      if (this.currentWidth <= 0 || this.currentHeight <= 0 || !this.$refs.chartContainerWrapper || this.innerWidth <= 0 || this.innerHeight <= 0) return;

      const mainChartWrapper = this.$refs.chartContainerWrapper;
      d3.select(mainChartWrapper).select('svg').remove();
      this.svg = null;
      const { margin } = this.dimensions;

      const svgRoot = d3.select(mainChartWrapper).append('svg')
        .attr('width', this.currentWidth)
        .attr('height', this.innerHeight + margin.top + margin.bottom);

      svgRoot.append('defs').append('clipPath').attr('id', 'clip-rect').append('rect').attr('width', this.innerWidth).attr('height', this.innerHeight);
      this.svg = svgRoot.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      if (!this.originalXScale) this.originalXScale = d3.scaleTime();
      if (!this.originalYScale) this.originalYScale = d3.scaleLinear();
      this.originalXScale.range([0, this.innerWidth]);
      this.originalYScale.range([this.innerHeight, 0]);

      this.xScale = this.originalXScale.copy();
      this.yScale = this.originalYScale.copy();

      this.lineGenerator = d3.line().x(d => this.xScale(d.time)).y(d => this.yScale(d.value)).curve(d3.curveMonotoneX);

      this.yAxisGridGroup = this.svg.append('g').attr('class', 'grid y-grid');
      this.xAxisGridGroup = this.svg.append('g').attr('class', 'grid x-grid').attr('transform', `translate(0,${this.innerHeight})`);

      this.xAxisGroup = this.svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.innerHeight})`);
      this.yAxisGroup = this.svg.append('g').attr('class', 'y-axis');

      this.linesGroup = this.svg.append('g').attr('class', 'lines-group').attr('clip-path', 'url(#clip-rect)');
      this.hoverElementsGroup = this.svg.append('g').attr('class', 'hover-elements-group').attr('clip-path', 'url(#clip-rect)');

      this.zoomBehavior = d3.zoom()
        .scaleExtent([1, 50])
        .extent([[0, 0], [this.innerWidth, this.innerHeight]])
        .translateExtent([[0, 0], [this.innerWidth, this.innerHeight]])
        .on("zoom", this.zoomIng)
        .on("end", this.zoomEnd);

      this.svg.append('rect')
        .attr('class', 'overlay zoom-rect')
        .attr('width', this.innerWidth)
        .attr('height', this.innerHeight)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', this.handleMouseMove)
        .on('mouseleave', this.handleMouseLeave)
        .call(this.zoomBehavior);
    },

    // 創建 Brush 圖表 (總覽圖)
    createBrushChart() {
      if (!this.$refs.brushContainerWrapper || this.innerWidth <= 0 || this.brushInnerHeight <= 0 || !this.originalXScale || !this.originalYScale) return;

      const brushChartWrapper = this.$refs.brushContainerWrapper;
      d3.select(brushChartWrapper).select('svg').remove();
      this.brushSvg = null;

      const { brushMargin } = this;

      const svgRoot = d3.select(brushChartWrapper).append('svg')
        .attr('width', this.currentWidth)
        .attr('height', this.brushHeight);

      this.brushSvg = svgRoot.append('g')
        .attr('transform', `translate(${brushMargin.left},${brushMargin.top})`);

      this.brushXScale = this.originalXScale.copy().range([0, this.innerWidth]);

      const allVisibleOriginalValues = this.chartSeriesData.filter(s => s.visible).reduce((acc, series) => acc.concat(series.originalValues), []);
      let brushYMinDomain = 0, brushYMaxDomain = 100;
      if (allVisibleOriginalValues.length > 0) {
        const yExtent = d3.extent(allVisibleOriginalValues, d => d.value);
        const dataRange = yExtent[1] - yExtent[0];
        const padding = dataRange * 0.1 || Math.abs(yExtent[0] * 0.1) || 5;
        brushYMinDomain = yExtent[0] - padding;
        brushYMaxDomain = yExtent[1] + padding;
        if (brushYMinDomain === brushYMaxDomain) {
          brushYMinDomain -= (Math.abs(brushYMinDomain * 0.2) || 10);
          brushYMaxDomain += (Math.abs(brushYMaxDomain * 0.2) || 10);
        }
      }
      this.brushYScale = d3.scaleLinear().domain([brushYMinDomain, brushYMaxDomain]).range([this.brushInnerHeight, 0]);

      this.brushSvg.append('g')
        .attr('class', 'x-axis-brush')
        .attr('transform', `translate(0,${this.brushInnerHeight})`)
        .call(d3.axisBottom(this.brushXScale).ticks(10).tickFormat(d3.timeFormat("%m-%d %H:%M")));

      const brushLineGenerator = d3.line()
        .x(d => this.brushXScale(d.time))
        .y(d => this.brushYScale(d.value))
        .curve(d3.curveMonotoneX);

      this.brushSvg.append('g').attr('class', 'brush-lines')
        .selectAll('path')
        .data(this.chartSeriesData.filter(s => s.visible), d => d.id)
        .join('path')
        .attr('class', 'brush-line-series')
        .attr('d', d => brushLineGenerator(d.originalValues))
        .style('fill', 'none')
        .style('stroke', d => d.color)
        .style('stroke-width', '1px');

      this.brushBehavior = d3.brushX()
        .extent([[0, 0], [this.innerWidth, this.brushInnerHeight]])
        .on("start brush end", this.brushed); // 修正：將所有 Brush 事件都導向 brushed

      this.brushGroup = this.brushSvg.append('g')
        .attr('class', 'brush')
        .call(this.brushBehavior);

      // 初始化 Brush 選區為整個範圍
      this.brushGroup.call(this.brushBehavior.move, this.brushXScale.range());
    },

    // 更新曲線圖資料 (軸、格線、線條)
    updateChart() {
      if (!this.svg || !this.xScale || !this.yScale || this.innerWidth <= 0 || this.innerHeight <= 0) return;
      const visibleSeries = this.chartSeriesData.filter(s => s.visible);

      this.updateScale();
      this.lineGenerator.x(d => this.xScale(d.time)).y(d => this.yScale(d.value));
      const lines = this.linesGroup.selectAll('.line-series').data(visibleSeries, d => d.id);
      lines.exit().remove();
      lines.enter()
        .append('path')
        .attr('class', 'line-series')
        .style('fill', 'none')
        .style('stroke-width', '2px')
        .merge(lines)
        .style('stroke', d => d.color)
        .attr('d', d => this.lineGenerator(d.displayValues));
      if (visibleSeries.length === 0) this.linesGroup.selectAll('.line-series').remove();
    },

    // 更新 Brush 圖表線條（當 series 可見性改變時）
    updateBrushChartLines() {
      if (!this.brushSvg || !this.brushXScale || !this.brushYScale || this.innerWidth <= 0 || this.brushInnerHeight <= 0) return;

      const brushLineGenerator = d3.line()
        .x(d => this.brushXScale(d.time))
        .y(d => this.brushYScale(d.value))
        .curve(d3.curveMonotoneX);

      const visibleSeries = this.chartSeriesData.filter(s => s.visible);

      this.brushSvg.select('.brush-lines').selectAll('.brush-line-series')
        .data(visibleSeries, d => d.id)
        .join('path')
        .attr('class', 'brush-line-series')
        .attr('d', d => brushLineGenerator(d.originalValues))
        .style('fill', 'none')
        .style('stroke', d => d.color)
        .style('stroke-width', '1px');
    },

    // Zoom事件 (縮放、拖拉中)
    zoomIng(event) {
      // 設置 isZooming 旗標，用於避免 Brush 反向觸發
      if (!event.sourceEvent) { // 來自程式碼觸發的 zoom 事件 (如來自 brush)
        this.isZooming = true;
      } else { // 來自用戶手動操作的 zoom 事件
        this.isZooming = false; // 重置此旗標，因為我們不是從 brush 過來的
      }

      const transform = event.transform;
      this.zoomOffset = transform;
      this.xScale = transform.rescaleX(this.originalXScale);
      this.yScale = transform.rescaleY(this.originalYScale);

      if (!this.svg || !this.xScale || !this.yScale || this.innerWidth <= 0 || this.innerHeight <= 0) return;

      this.updateScale();

      // 如果不是由 Brush 觸發的 Zoom，則同步 Brush 的選區
      if (!this.isBrushing && this.brushGroup && this.brushBehavior) { // 使用 isBrushing 旗標
        const currentMainChartDomain = this.xScale.domain();
        const brushSelection = [this.brushXScale(currentMainChartDomain[0]), this.brushXScale(currentMainChartDomain[1])];
        // 呼叫 brushBehavior.move 不會觸發 brush.end 事件，但會觸發 brush.brush 事件
        // 我們要在 brushed 中過濾掉非用戶操作的 brush 事件
        this.brushGroup.call(this.brushBehavior.move, brushSelection);
      }

      // 數據採樣和圖表更新邏輯
      // 可以在 "end" 事件進行完整更新，或在 "zoom" 過程中根據需要進行輕量級更新
      // 目前判斷方式：滾輪縮放或縮放比例大於4時更新
      if (event.sourceEvent?.type === 'wheel' || (event.transform.k > 4 && this.xScale.domain()[0] !== this.originalXScale.domain()[0])) {
        this.resampleAndUpdate();
      }
      this.handleMouseLeave();
    },

    // Zoom事件 (縮放拖拉結束)
    zoomEnd(event) {
      // 確保在用戶操作結束後進行數據更新
      // 如果是通過 Brush 調整 Zoom，那麼 `brushed` 函數會執行 `resampleAndUpdate()`
      // 如果是直接在主圖表上操作 Zoom，則在這裡執行
      if (!this.isBrushing) { // 僅當不是由 Brush 觸發的 Zoom 結束時才觸發
        this.resampleAndUpdate();
      }
      this.isBrushing = false; // 重置 isBrushing 旗標
    },

    // Brush 的 'end' 事件處理函數 (現在也處理 'start' 和 'brush')
    brushed({ selection, sourceEvent, type }) {
      if (!sourceEvent) return; // 忽略程式化調用 (例如來自 zoomIng 的調用)

      if (type === "start") {
        this.isBrushing = true; // 設置旗標，表示當前正在由 Brush 操作
      } else if (type === "end") {
        // 在 Brush 結束時觸發主圖表的 Zoom
        if (selection) {
          const [x0, x1] = selection.map(this.brushXScale.invert);
          const newZoomK = this.innerWidth / (this.originalXScale(x1) - this.originalXScale(x0));
          const newZoomX = -this.originalXScale(x0) * newZoomK;
          const newTransform = d3.zoomIdentity.translate(newZoomX, 0).scale(newZoomK);

          // 應用新的 Zoom 轉換到主圖表
          // 設置 isBrushing 旗標為 true，告訴 zoomIng 這是來自 brush 的操作
          this.isBrushing = true;
          this.svg.select('.zoom-rect').call(this.zoomBehavior.transform, newTransform);
          // 在 `zoomEnd` 中會重置 `isBrushing` 旗標
        } else {
          // 如果 Brush 選區被清除，則重置主圖表的 Zoom
          this.resetZoom();
        }
        // 無論 selection 如何，在 `end` 事件，只要是用戶操作，都應重新採樣
        this.resampleAndUpdate(); // 確保數據更新
        this.isBrushing = false; // 重置 isBrushing 旗標
      } else if (type === "brush") {
        // Brush 拖動過程中，如果需要即時更新主圖表（輕量級），可以在這裡實現
        // 為了避免過度計算，通常在 `end` 事件才做完整的 `resampleAndUpdate`
        // 但這裡我們讓它觸發 `zoomIng`，讓 `zoomIng` 中的採樣條件控制
        if (selection && !this.isZooming) { // 僅當不是由主圖表 zoom 觸發時
          const [x0, x1] = selection.map(this.brushXScale.invert);
          const newZoomK = this.innerWidth / (this.originalXScale(x1) - this.originalXScale(x0));
          const newZoomX = -this.originalXScale(x0) * newZoomK;
          const newTransform = d3.zoomIdentity.translate(newZoomX, 0).scale(newZoomK);
          // 設置 isBrushing 旗標，阻止 zoomIng 反向更新 brush
          this.isBrushing = true;
          this.svg.select('.zoom-rect').call(this.zoomBehavior.transform, newTransform);
          // 在 `zoomEnd` 或 `brushed` 的 `end` 階段會重置
        }
      }
    },

    // 重製Zoom縮放位置
    resetZoom() {
      if (this.svg && this.zoomBehavior) {
        // 設置 isBrushing 旗標，避免 Brush 反向觸發
        this.isBrushing = true;
        const zoomTarget = this.svg.select('.zoom-rect');
        zoomTarget.call(this.zoomBehavior.transform, d3.zoomIdentity);
        this.isBrushing = false; // 重置旗標

        if (this.brushGroup && this.brushXScale) {
          this.brushGroup.call(this.brushBehavior.move, this.brushXScale.range());
        }
        this.resampleAndUpdate();
      }
    },

    // 更新 X/Y 軸和格線 (使用當前的 X Scale, Y Scale)
    updateScale() {
      const numXTicks = Math.max(2, Math.floor(this.innerWidth / 250));
      const numYTicks = Math.max(2, Math.floor(this.innerHeight / 50));
      this.xAxisGroup.attr('transform', `translate(0,${this.innerHeight})`).call(d3.axisBottom(this.xScale).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
      this.yAxisGroup.call(d3.axisLeft(this.yScale).ticks(numYTicks));
      if (this.xAxisGridGroup) 
        this.xAxisGridGroup.attr('transform', `translate(0,${this.innerHeight})`)
          .call(d3.axisBottom(this.xScale).ticks(numXTicks).tickSize(-this.innerHeight).tickFormat(""));
      
      if (this.yAxisGridGroup) 
        this.yAxisGridGroup.call(d3.axisLeft(this.yScale).ticks(numYTicks).tickSize(-this.innerWidth).tickFormat(""));
    },

    // 滑鼠移動事件 (Tooltip 和懸停圓點)
    handleMouseMove(event) {
      const visibleSeries = this.chartSeriesData.filter(s => s.visible);
      if (!visibleSeries.some(s => s.displayValues && s.displayValues.length > 0) || !this.xScale || !this.yScale || !this.svg || this.innerWidth <= 0) {
        this.handleMouseLeave();
        return;
      }
      let pointer;
      try { pointer = d3.pointer(event, this.svg.node()); }
      catch (e) { this.handleMouseLeave(); return; }
      const pointerX = pointer[0];
      if (pointerX < 0 || pointerX > this.innerWidth) {
        this.handleMouseLeave(); return;
      }
      const x0 = this.xScale.invert(pointerX);
      const hoverPointsData = [];
      const bisectDate = d3.bisector(d => d.time).left;

      visibleSeries.forEach(series => {
        if (!series.displayValues || series.displayValues.length === 0) return;
        const index = bisectDate(series.displayValues, x0, 1);
        const d0 = series.displayValues[index - 1];
        const d1 = series.displayValues[index];
        let closestDataPoint;
        if (d0 && d1) closestDataPoint = (x0 - d0.time > d1.time - x0) ? d1 : d0;
        else if (d0) closestDataPoint = d0;
        else if (d1) closestDataPoint = d1;
        else return;

        if (closestDataPoint) {
          const cx = this.xScale(closestDataPoint.time);
          const cy = this.yScale(closestDataPoint.value);
          if (isFinite(cx) && isFinite(cy)) {
            hoverPointsData.push({
              seriesId: series.id, seriesName: series.name, time: closestDataPoint.time,
              value: closestDataPoint.value, color: series.color,
              cx: cx, cy: cy,
            });
          }
        }
      });

      const circles = this.hoverElementsGroup.selectAll('.hover-point-circle').data(hoverPointsData, d => d.seriesId);
      circles.exit().remove();
      circles.enter().append('circle')
        .attr('class', 'hover-point-circle').attr('r', 5).style('stroke', 'white').style('stroke-width', '1.5px')
        .merge(circles)
        .attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1);

      if (hoverPointsData.length > 0) {
        const positioningParent = this.$refs.chartContainerWrapper.parentElement;
        const parentRect = positioningParent.getBoundingClientRect();
        const chartRect = this.$refs.chartContainerWrapper.getBoundingClientRect();
        let mouseXRelToChart = event.clientX - chartRect.left;
        let mouseYRelToChart = event.clientY - chartRect.top;

        const tooltipItemHeight = 22; const tooltipPadding = 20;
        const tooltipEstimatedWidth = 220; const tooltipEstimatedHeight = (hoverPointsData.length * tooltipItemHeight) + tooltipPadding + (hoverPointsData.length > 0 ? 30 : 0);

        let tipX = mouseXRelToChart + chartRect.left - parentRect.left + 15;
        let tipY = mouseYRelToChart + chartRect.top - parentRect.top - tooltipEstimatedHeight - 15;

        if (tipX + tooltipEstimatedWidth > parentRect.width) tipX = mouseXRelToChart + chartRect.left - parentRect.left - tooltipEstimatedWidth - 15;
        if (tipX < 0) tipX = 5;

        if (tipY < 0) tipY = mouseYRelToChart + chartRect.top - parentRect.top + 15;
        if (tipY + tooltipEstimatedHeight > parentRect.height) tipY = parentRect.height - tooltipEstimatedHeight - 5;
        if (tipY < 0) tipY = 5;

        this.tooltip.x = tipX; this.tooltip.y = tipY;
        this.tooltip.data = hoverPointsData.map(d => ({
          seriesName: d.seriesName, time: d3.timeFormat("%Y-%m-%d %H:%M:%S")(d.time),
          value: d.value, color: d.color,
        }));
        this.tooltip.visible = true;
      } else { this.handleMouseLeave(); }
    },
    // 鼠標離開，隱藏 Tooltip 和懸停點
    handleMouseLeave() {
      this.tooltip.visible = false;
      this.tooltip.data = [];
      if (this.hoverElementsGroup) {
        this.hoverElementsGroup.selectAll('.hover-point-circle').remove();
      }
    },

    // 按鈕切換線條可見性
    toggleSeriesVisibility(seriesId) {
      const series = this.chartSeriesData.find(s => s.id === seriesId);
      if (series) {
        series.visible = !series.visible;
        this.resampleAndUpdate();
        this.updateBrushChartLines();
        if (this.tooltip.visible) {
          const newTooltipData = this.tooltip.data.filter(td => {
            const ts = this.chartSeriesData.find(s => s.name === td.seriesName);
            return ts && ts.visible;
          });
          if (newTooltipData.length === 0) {
            this.handleMouseLeave();
          } else {
            this.tooltip.data = newTooltipData;
            const visibleHoverPoints = newTooltipData.map(td => {
              const s = this.chartSeriesData.find(ser => ser.name === td.seriesName);
              if (!s || !s.displayValues) return null;
              const pointInSeries = s.displayValues.find(v => d3.timeFormat("%Y-%m-%d %H:%M:%S")(v.time) === td.time);
              if (pointInSeries && this.xScale && this.yScale) {
                const cx = this.xScale(pointInSeries.time);
                const cy = this.yScale(pointInSeries.value);
                if (isFinite(cx) && isFinite(cy)) {
                  return { seriesId: s.id, cx: cx, cy: cy, color: s.color };
                }
              } return null;
            }).filter(Boolean);
            if (this.hoverElementsGroup) {
              this.hoverElementsGroup.selectAll('.hover-point-circle').data(visibleHoverPoints, d => d.seriesId)
                .join(
                  enter => enter.append('circle').attr('class', 'hover-point-circle').attr('r', 5).style('stroke', 'white').style('stroke-width', '1.5px').attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1),
                  update => update.attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1),
                  exit => exit.remove()
                );
            }
          }
        }
      }
    },
    // ========================================= 搜尋 =========================================
    getDatetimeNow() {
      var today = new Date();
      this.dateS = { value: today, dday: this.formatDate(today), dtime: "00:00:00" }
      this.dateE = { value: today, dday: this.formatDate(today), dtime: this.formatTime(today) }
    },
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