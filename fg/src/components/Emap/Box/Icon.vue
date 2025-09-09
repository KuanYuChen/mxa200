<template>
  <v-icon class="icon-box"
    :style="{ 'fontSize': `${Math.min(item.width, item.height)}px` }"
    :color="currentIconColor"
    :icon="item.icon"
    @click="execFunc"
  />
</template>
<script>
export default {
  props: ["componentChange", "item", "execFunc"],
  data() {
    return {
      currentIconColor: null
    };
  },
  created() {
    this.getIconColor()
  },
  watch: {
    'item.iconColor'(color) {
      this.currentIconColor = color
    }
  },
  methods: {
    getIconColor() {
      this.currentIconColor = this.item.iconColor
      // if (this.componentChange) {
      //   clearInterval();
      //   setInterval(() => {
      //     if (this.currentIconColor == this.item.iconColor) this.currentIconColor = "red"
      //     else this.currentIconColor = this.item.iconColor
      //   }, 500);
      // }
    },
  }
}
</script>


<style lang=scss scoped>
// ICON格式
.icon-box {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>