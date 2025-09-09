<!-- =================================================== 顏色選擇器組件 =================================================== -->
<template>
  <v-menu :close-on-content-click="false">
    <template #activator="{ props }">
      <v-text-field
        :id="colorID"
        :name="colorID"
        :style="fieldStyle"
        v-model="internalColor"
        :label="label"
        variant="outlined"
        v-bind="props"
      />
    </template>
    <v-color-picker v-model="internalColor" />
  </v-menu>
</template>

<script>
export default {
  props: ['fieldStyle', 'colorModel', 'label'],
  data() {
    return {
      internalColor: this.colorModel,
      colorID: crypto.randomUUID()
    };
  },
  watch: {
    internalColor(newVal) {
      this.$emit('update:colorModel', newVal);
    },
    colorModel(newVal) {
      if (newVal !== this.internalColor) {
        this.internalColor = newVal;
      }
    }
  }
};
</script>


<style lang="scss" scoped>
:deep(.v-overlay__content) {
  min-width: 0px !important; 
}
</style>