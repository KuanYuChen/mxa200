<template>
  <v-main>
    <div class="radar-card">
      <div class="chart-title">{{ title }}</div>
      <div class="chart-body">
        <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`">
          <g :transform="`translate(${center}, ${center})`">
            <!-- 1. 靜態元素：網格和軸線 -->
            <g class="grid-lines">
              <circle v-for="(level, index) in gridLevels" :key="'grid-level-' + index" :r="level" class="grid-circle"></circle>
            </g>
            <g class="axis-lines">
              <line v-for="(line, index) in axisLines" :key="'axis-line-' + index" x1="0" y1="0" :x2="line.x" :y2="line.y" class="axis-line"></line>
            </g>

            <!-- 2. 可見的圖形元素 -->
            <g v-for="(item, index) in displayData" :key="'segment-' + index" class="segment-group"
              :style="{ transform: segmentTransforms[index] }">
              <!-- 彩色扇形 -->
              <path :d="segmentPaths[index].d" :fill="item.color" class="segment-path"></path>
              <!-- 數據標籤 -->
              <g class="data-label">
                <circle :cx="labelPoints[index].x" :cy="labelPoints[index].y" :r="labelRadius" :style="{ fill: item.color }" class="label-bg-circle"></circle>
                <text :x="labelPoints[index].x" :y="labelPoints[index].y" class="label-text">{{ Math.round(item.value)}}</text>
              </g>
            </g>

            <!-- 3. 透明的交互區域 -->
            <g class="hit-areas">
              <path v-for="(path, index) in hitAreaPaths" :key="'hit-area-' + index" :d="path.d" class="hit-area-path" @mouseover="handleMouseOver($event, index)" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
              </path>
            </g>
          </g>
        </svg>
      </div>
      <div class="chart-footer">平均 {{ averageValue }}</div>

      <!-- 4. 工具提示框 -->
      <div v-if="tooltip.visible" class="tooltip" :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }">
        {{ tooltip.content }}
      </div>
    </div>
  </v-main>
</template>

<script>
export default {
  props: { 
    size: { type: Number, default: 350 },
    maxValue: { type: Number, default: 100 }
  },
  data() {
    return {
      title: '1141A05',
      chartData: [
        { label: '表現力', value: 92, color: '#b0e0e6' },
        { label: '領導力', value: 45, color: '#3b5998' },
        { label: '創新性', value: 94, color: '#98fb98' },
        { label: '執行力', value: 44, color: '#6b8e23' },
        { label: '合作性', value: 45, color: '#ffb6c1' },
        { label: '溝通力', value: 46, color: '#c71585' },
        { label: '技術力', value: 75, color: '#f5deb3' },
        { label: '學習力', value: 92, color: '#ffa500' },
        { label: '抗壓力', value: 50, color: '#e6e6fa' },
        { label: '決策力', value: 80, color: '#9400d3' }
      ],
      labelRadius: 16,
      displayData: [],
      hoveredIndex: null,
      tooltip: { visible: false, content: '', x: 0, y: 0 },
    };
  },
  created() { 
    this.displayData = this.chartData.map(item => ({ ...item, value: 0 })); 
  },
  mounted() {
    this.animateChart(); 
  },
  computed: {
    center() { return this.size / 2; },
    chartRadius() { return this.size / 2 * 0.7; },
    gridLevels() { return Array.from({ length: 4 }, (_, i) => (this.chartRadius * (i + 1)) / 4); },
    axisLines() { 
      const n = this.displayData.length; 
      if (!n) return []; 
      const a = Math.PI * 2 / n; 
      return this.displayData.map((_, i) => this.polarToCartesian(a * i, this.chartRadius)); 
    },
    segmentPaths() { 
      const n = this.displayData.length; 
      if (!n) return []; 
      const a = Math.PI * 2 / n; 
      return this.displayData.map((item, i) => { 
        const r = (item.value / this.maxValue) * this.chartRadius, 
              sa = a * i - a / 2, 
              ea = a * i + a / 2, 
              sp = this.polarToCartesian(sa, r), 
              ep = this.polarToCartesian(ea, r); 
        return { d: `M 0,0 L ${sp.x},${sp.y} A ${r},${r} 0 0 1 ${ep.x},${ep.y} Z` }; 
      }); 
    },
    hitAreaPaths() { 
      const n = this.displayData.length; 
      if (!n) return []; 
      const a = Math.PI * 2 / n, hr = this.chartRadius + this.labelRadius + 10; 
      return this.displayData.map((_, i) => { 
        const sa = a * i - a / 2, 
              ea = a * i + a / 2, 
              sp = this.polarToCartesian(sa, hr), 
              ep = this.polarToCartesian(ea, hr); 
        return { d: `M 0,0 L ${sp.x},${sp.y} A ${hr},${hr} 0 0 1 ${ep.x},${ep.y} Z` }; 
      }); 
    },
    labelPoints() { 
      const n = this.displayData.length; 
      if (!n) return []; 
      const a = Math.PI * 2 / n; 
      return this.displayData.map((item, i) => { 
        const r = ((item.value / this.maxValue) * this.chartRadius) + this.labelRadius + 4; 
        return this.polarToCartesian(a * i, r); 
      }); 
    },
    averageValue() { 
      if (this.displayData.length === 0) return '0.00'; 
      const s = this.displayData.reduce((a, b) => a + b.value, 0); 
      return (s / this.displayData.length).toFixed(2); 
    },
    segmentTransforms() {
      const numAxes = this.displayData.length;
      if (numAxes === 0) return [];

      const angleSlice = (Math.PI * 2) / numAxes;
      const protrudeDistance = 10; // 突出的距離

      return this.displayData.map((_, index) => {
        if (this.hoveredIndex !== index) return 'translate(0, 0)'; // 未懸停，保持原位
        // 計算該扇區中心角度的平移向量
        const angle = angleSlice * index;
        const translation = this.polarToCartesian(angle, protrudeDistance);
        return `translate(${translation.x}px, ${translation.y}px)`;
      });
    },
  },
  methods: {
    polarToCartesian(angle, radius) { 
      const a = angle - Math.PI / 2; 
      return { x: radius * Math.cos(a), y: radius * Math.sin(a) }; 
    },
    animateChart() { 
      const d = 1000, t = this.chartData; 
      let s = null; 
      const step = ts => { 
        if (!s) s = ts; 
        const e = ts - s, 
              p = Math.min(e / d, 1), 
              ep = 1 - Math.pow(1 - p, 3); 
        this.displayData.forEach((item, i) => { item.value = t[i].value * ep }); 
        if (p < 1) requestAnimationFrame(step); 
        else this.displayData = JSON.parse(JSON.stringify(this.chartData)); 
      }; 
      requestAnimationFrame(step); 
    },
    handleMouseOver(event, index) {
      this.hoveredIndex = index;
      const data = this.chartData[index];
      this.tooltip = {
        visible: true,
        content: `${data.label}: ${data.value}`,
        x: event.clientX, // clientX/Y 是相對於 viewport 的
        y: event.clientY,
      };
    },
    handleMouseMove(event) {
      if (this.tooltip.visible) {
        this.tooltip.x = event.clientX;
        this.tooltip.y = event.clientY;
      }
    },
    handleMouseLeave() {
      this.hoveredIndex = null;
      this.tooltip.visible = false;
    },
  },
};
</script>

<style scoped>
.radar-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  font-family: Arial, sans-serif;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.segment-group {
  /* 這個 transition 現在會應用到 translate 屬性上 */
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform-origin: center;
}

.hit-area-path {
  fill: transparent;
  cursor: pointer;
}

.tooltip {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  white-space: nowrap;
  pointer-events: none;
  /* 讓 tooltip 在滑鼠上方 15px 處，避免遮擋 */
  transform: translate(-50%, calc(-100% - 15px));
  transition: opacity 0.2s;
}

.chart-title {
  background-color: #28a745;
  color: white;
  padding: 12px;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
}

.chart-body {
  position: relative;
  background-color: white;
}

.grid-circle {
  fill: none;
  stroke: #e9e9e9;
  stroke-width: 1;
}

.axis-line {
  stroke: #e0e0e0;
  stroke-width: 1;
  stroke-opacity: 0.5;
}

.segment-path {
  fill-opacity: 0.9;
}

.label-bg-circle {
  stroke: white;
  stroke-width: 2.5;
  paint-order: stroke;
}

.label-text {
  fill: white;
  font-size: 12px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: middle;
  pointer-events: none;
}

.chart-footer {
  background-color: #6c757d;
  color: white;
  padding: 15px;
  font-size: 24px;
  text-align: center;
}
</style>