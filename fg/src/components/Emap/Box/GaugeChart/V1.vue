<template>
  <div class="gauge-container-standalone" :style="{ width: item.width - 2 + 'px', height: item.height - 2 + 'px' }">
    <svg :viewBox="`0 0 ${viewBoxSize} ${viewBoxSize}`" preserveAspectRatio="xMidYMid meet">
      <!-- 裝飾環 -->
      <circle :cx="centerX" :cy="centerY" :r="viewBoxSize / 2 - 12" fill="none" :stroke="item['style1']['ringColor'][0]" stroke-width="4" />
      <circle :cx="centerX" :cy="centerY" :r="viewBoxSize / 2 - 17" fill="none" :stroke="item['style1']['ringColor'][1]" stroke-width="5" />
      <!-- 儀表板背景圓 -->
      <circle :cx="centerX" :cy="centerY" :r="radius + viewData.gaugeStrokeWidth / 2 + 5" :fill="item['style1']['bgColor']" />

      <!-- 儀表盤 -->
      <g class="segments">
        <path v-for="(segment, index) in segmentsData" :key="'segment-' + index" :d="segment.path"
          :stroke="segment.color" :stroke-width="viewData.gaugeStrokeWidth" fill="none" stroke-linecap="butt" />
      </g>

      <!-- 刻度線和標籤 -->
      <g class="ticks">
        <!-- 主要刻度線 -->
        <g v-for="(tick, index) in majorTicksData" :key="'major-tick-' + index">
          <line
            :x1="tick.x1" :y1="tick.y1"
            :x2="tick.x2" :y2="tick.y2"
            :stroke="item['style1']['scaleColor']"
            :stroke-width="viewBoxSize * 0.01"
          />
          <text
            :x="tick.labelX" :y="tick.labelY"
            :fill="item['style1']['scaleTextColor']" :font-size="viewBoxSize * 0.045"
            :text-anchor="tick.textAnchor" dominant-baseline="middle">
            {{ tick.value }}
          </text>
        </g>
        <!-- 次要刻度線 -->
        <g v-for="(tick, index) in minorTicksData" :key="'minor-tick-' + index">
          <line
            :x1="tick.x1" :y1="tick.y1"
            :x2="tick.x2" :y2="tick.y2"
            :stroke="item['style1']['scaleColor']"
            :stroke-width="viewBoxSize * 0.008"
          />
        </g>
      </g>

      <!-- 中心文字 -->
      <text :x="centerX" :y="centerY + viewBoxSize * 0.21" text-anchor="middle" :font-size="viewBoxSize * 0.08" font-weight="bold" :fill="item['style1']['titleColor']">
        {{ item['style1']['titleText'] }}
      </text>
      <text :x="centerX" :y="centerY + viewBoxSize * 0.31" text-anchor="middle" :font-size="viewBoxSize * 0.07" :fill="item.textColor">
        {{ computedTargetValue }}
      </text>

      <!-- 指針組 -->
      <g :transform="`rotate(${displayNeedleRotation} ${centerX} ${centerY})`">
        <line class="needle-line" :x1="centerX" :y1="centerY" :x2="centerX" :y2="needleTipYLocation" :stroke="item['style1']['needleColor']" :stroke-width="viewBoxSize * 0.018" stroke-linecap="round" />
        <circle :cx="centerX" :cy="centerY" :r="viewBoxSize * 0.04" :fill="item['style1']['needleColor']" />
      </g>
    </svg>
  </div>
</template>

<script>

