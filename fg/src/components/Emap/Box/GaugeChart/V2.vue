<template>
  <div class="gauge-container" :style="{ width: item.width - 4 + 'px', height: item.height - 4 + 'px' }">
    <svg viewBox="-80 -80 400 400" class="gauge-svg">
      <defs>
        <!-- 指針 -->
        <path id="inward-pointer" d="M 119 -8 L 131 -8 L 125 15 Z" />
        <!-- 刻度線 -->
        <line id="major-tick" x1="125" y1="9" x2="125" y2="20" stroke-width="2.5" />
        <line id="minor-tick" x1="125" y1="14" x2="125" y2="20" stroke-width="1.5" />
        
        <!-- 上方文字 -->
        <path id="top-arc-text-path" d="M 45 120 A 60 60 0 0 1 205 120" fill="none"></path>
        <!-- 下方文字 -->
        <path id="bottom-arc-text-path" d="M 45 145 A 60 60 0 0 0 205 145" fill="none"></path>
      </defs>

      <!-- 1. 儀表盤基座: 繪製所有靜態的圓環 -->
      <g id="base-gauge">
        <!-- 最外層細邊框 -->
        <circle cx="125" cy="125" r="125" fill="none" :stroke="item['style2']['gauge']['pointerTrailColor']" stroke-width="8" />
        <!-- 較粗的外環 -->
        <circle cx="125" cy="125" r="110" fill="none" :stroke="item['style2']['gauge']['scaleBGColor']" stroke-width="28" />
        <!-- 內層環帶 -->
        <circle cx="125" cy="125" r="92" fill="none" :stroke="item['style2']['gauge']['titleBGColor']" stroke-width="26" />
      </g>
      
      <!-- 2. "挖出" 凹槽和文字: 使用與背景色相同的元素覆蓋在淺灰色環帶上，製造視覺效果 -->
      <g id="cutouts">
        <!-- 使用 textPath 讓文字沿著定義好的路徑排列，並用黑色填充製造 "蝕刻" 效果 -->
        <!-- <text class="arc-text-cutout"><textPath href="#top-arc-text-path" :fill="item.gaugeTitleColor" startOffset="50%">溫度</textPath></text>
        <text class="arc-text-cutout"><textPath href="#bottom-arc-text-path" :fill="item.gaugeTitleColor" startOffset="50%">濕度</textPath></text> -->
      </g>

      <!-- 3. 中央的圓盤與數值顯示 -->
      <g id="center-display">
        <circle cx="125" cy="125" r="80" :fill="item['style2']['center']['centerBGColor']" />
        <text x="125" y="110" class="center-text-label" :style="{ fill: item['style2']['center']['centerTitleColor'] }">
          {{ item['style2']['center']['centerTitle'] }}
        </text>
        <text x="125" y="142" class="center-text-value" :style="{ fill: item['style2']['center']['pointColor'] }">
          {{ computedTargetValue.centerValue }}
        </text>
      </g>

      <!-- 4. 刻度、指針與標籤 -->
      <g id="markers-and-pointers">
        <g v-for="tick in allTicks" :key="tick.id" :transform="`rotate(${tick.angle} 125 125)`">
          <!-- 根據是否為主刻度，使用不同的刻度線 -->
          <use :href="tick.isMajor ? '#major-tick' : '#minor-tick'" :stroke="tick.type == 'top' ? item['style2']['top']['scaleColor'] : item['style2']['bottom']['scaleColor']" />
        </g>
        <!-- 渲染主刻度的文字標籤 -->
        <g v-for="tick in allTicks" :key="`${tick.id}-label`">
          <text v-if="tick.isMajor" 
            class="tick-label" :style="{ fill: tick.type == 'top' ? item['style2']['top']['scaleTextColor'] : item['style2']['bottom']['scaleTextColor'] }" 
            :x="tick.textPos.x" :y="tick.textPos.y" text-anchor="middle"
          >
            {{ tick.value }}
          </text>
        </g>
        <!-- 指針 -->
        <g :transform="topPointerTransform"><use href="#inward-pointer" class="pointer" :fill="item['style2']['top']['needleColor']" /></g>
        <g :transform="bottomPointerTransform"><use href="#inward-pointer" class="pointer" :fill="item['style2']['bottom']['needleColor']" /></g>
        <!-- 動態讀數 -->
        <text class="pointer-label" :style="{ fill: item['style2']['top']['pointColor'] }" :x="topLabelPos.x" :y="topLabelPos.y - 10" :text-anchor="topLabelPos.anchor">
          {{ computedTargetValue.topValue }}
        </text>
        <text class="pointer-label" :style="{ fill: item['style2']['bottom']['pointColor'] }" :x="bottomLabelPos.x" :y="bottomLabelPos.y + 35" :text-anchor="bottomLabelPos.anchor">
          {{ computedTargetValue.bottomValue }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script>

export default {
  props: ["componentChange", "item", "pointInfo"],
  data() {
    return {
      // 目標值
      topContent: 50,
      centerContent: 50,
      bottomContent: 50,
      // 動畫中的顯示值
      tweenedTop: 0,     // 上指針動畫
      tweenedBottom: 0,  // 下指針動畫
    };
  },
  computed: {
    // 讀取點位值
    computedTargetValue() {
      return {
        bottomValue: this.setPointText('bottom'),
        topValue: this.setPointText('top'),
        centerValue: this.setPointText('center')
      };
    },
    // 定義上下儀表的數值範圍和對應的角度範圍
    topRange() { return { val_min: 0, val_max: this.item['style2']['top']['maxValue'] || 120, ang_min: -60, ang_max: 60 } },
    bottomRange() { return { val_min: 0, val_max: this.item['style2']['bottom']['maxValue'] || 220, ang_min: 120, ang_max: 240 } },
    // 將上下的刻度合併成一個陣列
    allTicks() { return [...this.topTicks, ...this.bottomTicks] },
    // 生成上刻度的陣列
    topTicks() { return this.generateTicks(this.topRange, 'top') },
    // 生成下刻度的陣列
    bottomTicks() { return this.generateTicks(this.bottomRange, 'bottom') },
    // 計算上下指針的 transform rotate 屬性
    topPointerTransform() {
      const angle = this.mapValueToAngle(this.tweenedTop, this.topRange);
      return `rotate(${angle} 125 125)`;
    },
    bottomPointerTransform() {
      const angle = this.mapValueToAngle(this.tweenedBottom, this.bottomRange);
      return `rotate(${angle} 125 125)`;
    },
    // 計算上下動態標籤的位置 (x, y) 和對齊方式 (anchor)
    topLabelPos() {
      const angle = this.mapValueToAngle(this.tweenedTop, this.topRange);
      const position = this.calculateTextPosition(angle, 145);
      const anchor = angle < 0 ? 'end' : 'start';
      return { ...position, anchor };
    },
    bottomLabelPos() {
      const angle = this.mapValueToAngle(this.tweenedBottom, this.bottomRange);
      const position = this.calculateTextPosition(angle, 145);
      const anchor = angle < 180 ? 'end' : 'start';
      return { ...position, anchor };
    }
  },
  watch: {
    // 當 topContent 變化時，觸發補間動畫，讓 tweenedTop 追趕上來
    topContent(newValue) {
      this.tweenValue('tweenedTop', newValue);
    },
    // 當 bottomContent 變化時，觸發補間動畫，讓 tweenedBottom 追趕上來
    bottomContent(newValue) {
      this.tweenValue('tweenedBottom', newValue);
    },
    componentChange: {
      handler(newValue, oldValue) {
        if (newValue) this.startRandomTimer();
        else this.stopRandomTimer();
      },
      immediate: true
    }
  },
  beforeUnmount() {
    this.stopRandomTimer();
  },
  methods: {
    // 設定隨機亂數(每5秒，有${R}才更新)
    startRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
      if (this.componentChange) {
        this.randomTimer = setInterval(() => {
          var includeRandomDataTop = this.item['style2']['top']['pointText'].includes("${R}");
          var includeRandomDataBottom = this.item['style2']['top']['pointText'].includes("${R}");
          var includeRandomDataCenter = this.item['style2']['top']['pointText'].includes("${R}");

          if (includeRandomDataTop) this.topContent = Math.floor(Math.random() * 120)
          if (includeRandomDataBottom) this.bottomContent = Math.floor(Math.random() * 200)
          if (includeRandomDataCenter) this.centerContent = Math.floor(Math.random() * 200)
        }, 5000);
      }
    },
    stopRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
    },
    // 設定點位數值
    setPointText(key) {
      if (!this.componentChange) {
        return this.$utils.replacePointText(this.item['style2'][key]["pointText"])
      }
      var cpyItem = JSON.parse(JSON.stringify(this.item));
      var includeRandomData = cpyItem['style2'][key]['pointText'].includes("${R}");
      if (includeRandomData) {
        if (key == 'top') {
          this.topContent = Math.floor(Math.random() * 120)
          return cpyItem['style2'][key]['pointText'].replace("${R}", this.topContent)
        }
        else if (key == 'bottom') {
          this.bottomContent = Math.floor(Math.random() * 200)
          return cpyItem['style2'][key]['pointText'].replace("${R}", this.bottomContent)
        }
        else {
          this.centerContent = Math.floor(Math.random() * 200)
          return cpyItem['style2'][key]['pointText'].replace("${R}", this.centerContent);
        } 
      } else {
        var replace = this.$utils.replacePlaceholders(cpyItem['style2'][key]["pointText"], this.pointInfo);
        if (key == 'top') this.topContent = replace.usedValues[0] || 0
        else if (key == 'bottom') this.bottomContent = replace.usedValues[0] || 0
        else this.centerContent = replace.usedValues[0] || 0
        return this.$utils.replacePointText(replace.replacedText)
      }
    },
    // ========================================================= 組件動作 =========================================================
    // 核心的補間動畫函式，使用requestAnimationFrame實現平滑過渡
    tweenValue(property, targetValue) {
      const startValue = this[property];
      const duration = 1000; // 動畫持續時間 (毫秒)
      let startTime = null;

      const step = (currentTime) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        // 計算當前幀的數值
        this[property] = startValue + (targetValue - startValue) * progress;

        // 如果動畫未完成，請求瀏覽器在下一次重繪前繼續呼叫 step 函式
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    // 將一個範圍內的數值，轉換為另一個範圍內的數值 (角度)
    mapValueToAngle(value, range) {
      const { val_min, val_max, ang_min, ang_max } = range;
      if (val_max === val_min) return ang_min;
      let angle = (value - val_min) * (ang_max - ang_min) / (val_max - val_min) + ang_min;
      return Math.max(ang_min, Math.min(angle, ang_max)); // 限制結果在目標範圍內
    },
    // 根據角度和半徑，用三角函數計算出在圓周上的 x, y 座標
    calculateTextPosition(angle, radius) {
      const angleRad = angle * (Math.PI / 180); // 將角度轉換為弧度
      return {
        x: 125 + radius * Math.sin(angleRad),
        y: 125 - radius * Math.cos(angleRad), // SVG 的 Y 軸是向下的，所以用減號
      };
    },
    // 計算刻度間隔
    calculateNiceStep(range) {
      if (range <= 0) return 1;
      const rawStep = range / 5; // 1. 計算原始間隔
      const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep))); // 2. 計算數量級 (1, 10, 100...)
      const normalizedStep = rawStep / magnitude; // 3. 標準化

      // 4. 將標準化後的值，取到最接近的「優良」數字 (1, 2, 5)
      let niceNormalizedStep;
      if (normalizedStep < 1.5) niceNormalizedStep = 1;
      else if (normalizedStep < 3.5) niceNormalizedStep = 2; // 或 2.5，取決於需求
      else if (normalizedStep < 7.5) niceNormalizedStep = 5;
      else niceNormalizedStep = 10;
      return niceNormalizedStep * magnitude; // 5. 返回最終間隔
    },
    // 根據範圍、步長等參數，生成一個包含所有刻度資訊的陣列
    generateTicks(range, idPrefix) {
      const ticks = [];
      const tickLabelRadius = 140;
      const dataRange = range.val_max - range.val_min;
      // 1. 計算主刻度間隔
      const majorStep = this.calculateNiceStep(dataRange);
      // 2. 計算次要刻度間隔
      const minorStep = majorStep / 6;
      // 3. 以次要刻度為步長，遍歷整個範圍
      for (let i = 0; i <= dataRange; i += minorStep) {
        // 使用一個小的容差來處理浮點數精度問題
        const tolerance = 1e-9; 
        const value = range.val_min + i;
        // 如果當前值幾乎可以被主刻度間隔整除，則視為主刻度
        const isMajor = Math.abs(value % majorStep) < tolerance || Math.abs(value % majorStep - majorStep) < tolerance;
        const angle = this.mapValueToAngle(value, range);
        ticks.push({
          id: `${idPrefix}-${value}`,
          type: idPrefix, value: Math.round(value), angle: angle, isMajor: isMajor,
          textPos: this.calculateTextPosition(angle, tickLabelRadius),
        });
      }
      return ticks;
    },
  },
};
</script>

<style lang="scss" scoped>
// 樣式部分
.gauge-container {
  background-color: #21212100;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none; /* 防止用戶選取 SVG 內的文字 */
  font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
}
.gauge-svg {
  width: 100%;
  height: 100%;
}
.center-text-label, .center-text-value {
  text-anchor: middle; /* 文字水平居中 */
  dominant-baseline: middle; /* 文字垂直居中 */
}
.center-text-label {
  font-size: 30px;
  font-weight: bold;
}
.center-text-value {
  font-size: 20px;
}
.arc-text-cutout {
  font-size: 20px;
  font-weight: bold;
  fill: #212121; /* 使用背景色填充，製造 "蝕刻" 效果 */
  text-transform: uppercase;
  letter-spacing: 2px;
  text-anchor: middle;
}

.pointer-label {
  font-size: 18px;
  font-weight: bold;
  dominant-baseline: middle;
}
.tick-label {
  font-size: 12px;
  text-anchor: middle;
  dominant-baseline: middle;
}
</style>