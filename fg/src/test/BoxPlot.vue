<template>
  <v-main>
    <div ref="chartContainer" class="chart-container">
      <h2>使用 Vue 3 (Options API) 與 D3.js 繪製的箱形圖</h2>
      <!-- SVG 元素本身不設定寬高，由 CSS 控制 -->
      <svg ref="svgContainer"></svg>
      <div
        v-if="tooltip.visible"
        class="tooltip"
        :style="{ top: tooltip.top, left: tooltip.left }"
      >
        {{ tooltip.content }}
      </div>
    </div>
  </v-main>
</template>

<script>
import * as d3 from 'd3';

export default {
  name: 'BoxPlot',

  data() {
    return {
      rawData: {
        "Australia":   [70, 72, 73, 73, 74, 75, 75, 76, 78, 79, 80, 81, 83, 84, 86, 91],
        "Oceania":     [40, 42, 45, 47, 48, 49, 50, 51, 52, 53, 55, 56, 60, 71, 74, 81],
        "East Europe": [51, 57, 58, 60, 61, 63, 64, 65, 66, 68, 70, 70, 72, 75, 76, 79],
        "West Europe": [27, 32, 38, 55, 58, 59, 60, 62, 63, 64, 65, 68, 70, 71, 75, 79],
        "North Africa":[98, 99, 105, 106, 108, 109, 110, 111, 112, 115, 116, 117, 118, 128, 131]
      },
      tooltip: {
        visible: false,
        content: '',
        top: '0px',
        left: '0px',
      },
    };
  },

  mounted() {
    // RWD 簡化後，我們只需要在掛載時繪製一次圖表
    this.drawChart();
  },

  methods: {
    drawChart() {
      const vm = this;

      // --- 定義圖表的邏輯尺寸 (內部座標系) ---
      const logicalWidth = 1200;
      const logicalHeight = 600;
      const margin = { top: 30, right: 30, bottom: 50, left: 50 };
      const width = logicalWidth - margin.left - margin.right;
      const height = logicalHeight - margin.top - margin.bottom;

      // --- 設定 SVG 的 viewBox ---
      const svg = d3.select(this.$refs.svgContainer)
        // 關鍵！設定 viewBox，讓 SVG 可縮放
        .attr("viewBox", `0 0 ${logicalWidth} ${logicalHeight}`)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);
      
      const summaryData = [];
      const allDataPoints = [];
      const categories = Object.keys(this.rawData);

      for (const category of categories) {
        const values = this.rawData[category].sort(d3.ascending);
        const q1 = d3.quantile(values, 0.25);
        const median = d3.quantile(values, 0.5);
        const q3 = d3.quantile(values, 0.75);
        const min = values[0];
        const max = values[values.length - 1];
        
        summaryData.push({ key: category, value: { q1, median, q3, min, max } });
        values.forEach(d => { allDataPoints.push({ category: category, value: d }); });
      }

      const x = d3.scaleBand().domain(categories).range([0, width]).paddingInner(1).paddingOuter(0.5);
      const y = d3.scaleLinear().domain([20, 140]).range([height, 0]);

      svg.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-width).tickFormat(""));
      svg.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x)).select(".domain").remove();
      svg.append("g").call(d3.axisLeft(y));

      const boxWidth = 80;
      svg.selectAll(".whisker-line").data(summaryData).enter().append("line").attr("x1", d => x(d.key)).attr("x2", d => x(d.key)).attr("y1", d => y(d.value.min)).attr("y2", d => y(d.value.max)).attr("stroke", "#333").style("stroke-width", 1);
      svg.selectAll(".box").data(summaryData).enter().append("rect").attr("x", d => x(d.key) - boxWidth / 2).attr("y", d => y(d.value.q3)).attr("height", d => y(d.value.q1) - y(d.value.q3)).attr("width", boxWidth).attr("stroke", "#333").style("fill", "#a6cee3").style("fill-opacity", 0.8);
      svg.selectAll(".median-line").data(summaryData).enter().append("line").attr("x1", d => x(d.key) - boxWidth / 2).attr("x2", d => x(d.key) + boxWidth / 2).attr("y1", d => y(d.value.median)).attr("y2", d => y(d.value.median)).attr("stroke", "#333").style("stroke-width", 2);
      svg.selectAll(".cap-line").data(summaryData).enter().append("g").each(function(d) {
        const g = d3.select(this);
        g.append("line").attr("x1", x(d.key) - boxWidth / 4).attr("x2", x(d.key) + boxWidth / 4).attr("y1", y(d.value.min)).attr("y2", y(d.value.min)).attr("stroke", "#333");
        g.append("line").attr("x1", x(d.key) - boxWidth / 4).attr("x2", x(d.key) + boxWidth / 4).attr("y1", y(d.value.max)).attr("y2", y(d.value.max)).attr("stroke", "#333");
      });

      const jitterWidth = 70;
      svg.selectAll(".ind-point").data(allDataPoints).enter().append("circle").attr("cx", d => x(d.category) - jitterWidth / 2 + Math.random() * jitterWidth).attr("cy", d => y(d.value)).attr("r", 5).style("fill", "#1f78b4").style("cursor", "pointer").style("fill-opacity", 0.9)
        .on("mouseover", function(event, d) {
          d3.select(this).transition().duration(150).attr("r", 9).style("stroke", "black").style("stroke-width", "2px");
          vm.tooltip.visible = true;
          vm.tooltip.content = `${d.category}: ${d.value}`;
        })
        .on("mousemove", function(event) {
          // --- 修正 Tooltip 定位 ---
          // 獲取父容器的位置
          const containerRect = vm.$refs.chartContainer.getBoundingClientRect();
          // 計算滑鼠相對於容器的座標
          const xPos = event.clientX - containerRect.left;
          const yPos = event.clientY - containerRect.top;
          
          // 更新 Vue data，偏移量改小一點
          vm.tooltip.left = `${xPos + 10}px`;
          vm.tooltip.top = `${yPos + 10}px`;
        })
        .on("mouseout", function() {
          d3.select(this).transition().duration(150).attr("r", 5).style("stroke", "none");
          vm.tooltip.visible = false;
        });
    }
  }
}
</script>

<style>
.chart-container {
  position: relative;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  max-width: 1200px; /* 控制圖表最大寬度 */
  margin: 0 auto; /* 置中 */
  width: 100%; /* 確保容器寬度是響應式的 */
}

/* 關鍵！讓 SVG 響應式地填滿容器並保持長寬比 */
.chart-container svg {
    width: 100%;
    height: auto;
    display: block; /* 避免 SVG 底部出現不明間距 */
}

.grid line {
  stroke: lightgrey;
  stroke-opacity: 0.7;
  shape-rendering: crispEdges;
}
.grid path { stroke-width: 0; }
.axis path, .axis line { stroke: #333; }
.axis text { font-size: 13px; }

.tooltip {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 14px;
  pointer-events: none;
  white-space: nowrap;
  transition: opacity 0.2s;
  z-index: 10;
}
</style>