export default {
  props: ["componentChange", "item", "pointInfo"],
  data() {
    return {
      // ============================= 隨機數設定 =============================
      randomTimer: null,
      gaugeValue: 0,
      // ============================= 儀表板設定 =============================
      viewBoxSize: 250, // SVG 視圖框的尺寸，影響內部所有元素的相對大小和位置
      // *** MODIFIED: 將顏色定義移出，segments 將會被動態計算 ***
      segmentColors: ['#D9534F', '#A9CCE3', '#A9CCD3', '#1A5276'],
      viewData: {
        minValue: 0, maxValue: 200,       // 指針可表示的最小和最大數值
        gaugeStrokeWidth: 20,             // 儀表板彩色弧段的寬度 (厚度)
        startAngle: -115, endAngle: 115,  // 儀表板弧線的開始和結束角度 (度)
        minorTickCountPerMajor: 4,        // 每個主要刻度之間次要刻度的數量
      },
      displayNeedleRotation: -135,        // 指針當前在屏幕上顯示的旋轉角度，用於動畫
      animationFrameId: null,             // requestAnimationFrame 的 ID，用於取消動畫
    };
  },
  computed: {
    // 讀取點位值
    computedTargetValue() { return this.setPointText() },
    // 中間X、Y
    centerX() { return this.viewBoxSize / 2; },
    centerY() { return this.viewBoxSize / 2; },
    // 儀錶盤彩色弧段的半徑
    radius() { return this.viewBoxSize / 2 - this.viewData.gaugeStrokeWidth / 2 - (this.viewBoxSize * 0.12); },
    // 錶盤弧線的總角度跨度
    totalAngleSpan() { return this.viewData.endAngle - this.viewData.startAngle; },
    // 根據 minValue 和 maxValue 自動生成4個等分的 segments
    generatedSegments() {
      const { minValue } = this.viewData;
      const range = this.item['style1']['maxValue'] - minValue;
      // 如果範圍無效，返回空陣列
      if (range <= 0) return [];
      const segments = [];
      var dashboard_color = this.item['style1']['dashboardColor']
      const step = range / dashboard_color.length; // 根據顏色數量來決定分段數 (目前是4)

      for (let i = 1; i <= dashboard_color.length; i++) {
        segments.push({ value: minValue + i * step, color: dashboard_color[i - 1] });
      }
      return segments;
    },

    // 計算指針應該指向的目標旋轉角度。
    targetNeedleRotation() {
      var maxvalue = this.item['style1']['maxValue']
      const value = Math.max(this.viewData.minValue, Math.min(maxvalue, this.gaugeValue));
      const range = maxvalue - this.viewData.minValue;
      if (range === 0) return this.viewData.startAngle; // 避免除以零
      const percentage = (value - this.viewData.minValue) / range;
      return this.viewData.startAngle + percentage * this.totalAngleSpan;
    },
    // 計算指針尖端在指針垂直向上時的 Y 座標
    needleTipYLocation() {
      return this.centerY - (this.radius - (this.viewBoxSize * 0.02));
    },
    // 計算儀錶盤彩色弧段的 SVG 路徑數據
    segmentsData() {
      var maxvalue = this.item['style1']['maxValue']
      const segments = [];
      let currentAngleStart = this.viewData.startAngle;
      const range = maxvalue - this.viewData.minValue;
      if (range === 0) return [];
      
      const sortedSegments = [...this.generatedSegments].sort((a, b) => a.value - b.value);
      let lastProcessedValue = this.viewData.minValue;

      sortedSegments.forEach(segmentDef => {
        if (segmentDef.value <= lastProcessedValue && segmentDef.value !== this.viewData.minValue) return;
        const percentageOfTotalForSegmentEnd = (segmentDef.value - this.viewData.minValue) / range;
        const segmentAngleEnd = this.viewData.startAngle + Math.min(1, Math.max(0, percentageOfTotalForSegmentEnd)) * this.totalAngleSpan;
        if (segmentAngleEnd > currentAngleStart || (segmentAngleEnd === currentAngleStart && segmentDef.value === this.viewData.minValue)) {
          segments.push({
            path: this.describeArc(this.centerX, this.centerY, this.radius, currentAngleStart, segmentAngleEnd),
            color: segmentDef.color,
          });
        }
        currentAngleStart = segmentAngleEnd;
        lastProcessedValue = segmentDef.value;
      });
      return segments;
    },
    // 計算主要刻度線及其標籤的數據
    majorTicksData() {
      var maxvalue = this.item['style1']['maxValue']
      const ticks = [];
      const majorTickValues = [this.viewData.minValue];
      
      this.generatedSegments.forEach(s => {
        const roundedValue = Math.round(s.value * 10) / 10;
        if (!majorTickValues.includes(roundedValue) && roundedValue <= maxvalue) majorTickValues.push(roundedValue);
      });
      // 確保最大值刻度也作為主要刻度 (如果配置中未包含)
      if (maxvalue !== this.viewData.minValue && !majorTickValues.includes(maxvalue)) majorTickValues.push(maxvalue);
      majorTickValues.sort((a, b) => a - b);
      const uniqueMajorTickValues = [...new Set(majorTickValues)]; // 再次去重以防萬一
      const range = maxvalue - this.viewData.minValue;
      if (range === 0 && this.viewData.minValue === maxvalue) {
        uniqueMajorTickValues.splice(0, uniqueMajorTickValues.length, this.viewData.minValue);
      } else if (range === 0) return [];
      
      uniqueMajorTickValues.forEach(val => {
        const percentage = (val - this.viewData.minValue) / range;
        const angle = this.viewData.startAngle + percentage * this.totalAngleSpan;

        const tickInnerRadius = this.radius - this.viewData.gaugeStrokeWidth / 2;
        const tickOuterRadius = this.radius + this.viewData.gaugeStrokeWidth / 2;
        const labelRadius = this.radius - this.viewData.gaugeStrokeWidth / 2 - (this.viewBoxSize * 0.07);

        const p1 = this.polarToCartesian(this.centerX, this.centerY, tickInnerRadius, angle);
        const p2 = this.polarToCartesian(this.centerX, this.centerY, tickOuterRadius, angle);
        let pLabel = this.polarToCartesian(this.centerX, this.centerY, labelRadius, angle);
        let textAnchor = "middle";
        let dominantBaseline = "middle"; 

        if (angle < -120 && angle > -150) { pLabel.y += 3; pLabel.x -=5; } 
        else if (angle > 120 && angle < 150) { pLabel.y += 3; } 
        else if (angle < 45 && angle > 15) { textAnchor = "start"; pLabel.x -=3; } 

        ticks.push({
          value: val, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
          labelX: pLabel.x, labelY: pLabel.y,
          textAnchor: textAnchor, dominantBaseline: dominantBaseline, 
        });
      });
      return ticks;
    },
    // 計算次要刻度線的數據。
    minorTicksData() {
      const ticks = [];
      const range = this.item['style1']['maxValue'] - this.viewData.minValue;
      if (range === 0 || this.viewData.minorTickCountPerMajor <= 0) return [];
      const majorTickValues = this.majorTicksData.map(t => t.value).sort((a,b) => a-b);

      for (let i = 0; i < majorTickValues.length -1; i++) {
        const startMajor = majorTickValues[i];
        const endMajor = majorTickValues[i+1];
        const interval = (endMajor - startMajor) / (this.viewData.minorTickCountPerMajor + 1);

        for (let j = 1; j <= this.viewData.minorTickCountPerMajor; j++) {
          const minorVal = startMajor + interval * j;
          if (majorTickValues.includes(Math.round(minorVal*10) / 10)) continue;

          const percentage = (minorVal - this.viewData.minValue) / range;
          const angle = this.viewData.startAngle + percentage * this.totalAngleSpan;

          const tickInnerRadius = this.radius - this.viewData.gaugeStrokeWidth / 2;
          const tickOuterRadius = this.radius - this.viewData.gaugeStrokeWidth / 2 + (this.viewData.gaugeStrokeWidth * 0.4);

          const p1 = this.polarToCartesian(this.centerX, this.centerY, tickInnerRadius, angle);
          const p2 = this.polarToCartesian(this.centerX, this.centerY, tickOuterRadius, angle);
          ticks.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
        }
      }
      return ticks;
    }
  },
  watch: {
    // 監聽指針目標旋轉角度的變化。
    targetNeedleRotation(newValue, oldValue) {
      if (newValue !== oldValue) this.animateNeedle(newValue);
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
    // 當前顯示的指針角度初始化為目標角度
    this.displayNeedleRotation = this.targetNeedleRotation;
  },
  beforeUnmount() {
    // 組件卸載前，清除動畫幀
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.stopRandomTimer();
  },
  methods: {
    // 設定隨機亂數(每5秒，有${R}才更新)
    startRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
      var includeRandomData = this.item['style1']["pointText"].includes("${R}");
      if (this.componentChange && includeRandomData) {
        this.randomTimer = setInterval(() => {
          this.gaugeValue = Math.floor(Math.random() * (this.item['style1']['maxValue'] - this.viewData.minValue + 1)) + this.viewData.minValue;
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
        return this.$utils.replacePointText(this.item['style1']["pointText"])
      }
      var cpyItem = JSON.parse(JSON.stringify(this.item));
      var includeRandomData = cpyItem['style1']["pointText"].includes("${R}");
      if (includeRandomData) {
        this.gaugeValue = Math.floor(Math.random() * (this.item['style1']['maxValue'] - this.viewData.minValue + 1)) + this.viewData.minValue;
        return cpyItem['style1']["pointText"].replace("${R}", this.gaugeValue);
      }
      else {
        var replace = this.$utils.replacePlaceholders(this.item['style1']["pointText"], this.pointInfo);
        this.gaugeValue = replace.usedValues[0] || 0
        return this.$utils.replacePointText(replace.replacedText)
      }
    },
    // ========================================================= 組件動作 =========================================================
    // 座標轉換 ==> 極座標 (半徑, 角度) 轉換為笛卡爾座標 (x, y)
    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
      };
    },
    // 生成 SVG <path> 元素的 'd' 屬性字串來繪製圓弧。
    describeArc(x, y, radius, startAngleDegrees, endAngleDegrees) {
      if (Math.abs(endAngleDegrees - startAngleDegrees) < 0.001) return ""; // 弧度太小則不繪製
      // 防止角度跨度超過或等於360度導致SVG繪製問題
      if (Math.abs(endAngleDegrees - startAngleDegrees) >= 359.999) {
        if (endAngleDegrees > startAngleDegrees) endAngleDegrees = startAngleDegrees + 359.99;
        else endAngleDegrees = startAngleDegrees - 359.99;
      }
      const startPoint = this.polarToCartesian(x, y, radius, startAngleDegrees);
      const endPoint = this.polarToCartesian(x, y, radius, endAngleDegrees);
      const arcAngleAbsolute = Math.abs(endAngleDegrees - startAngleDegrees);
      const largeArcFlag = arcAngleAbsolute <= 180 ? "0" : "1"; // 判斷是小弧還是大弧
      const sweepFlag = endAngleDegrees > startAngleDegrees ? "1" : "0"; // 判斷繪製方向 (1為順時針)
      return ["M", startPoint.x, startPoint.y, "A", radius, radius, 0, largeArcFlag, sweepFlag, endPoint.x, endPoint.y].join(" ");
    },
    // 使用 requestAnimationFrame 平滑地動畫指針到目標旋轉角度。
    animateNeedle(targetRotation) {
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId); // 取消之前的動畫幀
      const animate = () => {
        const diff = targetRotation - this.displayNeedleRotation;
        const easingFactor = 0.03; // 動畫緩和因子，值越小動畫越慢
        if (Math.abs(diff) < 0.1) { // 如果差異足夠小，則停止動畫
          this.displayNeedleRotation = targetRotation;
          this.animationFrameId = null;
          return;
        }
        this.displayNeedleRotation += diff * easingFactor; // 更新顯示角度
        this.animationFrameId = requestAnimationFrame(animate); // 請求下一幀動畫
      };
      this.animationFrameId = requestAnimationFrame(animate); // 啟動動畫
    },
  },
};
</script>


<style scoped>
.gauge-container-standalone {
  user-select: none;
}
.gauge-container-standalone svg {
  width: 100%;
  height: 100%;
}
</style>