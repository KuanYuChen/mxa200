<template>
  <!-- SVG 容器 -->
  <div :style="{ width: item.width + 'px', height: item.height + 'px', 'user-select': 'none' }">
    <svg style="user-select: none; width: 100%; height: 100%" viewBox="0 0 300 300">
      <!-- 背景圓形 -->
      <circle cx="150" cy="150" r="100" :fill="item['style4']['bgColor']" />
      <!-- 儀表板指針 -->
      <g id="g1">
        <path v-for="(path, index) in gaugePaths" :key="index" :d="path.d" :stroke="path.stroke" :stroke-width="path.strokeWidth" :opacity="1" fill="none" />
      </g>
      <!-- 儀表板文字、圓點樣式 -->
      <g id="g2">
        <text id="pointText" class="smooth" x="50%" y="55%" text-anchor="middle" alignment-baseline="bottom" :style="{ fill: checkPointColor() }">
          {{ computedTargetValue }}
        </text>
        <text id="titleText" x="50%" y="63%" text-anchor="middle" alignment-baseline="central" :style="{ fill: item['style4']['titleColor'] }">
          {{ item['style4']['titleText'] }}
        </text>
        <circle id="limite" cx="50%" cy="50%" :style="limitStyle"/>
        <circle id="point" class="" cx="50%" cy="50%" :style="pointStyle" />
      </g>
    </svg>
  </div>
</template>

<script>

