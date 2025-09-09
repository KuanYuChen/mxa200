<template>
  <v-main>
    <svg id="gg">
      <!-- Group for gauge paths, rendered via v-for -->
      <g id="g1">
        <path v-for="(path, index) in gaugePaths" :key="index" :d="path.d" :stroke="path.stroke" :stroke-width="path.strokeWidth" :opacity="1" fill="none" />
      </g>
      <!-- Group for text and pointers -->
      <g id="g2">
        <text id="valtext" class="smooth" x="50%" y="55%" text-anchor="middle" alignment-baseline="bottom":style="valTextStyle" v-html="formattedValue"></text>
        <text id="lbltext" x="50%" y="63%" text-anchor="middle" alignment-baseline="central">{{ displayLabel }}</text>
        <circle id="limite" cx="50%" cy="50%" :style="limitStyle" v-show="activeGauge.limit > 0" />
        <circle id="point" class="" cx="50%" cy="50%" :style="pointStyle" />
      </g>
    </svg>

    <div class="buttons-container">
      <div class="button" @click="setGauge(0)">1</div>
      <div class="button" @click="setGauge(1)">2</div>
      <div class="button" @click="setGauge(2)">3</div>
      <div class="button" @click="setGauge(3)">4</div>
    </div>
  </v-main>
</template>

