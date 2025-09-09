<template>
  <v-btn :style="btnStyle" :elevation="item.shadowSize" :readonly="item.btnReadonly" @mouseover="item['hover'] = true" @mouseleave="item['hover'] = false;" @click="execFunc">
    <span style="text-transform: capitalize; white-space: normal;">{{ setPointText(item) }}</span>
  </v-btn>
</template>
<script>
export default {
  props: ["componentChange", "item", "execFunc", "pointInfo"],
  data() {
    return {
      randomTimer: null,
      randomValue: 0,
    }
  },
  computed: {
    btnStyle() {
      return {
        width: '100%',
        height: '100%',
        borderRadius: `${this.item['btnRadius']}px`,
        color: this.item['textColor'],
        backgroundColor: this.item['bgColor'],
        opacity: this.item["hover"] ? 1 : this.item['btnOpacity'],
        fontSize: `${this.item['fontSize']}px`,
        transition: "all 0.3s ease",
        justifyContent: this.item['textAlign'],
        overflow: 'hidden',
        display: 'flex',
      };
    },
  },
  watch: {
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
    // 設定隨機亂數(每5秒，並確定有隨機數才會操作)
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
  }
}
</script>