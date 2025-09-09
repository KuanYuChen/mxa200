<template>
  <div class="gauge-chart-container">
    <svg :viewBox="`0 0 ${svgSize} ${svgSize}`" class="gauge-svg">
      <defs>
        <!-- 1. 顏色漸層 -->
        <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <!-- 顏色分布可以微調以符合圖片效果 -->
          <stop offset="0%" style="stop-color:#4CAF50;" /> <!-- 綠色 -->
          <stop offset="25%" style="stop-color:#FFC107;" /> <!-- 黃色 -->
          <stop offset="50%" style="stop-color:#FF9800;" /> <!-- 橘色 -->
          <stop offset="75%" style="stop-color:#ff6000;" /> <!-- 深橘色 -->
          <stop offset="100%" style="stop-color:#ff0000;" /> <!-- 紅色 -->
        </linearGradient>

        <!-- 2. 遮罩 -->
        <mask id="gauge-mask">
          <!-- 遮罩內部是一個動態長度的白色路徑 -->
          <path :d="gaugePath" :stroke-width="strokeWidth" stroke="white" fill="none" stroke-linecap="round" :style="gaugeValueStyle" ref="gaugeValuePath" />
        </mask>
      </defs>

      <!-- 繪製儀表板 -->
      <!-- 背景灰色軌道 -->
      <path :d="gaugePath" :stroke-width="strokeWidth" stroke="#e6e6e6" fill="none" stroke-linecap="round" />

      <!-- 繪製一個完整的、帶有漸層的圓弧，並應用遮罩 -->
      <path :d="gaugePath" :stroke-width="strokeWidth" stroke="url(#gauge-gradient)" fill="none" stroke-linecap="round" mask="url(#gauge-mask)" />

      <!-- 中心數值 -->
      <text :x="center" :y="center - 10" class="gauge-value-text">
        {{ animatedValue.toFixed(1) }}
      </text>
      <text :x="center" :y="center + 15" class="gauge-unit-text">
        % RH
      </text>

      <!-- 最小/最大值標籤 -->
      <text :x="minMaxLabelPositions.min.x" :y="minMaxLabelPositions.min.y" class="gauge-minmax-text">{{ min }}</text>
      <text :x="minMaxLabelPositions.max.x" :y="minMaxLabelPositions.max.y" class="gauge-minmax-text">{{ max }}</text>
    </svg>

    <!-- 底部標題 -->
    <div class="gauge-info">
      <div class="gauge-title">CRAC-10</div>
      <div class="gauge-subtitle">Return Humidity</div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      value: 68.5,
      min: 0,
      max: 100,
      animatedValue: 0,
      svgSize: 200,
      strokeWidth: 15,
      pathLength: 0,
      animationFrameId: null,
      animationDuration: 1000,
    };
  },
  computed: {
    center() { return this.svgSize / 2; },
    radius() { return this.center - this.strokeWidth; },
    gaugePath() {
      const startAngle = -120; // 0% 的位置 (左下)
      const endAngle = 120;   // 100% 的位置 (右下)

      // 計算起點和終點的座標
      const startCoords = this.polarToCartesian(this.center, this.center, this.radius, startAngle);
      const endCoords = this.polarToCartesian(this.center, this.center, this.radius, endAngle);

      // 圓弧跨越的角度 (270度) 大於180度，所以 large-arc-flag 是 1
      const largeArcFlag = '1';

      // 為了從起點到終點順時針繪製，sweep-flag 必須是 1
      // 這就是之前版本中的錯誤點，它被設成了 0 (逆時針)
      const sweepFlag = '1';

      // M = MoveTo, A = Arc
      return `M ${startCoords.x} ${startCoords.y} A ${this.radius} ${this.radius} 0 ${largeArcFlag} ${sweepFlag} ${endCoords.x} ${endCoords.y}`;
    },

    minMaxLabelPositions() {
      const offset = this.strokeWidth + 5;
      const minPos = this.polarToCartesian(this.center, this.center, this.radius + offset, -135);
      const maxPos = this.polarToCartesian(this.center, this.center, this.radius + offset, 135);
      return {
        min: { x: minPos.x - 5, y: minPos.y + 5 },
        max: { x: maxPos.x + 5, y: maxPos.y + 5 },
      }
    },

    gaugeValueStyle() {
      if (this.pathLength === 0) return { strokeDasharray: 0, strokeDashoffset: 0 };

      // 我們根據動畫中的數值來計算，讓圓弧和數字同步
      const normalizedValue = (this.animatedValue - this.min) / (this.max - this.min);
      const clampedValue = Math.max(0, Math.min(1, normalizedValue));

      // stroke-dashoffset 控制路徑顯示的長度
      // offset 為 0 時，顯示完整路徑
      // offset 為 pathLength 時，完全隱藏
      // 所以我們用 (1 - 百分比) 來計算
      const offset = this.pathLength * (1 - clampedValue);

      return { strokeDasharray: this.pathLength, strokeDashoffset: offset };
    },
  },
  mounted() {
    this.$nextTick(() => {
      if (this.$refs.gaugeValuePath) {
        this.pathLength = this.$refs.gaugeValuePath.getTotalLength();
      }
      this.animateValue(0, this.value);
      setInterval(() => {
        this.value = Math.floor(Math.random() * 100)
        this.animateValue(this.animatedValue, this.value);
      }, 2000);
    });
  },
  beforeDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  },
  methods: {
    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians)),
      };
    },
    easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); },
    animateValue(startValue, endValue) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      const startTime = performance.now();
      const step = (currentTime) => {
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / this.animationDuration, 1);
        const easedProgress = this.easeOutCubic(progress);
        this.animatedValue = startValue + (endValue - startValue) * easedProgress;
        if (progress < 1) {
          this.animationFrameId = requestAnimationFrame(step);
        } else {
          this.animatedValue = endValue;
        }
      };
      this.animationFrameId = requestAnimationFrame(step);
    },
  },
};
</script>

<style>
/* CSS 樣式完全不需要改變 */
body {
  margin: 0;
  background-color: #f0f2f5;
}

#dashboard-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

.gauge-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 450px;
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.gauge-svg {
  width: 100%;
  height: auto;
}

.gauge-value-text {
  font-size: 40px;
  font-weight: bold;
  fill: #333;
  text-anchor: middle;
  dominant-baseline: middle;
}

.gauge-unit-text {
  font-size: 14px;
  fill: #666;
  text-anchor: middle;
  dominant-baseline: middle;
}

.gauge-minmax-text {
  font-size: 12px;
  fill: #999;
  text-anchor: middle;
  dominant-baseline: central;
}

.gauge-info {
  margin-top: -30px;
  text-align: center;
}

.gauge-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.gauge-subtitle {
  font-size: 12px;
  color: #888;
}
</style>