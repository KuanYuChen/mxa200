<template>
  <!-- <v-badge v-if="item['alarmHistory']" color="red" offset-x="-10" offset-y="-10" :content="item['alarmHistory'].length">
    <span style="white-space: normal;">{{ setPointText(item) }}</span>
  </v-badge>
  <span v-else style="white-space: normal;">{{ setPointText(item) }}</span> -->
  <!-- <div class="edit-box">
    <input class="edit-input" 
      :style="{width: '100%', height: '100%', 'color': item.textColor, 'fontSize': `${item.fontSize}px`}" 
      v-model="item['pointText']" 
      type="text"  
      @focus="recordOriginalValue(item)"
      @blur="() => onBlurCheckChange(item)"
    />
  </div> -->
  <h2 :style="{'color': item['textColor'], 'fontSize': `${item['fontSize']}px`, justifyContent: `${item['textAlign']}`, 'padding': '0px 10px'}">
    <span style="text-transform: capitalize; white-space: normal;">{{ setPointText(item) }}</span>
  </h2>
</template>

<script>

export default {
  props: ["componentChange", "item", "changeEmap", "pointInfo"],
  data() {
    return {
      randomTimer: null,
      randomValue: 0,
      originalTitleMap: {}, // 記錄輸入框組件的原始文字
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
        var replace = this.$utils.replacePlaceholders(item['pointText'], this.pointInfo);
        return this.$utils.replacePointText(replace.replacedText)
      }
    },
    // ========================================================= 組件動作 =========================================================
    // 確認是否有修改輸入框文字
    recordOriginalValue(item) {
      this.originalTitleMap[item.id] = item.pointText;
    },
    onBlurCheckChange(item) {
      const oldVal = this.originalTitleMap[item.id];
      const newVal = item.pointText;
      if (oldVal !== newVal) this.changeEmap("修改輸入框文字");
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
}

// 消除輸入框Focus時的框
input:focus {
  outline: none;
}

// Resize 修改框
.edit-box {
  position: relative;
  .edit-input {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    text-align: center;
    // border: black 1px solid;
  }
}
</style>