export default {
  props: ["componentChange", "item", "pointInfo"],
  data() {
    return {
      datapointValue: 0, 
      // 儀錶板主要設定物件
      gauge: {
        radius: 20,           // 儀錶板的半徑
        angle: 270,           // 儀錶板的總角度
        start: 135,           // 儀錶板的起始角度
        divs: 50,             // 儀錶板的刻度總數
        // 線條與指針樣式設定
        lineWidth: 1.5,       // 主要刻度線的寬度
        lineSize: 3,          // 主要刻度線的長度
        lineOffset: 0,        // 主要刻度線距離基礎半徑的偏移量
        needleStart: 0,       // 當前值指針的起始點偏移量
        needleEnd: -5,        // 當前值指針的結束點偏移量
        pointPos: -2,         // 指針末端小圓點的位置偏移量

        // 未達到的刻度樣式 (背景刻度)
        scale: {
          lineWidth: 1,       // 刻度線寬度
          lineSize: 1,        // 刻度線長度
          lineOffset: 1,      // 刻度線偏移量
        },

        // 超過 limit 後的刻度樣式
        scaleOver: {
          lineWidth: 3,       // 刻度線寬度
          lineSize: 3,        // 刻度線長度
          lineOffset: 0,      // 刻度線偏移量
        },

        // limit 標記與其之前的刻度樣式
        scaleLimit: {
          lineWidth: 3,       // 標記線的寬度
          lineSize: 3,        // 標記線的長度
          needleStart: -3,    // 標記針的起始點偏移量
          needleEnd: 2,       // 標記針的結束點偏移量
          pointPos: 5,        // 標記小圓點的位置偏移量
          lineOffset: 0,      // 標記線的偏移量
        },
      },

      // 動畫與內部狀態變數
      animatedCounter: 0,     // 動畫計數器
      multiplier: 3.7,        // 全局縮放乘數
      animationFrameId: null, // 儲存 requestAnimationFrame 的 ID，用於在組件銷毀時取消動畫
      updateIntervalId: null, // 儲存 setInterval 的 ID，用於在組件銷毀時清除計時器
    };
  },
  computed: {
    // 讀取點位值
    computedTargetValue() { return this.setPointText() },
    targetCnt() {
      const g = this.gauge;
      const maxValue = this.item['style4']['maxValue']
      if (!g) return 0;
      if (maxValue === 0 || g.divs === 0) return 0;
      return this.datapointValue / (maxValue / g.divs);
    },
    gaugePaths() {
      const paths = [];
      const g = this.gauge;
      if (!g) return [];
      const maxValue = this.item['style4']['maxValue']
      const limitValue = this.item['style4']['limitValue']
      const scaleLimit = g.scaleLimit || g;
      const scaleOver = g.scaleOver || g;
      const scale = g.scale || g;
      const angle = g.angle <= 0 ? 180 : g.angle;
      const limit = limitValue > 0 ? Math.floor(limitValue / (maxValue / g.divs)) : 0;
      const step = angle / g.divs;
      let pos = 0;
      for (let i = g.start; i <= (angle + g.start); i += step) {
        const ang = i * Math.PI / 180;
        const sang = Math.cos(ang);
        const cang = Math.sin(ang);
        let pathData = {};
        const addPathData = (gr, config, color) => {
          const sx = sang * (gr.radius + config.lineSize + config.lineOffset) * this.multiplier + 150;
          const sy = cang * (gr.radius + config.lineSize + config.lineOffset) * this.multiplier + 150;
          const ex = sang * (gr.radius + config.lineOffset) * this.multiplier + 150;
          const ey = cang * (gr.radius + config.lineOffset) * this.multiplier + 150;
          return {
            d: `M ${sx} ${sy} L ${ex} ${ey}`,
            stroke: color,
            strokeWidth: config.lineWidth,
          };
        };
        if (pos < this.animatedCounter) {
          if (limit > 0 && pos > limit) {
            pathData = addPathData(g, scaleOver, this.item['style4']['largeScaleOverColor']);
          } else {
            pathData = addPathData(g, g, this.item['style4']['largeScaleColor']);
          }
        } else if (pos > this.animatedCounter) {
          if (limit > 0 && pos < limit) {
            pathData = addPathData(g, scaleLimit, this.item['style4']['largeScaleLimitColor']);
          } else {
            pathData = addPathData(g, scale, this.item['style4']['shortScaleColor']);
          }
        } else {
          const sx = sang * (g.radius + g.lineSize + g.needleStart) * this.multiplier + 150;
          const sy = cang * (g.radius + g.lineSize + g.needleStart) * this.multiplier + 150;
          const ex = sang * (g.radius + g.lineSize + g.needleEnd) * this.multiplier + 150;
          const ey = cang * (g.radius + g.lineSize + g.needleEnd) * this.multiplier + 150;
          pathData = {
            d: `M ${sx} ${sy} L ${ex} ${ey}`,
            stroke: this.checkPointColor(),
            strokeWidth: g.lineWidth,
          };
        }
        if (pathData.d) {
          paths.push(pathData);
        }
        if (limit > 0 && pos.toFixed(0) == limit.toFixed(0)) {
          const lsx = sang * (g.radius + scaleLimit.lineSize + scaleLimit.needleStart) * this.multiplier + 150;
          const lsy = cang * (g.radius + scaleLimit.lineSize + scaleLimit.needleStart) * this.multiplier + 150;
          const lex = sang * (g.radius + scaleLimit.lineSize + scaleLimit.needleEnd) * this.multiplier + 150;
          const ley = cang * (g.radius + scaleLimit.lineSize + scaleLimit.needleEnd) * this.multiplier + 150;
          paths.push({
            d: `M ${lsx} ${lsy} L ${lex} ${ley}`,
            stroke: this.item['style4']['largeScaleLimitColor'],
            strokeWidth: scaleLimit.lineWidth,
          });
        }
        pos++;
      }
      return paths;
    },
    
    // 極限值指針前端樣式
    limitStyle() {
      const g = this.gauge;
      const maxValue = this.item['style4']['maxValue']
      const limitValue = this.item['style4']['limitValue']
      if (!g || !limitValue) return {};
      const step = g.angle / g.divs;
      const limit = limitValue > 0 ? Math.floor(limitValue / (maxValue / g.divs)) : 0;
      const limitdegree = (g.start) + 90 + (step * limit);
      const scaleLimit = g.scaleLimit || g;
      return {
        fill: this.item['style4']['largeScaleLimitColor'],
        transform: `rotate(${limitdegree}deg) translateY(-${(g.radius + scaleLimit.pointPos) * this.multiplier}px) rotate(-${limitdegree}deg)`
      }
    },
    // 儀表板內圓圈樣式
    pointStyle() {
      const g = this.gauge;
      const maxValue = this.item['style4']['maxValue']
      const limitValue = this.item['style4']['limitValue']
      if (!g) return {};
      const step = g.angle / g.divs;
      const degree = (g.start) + 90 + (step * this.animatedCounter);
      const limit = limitValue > 0 ? Math.floor(limitValue / (maxValue / g.divs)) : 0;
      let color;
      if (limitValue > 0 && this.animatedCounter > limit) color = this.item['style4']['largeScaleOverColor'];
      else if (limitValue > 0 && this.animatedCounter.toFixed(0) == limit.toFixed(0)) color = this.item['style4']['largeScaleLimitColor'];
      else color = this.item['style4']['pointColor'];
      return {
        fill: color,
        transform: `rotate(${degree}deg) translateY(-${(g.radius + g.pointPos) * this.multiplier}px) rotate(-${degree}deg)`
      };
    },
    formattedValue() {
      const maxValue = this.item['style4']['maxValue']
      const realValue = this.animatedCounter * (maxValue / this.gauge.divs);
      const valueInt = Math.trunc(realValue);
      const valueDec = Math.trunc((realValue - valueInt) * 10);
      return `${valueInt}<tspan>.${valueDec}</tspan>`;
    },
  },
  watch: {
    datapointValue() {
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
    this.animateGauge();
  },
  beforeUnmount() {
    cancelAnimationFrame(this.animationFrameId);
    this.stopRandomTimer();
  },
  methods: {
    // 設定隨機亂數(每5秒，有${R}才更新)
    startRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
      var includeRandomData = this.item['style4']["pointText"].includes("${R}");
      if (this.componentChange && includeRandomData) {
        this.randomTimer = setInterval(() => {
          this.datapointValue = Math.floor(Math.random() * this.item['style4']['maxValue'])
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
        return this.$utils.replacePointText(this.item['style4']["pointText"])
      }
      var cpyItem = JSON.parse(JSON.stringify(this.item));
      var includeRandomData = cpyItem['style4']["pointText"].includes("${R}");
      if (includeRandomData) {
        this.datapointValue = Math.floor(Math.random() * cpyItem['style4']['maxValue'])
        return cpyItem['style4']["pointText"].replace("${R}", this.datapointValue);
      } else {
        var replace = this.$utils.replacePlaceholders(cpyItem['style4']["pointText"], this.pointInfo);
        this.datapointValue = replace.usedValues[0] || 0
        if (replace.usedValues[0] > parseInt(cpyItem['style4']['maxValue'])) this.datapointValue = parseInt(cpyItem['style4']['maxValue']) // 判斷點位數值是超過最大值
        return this.$utils.replacePointText(replace.replacedText)
      }
    },
    // ========================================================= 組件動作 =========================================================
    checkPointColor() {
      const g = this.gauge;
      const maxValue = this.item['style4']['maxValue']
      const limitValue = this.item['style4']['limitValue']
      const limit = limitValue > 0 ? Math.floor(limitValue / (maxValue / g.divs)) : 0;
      let color = "white";
      if (limitValue > 0 && this.animatedCounter > limit) color = this.item['style4']['largeScaleOverColor'];
      else if (limitValue > 0 && this.animatedCounter.toFixed(0) == limit.toFixed(0)) color = this.item['style4']['largeScaleLimitColor'];
      else color = this.item['style4']['pointColor'];
      return color
    },
    animateGauge() {
      cancelAnimationFrame(this.animationFrameId);
      const animationStep = () => {
        const target = this.targetCnt;
        if (Math.abs(this.animatedCounter - target) < 0.01) {
          this.animatedCounter = target;
          return;
        }
        const diff = target - this.animatedCounter;
        this.animatedCounter += diff * 0.1;
        this.animationFrameId = requestAnimationFrame(animationStep);
      };
      this.animationFrameId = requestAnimationFrame(animationStep);
    },
    updateData() {
      this.gauge.value += 5;
      if (this.gauge.value > this.item['style4']['maxValue']) {
        this.gauge.value = 0;
      }
    },
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css?family=Lato:100,200,300');

:deep(tspan) {
  font-size: .4em;
}


#point {
  r: .15em;
}

#limite {
  r: .15em;
}

.smooth {
  transition: all .5s linear;
}

#pointText {
  font-family: 'Lato', sans-serif;
  font-size: 2em;
  font-weight: 300;
}

#titleText {
  font-family: 'Lato', sans-serif;
  font-size: 1.0em;
  font-weight: 300;
}
</style>