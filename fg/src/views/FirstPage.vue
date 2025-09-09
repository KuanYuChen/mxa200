<!-- =================================================== E-MAP跳轉頁面 =================================================== -->
<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <h3>Emap 跳轉頁面</h3>
  </v-main>

</template>

<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  data() {
    return { Setup: useSetup().$state };
  },
  mounted() {
    // 重定位路徑
    setTimeout(() => {
      if (this.Setup.systemInfo['Module'] == 'MXA-200') this.$router.push("/protocols")
      else this.$router.push("/edit/1")
    }, 10);
  },
};
</script>