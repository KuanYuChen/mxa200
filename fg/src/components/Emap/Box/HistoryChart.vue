<template>
  <div style="width: 100%; height: 100%; position: relative;">
    <!-- SVG 容器 -->
    <svg :class="'linechart-svg-' + item.id" :width="item.width - 4" :height="item.height - 4" :style="{ 'background-color': item['bgColor'] }">
      
      <!-- Vue 負責的區域 1：頂部控制項 -->
      <foreignObject x="0" y="5" :width="item.width - 4" height="50">
        <div xmlns="http://www.w3.org/1999/xhtml" class="top-controls">
          <DatePickerInput
            v-model="sDate"
            label="開始時間"
            color="black"
            variant="outlined"
            density="compact"
            :max="eDate"
            :withTime="true"
            :withSeconds="true"
            style="width: 200px;"
          />
          <DatePickerInput
            v-model="eDate"
            label="結束時間"
            color="black"
            variant="outlined"
            density="compact"
            :min="sDate"
            :max="new Date()"
            :withTime="true"
            :withSeconds="true"
            style="width: 200px;"
          />
          <button @click="toggleDotLabels" class="toggle-button">
            {{ showDotLabels ? '隱藏數值' : '顯示數值' }}
          </button>
        </div>
      </foreignObject>

      <!-- D3 負責的區域：圖表將會被繪製在這個 <g> 元素内 -->
      <g class="d3-chart-container"></g>

      <!-- Vue 負責的區域 2：新增的圖例 (Legend) 按鈕 -->
      <foreignObject :x="margin.left" :y="item.height - margin.bottom - 20" :width="item.width - margin.left - margin.right" height="30">
        <div xmlns="http://www.w3.org/1999/xhtml" class="legend-container">
          <div v-for="series in chart_data" :key="series.id" 
            class="legend-item"
            :class="{ 'is-hidden': !series.visible }"
            @click="toggleLineVisibility(series)"
          >
            <span class="legend-color-box" :style="{ backgroundColor: series.color }"></span>
            <span class="legend-text">{{ series.title }}</span>
          </div>
        </div>
      </foreignObject>

    </svg>
    
    <!-- Tooltip 提示框 -->
    <div v-if="tooltip.visible" ref="tooltip" :style="tooltip.style" class="tooltip_style">
      <h3 style="margin: 10px; font-size: 20px;">時間: {{ tooltip.time }}</h3>
      <div v-for="(dataPoint, i) in tooltip.values" :key="i" style="display: flex; align-items: center; gap: 6px; font-size: 20px;">
        <h3 :style="{ backgroundColor: chartColor(i), width: '10px', height: '10px', display: 'inline-block', 'margin': '10px' }"></h3>
        <h3>{{ dataPoint.title }}: {{ dataPoint.value }}</h3>
      </div>
    </div>
  </div>
</template>

<script>
import DatePickerInput from '@/components/Module/DatePickerInput.vue' // 請確保路徑正確
import * as d3 from "d3";

