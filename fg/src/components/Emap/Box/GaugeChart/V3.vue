<template>
  <div class="gauge-container" :style="{ width: item.width + 'px', height: item.height + 'px' }">
    <!-- SVG 標籤 -->
    <svg class="gauge-svg" viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet">
      <!-- 背景圓形 -->
      <circle cx="150" cy="150" r="100" :fill="item['style3']['bgColor']"/>
      <!-- 繪製儀表板刻度 -->
      <g id="g1">
        <path v-for="(path, index) in gaugePaths" :key="index" :d="path.d" :stroke="path.stroke" :stroke-width="path.strokeWidth" fill="none" />
      </g>
      <!-- 顯示文字和指針 -->
      <g id="g2">
        <text id="valtext" class="smooth" x="50%" y="53%" text-anchor="middle" alignment-baseline="bottom" :style="{ fill: item['style3']['pointColor'] }">
          {{ computedTargetValue }}
        </text>
        <text id="lbltext" x="50%" y="60%" text-anchor="middle" alignment-baseline="central" :style="{ fill: item['style3']['titleColor'] }">
          {{ item['style3']['titleText'] }}
        </text>
        <circle id="point" cx="50%" cy="50%" :style="pointStyle" />
      </g>
    </svg>
  </div>
</template>

<script>

