<template>
  <!-- Vuetify 主內容區域 -->
  <v-main>
    <!-- Vuetify 卡片組件，作為圖表的容器 -->
    <v-card style="width: 100%; height: 700px; margin: 30px; display: flex; flex-direction: column;">
      <!-- 卡片標題 -->
      <v-card-title style="flex-shrink: 0;">
        <h3>曲線圖</h3>
        <v-btn @click="startDataUpdates()">
          <h3>開始</h3>
        </v-btn>
        <v-btn @click="stopUpdateChart()">
          <h3>停止</h3>
        </v-btn>
      </v-card-title>
      <!-- 圖表內容的內部包裹器，用於 flex 佈局和 tooltip 定位 -->
      <div class="chart-wrapper-inside-card">
        <!-- D3 SVG 的直接容器，ResizeObserver 會監聽這個元素的尺寸變化 -->
        <div ref="chartContainerWrapper" class="chart-container-wrapper">
          <!-- D3 會在這裡繪製 SVG 圖表 -->
        </div>
        <!-- Tooltip 元素，當鼠標懸停在圖表上時顯示 -->
        <div v-if="tooltip.visible && tooltip.data.length > 0" class="tooltip"
          :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }">
          <!-- 遍歷 tooltip 數據，為每個系列顯示信息 -->
          <div v-for="item in tooltip.data" :key="item.seriesName" class="tooltip-item">
            <!-- 顏色指示標籤 -->
            <h3 class="tooltip-color-indicator" :style="{ backgroundColor: item.color }"></h3>
            <!-- 系列名稱 -->
            <h3 class="tooltip-series-name">{{ item.seriesName }}:</h3>
            <!-- 系列數值 -->
            <h3 class="tooltip-value">{{ item.value }}</h3>
          </div>
          <!-- 如果有 tooltip 數據，顯示共同的時間戳 -->
          <div v-if="tooltip.data.length > 0 && tooltip.data[0].time" class="tooltip-time">
            時間: {{ tooltip.data[0].time }}
          </div>
        </div>
        <!-- 圖例控件區域，包含切換系列可見性的按鈕 -->
        <div class="legend-controls">
          <!-- 遍歷圖表系列數據，為每個系列創建一個按鈕 -->
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
import csvData from "@/components/csv/data.csv?raw"

