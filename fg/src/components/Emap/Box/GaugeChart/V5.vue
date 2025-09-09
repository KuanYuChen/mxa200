<template>
  <div class="gauge-chart-container" :style="{ width: item.width - 4 + 'px', height: item.height - 4 + 'px', 'user-select': 'none', background: item['style5']['bgColor'] }">
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
      <text :x="center" :y="center - 10" class="gauge-value-text" :fill="item['style5']['pointColor']">
        {{ computedTargetValue }}
      </text>
      <text :x="center" :y="center + 25" class="gauge-unit-text" :fill="item['style5']['unitColor']">
        {{ item['style5']['unitText'] }}
      </text>

      <text :x="center" :y="center + 70" class="gauge-unit-text" :fill="item['style5']['titleColor']">
        {{ item['style5']['titleText'] }}
      </text>

      <!-- 最小/最大值標籤 -->
      <text :x="minMaxLabelPositions.min.x" :y="minMaxLabelPositions.min.y - 10" class="gauge-minmax-text">{{ min }}</text>
      <text :x="minMaxLabelPositions.max.x" :y="minMaxLabelPositions.max.y - 10" class="gauge-minmax-text">{{ item['style5']['maxValue'] }}</text>
    </svg>
  </div>
</template>

<script>

export default {
  props: ["componentChange", "item", "pointInfo"],
  data() {
    return {
      datapointValue: 0, 
      min: 0,
      animatedValue: 0,
      svgSize: 200,
      strokeWidth: 15,
      pathLength: 0,
      animationFrameId: null,
      animationDuration: 1000,
    };
  },
  computed: {
    // 讀取點位值
    computedTargetValue() { return this.setPointText() },
    center() { return this.svgSize / 2; },
    radius() { return this.center - this.strokeWidth; },
    gaugePath() {
      const startAngle = -110; // 0% 的位置 (左下)
      const endAngle = 110;   // 100% 的位置 (右下)

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
        min: { x: minPos.x - 5, y: minPos.y - 15 },
        max: { x: maxPos.x + 5, y: maxPos.y - 15 },
      }
    },

    gaugeValueStyle() {
      if (this.pathLength === 0) return { strokeDasharray: 0, strokeDashoffset: 0 };
      // 我們根據動畫中的數值來計算，讓圓弧和數字同步
      const normalizedValue = (this.animatedValue - this.min) / (this.item['style5']['maxValue'] - this.min);
      const clampedValue = Math.max(0, Math.min(1, normalizedValue));

      // stroke-dashoffset 控制路徑顯示的長度
      // offset 為 0 時，顯示完整路徑
      // offset 為 pathLength 時，完全隱藏
      const offset = this.pathLength * (1 - clampedValue);
      return { strokeDasharray: this.pathLength, strokeDashoffset: offset };
    },
  },
  watch: {
    datapointValue() {
      this.animateValue(this.animatedValue, this.datapointValue);
    },
    componentChange: {
      handler(newValue, oldValue) {
        if (newValue) this.startRandomTimer();
        else this.stopRandomTimer();
      },
      immediate: true
    }
  },
  
  mounted() {
    this.$nextTick(() => {
      if (this.$refs.gaugeValuePath) this.pathLength = this.$refs.gaugeValuePath.getTotalLength();
      this.animateValue(50, this.datapointValue);
    });
  },
  beforeUnmount() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.stopRandomTimer();
  },
  methods: {
    // 設定隨機亂數(每5秒，有${R}才更新)
    startRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
      var includeRandomData = this.item['style5']["pointText"].includes("${R}");
      if (this.componentChange && includeRandomData) {
        this.randomTimer = setInterval(() => {
          this.datapointValue = Math.floor(Math.random() * this.item['style5']['maxValue'])
        }, 5000);
      }
    },
    stopRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
    },
    // 設定點位數值
    setPointText() {
      if (!this.componentChange) {
        return this.$utils.replacePointText(this.item['style5']["pointText"])
      }
      var cpyItem = JSON.parse(JSON.stringify(this.item));
      var includeRandomData = cpyItem['style5']["pointText"].includes("${R}");
      if (includeRandomData) {
        this.datapointValue = Math.floor(Math.random() * cpyItem['style5']['maxValue'])
        return cpyItem['style5']["pointText"].replace("${R}", this.datapointValue);
      } else {
        var replace = this.$utils.replacePlaceholders(cpyItem['style5']["pointText"], this.pointInfo);
        this.datapointValue = replace.usedValues[0] || 0
        if (replace.usedValues[0] > parseInt(cpyItem['style5']['maxValue'])) this.datapointValue = parseInt(cpyItem['style5']['maxValue']) // 判斷點位數值是超過最大值
        return this.$utils.replacePointText(replace.replacedText)
      }
    },
    // ========================================================= 組件動作 =========================================================
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

<style lang="scss" scoped>
.gauge-chart-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.gauge-svg {
  width: 100%;
  height: 100%;
}

.gauge-value-text {
  font-size: 40px;
  font-weight: bold;
  text-anchor: middle;
  dominant-baseline: middle;
}

.gauge-unit-text {
  font-size: 20px;
  text-anchor: middle;
  dominant-baseline: middle;
}

.gauge-minmax-text {
  font-size: 12px;
  text-anchor: middle;
  dominant-baseline: central;
}

</style>