export default {
  props: ["componentChange", "item", "pointInfo"],
  data() {
    return {
      datapointValue: 0,             // 點位數值
      // 儀表板的核心設定物件。
      gaugeConfig: {
        radius: 20,                   // 儀表板刻度的基礎半徑
        angle: 360,                   // 儀表板的總跨越角度。
        start: 270,                   // 儀表板刻度的起始角度。
        divs: 100,                    // 儀表板的總刻度數。
        lineWidth: 2,                 // 已填充部分刻度線的寬度
        lineSize: 4,                  // 刻度線的長度。
        lineOffset: 0,                // 刻度線距離基礎半徑 `radius` 的偏移量。
        needleStart: 0,               // 指針刻度 (標示當前值的刻度) 的內端起始位置
        needleEnd: -4,                // 指針刻度的外端結束位置。
        // 未填充部分 (背景刻度) 的外觀設定。
        scale: {
          lineWidth: 1,               // 背景刻度線的寬度。
          lineSize: 1,                // 背景刻度線的長度。
          lineOffset: 1,              // 背景刻度線的偏移量。
        },
      },
      animatedCounter: 0,   // 動畫計數器
      multiplier: 4,        // 全局縮放乘數
      animationFrameId: null,
      updateIntervalId: null,
    };
  },

  computed: {
    // 讀取點位值
    computedTargetValue() { return this.setPointText() },
    targetCnt() {
      const g = this.gaugeConfig;
      var intMaxValue = parseInt(this.item['style3']["maxValue"])
      if (this.item['style3']["maxValue"] == undefined && intMaxValue === 0) return 0;
      return (this.datapointValue / intMaxValue) * g.divs;
    },
    // 儀表板指針樣式
    gaugePaths() {
      const paths = [];
      const g = this.gaugeConfig;
      const scale = g.scale;
      const angle = g.angle <= 0 ? 180 : g.angle;
      const step = angle / g.divs;

      let pos = 0;
      for (let i = g.start; i <= (angle + g.start); i += step) {
        const ang = i * Math.PI / 180;
        const sang = Math.cos(ang);
        const cang = Math.sin(ang);

        let pathData = {};

        const addPathData = (config, radius, offset = 0, color) => {
          const sx = sang * (radius + config.lineSize + offset) * this.multiplier + 150;
          const sy = cang * (radius + config.lineSize + offset) * this.multiplier + 150;
          const ex = sang * (radius + offset) * this.multiplier + 150;
          const ey = cang * (radius + offset) * this.multiplier + 150;
          return {
            d: `M ${sx} ${sy} L ${ex} ${ey}`,
            stroke: color,
            strokeWidth: config.lineWidth,
          };
        };

        if (pos < this.animatedCounter) pathData = addPathData(g, g.radius, g.lineOffset, this.getColorForValue());
        else if (pos > this.animatedCounter) pathData = addPathData(scale, g.radius, scale.lineOffset, this.item['style3']['shortScaleColor']);
        else {
          const sx = sang * (g.radius + g.lineSize + g.needleStart) * this.multiplier + 150;
          const sy = cang * (g.radius + g.lineSize + g.needleStart) * this.multiplier + 150;
          const ex = sang * (g.radius + g.lineSize + g.needleEnd) * this.multiplier + 150;
          const ey = cang * (g.radius + g.lineSize + g.needleEnd) * this.multiplier + 150;
          pathData = {
            d: `M ${sx} ${sy} L ${ex} ${ey}`,
            stroke: this.getColorForValue(),
            strokeWidth: g.lineWidth,
          };
        }
        if (pathData.d) paths.push(pathData);
        pos++;
      }
      return paths;
    },
    // 圓點樣式
    pointStyle() {
      const g = this.gaugeConfig;
      const step = g.angle / g.divs;
      const degree = (g.start) + 90 + (step * this.animatedCounter);
      const pointPos = -3 // 圓點指針的位置
      return {
        fill: this.getColorForValue(),
        transform: `rotate(${degree}deg) translateY(-${(g.radius + pointPos) * this.multiplier}px) rotate(-${degree}deg)`
      };
    },
  },
  watch: {
    targetCnt() {
      this.animateGauge();
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
    this.animatedCounter = this.targetCnt;
    this.animateGauge();
  },
  beforeUnmount() {
    clearInterval(this.updateIntervalId);
    cancelAnimationFrame(this.animationFrameId);
    this.stopRandomTimer();
  },
  methods: {
    // 設定隨機亂數(每5秒，有${R}才更新)
    startRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
      var includeRandomData = this.item['style3']["pointText"].includes("${R}");
      if (this.componentChange && includeRandomData) {
        this.randomTimer = setInterval(() => {
          this.datapointValue = Math.floor(Math.random() * this.item['style3']['maxValue'])
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
        return this.$utils.replacePointText(this.item['style3']["pointText"])
      }
      var cpyItem = JSON.parse(JSON.stringify(this.item));
      var includeRandomData = cpyItem['style3']["pointText"].includes("${R}");
      if (includeRandomData) {
        this.datapointValue = Math.floor(Math.random() * cpyItem['style3']['maxValue'])
        return cpyItem['style3']["pointText"].replace("${R}", this.datapointValue);
      } else {
        var replace = this.$utils.replacePlaceholders(cpyItem['style3']["pointText"], this.pointInfo);
        this.datapointValue = replace.usedValues[0] || 0
        if (replace.usedValues[0] > parseInt(cpyItem['style3']['maxValue'])) this.datapointValue = parseInt(cpyItem['style3']['maxValue']) // 判斷點位數值是超過最大值
        return this.$utils.replacePointText(replace.replacedText)
      }
    },
    // ========================================================= 組件動作 =========================================================
    // 取得長指針對應數值顏色
    getColorForValue() {
      const maxValue = this.item['style3']['maxValue']
      const largeScaleColor = this.item['style3']['largeScaleColor']
      if (maxValue === 0) return largeScaleColor[0]; // 避免最大值為零

      const percentage = this.animatedCounter / maxValue;
      const numberOfStops = largeScaleColor.length;
      
      // 計算出當前百分比應該對應到哪個顏色區段的索引
      let colorIndex = Math.floor(percentage * numberOfStops);

      // 處理邊界情況：當 value 正好等於 max 時，percentage 會是 1.0，
      if (colorIndex >= numberOfStops) colorIndex = numberOfStops - 1;
      return largeScaleColor[colorIndex];
    },
    // 動畫效果
    animateGauge() {
      cancelAnimationFrame(this.animationFrameId);
      const animationStep = () => {
        const target = this.targetCnt;
        if (Math.abs(this.animatedCounter - target) < 0.07) {
          this.animatedCounter = target;
          return;
        }
        const diff = target - this.animatedCounter;
        this.animatedCounter += diff * 0.07;
        this.animationFrameId = requestAnimationFrame(animationStep);
      };
      this.animationFrameId = requestAnimationFrame(animationStep);
    },
  },
};
</script>

<style scoped>
.gauge-container {
  user-select: none;
}

.gauge-svg {
  width: 100%;
  height: 100%;
}

@import url('https://fonts.googleapis.com/css?family=Lato:100,200,300');

#point {
  r: .15em;
}

.smooth {
  transition: fill .5s linear;
}

#valtext {
  font-family: 'Lato', sans-serif;
  font-size: 1.5em;
  font-weight: 300;
}

#lbltext {
  font-family: 'Lato', sans-serif;
  font-size: 1em;
  font-weight: 300;
  fill: white;
}
</style>