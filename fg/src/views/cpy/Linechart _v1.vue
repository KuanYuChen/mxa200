<template>
  <div style="width: 100%; height: 100%; position: relative;">
    <svg :class="'linechart-svg-' + item.id" :width="item.width - 4" :height="item.height - 4" :style="{ 'background-color': item['bgColor'] }"></svg>
    <div v-if="tooltip.visible" ref="tooltip" :style="tooltip.style" class="tooltip_style">
      <h3 style="margin: 10px;">X軸位置: {{ tooltip.xIndex }}</h3>
      <div v-for="(dataPoint, i) in tooltip.values" :key="i" style="display: flex; align-items: center; gap: 6px;">
        <h3
          :style="{ backgroundColor: chartColor(i), width: '10px', height: '10px', display: 'inline-block', 'margin': '10px' }">
        </h3>
        <h3>{{ dataPoint.title }}: {{ dataPoint.value }}</h3>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from "d3";

export default {
  props: ["componentChange", "item", "onResizedown", "blurEditText"],
  data() {
    return {
      chart_data: [],
      maxPoints: 50,
      svg: null,
      xScale: null,
      yScale: null,
      newXScale: null,
      newYScale: null,
      chartGroup: null,
      line: null,
      zoomEvent: null,
      xAxis: null,
      yAxis: null,
      tooltip: {
        visible: false,
        xIndex: 0,
        values: [],
        style: { left: "0px", top: "0px" }
      },
      linechartInterval: null
    };
  },
  watch: {
    'item.edit'(isEdit) {
      if (!isEdit) this.initChart();
    },
    // 更新曲線圖X、Y軸顏色
    'item.linechartXColor'() { this.setAxisColor(); },
    'item.linechartYColor'() { this.setAxisColor(); },
  },
  mounted() {
    this.initChart();
  },
  beforeUnmount() {
    clearInterval(this.linechartInterval);
  },
  methods: {
    initChart() {
      const width = this.item.width;
      const height = this.item.height;
      if (this.svg) this.svg.selectAll("*").remove();
      this.newXScale = null;
      this.newYScale = null;

      setTimeout(() => {
        this.svg = d3.select(`.linechart-svg-${this.item.id}`);
        this.xScale = d3.scaleLinear().domain([0, this.maxPoints - 1]).range([50, width - 20]);
        this.yScale = d3.scaleLinear().domain([0, 100]).range([height - 20, 20]);
        this.line = d3.line().x((d, i) => this.xScale(i)).y(d => this.yScale(d));

        this.zoomEvent = d3.zoom()
          .scaleExtent([1, 5])
          .translateExtent([[0, 0], [width, height]])
          .on("zoom", this.handleZoom.bind(this))
          .filter(event => event.type !== "dblclick" && event.type !== "mousedown");

        this.svg.call(this.zoomEvent);

        this.svg.append("defs")
          .append("clipPath")
          .attr("id", `clip-${this.item.id}`)
          .append("rect")
          .attr("width", width - 50)
          .attr("height", height - 40)
          .attr("x", 50)
          .attr("y", 20);

        this.chartGroup = this.svg.append("g")
          .attr("class", "chart-content")
          .attr("clip-path", `url(#clip-${this.item.id})`);

        this.svg.append("rect")
          .attr("class", "mouse-tracker")
          .attr("width", width)
          .attr("height", height)
          .attr("fill", "none")
          .attr("pointer-events", "all")
          .on("mousemove", this.handleMouseMove)
          .on("mouseout", () => this.tooltip.visible = false);

        this.xAxis = this.svg.append("g")
          .attr("class", "axisX")
          .attr("transform", `translate(0, ${height - 20})`).style("color", this.item.linechartXColor)
          .call(d3.axisBottom(this.xScale).ticks(5));

        this.yAxis = this.svg.append("g")
          .attr("class", "axisY")
          .attr("transform", "translate(50, 0)").style("color", this.item.linechartYColor)
          .call(d3.axisLeft(this.yScale).ticks(5));

        this.startUpdatingData();
      }, 10);
    },
    // 縮放方法
    handleZoom(event) {
      const transform = event.transform;
      this.newXScale = transform.rescaleX(this.xScale);
      this.newYScale = transform.rescaleY(this.yScale);
      this.xAxis.call(d3.axisBottom(this.newXScale).ticks(5));
      this.yAxis.call(d3.axisLeft(this.newYScale).ticks(5));
      this.chartGroup.selectAll(".line").attr("d", d => d3.line().x((_, i) => this.newXScale(i)).y(val => this.newYScale(val))(d.values));
      this.chartGroup.selectAll(".dot").attr("cx", d => this.newXScale(d.x)).attr("cy", d => this.newYScale(d.y));
    },
    // 滑鼠移動方法
    handleMouseMove(event) {
      const [mouseX] = d3.pointer(event);
      const xScaleToUse = this.newXScale || this.xScale;
      const xIndex = Math.round(xScaleToUse.invert(mouseX));

      if (xIndex < 0 || xIndex >= this.maxPoints) {
        this.tooltip.visible = false;
        return;
      }

      const valuesAtX = this.chart_data.map(lineData => ({
        title: lineData.title,
        value: lineData.values[xIndex] ?? null
      }));

      this.tooltip.visible = true;
      this.tooltip.xIndex = xIndex;
      this.tooltip.values = valuesAtX;

      // 使用 $nextTick 確保 tooltip 渲染後再計算位置
      this.$nextTick(() => {
        if (!this.$refs.tooltip) return;
        const chartWidth = this.item.width;
        const chartHeight = this.item.height;
        const tooltipWidth = this.$refs.tooltip.offsetWidth;
        const tooltipHeight = this.$refs.tooltip.offsetHeight;
        const offsetX = event.offsetX;
        const offsetY = event.offsetY;

        let left = offsetX + 15; // 默認在鼠標右邊
        let top = offsetY + 15;  // 默認在鼠標下邊

        // 檢查右邊界
        if (left + tooltipWidth > chartWidth) left = offsetX - tooltipWidth - 15; // 翻轉到鼠標左邊
        // 檢查下邊界
        if (top + tooltipHeight > chartHeight) top = offsetY - tooltipHeight - 15; // 翻轉到鼠標上邊
        // 確保不會超出左邊界和上邊界
        if (left < 0) left = 5;
        if (top < 0) top = 5;
        this.tooltip.style = { left: `${left}px`, top: `${top}px` };
      });
    },
    // 更新X、Y軸顏色
    setAxisColor() {
      d3.select(".axisX").style("color", this.item.linechartXColor);
      d3.select(".axisY").style("color", this.item.linechartYColor);
    },
    // 更新曲線圖
    updateChart() {
      const allValues = this.chart_data.flatMap(lineData => lineData.values);
      const yMin = d3.min(allValues);
      const yMax = d3.max(allValues);
      if (yMin !== undefined && yMax !== undefined) this.yScale.domain([yMin > 10 ? yMin - 10 : 0, yMax + 10]);
      const xScaleToUse = this.newXScale || this.xScale;
      const yScaleToUse = this.newYScale || this.yScale;
      this.yAxis.call(d3.axisLeft(yScaleToUse).ticks(5));
      
      this.chartGroup.selectAll(".line")
        .data(this.chart_data, d => d.title)
        .join("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", (d, i) => this.chartColor(i))
        .attr("stroke-width", 2)
        .attr("d", d => d3.line()
        .x((_, i) => xScaleToUse(i))
        .y(val => yScaleToUse(val))(d.values));
      const allDataPoints = this.chart_data.flatMap((lineData, lineIndex) => lineData.values.map((val, i) => ({ x: i, y: val, lineIndex })));
      this.chartGroup.selectAll(".dot")
        .data(allDataPoints)
        .join("circle")
        .attr("class", "dot")
        .attr("r", 3.5)
        .attr("fill", d => this.chartColor(d.lineIndex))
        .attr("cx", d => xScaleToUse(d.x))
        .attr("cy", d => yScaleToUse(d.y));
    },
    // 更新曲線圖資料
    startUpdatingData() {
      clearInterval(this.linechartInterval);
      this.linechartInterval = null;
      if (!this.svg) this.initChart();

      // const lineCount = 5;
      // this.chart_data = Array.from({ length: lineCount }, (_, i) => ({ 
      //   title: `標題${i + 1}`, 
      //   color: "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"),
      //   values: []
      // }));
      this.chart_data = this.item['content']
      console.log("@@@@@@@@@@@@@", this.chart_data)
      this.updateChart();
      if (this.componentChange) {
        setTimeout(() => {
          this.linechartInterval = setInterval(() => {
            this.chart_data.forEach(lineData => {
              lineData.values.push(Math.floor(Math.random() * 150));
              if (lineData.values.length > this.maxPoints) lineData.values.shift();
            });
            this.updateChart();
          }, 1000);
        }, 50);
      }
    },
    // 曲線顏色
    chartColor(index) {
      return this.chart_data[index]['color'];
    }
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
  font-size: 12px;
  pointer-events: none;
  transform: translate(-50%, 0);
  white-space: nowrap;
  z-index: 999;
  transition: left 0.1s ease-out, top 0.1s ease-out;
  pointer-events: none;
}
</style>