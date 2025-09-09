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
          <v-btn style="margin: 30px 0px 0px 10px;" variant="outlined" :loading=getChartLoading @click="generateChartList()"><h3>搜尋</h3></v-btn>
        </div>
      </v-card-title>
      <!-- 圖表內容的內部包裹器，用於 flex 佈局和 tooltip 定位 -->
      <div class="chart-wrapper-inside-card">
        <!-- D3 SVG 的直接容器，ResizeObserver 會監聽這個元素的尺寸變化 -->
        <div ref="chartContainerWrapper" class="chart-container-wrapper">
          <!-- D3 會在這裡繪製 SVG 圖表 -->
          <v-icon v-if="zoomOffset && zoomOffset.k != 1" style="position: absolute; left: 70px; top: 30px; cursor: pointer;" @click="resetZoom()">mdi-reload</v-icon>
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
    <v-container>
      <div v-for="(item, index) in chartSeriesData" :key="index">
        <h3>{{ item.originalValues.length }}, {{ item.displayValues.length }}</h3>
      </div>
    </v-container>
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
      limitDataPoint: 50, // 曲線最大數
      resizeObserver: null, // ResizeObserver 的實例，用於監聽容器尺寸變化
      zoomBehavior: null, // D3 Zoom behavior 實例
      zoomOffset: null,
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
        const val = this.currentHeight - this.dimensions.margin.top - this.dimensions.margin.bottom;
        return Math.max(0, val);
      }
      return 0;
    },
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
    // 設定曲線圖顏色
    setLinechartColor() {
      var colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      // 遍歷 chartSeriesData，為每個系列分配顏色
      this.chartSeriesData.forEach((series) => {
        series.color = colorScale(series.id); // 使用系列ID作為顏色比例尺的輸入，確保顏色一致性
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
      newHeight = Math.max(newHeight, newHeight); // 修正：這裡應該是 Math.max(newHeight, minHeight);

      if (newWidth > 0 && newHeight > 0 && (this.currentWidth !== newWidth || this.currentHeight !== newHeight)) {
        this.currentWidth = newWidth;
        this.currentHeight = newHeight;

        if (this.innerWidth > 0 && this.innerHeight > 0) {
          const currentTransform = this.svg ? d3.zoomTransform(this.svg.select('.zoom-rect').node()) : d3.zoomIdentity;

          d3.select(this.$refs.chartContainerWrapper).select('svg').remove();
          this.svg = null;

          if (this.originalXScale) this.originalXScale.range([0, this.innerWidth]);
          if (this.originalYScale) this.originalYScale.range([this.innerHeight, 0]);

          this.createChart();

          // *** 新增/修改：在 Create Chart 完成後，觸發第一次繪圖/應用 Zoom ***
          // 使用 $nextTick 確保 Create Chart 添加的 SVG 元素已經在 DOM 中
          this.$nextTick(() => {
            if (this.svg && this.zoomBehavior) { // 再次檢查 SVG 和 zoom 是否存在
              try {
                // 如果存在舊的 transform，應用它。應用 transform 會觸發 zoomIng 事件
                if (currentTransform && (currentTransform.k !== 1 || currentTransform.x !== 0 || currentTransform.y !== 0)) {
                  this.svg.select('.zoom-rect').call(this.zoomBehavior.transform, currentTransform);
                } else {
                  // 如果沒有舊的 transform (默認視圖)，手動調用觸發初始繪製
                  this.resampleAndUpdate();
                }
              } catch (e) {
                console.error("Error during initial chart drawing or applying zoom:", e);
                // 出錯時，至少嘗試觸發一次默認繪製
                this.resampleAndUpdate();
              }
            } else {
              // 如果 Create Chart 沒成功，也嘗試觸發一次 (雖然可能不會繪圖)
              this.resampleAndUpdate();
            }
          });
        } else {
          d3.select(this.$refs.chartContainerWrapper).select('svg').remove();
          this.svg = null;
        }
        this.handleMouseLeave(); // 尺寸變化後隱藏 tooltip
      }
    },
    // 產生曲線圖資料格式
    generateChartList() {
      // this.getChartLoading = true;
      // var Query = {
      //   start: `${this.dateS['dday']}T${this.dateS['dtime']}Z`,
      //   end: `${this.dateE['dday']}T${this.dateE['dtime']}Z`,
      // }
      // useSetup().queryLinechartData(Query).then((res)=> {
      //   var d = res["data"]
      //   const data = [];
      //   for (let i in res["data"]) {
      //     var rawData = res["data"][i]
      //     const iso = rawData["tgroup"].replace(" ", "T") + ":00:00";
      //     const timestamp = new Date(iso);
      //     Object.entries(rawData).forEach(([key, value]) => {
      //       if (key === "tgroup" || key === "id_avg") return; // 跳過時間欄
      //       if (i == 0) {
      //         data.push({
      //           id: key, name: key, visible: false,
      //           originalValues: [{ time: timestamp,value: value }],
      //           displayValues: [],
      //         });
      //       } else {
      //         var findIndex = data.findIndex((d)=> d.id == key)
      //         data[findIndex]['originalValues'].push({ time: timestamp, value: value })
      //       }
      //     });
      //   }
      //   for (let i in data) data[i]["visible"] = i == 0 ? true : false;
      //   this.chartSeriesData = data
      //   console.log("Total Chart Data: ", this.chartSeriesData)
      //   this.setLinechartColor();
      //   this.updateOriginalScalesDomain();
      //   this.createChart();
      //   this.getChartLoading = false;
      // }).catch(()=> {
      //   useSetup().showAlertDialog({ icon: "error", title: "獲取曲線圖資料失敗!" });
      //   this.getChartLoading = false;
      // })
      this.setTestChartData();
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
      console.log("Total Chart Data: ", this.chartSeriesData)
      this.setLinechartColor();
      this.updateOriginalScalesDomain();
      this.createChart();
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
        // 設置默認 domain
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

        // --- 執行數據採樣 (old) ---
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

        // --- 執行數據採樣 (new) ---
        // const sampledData = [];
        // if (n === 0) {
        //   series.displayValues = [];
        //   return;
        // }
        // // 如果最終目標點數大於等於可見原始點數，或者 可見原始點數 <= 全顯示閾值 (這部分邏輯已移到前面計算 actualKToDisplay 時)
        // // 這裡只根據 actualKToDisplay 和 n 的最終值來決定如何採樣
        // if (actualKToDisplay >= n) sampledData.push(...visibleOriginalValues);
        // else {
        //   // 執行改進的均勻採樣 (actualKToDisplay > 2 且 actualKToDisplay < n)
        //   const usedIndices = new Set();
        //   // 始終包含第一個點的索引
        //   if (!usedIndices.has(0)) {
        //     sampledData.push(visibleOriginalValues[0]);
        //     usedIndices.add(0);
        //   }
        //   const step = (n - 1) / (actualKToDisplay - 1); // 步長基於總點數和目標點數
        //   // 採樣中間點 (從 i = 1 到 actualKToDisplay - 2)
        //   for (let i = 1; i < actualKToDisplay - 1; i++) {
        //     const originalIndex = Math.round(i * step);
        //     // 確保索引有效且沒有被使用過
        //     if (originalIndex > 0 && originalIndex < n - 1 && !usedIndices.has(originalIndex)) {
        //       sampledData.push(visibleOriginalValues[originalIndex]);
        //       usedIndices.add(originalIndex);
        //     }
        //   }
        //   // 始終包含最後一個點的索引
        //   if (!usedIndices.has(n - 1)) {
        //     sampledData.push(visibleOriginalValues[n - 1]);
        //     usedIndices.add(n - 1);
        //   }
        //   const percentagesToInclude = [0.6, 0.7, 0.8, 0.9]; // 你想要的百分比位置 (10%, 20%, ..., 90%)
        //   percentagesToInclude.forEach(percentage => {
        //     // 計算對應百分比的索引 (基於 n-1，確保到達最後一個點)
        //     const percentageIndex = Math.floor((n - 1) * percentage); // 使用 floor 或 round
        //     // 確保索引有效且沒有被使用過
        //     if (percentageIndex > 0 && percentageIndex < n - 1 && !usedIndices.has(percentageIndex)) { // 只在中間範圍添加
        //       console.log("percentageIndex: ", series.originalValues[percentageIndex])
        //       sampledData.push(series.originalValues[percentageIndex]);
        //       usedIndices.add(percentageIndex);
        //     }
        //   });
        //   // 進行排序，因為添加順序可能不是時間順序（由於去重和獨立添加首尾點）
        //   sampledData.sort((a, b) => a.time.getTime() - b.time.getTime());
        // }

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
      d3.select(this.$refs.chartContainerWrapper).select('svg').remove();
      this.svg = null;
      const { margin } = this.dimensions;

      const svgRoot = d3.select(this.$refs.chartContainerWrapper).append('svg').attr('width', this.currentWidth).attr('height', this.currentHeight);
      svgRoot.append('defs').append('clipPath').attr('id', 'clip-rect').append('rect').attr('width', this.innerWidth).attr('height', this.innerHeight);
      this.svg = svgRoot.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // 確保 original scales 存在，並設置它們的 Range
      if (!this.originalXScale) this.originalXScale = d3.scaleTime();
      if (!this.originalYScale) this.originalYScale = d3.scaleLinear();
      this.originalXScale.range([0, this.innerWidth]);
      this.originalYScale.range([this.innerHeight, 0]);

      // X Scale 和 Y Scale 根據 zoom 變換設置
      this.xScale = this.originalXScale.copy();
      this.yScale = this.originalYScale.copy();

      this.lineGenerator = d3.line().x(d => this.xScale(d.time)).y(d => this.yScale(d.value)).curve(d3.curveMonotoneX);

      this.yAxisGridGroup = this.svg.append('g').attr('class', 'grid y-grid');
      this.xAxisGridGroup = this.svg.append('g').attr('class', 'grid x-grid').attr('transform', `translate(0,${this.innerHeight})`);

      this.xAxisGroup = this.svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.innerHeight})`);
      this.yAxisGroup = this.svg.append('g').attr('class', 'y-axis');

      this.linesGroup = this.svg.append('g').attr('class', 'lines-group').attr('clip-path', 'url(#clip-rect)');
      this.hoverElementsGroup = this.svg.append('g').attr('class', 'hover-elements-group').attr('clip-path', 'url(#clip-rect)');
 
      // 創建和配置 Zoom Behavior
      this.zoomBehavior = d3.zoom()
        .scaleExtent([1, 50]) // *** 設置縮放範圍 [1, 50] ***
        .extent([[0, 0], [this.innerWidth, this.innerHeight]])
        .translateExtent([[0, 0], [this.innerWidth, this.innerHeight]])
        .on("zoom", this.zoomIng)
        .on("end", this.zoomEnd);

      // 應用 Zoom Behavior
      this.svg.append('rect')
        .attr('class', 'overlay zoom-rect')
        .attr('width', this.innerWidth)
        .attr('height', this.innerHeight)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', this.handleMouseMove)
        .on('mouseleave', this.handleMouseLeave)
        .call(this.zoomBehavior)

      this.updateChart();
      this.resampleAndUpdate()
    },

    // 更新曲線圖資料 (軸、格線、線條)
    updateChart() {
      if (!this.svg || !this.xScale || !this.yScale || this.innerWidth <= 0 || this.innerHeight <= 0) return;
      const visibleSeries = this.chartSeriesData.filter(s => s.visible);

      // 更新 X/Y 軸和格線 (使用當前的 X Scale, Y Scale)
      this.updateScale();
      // 更新線條生成器以使用當前的 scales
      this.lineGenerator.x(d => this.xScale(d.time)).y(d => this.yScale(d.value));
      // 更新線條
      const lines = this.linesGroup.selectAll('.line-series').data(visibleSeries, d => d.id);
      lines.exit().remove();
      lines.enter()
        .append('path')
        .attr('class', 'line-series')
        .style('fill', 'none')
        .style('stroke-width', '2px')
        .merge(lines)
        .style('stroke', d => d.color)
        .attr('d', d => this.lineGenerator(d.displayValues)); // *** 使用 displayValues列表繪製 ***
      // 如果沒有任何系列是可見的，則清空線條
      if (visibleSeries.length === 0) this.linesGroup.selectAll('.line-series').remove();
    },
    // Zoom事件 (縮放、拖拉中)
    zoomIng(event) {
      const transform = event.transform;
      this.zoomOffset = transform; // 更新 zoomOffset
      // 更新當前的 X Scale 和 YScale
      this.xScale = transform.rescaleX(this.originalXScale);
      this.yScale = transform.rescaleY(this.originalYScale);
      if (!this.svg || !this.xScale || !this.yScale || this.innerWidth <= 0 || this.innerHeight <= 0) return;
      // 更新 X/Y 軸和格線 (使用當前的 X Scale, Y Scale)
      this.updateScale();
      if (event.sourceEvent?.type === 'wheel') this.resampleAndUpdate(); // 在滾輪縮放狀態下可更新資料
      else if (event.transform.k > 4) this.resampleAndUpdate(); // 在拖拉狀態下，當縮放比例大於 4 時更新資料
      // console.log("Zooming: ", event.transform);
      this.handleMouseLeave(); // 縮放時隱藏 tooltip
    },
    // Zoom事件 (縮放拖拉結束)
    zoomEnd(event) {
      if (event.sourceEvent?.type === 'mouseup') this.resampleAndUpdate(); // 在拖拉結束時更新資料
    },
    // 重製Zoom縮放位置
    resetZoom() {
      // 確保 SVG 和 zoom behavior 已經創建
      if (this.svg && this.zoomBehavior) {
        const zoomTarget = this.svg.select('.zoom-rect');
        zoomTarget.call(this.zoomBehavior.transform, d3.zoomIdentity);
        // 應用 d3.zoomIdentity 會觸發 'zoom' 和 'end' 事件，
        // 最終觸發 resampleAndUpdate -> updateChart，將圖表重繪為初始狀態
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
        let mouseXRelToParent = event.clientX - parentRect.left;
        let mouseYRelToParent = event.clientY - parentRect.top;
        let tipX = mouseXRelToParent + 15; let tipY = mouseYRelToParent - 30;
        const tooltipItemHeight = 22; const tooltipPadding = 20;
        const tooltipEstimatedWidth = 220; const tooltipEstimatedHeight = (hoverPointsData.length * tooltipItemHeight) + tooltipPadding;
        if (tipX + tooltipEstimatedWidth > parentRect.width) tipX = mouseXRelToParent - tooltipEstimatedWidth - 15;
        if (tipX < 0) tipX = 5;
        if (tipY < 0) tipY = mouseYRelToParent + 15;
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
        this.resampleAndUpdate(); // 可見性改變，只需要重繪，不需要重新採樣（除非你希望隱藏後完全移除數據）
        // 更新 tooltip (如果可見)
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