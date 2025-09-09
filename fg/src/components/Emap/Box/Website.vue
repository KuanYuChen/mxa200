<template>
  <div :style="{ width: item.width, height: item.height, userSelect: 'none'}">
    <iframe :src="item.weburl" frameborder="1" :width="item.width - 5" :height="item.height - 5">
      看不到頁面時才會顯示這行文字
    </iframe>
    <div v-if="!componentChange" 
      style=" position: absolute; top: 0; left: 0; z-index: 10; width: 100%; height: 100%; background-color: transparent;"
      oncontextmenu="return false"
    />
  </div>
</template>

<script>
export default {
  props: ["componentChange", "item"],
}
</script>