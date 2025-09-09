<template>
  <h2 :style="{'color': item.textColor, 'fontSize': `${item.fontSize}px`}">{{ item["timenow"] }}</h2>
</template>
<script>
export default {
  props: ["componentChange", "item"],
  data() {
    return {
      now: null, // 初始時間戳
    };
  },
  created() {
    this.getTimer()
  },
  methods: {
    getTimer() {
      clearInterval(this.timer)
      this.timer = null;
      this.item['timenow'] = this.item["timeFormat"] == 'ad' ? this.getDateTimeFormats() : this.getROCFullDateTime()
      this.timer = setInterval(() => this.item['timenow'] = this.item["timeFormat"] == 'ad' ? this.getDateTimeFormats() : this.getROCFullDateTime() , 100);
    },
    getDateTimeFormats() {
      const now = new Date();
      // 年月日
      const yearCE = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");

      // 時分秒
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      return `${yearCE}/${month}/${day} ${hours}:${minutes}:${seconds}`
    },

    getROCFullDateTime() {
      const now = new Date();
      const yearROC = now.getFullYear() - 1911;
      const month = now.getMonth() + 1;
      const day = now.getDate();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      return `民國${yearROC}年${month}月${day}日 ${hours}點${minutes}分${seconds}秒`;
    },
  },
  beforeUnmount() {
    clearInterval(this.timer); // 清除計時器
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