<script>
export default {
  name: 'GaugeComponent',
  data() {
    return {
      // 儀錶板設定 (已將 eval 字串改為函式)
      gauge: [
        {
          radius: 20, angle: 270, start: 135, divs: 50, value: 0, limit: 40,
          min: 0, max: 50,
          color: () => 'cyan',
          alertColor: () => 'red',
          limitColor: () => 'orange',
          units: () => 'Km/h',
          lineWidth: (pos) => pos / 20,
          lineSize: 3, lineOffset: 0, needleStart: 0, needleEnd: -5,
          pointPos: -2, pointColor: () => 'green',
          scale: {
            lineWidth: (pos) => pos / 20, lineSize: 1, color: () => 'white', lineOffset: 1,
          },
          scaleOver: {
            lineWidth: (pos) => pos / 20, lineSize: 3, color: () => 'red', lineOffset: 0,
          },
          scaleLimit: {
            lineWidth: (pos) => pos / 20, lineSize: 3, color: () => 'orange',
            needleStart: -3, needleEnd: 2, pointPos: 5, lineOffset: 0,
          },
        },
        {
          radius: 20, angle: 360, start: 270, divs: 100, value: 50, limit: 0,
          min: 0, max: 100,
          color: (pos) => `rgb(${pos * 4}, ${255 - (pos * 2)}, ${255 - (pos * 4)})`,
          alertColor: () => 'red',
          limitColor: () => 'yellow',
          units: () => 'temperature',
          lineWidth: () => 2, lineSize: 4, lineOffset: 0, needleStart: 0, needleEnd: -4,
          pointPos: -3, pointColor: () => 'magenta',
          refresh: 100, // 此屬性現在由 watch 和 animateGauge 控制，不再直接使用
          scale: {
            lineWidth: () => 1, lineSize: 1, color: () => 'white', lineOffset: 1,
          },
          scaleLimit: {
            lineWidth: () => 3, lineSize: 3, color: () => 'orange',
            needleStart: -3, needleEnd: 2, pointPos: 5, lineOffset: 0,
          },
        },
        {
          radius: 25, angle: 359, start: 270, divs: 60, value: 0, limit: 0,
          min: 0, max: 60,
          color: (pos, cnt) => `rgb(${255 - (cnt * 4)}, ${cnt}, ${cnt * 4})`,
          alertColor: () => 'red',
          limitColor: () => 'orange',
          units: () => 'seconds',
          lineWidth: () => 4, lineSize: 4, lineOffset: 0, needleStart: 0, needleEnd: -4,
          pointPos: -4, pointColor: () => 'yellow',
          refresh: 1,
          scale: {
            lineWidth: () => 1, lineSize: 1, color: () => 'white', lineOffset: 1,
          },
        },
        {
          radius: 20, angle: 360, start: 180, divs: 100, value: 0, limit: 0,
          min: 0, max: 100,
          color: (pos) => `rgb(${pos * 4}, 0, ${255 - (pos * 4)})`,
          alertColor: () => 'yellow',
          limitColor: () => 'orange',
          units: (Hrs, Min) => `${Hrs}:${Min}`,
          lineWidth: () => 2, lineSize: 3, lineOffset: 0, needleStart: 0, needleEnd: -5,
          pointPos: -2, pointColor: () => 'green',
          refresh: 1,
          scale: {
            lineWidth: () => 1, lineSize: 1, color: () => 'white', lineOffset: 0,
          },
          scaleOver: {
            lineWidth: () => 3, lineSize: 3, color: () => 'red', lineOffset: 0,
          },
          scaleLimit: {
            lineWidth: () => 1, lineSize: 1, color: () => 'orange',
            needleStart: -3, needleEnd: 2, pointPos: 5, lineOffset: 0,
          },
        },
      ],
      active: 0, // 當前活動的儀錶板索引
      cnt: 0, // 動畫計數器，代表當前顯示的值
      m: 4, // 縮放乘數
      animationFrameId: null, // 用於儲存 requestAnimationFrame 的 ID
      updateIntervalId: null, // 用於儲存 setInterval 的 ID
      // 時間變數
      Hrs: 0,
      Min: '00',
    };
  },
  computed: {
    // 取得當前活動的儀錶板設定
    activeGauge() {
      return this.gauge[this.active];
    },
    // 將目標值轉換為 division 單位
    targetCnt() {
      const g = this.activeGauge;
      if (!g) return 0;
      return g.value / (g.max / g.divs);
    },
    // 計算所有 SVG 路徑
    gaugePaths() {
      const paths = [];
      const g = this.activeGauge;
      if (!g) return [];

      const scaleLimit = g.scaleLimit || g;
      const scaleOver = g.scaleOver || g;
      const scale = g.scale || g;

      const angle = g.angle <= 0 ? 180 : g.angle;
      const limit = g.limit > 0 ? Math.floor(g.limit / (g.max / g.divs)) : 0;
      const step = angle / g.divs;

      let pos = 0;
      for (let i = g.start; i <= (angle + g.start); i += step) {
        const ang = i * Math.PI / 180;
        const sang = Math.cos(ang);
        const cang = Math.sin(ang);

        let pathData = {};

        const addPathData = (gr, config) => {
          const sx = sang * (gr.radius + config.lineSize + config.lineOffset) * this.m + 150;
          const sy = cang * (gr.radius + config.lineSize + config.lineOffset) * this.m + 150;
          const ex = sang * (gr.radius + config.lineOffset) * this.m + 150;
          const ey = cang * (gr.radius + config.lineOffset) * this.m + 150;

          return {
            d: `M ${sx} ${sy} L ${ex} ${ey}`,
            stroke: config.color(pos, this.cnt),
            strokeWidth: config.lineWidth(pos, this.cnt),
          };
        };

        if (pos < this.cnt) { // 已達到的值
          if (limit > 0 && pos > limit) {
            pathData = addPathData(g, scaleOver);
          } else {
            pathData = addPathData(g, g);
          }
        } else if (pos > this.cnt) { // 未達到的值 (刻度)
          if (limit > 0 && pos < limit) {
            pathData = addPathData(g, scaleLimit);
          } else {
            pathData = addPathData(g, scale);
          }
        } else { // 當前值的指針
          const sx = sang * (g.radius + g.lineSize + g.needleStart) * this.m + 150;
          const sy = cang * (g.radius + g.lineSize + g.needleStart) * this.m + 150;
          const ex = sang * (g.radius + g.lineSize + g.needleEnd) * this.m + 150;
          const ey = cang * (g.radius + g.lineSize + g.needleEnd) * this.m + 150;
          pathData = {
            d: `M ${sx} ${sy} L ${ex} ${ey}`,
            stroke: g.color(pos, this.cnt),
            strokeWidth: g.lineWidth(pos, this.cnt),
          };
        }

        if (pathData.d) {
          paths.push(pathData);
        }

        // 繪製 limit 針
        if (limit > 0 && pos.toFixed(0) == limit.toFixed(0)) {
          const lsx = sang * (g.radius + scaleLimit.lineSize + scaleLimit.needleStart) * this.m + 150;
          const lsy = cang * (g.radius + scaleLimit.lineSize + scaleLimit.needleStart) * this.m + 150;
          const lex = sang * (g.radius + scaleLimit.lineSize + scaleLimit.needleEnd) * this.m + 150;
          const ley = cang * (g.radius + scaleLimit.lineSize + scaleLimit.needleEnd) * this.m + 150;
          paths.push({
            d: `M ${lsx} ${lsy} L ${lex} ${ley}`,
            stroke: scaleLimit.color(pos, this.cnt),
            strokeWidth: scaleLimit.lineWidth(pos, this.cnt),
          });
        }

        pos++;
      }
      return paths;
    },
    // 指針圓點的樣式
    pointStyle() {
      const g = this.activeGauge;
      if (!g) return {};
      const step = g.angle / g.divs;
      const degree = (g.start) + 90 + (step * this.cnt);
      return {
        fill: g.pointColor(this.pos, this.cnt),
        transform: `rotate(${degree}deg) translateY(-${(g.radius + g.pointPos) * this.m}px) rotate(-${degree}deg)`
      };
    },
    // 限制圓點的樣式
    limitStyle() {
      const g = this.activeGauge;
      if (!g || !g.limit) return {};
      const step = g.angle / g.divs;
      const limit = g.limit > 0 ? Math.floor(g.limit / (g.max / g.divs)) : 0;
      const limitdegree = (g.start) + 90 + (step * limit);
      const scaleLimit = g.scaleLimit || g;

      return {
        fill: scaleLimit.color(),
        transform: `rotate(${limitdegree}deg) translateY(-${(g.radius + scaleLimit.pointPos) * this.m}px) rotate(-${limitdegree}deg)`
      }
    },
    // 中間數值文字的樣式 (顏色)
    valTextStyle() {
      const g = this.activeGauge;
      if (!g) return { fill: 'white' };
      const limit = g.limit > 0 ? Math.floor(g.limit / (g.max / g.divs)) : 0;

      let color;
      if (g.limit > 0 && this.cnt > limit) {
        color = g.alertColor(this.pos, this.cnt);
      } else if (g.limit > 0 && this.cnt.toFixed(0) == limit.toFixed(0)) {
        color = g.limitColor(this.pos, this.cnt);
      } else {
        color = g.color(this.pos, this.cnt);
      }
      return { fill: color };
    },
    // 格式化中間的數值文字
    formattedValue() {
      const realValue = this.cnt * (this.activeGauge.max / this.activeGauge.divs);
      const valueInt = Math.trunc(realValue);
      const valueDec = Math.trunc((realValue - valueInt) * 10);
      return `${valueInt}<tspan>.${valueDec}</tspan>`;
    },
    // 顯示單位文字
    displayLabel() {
      const g = this.activeGauge;
      if (!g) return '';
      // 傳入需要的參數來執行函式
      return g.units(this.Hrs, this.Min);
    }
  },
  watch: {
    // 監聽目標值的變化，觸發動畫
    targetCnt() {
      this.animateGauge();
    }
  },
  methods: {
    setGauge(n) {
      this.active = n;
      // 重置 value 和 cnt 以便從 0 開始動畫
      this.gauge[this.active].value = 0;
      this.cnt = 0;
      // 立即觸發一次動畫，以防初始值不為 0
      this.animateGauge();
    },
    // 動畫函式
    animateGauge() {
      cancelAnimationFrame(this.animationFrameId);

      const animationStep = () => {
        const target = this.targetCnt;
        // 只有在 cnt 和 target 不一致時才繼續動畫
        if (Math.abs(this.cnt - target) < 0.1) {
          this.cnt = target; // 對齊最終值
          return;
        }

        // 緩動效果
        const diff = target - this.cnt;
        this.cnt += diff * 0.1;

        this.animationFrameId = requestAnimationFrame(animationStep);
      };

      this.animationFrameId = requestAnimationFrame(animationStep);
    },
    // 更新模擬數據
    updateData() {
      // 更新時間
      const date = new Date();
      this.Hrs = date.getHours();
      let min = '0' + date.getMinutes();
      this.Min = min.substr(-2);

      // 更新儀錶板數值
      let g0 = this.gauge[0];
      g0.value += 5;
      if (g0.value > g0.max) g0.value = 0;

      let g1 = this.gauge[1];
      g1.value = Math.random() * g1.max;

      let g2 = this.gauge[2];
      g2.value = date.getSeconds();

      let g3 = this.gauge[3];
      g3.value = (g3.value > 0) ? 0 : 100;
    }
  },
  mounted() {
    // 啟動動畫
    this.animateGauge();

    // 每秒更新一次數據
    this.updateIntervalId = setInterval(this.updateData, 1000);
  },
  // 在 Vue 3 中使用 beforeUnmount
  beforeDestroy() {
    // 清除計時器和動畫幀，防止記憶體洩漏
    clearInterval(this.updateIntervalId);
    cancelAnimationFrame(this.animationFrameId);
  },
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css?family=Lato:100,200,300');

body {
  /* 這些樣式可能不會生效，因為它們被 scoped 限制，但保留以示對應 */
  font-size: 26px;
  color: cyan;
  background: black;
}

/* v-html 內容的樣式需要使用深度選擇器 */
:deep(tspan) {
  font-size: .4em;
}

#gg {
  position: fixed;
  top: calc(50vh - 150px);
  left: calc(50vw - 150px);
  width: 300px;
  height: 300px;
  background: #111;
}

#point {
  /* fill is now handled by :style binding */
  r: .15em;
}

#limite {
  /* fill is now handled by :style binding */
  r: .15em;
}

.smooth {
  transition: all .5s linear;
}

#valtext {
  font-family: 'Lato', sans-serif;
  font-size: 2em;
  font-weight: 300;
  /* fill is now handled by :style binding */
}

#lbltext {
  font-family: 'Lato', sans-serif;
  font-size: .7em;
  font-weight: 300;
  fill: white;
}

.buttons-container {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
}

.button {
  color: black;
  font-family: 'Lato', sans-serif;
  font-weight: 300;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid white;
  width: 50px;
  height: 50px;
  text-align: center;
  border-radius: 50%;
  margin: 10px;
  background: orange;
  cursor: pointer;
  transition: all .5s linear;
}

.button:hover {
  background: red;
}
</style>