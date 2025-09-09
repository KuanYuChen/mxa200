<template>
  <v-img 
    :src="getImageURL" 
    style="user-select: none;" 
    contain
    draggable="false" :width="item.width" :height="item.height" 
    @click="execFunc"
  >
    <div class="d-flex align-center" :style="imageTextStyle">
      <span style="text-transform: capitalize; white-space: normal;">{{ setPointText(item) }}</span>
    </div>
  </v-img>
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
    getImageURL() {
      return `http://${window.location.hostname}:4456/image/${this.item.image}`
    },
    imageTextStyle() {
      return {
        width: '100%',
        height: '100%',  
        padding: '0px 30px',
        'font-weight': 'bold',

        color: this.item.textColor || 'white',
        fontSize: `${this.item.fontSize}px` || '30px',
        'justify-content': this.item.textAlign || 'center',
      }
    }
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
        var replace = this.$utils.replacePlaceholders(item["pointText"], this.pointInfo)
        return this.$utils.replacePointText(replace.replacedText)
      }
    },
  }
}
</script>