export default {
  name: "InteractiveLineChart",
  props: ["componentChange", "item", "onResizedown", "blurEditText", "targetElement"],
  components: { DatePickerInput },
  data() {
    return {
      sDate: new Date(new Date().getTime() - 3600 * 1000),
      eDate: new Date(),
      chart_data: [],
      maxPoints: 250,
      svg: null,
      d3Container: null,
      xScale: null,
      yScale: null,
      newXScale: null,
      newYScale: null,
      chartGroup: null,
      mainGroup: null,
      zoomEvent: null,
      xAxis: null,
      yAxis: null,
      margin: { top: 100, right: 20, bottom: 70, left: 70 },
      tooltip: {
        visible: false,
        time: '',
        values: [],
        style: { left: "0px", top: "0px" }
      },
      linechartInterval: null,
      showDotLabels: true,
    };
  },
  watch: {
    'item.edit'(isEdit) { if (!isEdit) this.handleStyleChange(); },
    'item.width'() { this.handleStyleChange(); },
    'item.height'() { this.handleStyleChange(); },

    'item.content': {
      handler() { this.handleStyleChange(); },
      deep: true
    },
    sDate() { this.fetchDataForDateRange(); },
    eDate() { this.fetchDataForDateRange(); }
  },
  mounted() {
    // 使用 nextTick 確保 DOM 渲染完畢
    this.$nextTick(() => { this.initChart() });
  },
  beforeUnmount() {
    clearInterval(this.linechartInterval);
  },
  methods: {
    // =================================================================
    //  1. 流程控制與初始化
    // =================================================================
    handleStyleChange() {
      this.syncChartDataWithProps();
      this.updateChartLayoutAndStyles();
    },
    
    initChart() {
      var target = this.targetElement == undefined ? "" : this.targetElement
      this.svg = d3.select(`${target} .linechart-svg-${this.item.id}`);
      this.d3Container = this.svg.select(`${target} .d3-chart-container`);
      this.d3Container.selectAll("*").remove();

      this.mainGroup = this.d3Container.append("g");
      
      this.xScale = d3.scaleTime();
      this.yScale = d3.scaleLinear();

      this.zoomEvent = d3.zoom().scaleExtent([1, 5]).on("zoom", this.handleZoom.bind(this)).filter(event => event.type !== "dblclick" && event.type !== "mousedown");
      this.mainGroup.call(this.zoomEvent);
      
      this.mainGroup.append("defs").append("clipPath").attr("id", `clip-${this.item.id}`).append("rect");
      this.chartGroup = this.mainGroup.append("g").attr("class", "chart-content").attr("clip-path", `url(#clip-${this.item.id})`);
      this.mainGroup.append("rect").attr("class", "mouse-tracker").attr("fill", "none").attr("pointer-events", "all").on("mousemove", this.handleMouseMove).on("mouseout", () => this.tooltip.visible = false);
      this.xAxis = this.mainGroup.append("g").attr("class", "axisX");
      this.yAxis = this.mainGroup.append("g").attr("class", "axisY");
      
      this.startUpdatingData();
    },

    // =================================================================
    //  2. 佈局與樣式更新
    // =================================================================
    updateChartLayoutAndStyles() {
      if (!this.mainGroup) return;
      
      const svgWidth = this.item.width, svgHeight = this.item.height - 50;
      const innerWidth = Math.max(0, svgWidth - this.margin.left - this.margin.right);
      const innerHeight = Math.max(0, svgHeight - this.margin.top - this.margin.bottom);
      
      this.mainGroup.attr("transform", `translate(${this.margin.left}, ${this.margin.top})`);
      
      if (this.chart_data.length > 0 && this.chart_data[0].values.length > 0) {
        const firstPoint = this.chart_data[0].values[0];
        const lastPoint = this.chart_data[0].values[this.chart_data[0].values.length - 1];
        this.xScale.domain([firstPoint.time, lastPoint.time]).range([0, innerWidth]);
      } else {
        this.xScale.domain([this.sDate, this.eDate]).range([0, innerWidth]);
      }
      this.yScale.range([innerHeight, 0]);
      this.zoomEvent.translateExtent([[0, 0], [innerWidth, innerHeight]]);

      this.mainGroup.select("clipPath rect").attr("width", innerWidth).attr("height", innerHeight);
      this.mainGroup.select(".mouse-tracker").attr("width", innerWidth).attr("height", innerHeight);

      const xAxisGenerator = d3.axisBottom(this.xScale).ticks(5).tickFormat(d3.timeFormat("%H:%M:%S"));

      this.xAxis.style("font-size", "16px").attr("transform", `translate(0, ${innerHeight})`).call(xAxisGenerator);
      this.yAxis.style("font-size", "16px").call(d3.axisLeft(this.yScale).ticks(5));
      
      this.updateLabels();
      this.setAxisColor();
      this.updateChart();
    },

    // =================================================================
    //  3. 數據相關操作
    // =================================================================
    syncChartDataWithProps() {
      if (!this.item.content || !this.chart_data) return;
      this.chart_data.forEach(internalSeries => {
        const externalSeries = this.item.content.find(s => s.id === internalSeries.id);
        if (externalSeries) {
          internalSeries.color = externalSeries.color;
          internalSeries.title = externalSeries.title;
        }
      });
    },
    
    startUpdatingData() {
      clearInterval(this.linechartInterval);
      this.linechartInterval = null;
      
      let base_chart_data = (this.item.content || []).map((d, i) => ({
        id: d.id || `line-${i+1}`, 
        title: d.title || `標題${i + 1}`, 
        color: d.color || "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"), 
        values: [],
        visible: true // 核心：增加可見性狀態
      }));

      const timeRange = this.eDate.getTime() - this.sDate.getTime();
      const timeInterval = this.maxPoints > 1 ? timeRange / (this.maxPoints - 1) : 0;

      base_chart_data.forEach(series => {
        series.values = Array.from({ length: this.maxPoints }, (_, i) => ({
          time: new Date(this.sDate.getTime() + i * timeInterval),
          value: Math.floor(Math.random() * 90) + 10
        }));
      });
      
      this.chart_data = base_chart_data;
      this.updateChartLayoutAndStyles();
    },
    
    updateChart() {
      if(!this.chart_data || this.chart_data.length === 0 || !this.yScale) return;

      const visibleSeries = this.chart_data.filter(d => d.visible);
      const allValues = visibleSeries.flatMap(lineData => lineData.values.map(point => point.value));
      const yMin = d3.min(allValues), yMax = d3.max(allValues);
      this.yScale.domain(yMin !== undefined && yMax !== undefined ? [Math.min(yMin, 0), yMax + 10] : [0, 100]);
      
      const xScaleToUse = this.newXScale || this.xScale;
      const yScaleToUse = this.newYScale || this.yScale;
      
      this.yAxis.transition().duration(300).call(d3.axisLeft(yScaleToUse).ticks(5));
      
      const lineGroups = this.chartGroup.selectAll(".line-group").data(visibleSeries, d => d.id).join("g").attr("class", d => `line-group line-group-${this.sanitizeClassName(d.id)}`);
      
      const lineGenerator = d3.line().x(d => xScaleToUse(d.time)).y(d => yScaleToUse(d.value));
      lineGroups.selectAll(".line").data(d => [d]).join("path")
        .attr("class", d => `line line-${this.sanitizeClassName(d.id)}`)
        .attr("fill", "none").attr("stroke-width", 2).attr("stroke", d => d.color)
        .attr("d", d => lineGenerator(d.values));

      lineGroups.selectAll(".dot").data((d) => d.values.map(point => ({ ...point, color: d.color, id: d.id }))).join("circle")
        .attr("class", d => `dot dot-line-${this.sanitizeClassName(d.id)}`).attr("r", 3.5).attr("fill", d => d.color)
        .attr("cx", d => xScaleToUse(d.time)).attr("cy", d => yScaleToUse(d.value));

      lineGroups.selectAll(".dot-label").data(d => d.values).join("text")
        .attr("class", d => `dot-label dot-label-line-${this.sanitizeClassName(d.id)}`)
        .attr("text-anchor", "middle").attr("font-size", "15px").attr("fill", "#333")
        .style("opacity", this.showDotLabels ? 1 : 0)
        .text(d => d.value)
        .attr("x", d => xScaleToUse(d.time)).attr("y", d => yScaleToUse(d.value) - 10);
    },
    
    // =================================================================
    //  4. 樣式與標籤更新
    // =================================================================
    updateLabels() {
      if (!this.d3Container) return;
      const innerWidth = Math.max(0, this.item.width - this.margin.left - this.margin.right);
      const innerHeight = Math.max(0, this.item.height - this.margin.top - this.margin.bottom);
      
      this.d3Container.selectAll(".chart-title").data([this.item.charttitle.text || '曲線圖標題']).join("text")
        .attr("class", "chart-title").attr("x", this.item.width / 2).attr("y", this.margin.top / 2 + 40) // 調整標題位置
        .attr("text-anchor", "middle").style("font-size", `${this.item.charttitle.fontSize}px`).style("fill", this.item.charttitle.color).style("font-weight", "bold")
        .text(d => d);
        
      this.d3Container.selectAll(".x-axis-label").data([this.item.xaxistitle.text || '時間']).join("text")
        .attr("class", "x-axis-label").attr("x", this.margin.left + innerWidth / 2).attr("y", this.item.height - 30) // 調整X軸標籤位置
        .attr("text-anchor", "middle").style("font-size", `${this.item.xaxistitle.fontSize}px`).style("fill", this.item.xaxistitle.color)
        .text(d => d);

      this.d3Container.selectAll(".y-axis-label").data([this.item.yaxistitle.text || '數值']).join("text")
        .attr("class", "y-axis-label").attr("x", -(this.margin.top + innerHeight / 2)).attr("y", 30).attr("transform", "rotate(-90)") // 調整Y軸標籤位置
        .attr("text-anchor", "middle").style("font-size", `${this.item.yaxistitle.fontSize}px`).style("fill", this.item.yaxistitle.color)
        .text(d => d);
    },

    setAxisColor() {
      if (!this.mainGroup) return;
      this.mainGroup.select(".axisX").style("color", this.item.linechartXColor);
      this.mainGroup.select(".axisY").style("color", this.item.linechartYColor);
    },
    
    // =================================================================
    //  5. 交互與輔助方法
    // =================================================================
    toggleDotLabels() {
      this.showDotLabels = !this.showDotLabels;
      if (this.chartGroup) {
        this.chartGroup.selectAll(".dot-label").transition().duration(300).style("opacity", this.showDotLabels ? 1 : 0);
      }
    },
    
    toggleLineVisibility(series) {
      series.visible = !series.visible;
      this.updateChart(); // 狀態改變後，立即更新圖表
    },
    
    fetchDataForDateRange() {
      console.log(`正在獲取數據，時間範圍: ${this.sDate.toLocaleString()} 到 ${this.eDate.toLocaleString()}`);
      this.startUpdatingData();
    },
    
    handleZoom(event) {
      const { transform } = event;
      // 初始化Zoom位置
      if (event.transform.k == 1) {
        event.transform.x = 0;
        event.transform.y = 0;
      }
      this.newXScale = transform.rescaleX(this.xScale);
      this.newYScale = transform.rescaleY(this.yScale);
      this.xAxis.call(d3.axisBottom(this.newXScale).ticks(5).tickFormat(d3.timeFormat("%H:%M:%S")));
      this.yAxis.call(d3.axisLeft(this.newYScale).ticks(5));
      
      const lineGenerator = d3.line().x(d => this.newXScale(d.time)).y(d => this.newYScale(d.value));
      this.chartGroup.selectAll(".line").attr("d", d => lineGenerator(d.values));
      this.chartGroup.selectAll(".dot").attr("cx", d => this.newXScale(d.time)).attr("cy", d => this.newYScale(d.value));
      this.chartGroup.selectAll(".dot-label").attr("x", d => this.newXScale(d.time)).attr("y", d => this.newYScale(d.value) - 10);
    },
    
    handleMouseMove(event) {
      if (!this.mainGroup || !this.chart_data[0]?.values.length) return;
      const [mouseX] = d3.pointer(event, this.mainGroup.node());
      const xScaleToUse = this.newXScale || this.xScale;
      
      const invertedDate = xScaleToUse.invert(mouseX);
      const bisectDate = d3.bisector(d => d.time).left;
      const refValues = this.chart_data[0].values;
      const index = bisectDate(refValues, invertedDate, 1);
      const p0 = refValues[index - 1], p1 = refValues[index];
      if (!p0) return;
      const targetIndex = (p1 && (invertedDate - p0.time > p1.time - invertedDate)) ? index : index - 1;

      if (targetIndex < 0 || targetIndex >= refValues.length) {
        this.tooltip.visible = false;
        return;
      }

      this.tooltip.visible = true;
      const pointInTime = refValues[targetIndex];
      this.tooltip.time = pointInTime.time.toLocaleString('zh-TW', { hour12: false });
      this.tooltip.values = this.chart_data.map(lineData => ({
        title: lineData.title,
        value: lineData.values[targetIndex]?.value ?? 'N/A'
      }));

      this.$nextTick(() => {
        if (!this.$refs.tooltip) return;
        const { offsetWidth: tooltipWidth, offsetHeight: tooltipHeight } = this.tooltip;
        const { offsetX, offsetY } = event;
        let left = offsetX + 15;
        let top = offsetY + 15;
        if (left + tooltipWidth > this.item.width) left = offsetX - tooltipWidth - 15;
        if (top + tooltipHeight > this.item.height) top = offsetY - tooltipHeight - 15;
        this.tooltip.style = { left: `${Math.max(5, left)}px`, top: `${Math.max(5, top)}px` };
      });
    },

    sanitizeClassName(name) {
      if (!name) return '';
      return String(name).replace(/[\s\W]+/g, '-');
    },

    chartColor(index) {
      const visibleSeries = this.chart_data.filter(s => s.visible);
      return visibleSeries[index]?.color || '#cccccc';
    },
  }
};
</script>

<style lang="scss" scoped>
.tooltip_style {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 8px 10px;
  border-radius: 4px;
  font-size: 14px;
  pointer-events: none;
  white-space: nowrap;
  z-index: 999;
  transition: left 0.1s ease-out, top 0.1s ease-out;
}

::v-deep(.dot-label) {
  pointer-events: none;
  user-select: none;
}

.top-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  height: 100%;
  margin: 0 10px;
}

.toggle-button {
  padding: 4px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f0f0f0;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.toggle-button:hover {
  background-color: #e0e0e0;
}

/* 圖例樣式 */
.legend-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  height: 100%;
  font-family: sans-serif;
}

.legend-item {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 2px 5px;
  border-radius: 4px;
  transition: background-color 0.2s, opacity 0.3s;
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}


.legend-item.is-hidden {
  opacity: 0.5;
  text-decoration: line-through;
}

.legend-color-box {
  width: 12px;
  height: 12px;
  margin-right: 6px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.legend-text {
  font-size: 18px;
  user-select: none;
}
</style>