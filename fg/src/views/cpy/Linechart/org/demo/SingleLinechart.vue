<template>
  <v-main>
    <div class="chart-container">
      <h2>實時滑動窗口折線圖 (D3.js)</h2>
      <div ref="chartDiv" class="d3-chart">
        <!-- D3 會將 SVG 插入這裡 -->
      </div>
      <div v-if="!initialDataLoaded">正在生成初始數據...</div>
    </div>
  </v-main>
</template>

<script>
import * as d3 from 'd3';

const INITIAL_DATA_POINTS = 100; // 初始數據點數量
const MAX_DATA_POINTS = 100;    // 圖表上始終保持的數據點數量
const UPDATE_INTERVAL = 1000;   // 更新間隔 (毫秒) - 可以加快一點看效果
const TRANSITION_DURATION = UPDATE_INTERVAL * 0.8; // 過渡動畫時間 (略小於更新間隔)

export default {
  data() {
    return {
      chartData: [],       // 存儲圖表數據 [{ time: Date, value: number }]
      d3_elements: {     // D3 相關元素
        svg: null, chartGroup: null, xScale: null, yScale: null,
        xAxis: null, yAxis: null, xAxisGroup: null, yAxisGroup: null,
        lineGenerator: null, path: null, width: 0, height: 0,
        margin: { top: 20, right: 30, bottom: 40, left: 50 },
      },
      intervalId: null,    // Interval ID
      isMounted: false,    // 組件掛載標誌
      initialDataLoaded: false, // 初始數據加載標誌
      resizeTimeout: null,  // 用於 resize 防抖
      lastTimestamp: null, // 記錄最後一個數據點的時間戳
    };
  },
  mounted() {
    this.isMounted = true;
    this.$nextTick(() => {
      this.generateInitialData(); // 先生成初始數據
      this.initChart();          // 然後初始化圖表 (包含首次繪製)
      this.startDataUpdates();     // 最後開始定時更新
    });
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    this.isMounted = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.d3_elements.svg) {
      this.d3_elements.svg.remove();
    }
  },
  methods: {
    /**
     * 生成初始的 100 筆數據
     */
    generateInitialData() {
      const initialData = [];
      const now = Date.now();
      this.lastTimestamp = now - UPDATE_INTERVAL; // 設置一個起始時間戳
      let currentValue = 50; // 起始值

      for (let i = 0; i < INITIAL_DATA_POINTS; i++) {
        // 稍微模擬一些波動
        currentValue += (Math.random() - 0.5) * 5;
        currentValue = Math.max(0, Math.min(100, currentValue)); // 限制在 0-100

        const timestamp = this.lastTimestamp - (INITIAL_DATA_POINTS - 1 - i) * UPDATE_INTERVAL;
        initialData.push({ time: new Date(timestamp), value: currentValue });
      }
      this.chartData = initialData;
      this.initialDataLoaded = true; // 標記初始數據已加載
      console.log(`生成了 ${INITIAL_DATA_POINTS} 筆初始數據`);
    },

    /**
     * 初始化 D3 圖表結構、比例尺、坐標軸和線條
     */
    initChart() {
      const chartDiv = this.$refs.chartDiv;
      if (!chartDiv || this.chartData.length === 0) return; // 需要有初始數據

      const containerWidth = chartDiv.clientWidth;
      const containerHeight = 400;
      const margin = this.d3_elements.margin;
      this.d3_elements.width = containerWidth - margin.left - margin.right;
      this.d3_elements.height = containerHeight - margin.top - margin.bottom;
      const { width, height } = this.d3_elements;

      this.d3_elements.svg = d3.select(chartDiv).append('svg')
        .attr('width', containerWidth)
        .attr('height', containerHeight)
        .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
        .attr('preserveAspectRatio', 'xMidYMid meet');

      this.d3_elements.chartGroup = this.d3_elements.svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      this.d3_elements.xScale = d3.scaleTime().range([0, width]);
      this.d3_elements.yScale = d3.scaleLinear().range([height, 0]);

      // 設置初始比例尺域
      this.updateScalesDomain();

      this.d3_elements.xAxis = d3.axisBottom(this.d3_elements.xScale)
        .ticks(5).tickFormat(d3.timeFormat("%H:%M:%S"));
      this.d3_elements.yAxis = d3.axisLeft(this.d3_elements.yScale);

      this.d3_elements.xAxisGroup = this.d3_elements.chartGroup.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0,${height})`)
        .call(this.d3_elements.xAxis); // 初始繪製 X 軸

      this.d3_elements.yAxisGroup = this.d3_elements.chartGroup.append('g')
        .attr('class', 'y-axis')
        .call(this.d3_elements.yAxis); // 初始繪製 Y 軸

      this.d3_elements.lineGenerator = d3.line()
        .x(d => this.d3_elements.xScale(d.time))
        .y(d => this.d3_elements.yScale(d.value));

      // 添加 clipPath 防止線條繪製到坐標軸區域外
      this.d3_elements.chartGroup.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

      // 將線條路徑放在 clipPath 內
      this.d3_elements.path = this.d3_elements.chartGroup.append('g')
        .attr("clip-path", "url(#clip)")
        .append('path')
        .datum(this.chartData) // 綁定初始數據
        .attr('class', 'data-line')
        .attr('d', this.d3_elements.lineGenerator); // 初始繪製線條
    },

    /**
     * 添加新數據點並移除舊數據點
     */
    updateData() {
      if (!this.isMounted) return;

      // 生成新數據點
      const now = new Date(this.lastTimestamp + UPDATE_INTERVAL);
      this.lastTimestamp = now.getTime(); // 更新最後時間戳
      let lastValue = this.chartData.length > 0 ? this.chartData[this.chartData.length - 1].value : 50;
      let newValue = lastValue + (Math.random() - 0.5) * 5;
      newValue = Math.max(0, Math.min(100, newValue)); // 限制範圍

      // 添加新數據並移除最舊的數據
      this.chartData.push({ time: now, value: newValue });
      this.chartData.shift(); // 移除第一個元素

      // 更新圖表
      this.updateChartAnimation();
    },

    /**
    * 更新比例尺的域 (Domain)
    */
    updateScalesDomain() {
      if (this.chartData.length < 2) return;
      // X 軸域: 根據當前數據的時間範圍
      this.d3_elements.xScale.domain(d3.extent(this.chartData, d => d.time));
      // Y 軸域: 根據當前數據的值範圍 (加緩衝)
      const [minVal, maxVal] = d3.extent(this.chartData, d => d.value);
      const buffer = Math.max((maxVal - minVal) * 0.1, 5); // 至少 5 個單位的緩衝
      this.d3_elements.yScale.domain([Math.max(0, minVal - buffer), maxVal + buffer]); // Y 軸最低可以是 0
    },

    /**
 * 平滑更新 D3 圖表的顯示 (再次修正滑動動畫)
 */
    updateChartAnimation() {
      if (!this.d3_elements.svg || !this.isMounted || this.chartData.length < 2) return;

      const { xScale, yScale, xAxis, yAxis, xAxisGroup, yAxisGroup, lineGenerator, path, width, height, margin } = this.d3_elements; // 獲取 margin

      // --- 1. 數據已在 updateData() 中更新 (移除舊的，添加新的) ---

      // --- 2. 更新 Y 比例尺和 Y 軸 (與之前類似) ---
      const [minVal, maxVal] = d3.extent(this.chartData, d => d.value);
      const buffer = Math.max((maxVal - minVal) * 0.1, 5);
      yScale.domain([Math.max(0, minVal - buffer), maxVal + buffer]);

      yAxisGroup
        .transition().duration(TRANSITION_DURATION).ease(d3.easeLinear)
        .call(yAxis.scale(yScale));

      // --- 3. 確定 X 軸的【最終】域，並更新比例尺 ---
      const finalXDomain = d3.extent(this.chartData, d => d.time);
      xScale.domain(finalXDomain);

      // --- 4. 計算需要向左平移的距離 ---
      // 這個距離等於新數據範圍中第一個點和第二個點之間的 X 座標差
      // （或者一個數據點的平均寬度）
      // 使用更新後的 xScale 來計算
      const xTranslate = xScale(this.chartData[1].time) - xScale(this.chartData[0].time);
      // 注意：這裡計算的是差值，應該是正數。xScale(t1) - xScale(t0)
      // 如果點非常密集，可以用 width / (MAX_DATA_POINTS - 1) 作為近似值

      if (isNaN(xTranslate) || xTranslate <= 0) {
        console.warn("計算出的平移距離無效:", xTranslate);
        // 如果距離無效，可以選擇不執行動畫或使用備用值
        // 這裡簡單處理，直接更新不動畫
        this.redrawChartWithoutAnimation(); // 需要一個無動畫的重繪函數
        return;
      }


      // --- 5. 啟動動畫 ---
      // 對線條應用向左平移的 transform
      path
        .interrupt() // 中斷舊動畫
        .transition().duration(TRANSITION_DURATION).ease(d3.easeLinear)
        .attr("transform", `translate(${-xTranslate}, 0)`) // 向左移動 xTranslate 距離
        .on("end", () => {
          // 線條動畫結束後
          path.attr("transform", null) // 移除 transform
            .datum(this.chartData)   // 確保數據是最新的
            .attr("d", lineGenerator); // 更新線條到最終形狀和位置
        });

      // 對 X 軸應用相同的向左平移 transform
      // 注意 X 軸的 transform 基點是 (0, height)
      xAxisGroup
        .interrupt()
        .transition().duration(TRANSITION_DURATION).ease(d3.easeLinear)
        // 在原有的 translate(0, height) 基礎上再向左平移
        .attr("transform", `translate(${-xTranslate}, ${height})`)
        // 在動畫過程中【不要】調用 .call(xAxis)，因為比例尺域已經更新，會導致刻度跳躍
        .on("end", () => {
          // X 軸動畫結束後
          xAxisGroup.attr("transform", `translate(0, ${height})`); // 恢復原始 transform
          // 現在應用最終的刻度
          xAxisGroup.call(xAxis.scale(xScale)); // 使用最終的 xScale
        });
    },

    /**
     * (新增) 無動畫地重繪圖表 - 用於 resize 或平移距離無效時
     */
    redrawChartWithoutAnimation() {
      if (!this.d3_elements.svg || !this.isMounted || this.chartData.length < 2) return;
      const { xScale, yScale, xAxis, yAxis, xAxisGroup, yAxisGroup, lineGenerator, path } = this.d3_elements;

      this.updateScalesDomain(); // 更新比例尺域

      // 直接更新坐標軸
      xAxisGroup.call(xAxis.scale(xScale));
      yAxisGroup.call(yAxis.scale(yScale));

      // 直接更新線條
      path.datum(this.chartData).attr("d", lineGenerator);
    },
    // (handleResize 方法中調用 redrawChartWithoutAnimation)
    handleResize() {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        if (!this.isMounted || !this.$refs.chartDiv) return;
        console.log("Resizing chart...");
        if (this.d3_elements.svg) {
          this.d3_elements.svg.remove();
        }
        this.initChart();
        this.redrawChartWithoutAnimation(); // 使用無動畫重繪
      }, 300);
    },

    /**
     * 開始定時更新數據
     */
    startDataUpdates() {
      if (this.intervalId) clearInterval(this.intervalId); // 清除舊的

      this.intervalId = setInterval(() => {
        if (this.isMounted) {
          this.updateData(); // 添加新數據並更新圖表
        } else {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
      }, UPDATE_INTERVAL);
      console.log('數據更新 Interval 已啟動');
    },

  }
}
</script>

<style scoped>
.chart-container {
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  border: 1px solid #ccc;
  padding: 15px;
}

.d3-chart {
  width: 100%;
  height: 400px;
  overflow: hidden;
}

.d3-chart :deep(.data-line) {
  fill: none;
  stroke: steelblue;
  stroke-width: 1.5px;
}

.d3-chart :deep(.x-axis .tick text),
.d3-chart :deep(.y-axis .tick text) {
  font-size: 15px;
  color: #333;
}
</style>