export default {
  // 組件的數據選項
  data() {
    return {
      total_data: [],
      dataCount: 60,
      chartSeriesData: [], // 存儲所有圖表系列數據的數組
      svg: null, // D3 SVG 根元素的引用
      xScale: null, // D3 X軸比例尺
      yScale: null, // D3 Y軸比例尺
      lineGenerator: null, // D3 線條生成器
      xAxisGroup: null, // D3 X軸 <g> 元素的引用
      yAxisGroup: null, // D3 Y軸 <g> 元素的引用
      hoverElementsGroup: null, // 存儲所有懸停圓點的 <g> 元素
      tooltip: { // Tooltip 相關數據
        visible: false, // Tooltip 是否可見
        x: 0, // Tooltip 的 X 坐標
        y: 0, // Tooltip 的 Y 坐標
        data: [], // Tooltip 中顯示的數據數組
      },
      dimensions: { // 圖表的邊距設置
        margin: { top: 20, right: 40, bottom: 50, left: 60 },
      },
      currentWidth: 0, // chartContainerWrapper 的當前寬度
      currentHeight: 0, // chartContainerWrapper 的當前高度
      maxDataPoints: 60, // 每個系列在圖表上顯示的最大數據點數量
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
      if (this.currentWidth > 0 && this.dimensions && this.dimensions.margin) {
        const val = this.currentWidth - this.dimensions.margin.left - this.dimensions.margin.right;
        return Math.max(0, val); // 確保不為負值
      }
      return 0;
    },
    // 圖表內部繪圖區域的高度 (容器高度 - 上下邊距)
    innerHeight() {
      if (this.currentHeight > 0 && this.dimensions && this.dimensions.margin) {
        const val = this.currentHeight - this.dimensions.margin.top - this.dimensions.margin.bottom;
        return Math.max(0, val); // 確保不為負值
      }
      return 0;
    },
    // 過濾出當前可見的系列數據
    visibleSeriesData() {
      return this.chartSeriesData.filter(s => s.visible);
    }
  },
  created() {
    this.parseCSVData();
  },
  // Vue 組件掛載後執行的鉤子函數
  mounted() {
    this.generateChartList(); // 初始化圖表數據列表
    this.setLinechartColor(); // 為圖表系列設置顏色
    this.setupResizeObserver(); // 設置 ResizeObserver 來監聽容器尺寸變化
    this.startDataUpdates(); // 開始定時更新圖表數據
  },
  // Vue 組件銷毀前執行的鉤子函數
  beforeUnmount() {
    // 清除定時器
    if (this.updateInterval) clearInterval(this.updateInterval);
    // 停止觀察尺寸變化並清理 ResizeObserver
    if (this.resizeObserver && this.$refs.chartContainerWrapper) this.resizeObserver.unobserve(this.$refs.chartContainerWrapper);
    // 移除 window resize 事件監聽器 (備用方案)
    window.removeEventListener('resize', this.handleResize);
  },
  methods: {
    // 解析 CSV 資料
    parseCSVData() {
      const rows = csvData.split('\n');
      const keys = rows[0].split(','); // CSV標題(作為資料的key)
      // 總資料
      this.total_data = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj = {};
        keys.forEach((key, i) => obj[key] = values[i]);
        return obj
      });
      this.total_data.splice(this.total_data.length-1, 1)
      // console.log("Total Data: ", this.total_data)
    },
    // ============================================== 曲線圖資料操作 ==============================================
    // 生成初始圖表數據列表
    generateChartList() {
      // ============================= 測試資料 =============================
      // 定義包含20個系列的數據結構
      this.chartSeriesData = Array.from({ length: 20 }, (_, i) => ({
        id: `series${i + 1}`,
        name: `系列 ${i + 1}`,
        visible: i < 10 ? true : false, // 初始時只顯示前10筆資料
        values: [],    // 數據點數組，初始為空
      }));

      const now = new Date(); // 當前時間
      // 初始數據
      this.chartSeriesData.forEach(series => {
        series.values = [];
        for (let i = 0; i < this.maxDataPoints; i++) {
          series.values.push({
            time: new Date(now.getTime() - (this.maxDataPoints - 1 - i) * 1000), // 從過去到現在的時間點
            value: Math.floor(Math.random() * 1000), // 0到999之間的隨機整數值
          });
        }
      });

      // ============================= CSV資料 =============================
      // const data = [];
      // for (let i=0; i < this.dataCount; i++) {
      //   var rawData = this.total_data[i]
      //   const timestamp = new Date(rawData["Time"]);

      //   Object.entries(rawData).forEach(([key, value]) => {
      //     if (key === "Time") return; // 跳過時間欄
      //     if (i == 0) {
      //       data.push({
      //         id: key,
      //         name: key, // 如果你有對應名稱可替換，否則先用 key
      //         visible: true,
      //         values: [{ time: timestamp,value: value }]
      //       });
      //     }else {
      //       var findIndex = data.findIndex((d)=> d.id == key)
      //       data[findIndex]['values'].push({ time: timestamp, value: value })
      //     }
      //   });
      // }
      // this.chartSeriesData = data
      // console.log("Init Data: ", this.chartSeriesData)
    },
    // 更新圖表數據列表 (添加新數據點，移除舊數據點)
    updateChartList() {
      // ============================= 測試資料 =============================
      const now = new Date(); // 當前時間
      this.chartSeriesData.forEach(series => {
        const newPoint = { time: now, value: Math.floor(Math.random() * 1000) }; // 生成隨機值
        series.values.push(newPoint); // 添加新數據點到末尾
        // 如果數據點數量超過最大限制，則移除最早的數據點
        if (series.values.length > this.maxDataPoints) series.values.shift();
      });

      // ============================= CSV資料 =============================
      // this.dataCount++
      // var rawData = this.total_data[this.dataCount]
      // const timestamp = new Date(rawData["Time"]);
      // Object.entries(rawData).forEach(([key, value]) => {
      //   if (key === "Time") return; // 跳過時間欄
      //   var findIndex = this.chartSeriesData.findIndex((d)=> d.id == key)
      //   this.chartSeriesData[findIndex]['values'].push({ time: timestamp, value: value })
      //   this.chartSeriesData[findIndex]['values'].shift()
      // });

    },
    // 設置圖表線條的顏色
    setLinechartColor() {
      // 使用 D3 的分類顏色方案 (schemeCategory10 提供10種不同顏色)
      this.colorScale = d3.scaleOrdinal(d3.schemeCategory10);
      // 遍歷 chartSeriesData，為每個系列分配顏色
      this.chartSeriesData.forEach((series) => { // index 未使用，可以移除
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
        this.resizeObserver = new ResizeObserver(() => { // entries 未使用，可以移除
          this.handleResize();
        });
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
        if (this.innerWidth > 0 && this.innerHeight > 0) {
          // 更新 zoom behavior 的範圍
          if (this.zoomBehavior) {
            this.zoomBehavior
              .extent([[0, 0], [this.innerWidth, this.innerHeight]])
              .translateExtent([[0, 0], [this.innerWidth, this.innerHeight]]);
          }
          // 更新原始比例尺的 range
          if (this.originalXScale) this.originalXScale.range([0, this.innerWidth]);
          if (this.originalYScale) this.originalYScale.range([this.innerHeight, 0]);
          d3.select(this.$refs.chartContainerWrapper).select('svg').remove();
          this.svg = null;
          this.createChart(); // createChart 會使用新的 innerWidth/Height
        } else {
          d3.select(this.$refs.chartContainerWrapper).select('svg').remove();
          this.svg = null;
        }
        this.handleMouseLeave();
      }
    },

    // ============================================== 按鈕操作 ==============================================
    // 開始更新資料
    startDataUpdates() {
      this.stopUpdateChart();
      this.updateInterval = setInterval(() => {
        this.updateChartList(); // 更新資料
        // 只有在 SVG 和繪圖區域有效時才更新圖表顯示
        if (this.svg && this.innerWidth > 0 && this.innerHeight > 0) this.updateChart();
      }, 1000);
    },
    // 暫停更新資料
    stopUpdateChart() {
      clearInterval(this.updateInterval)
      this.updateInterval = null;
    },
    // 切換系列的顯示/隱藏狀態
    toggleSeriesVisibility(seriesId) {
      const series = this.chartSeriesData.find(s => s.id === seriesId); // 找到對應的系列
      if (series) {
        series.visible = !series.visible; // 翻轉其可見狀態
        // 如果 SVG 和繪圖區域有效，則更新圖表以反映變化
        if (this.svg && this.innerWidth > 0 && this.innerHeight > 0) {
          this.updateChart();
        }
        // 如果 tooltip 當前可見，需要更新其內容和懸停點
        if (this.tooltip.visible) {
          // 過濾掉已隱藏系列的 tooltip 數據
          const newTooltipData = this.tooltip.data.filter(td => {
            const ts = this.chartSeriesData.find(s => s.name === td.seriesName);
            return ts && ts.visible;
          });
          if (newTooltipData.length === 0) {
            this.handleMouseLeave(); // 如果沒有可顯示的 tooltip 數據，則隱藏
          } else {
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
                .join( // .join 是 D3 v6+ 的 enter/update/exit 簡寫
                  enter => enter.append('circle').attr('class', 'hover-point-circle').attr('r', 5).style('stroke', 'white').style('stroke-width', '1.5px').attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1),
                  update => update.attr('cx', d => d.cx).attr('cy', d => d.cy).style('fill', d => d.color).style('opacity', 1),
                  exit => exit.remove()
                );
            }
          }
        } else if (!this.visibleSeriesData.some(s => s.values.length > 0)) {
          // 如果所有系列都隱藏了，則隱藏 tooltip 和懸停點
          this.handleMouseLeave();
        }
      }
    },
  
    // ============================================== 繪製曲線圖 ==============================================
    // 創建 D3 圖表 (初始化 SVG, scales, axes, etc.)
    createChart() {
      if (this.currentWidth <= 0 || this.currentHeight <= 0 || !this.$refs.chartContainerWrapper || this.innerWidth <= 0 || this.innerHeight <= 0) {
        return;
      }
      d3.select(this.$refs.chartContainerWrapper).select('svg').remove();
      const { margin } = this.dimensions;

      this.svg = d3.select(this.$refs.chartContainerWrapper)
        .append('svg')
        .attr('width', this.currentWidth)
        .attr('height', this.currentHeight)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // ------------------- ZOOM SETUP START -------------------
      // 創建原始比例尺 (在應用縮放變換之前)
      // 這些原始比例尺的 domain 將基於完整的初始數據集
      this.originalXScale = d3.scaleTime().range([0, this.innerWidth]);
      this.originalYScale = d3.scaleLinear().range([this.innerHeight, 0]);

      // 初始化當前使用的 xScale 和 yScale 為原始比例尺的副本
      // 在 updateChart 中會根據數據更新 originalXScale/originalYScale 的 domain,
      // 然後 xScale/yScale 會通過 zoom transform 或直接賦值來更新
      this.xScale = this.originalXScale.copy();
      this.yScale = this.originalYScale.copy();
      // ------------------- ZOOM SETUP END ---------------------
      this.lineGenerator = d3.line()
        .x(d => this.xScale(d.time))
        .y(d => this.yScale(d.value))
        .curve(d3.curveMonotoneX);

      // Y 軸格線
      this.yAxisGridGroup = this.svg.append('g').attr('class', 'grid y-grid');
      // X 軸格線
      this.xAxisGridGroup = this.svg.append('g').attr('class', 'grid x-grid').attr('transform', `translate(0,${this.innerHeight})`);

      // X 軸和 Y 軸
      this.xAxisGroup = this.svg.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this.innerHeight})`);
      this.yAxisGroup = this.svg.append('g').attr('class', 'y-axis');

      // 數據線條組
      this.svg.append('g').attr('class', 'lines-group');
      this.hoverElementsGroup = this.svg.append('g').attr('class', 'hover-elements-group');

      // 創建 zoom behavior
      this.zoomBehavior = d3.zoom().scaleExtent([1, 10]) // 縮放範圍，1~10倍
        .extent([[0, 0], [this.innerWidth, this.innerHeight]]) // 可縮放/平移的視口範圍
        .translateExtent([[0, 0], [this.innerWidth, this.innerHeight]]) // 平移限制，防止移出視圖 (可選)
        .on("zoom", this.zoomed); // "zoom" 事件觸發 zoomed 方法

      // 鼠標覆蓋層 - 將 zoom behavior 應用到這個元素上
      this.svg.append('rect')
        .attr('class', 'overlay zoom-rect') // 添加一個 class 方便識別
        .attr('width', this.innerWidth)
        .attr('height', this.innerHeight)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('mousemove', this.handleMouseMove)
        .on('mouseleave', this.handleMouseLeave)
        .call(this.zoomBehavior); // 應用 zoom

      this.updateChart(); // 初次繪製
    },

    // 更新圖表內容 (線條, 坐標軸)
    updateChart() {
      if (!this.svg || this.innerWidth <= 0 || this.innerHeight <= 0) return;

      const visibleSeries = this.visibleSeriesData;
      // 更新 originalXScale 和 originalYScale 的 domain 以反映當前完整數據
      if (!visibleSeries.some(s => s.values.length > 0)) {
        // 無數據時的處理
        this.originalXScale.domain([new Date(), new Date(Date.now() + 1000)]);
        this.originalYScale.domain([0, 100]);
      } else {
        const allVisibleValues = visibleSeries.reduce((acc, series) => acc.concat(series.values), []);
        this.originalXScale.domain(d3.extent(allVisibleValues, d => d.time));

        const yExtent = d3.extent(allVisibleValues, d => d.value);
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
      }

      // 應用當前的 zoom transform (如果有的話) 到 original scales
      // 或者如果沒有 transform，就直接使用 original scales
      const currentTransform = d3.zoomTransform(this.svg.select('.zoom-rect').node());
      if (currentTransform && currentTransform.k !== 1 || currentTransform.x !== 0 || currentTransform.y !== 0) {
        this.xScale = currentTransform.rescaleX(this.originalXScale);
        this.yScale = currentTransform.rescaleY(this.originalYScale);
      } else {
        this.xScale = this.originalXScale.copy();
        this.yScale = this.originalYScale.copy();
      }

      // 更新坐標軸和格線 (使用 this.xScale 和 this.yScale)
      const numXTicks = Math.max(2, Math.floor(this.innerWidth / 100));
      const numYTicks = Math.max(2, Math.floor(this.innerHeight / 50));

      this.xAxisGroup.attr('transform', `translate(0,${this.innerHeight})`)
        .call(d3.axisBottom(this.xScale).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
      this.yAxisGroup
        .call(d3.axisLeft(this.yScale).ticks(numYTicks));

      if (this.xAxisGridGroup) {
        this.xAxisGridGroup.attr('transform', `translate(0,${this.innerHeight})`)
          .call(d3.axisBottom(this.xScale)
            .ticks(numXTicks)
            .tickSize(-this.innerHeight)
            .tickFormat("")
          );
      }
      if (this.yAxisGridGroup) {
        this.yAxisGridGroup
          .call(d3.axisLeft(this.yScale)
            .ticks(numYTicks)
            .tickSize(-this.innerWidth)
            .tickFormat("")
          );
      }

      // 更新線條 (使用 this.xScale 和 this.yScale)
      this.lineGenerator.x(d => this.xScale(d.time)).y(d => this.yScale(d.value));
      const lines = this.svg.select('.lines-group')
        .selectAll('.line-series')
        .data(visibleSeries, d => d.id);
      lines.exit().remove();
      lines.enter()
        .append('path')
        .attr('class', 'line-series')
        .attr('fill', 'none')
        .attr('stroke-width', '2px')
        .merge(lines)
        .style('stroke', d => d.color)
        .attr('d', d => this.lineGenerator(d.values));

      // 如果是無數據情況，需要單獨處理軸和格線的顯示，如之前代碼所示
      if (!visibleSeries.some(s => s.values.length > 0)) {
        this.svg.select('.lines-group').selectAll('.line-series').remove();
        if (this.hoverElementsGroup) this.hoverElementsGroup.selectAll('.hover-point-circle').remove();

        // 使用原始比例尺的空域來繪製軸和格線
        const emptyX = this.originalXScale.copy().domain([new Date(), new Date(Date.now() + 1000)]);
        const emptyY = this.originalYScale.copy().domain([0, 100]);

        this.xAxisGroup.attr('transform', `translate(0,${this.innerHeight})`)
          .call(d3.axisBottom(emptyX).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
        this.yAxisGroup.call(d3.axisLeft(emptyY).ticks(numYTicks));

        if (this.xAxisGridGroup) {
          this.xAxisGridGroup.attr('transform', `translate(0,${this.innerHeight})`)
            .call(d3.axisBottom(emptyX).ticks(numXTicks).tickSize(-this.innerHeight).tickFormat(""));
        }
        if (this.yAxisGridGroup) {
          this.yAxisGridGroup
            .call(d3.axisLeft(emptyY).ticks(numYTicks).tickSize(-this.innerWidth).tickFormat(""));
        }
        this.handleMouseLeave();
      }
    },
    // Zoom縮放
    zoomed(event) {
      // event.transform 包含了當前的縮放 (k) 和平移 (x, y) 信息
      const transform = event.transform;

      // 使用 transform 來重新計算 xScale 和 yScale 的 domain
      // rescaleX/Y 會返回一個新的比例尺，其 domain 已經根據 transform 調整
      this.xScale = transform.rescaleX(this.originalXScale);
      this.yScale = transform.rescaleY(this.originalYScale);

      // 更新線條 (因為 xScale/yScale 變了，lineGenerator 會使用新的比例尺)
      this.svg.select('.lines-group').selectAll('.line-series')
        .attr('d', d => this.lineGenerator(d.values));

      // 更新 X 軸和 Y 軸
      const numXTicks = Math.max(2, Math.floor(this.innerWidth / 100));
      const numYTicks = Math.max(2, Math.floor(this.innerHeight / 50));
      this.xAxisGroup.call(d3.axisBottom(this.xScale).ticks(numXTicks).tickFormat(d3.timeFormat("%Y-%m-%d %H:%M:%S")));
      this.yAxisGroup.call(d3.axisLeft(this.yScale).ticks(numYTicks));

      // 更新格線
      if (this.xAxisGridGroup) {
        this.xAxisGridGroup
          .call(d3.axisBottom(this.xScale)
            .ticks(numXTicks)
            .tickSize(-this.innerHeight)
            .tickFormat("")
          );
      }
      if (this.yAxisGridGroup) {
        this.yAxisGridGroup
          .call(d3.axisLeft(this.yScale)
            .ticks(numYTicks)
            .tickSize(-this.innerWidth)
            .tickFormat("")
          );
      }
      this.handleMouseLeave();
    },

    // 處理鼠標在圖表上移動的事件
    handleMouseMove(event) {
      const visibleSeries = this.visibleSeriesData;
      // 檢查是否有可見數據、比例尺和 SVG 是否已初始化，以及繪圖寬度是否有效
      if (!visibleSeries.some(s => s.values.length > 0) || !this.xScale || !this.svg || this.innerWidth <= 0) {
        this.handleMouseLeave(); // 如果條件不滿足，則隱藏 tooltip 和懸停點
        return;
      }
      let pointer;
      try {
        // 獲取鼠標相對於 SVG <g> 元素的坐標
        pointer = d3.pointer(event, this.svg.node());
      } catch (e) {
        // 如果獲取 pointer 失敗 (例如 SVG 還未完全渲染好)，則離開
        this.handleMouseLeave();
        return;
      }

      const pointerX = pointer[0]; // 鼠標的 X 坐標 (相對於繪圖區域)
      // 如果鼠標 X 坐標超出了繪圖區域的有效範圍，則隱藏 tooltip
      if (pointerX < 0 || pointerX > this.innerWidth) {
        this.handleMouseLeave();
        return;
      }

      // 將鼠標的 X 像素坐標轉換回對應的時間值
      const x0 = this.xScale.invert(pointerX);
      const hoverPointsData = []; // 存儲所有系列在 x0 時間點附近的數據
      const bisectDate = d3.bisector(d => d.time).left; // 創建一個二分查找函數，用於按時間查找

      // 遍歷所有可見系列
      visibleSeries.forEach(series => {
        if (!series.values.length) return; // 如果系列沒有數據點，則跳過
        // 找到在 x0 時間點左右的數據點索引
        const index = bisectDate(series.values, x0, 1);
        const d0 = series.values[index - 1]; // x0 左側的點
        const d1 = series.values[index];     // x0 右側的點
        let closestDataPoint; // 最接近 x0 的數據點
        // 判斷哪個點更接近 x0
        if (d0 && d1) closestDataPoint = (x0 - d0.time > d1.time - x0) ? d1 : d0;
        else if (d0) closestDataPoint = d0;
        else if (d1) closestDataPoint = d1;
        else return; // 如果沒有找到點，則跳過

        if (closestDataPoint) {
          // 將找到的點的相關信息添加到 hoverPointsData
          hoverPointsData.push({
            seriesId: series.id,
            seriesName: series.name,
            time: closestDataPoint.time, // 原始 Date 對象
            value: closestDataPoint.value,
            color: series.color,
            cx: this.xScale(closestDataPoint.time), // 計算屏幕 X 坐標
            cy: this.yScale(closestDataPoint.value), // 計算屏幕 Y 坐標
          });
        }
      });

      // 使用 D3 data join 更新懸停圓點
      const circles = this.hoverElementsGroup.selectAll('.hover-point-circle')
        .data(hoverPointsData, d => d.seriesId); // 以 seriesId 為 key

      circles.exit().remove(); // 移除不再需要的圓點

      circles.enter().append('circle') // 為新的懸停點數據創建圓形
        .attr('class', 'hover-point-circle')
        .attr('r', 5) // 半徑
        .style('stroke', 'white') // 邊框白色
        .style('stroke-width', '1.5px') // 邊框寬度
        .merge(circles) // 合併 enter 和 update
        .attr('cx', d => d.cx) // 更新 X 位置
        .attr('cy', d => d.cy) // 更新 Y 位置
        .style('fill', d => d.color) // 填充顏色與系列一致
        .style('opacity', 1); // 設置為可見

      // 如果有懸停點數據，則更新並顯示 tooltip
      if (hoverPointsData.length > 0) {
        // Tooltip 定位相對於 .chart-wrapper-inside-card
        const positioningParent = this.$refs.chartContainerWrapper.parentElement;
        const parentRect = positioningParent.getBoundingClientRect(); // 獲取定位父元素的邊界
        let mouseXRelToParent = event.clientX - parentRect.left; // 鼠標相對於定位父元素的 X
        let mouseYRelToParent = event.clientY - parentRect.top; // 鼠標相對於定位父元素的 Y

        let tipX = mouseXRelToParent + 15; // Tooltip 初始 X (鼠標右側)
        let tipY = mouseYRelToParent - 30; // Tooltip 初始 Y (鼠標上方)

        // 估算 tooltip 的寬高以進行邊界檢測
        const tooltipItemHeight = 22;
        const tooltipPadding = 20;
        const tooltipEstimatedWidth = 220;
        const tooltipEstimatedHeight = (hoverPointsData.length * tooltipItemHeight) + tooltipPadding;

        // 邊界檢測和調整 Tooltip 位置
        if (tipX + tooltipEstimatedWidth > parentRect.width) tipX = mouseXRelToParent - tooltipEstimatedWidth - 15; // 超出右邊界
        if (tipX < 0) tipX = 5; // 超出左邊界
        if (tipY < 0) tipY = mouseYRelToParent + 15; // 超出上邊界，移到鼠標下方
        if (tipY + tooltipEstimatedHeight > parentRect.height) tipY = parentRect.height - tooltipEstimatedHeight - 5; // 超出下邊界
        if (tipY < 0) tipY = 5; // 再次檢查，防止推到頂部外面

        this.tooltip.x = tipX;
        this.tooltip.y = tipY;
        this.tooltip.data = hoverPointsData.map(d => ({ // 格式化 tooltip 數據
          seriesName: d.seriesName,
          time: d3.timeFormat("%Y-%m-%d %H:%M:%S")(d.time), // 將時間格式化
          value: d.value,
          color: d.color,
        }));
        this.tooltip.visible = true; // 顯示 tooltip
      } else {
        this.handleMouseLeave(); // 如果沒有懸停數據，則隱藏
      }
    },
    // 處理鼠標離開圖表區域的事件
    handleMouseLeave() {
      this.tooltip.visible = false; // 隱藏 tooltip
      this.tooltip.data = []; // 清空 tooltip 數據
      if (this.hoverElementsGroup) {
        // 移除所有懸停圓點
        this.hoverElementsGroup.selectAll('.hover-point-circle').remove();
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
  font-size: 10px;
  fill: #333;
}
</style>