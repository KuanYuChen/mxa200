<!-- =================================================== 動態可往上疊加 Snackbar =================================================== -->
<template>
  <!-- <div class="snackbar-stack-container">
    <div v-for="(snack, i) in snackbar_list" :key="snack.id" class="snackbar-wrapper">
      <v-snackbar v-model="snack.show" timeout="-1" :color="snack.bgcolor" location="bottom end" transition="slide-x-reverse-transition">
        {{ snack.text }}
        <template #actions><v-btn icon @click="closeSnackbar(i)"><v-icon icon="mdi-close"/></v-btn></template>
      </v-snackbar>
    </div>
  </div> -->
  <div class="toast-container">
    <div class="toast" v-for="(toast, index) in snackbar_list" :key="toast.id" :style="{ bottom: `${index * (toastHeight + gap)}px`, background: toast.bgcolor }">
      <div style="display: flex;">
        <strong>{{ toast.text }}</strong>
        <v-spacer></v-spacer>
        <v-icon @click="closeToast(toast)">mdi-close</v-icon>
      </div>
    </div>
  </div>
</template>


<script>
import { useSetup } from '@/store/module/setup.js'
import { mapWritableState } from 'pinia'

export default {
  computed: {
    ...mapWritableState(useSetup, ["snackbar_list"]),
  },
  data(){
    return {
      toastHeight: 50, // 每個toast高度
      gap: 1           // 間距
    }
  },
  methods: {
    // closeSnackbar(index) {
    //   var state = useSetup().$state
    //   if (state.snackbar_list[index]) state.snackbar_list[index].show = false; // 觸發關閉動畫
    // },
    closeToast(toast) {
      var state = useSetup().$state
      const index = state.snackbar_list.findIndex(t => t.id === toast.id);
      if (index !== -1) state.snackbar_list.splice(index, 1);
    },
  }
}
</script>


<style scoped>
.toast-container {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 9999;
  pointer-events: none;
}

.toast {
  position: absolute;
  right: 0;
  min-width: 350px;
  color: white;
  padding: 10px 16px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: auto;
}

.toast.toast-show {
  opacity: 1;
  transform: translateY(0); /* 顯示時往上浮現 */
}

</style>
