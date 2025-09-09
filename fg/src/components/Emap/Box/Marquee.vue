<template>
  <!-- <v-badge v-if="item.alarmHistory" color="red" offset-x="-10" offset-y="-10" :content="item.alarmHistory.length">
    <span style="text-transform: capitalize; white-space: nowrap;">{{ setPointText(item) }}</span>
  </v-badge> -->
  <h2 :style="{'color': item.textColor, transform: `translateX(${position}px)`, 'fontSize': `${item.fontSize}px`}">
    <span style="text-transform: capitalize; white-space: normal;">{{ setPointText(item) }}</span>
  </h2>
</template>

<script>

export default {
  props: ["componentChange", "item", "pointInfo"],
  data() {
    return {
      marqueeTimer: null,
      position: 0, // 文字的 X 軸位置
      speed: 3, // 滾動速度

      randomTimer: null,
      randomValue: 0,
    };
  },
  watch: {
    componentChange: {
      handler(newValue, oldValue) {
        if (newValue) {
          this.startMarqueeTimer();
          this.startRandomTimer();
        }
        else {
          this.stopMarqueeTimer();
          this.stopRandomTimer();
        }
      },
      immediate: true
    }
  },
  beforeUnmount() {
    this.stopMarqueeTimer();
    this.stopRandomTimer();
  },
  methods: {
    // 設定隨機亂數(每5秒)
    startRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
      var includeRandomData = this.item["pointText"].includes("${R}")
      if (this.componentChange && includeRandomData) {
        this.randomTimer = setInterval(() => {
          this.randomValue = Math.floor(Math.random() * 1000)
        }, 5000);
      }
    },
    stopRandomTimer() {
      clearInterval(this.randomTimer);
      this.randomTimer = null;
    },
    // 設定點位數值
    setPointText(item) {
      if (!this.componentChange) {
        return this.$utils.replacePointText(item["pointText"])
      }
      var includeRandomData = item["pointText"].includes("${R}")
      if (includeRandomData) return item["pointText"].replace("${R}", this.randomValue)
      else {
        var replace = this.$utils.replacePlaceholders(item.pointText, this.pointInfo);
        return this.$utils.replacePointText(replace.replacedText)
      }
    },
    // ========================================================= 組件動作 =========================================================
    // 設定跑馬燈Timer重新定位位置
    startMarqueeTimer() {
      clearInterval(this.marqueeTimer);
      this.marqueeTimer = null;
      if (this.componentChange) {
        this.marqueeTimer = setInterval(() => {
          this.position -= this.speed;
          if (this.position < -this.item["width"] - 300) this.position = this.item["width"]; // 讓它從右邊重新進入
        }, 30);
      }
    },
    stopMarqueeTimer() {
      clearInterval(this.marqueeTimer);
      this.marqueeTimer = null;
    },
  }
}
</script>


<style lang=scss scoped>
// 輸入框文字格式
h2 {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  overflow-wrap: anywhere;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -moz-user-select: none;
  -ms-user-select: none; 
  user-select: none;
  // border: black 1px solid;
}
</style>