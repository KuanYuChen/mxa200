<template>
  <!-- <div v-if="item.edit && dragitem.includes(item)" style="width: 100%;height: 100%;" class="edit-box">
    <h2 class="edit-input" @blur="blurEditText">調整攝影機大小</h2>
  </div> -->
  <video :src="item.monitor" autoplay controls width="100%" height="100%" @dblclick.stop></video>
</template>
<script>
export default {
  props: ["componentChange", "item", "dragitem", "blurEditText"],
  methods: {
    toggleFullscreen(event) {
      event.preventDefault();  // 阻止預設行為
      event.stopPropagation(); // 阻止事件冒泡
    }
  }
}
</script>

<style lang=scss scoped>
// 攝影機框文字格式
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
// Resize 修改框
.edit-box {
  .edit-input {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    text-align: center;
    // border: black 1px solid;
  }
  .resize-handle {
    position: absolute;
    width: 8px;
    height: 8px;
    background-color: gray;
    cursor: pointer;
  }
  // 左上角
  #top-left {
    top: 0;
    left: 0;
    cursor: nw-resize;
  }
  // 右上角
  #top-right {
    top: 0;
    right: 0;
    cursor: ne-resize;
  }
  // 左下角
  #bottom-left {
    bottom: 0;
    left: 0;
    cursor: sw-resize;
  }
  // 右下角
  #bottom-right {
    bottom: 0;
    right: 0;
    cursor: se-resize;
  }
}
</style>