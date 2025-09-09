<template>
  <v-app style="background: rgb(233, 233, 233);">
    <router-view name="headerbar" />
    <div>
      <router-view name="nav" />
      <router-view :key="$route.fullPath" />
    </div>
    <showAlertDialog />
    <!--  操作提示Snack Bar  -->
    <SnackbarShow />
  </v-app>
</template>

<script>
import showAlertDialog from '@/components/animation/showAlertDialog.vue';
import SnackbarShow from '@/components/animation/SnackbarShow.vue';
import { useSetup } from '@/store/module/setup.js' // Pinia

import { onMouseMove, onMouseUp, onResize, onResizeMouseUp } from '@/views/Emap/jsfile/emap.js'
import { handleKeydown } from '@/views/Emap/jsfile/keyboard.js'
export default {
  components: { showAlertDialog, SnackbarShow },
  data() {
    return {
      Setup: useSetup().$state,
    }
  },
  watch: {
    $route() {
      setTimeout(() => {
        window.removeEventListener("keydown", this.handleKeydown);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("mouseup", this.onMouseUp);
        window.removeEventListener("mousemove", this.onResize);
        window.removeEventListener("mouseup", this.onResizeMouseUp);
      }, 10);
    }
  },
  mounted() {
    this.getSystemInfo();
    this.checkBrowser();
    window.addEventListener("keydown", this.globalKeydown);
    // TODO: 這裡要做集中式API處理(統一設定 EX: 通訊協議、點位、排程、事件、告警等 UUID列表，只在第一次讀取，並透過Setup Global方式保存)
  },
  unmounted() {
    window.removeEventListener("keydown", this.globalKeydown);
  },
  methods: {
    handleKeydown, onMouseMove, onMouseUp, onResize, onResizeMouseUp,
    // 取得系統資訊
    getSystemInfo() {
      useSetup().getSystemInfo().then((res)=> {
        this.Setup.systemInfo = res['data']
      })
    },
    // 確認瀏覽器
    checkBrowser() {
      this.Setup.browser = navigator.userAgent.indexOf('Firefox') !== -1 ? "Firefox" : "Chrome"
    },
    // 全域鍵盤函數
    globalKeydown(ev) {
      if (ev.ctrlKey) {
        switch (ev.key) {
          case "d":
          case "D": // Ctrl + D，回到 /edit/:pathnow 路徑
            ev.preventDefault();
            this.setGOTOPath('/edit')
            break;
          case "f":
          case "F": // Ctrl + F，回到 /view/:pathnow 路徑
            ev.preventDefault();
            this.setGOTOPath('/view')
            break;
        }
      }
    },
    setGOTOPath(pathname) {
      var path = this.$route.path
      if (path == "/login") return; // 登入頁面禁止
      const parts = path.split('/').map(s => s.trim());
      var checkPageMode = parts[1] == "view" || parts[1] == "edit"
      if (parts.length == 3 && checkPageMode) return // 確認是否為編輯或預覽頁面，是則禁止 (在編輯或預覽頁面有自己的鍵盤控制)
      else this.$router.push(`${pathname}/${this.Setup.viewFirstPage}`)
    }
  }
}
//
</script>


<style lang="scss">
.show-animation {
  animation: show_info 1s;
}
@keyframes show_info {
  0% { 
    opacity: 0;
  }
  100% { 
    opacity: 1; 
  }
}

// Dialog Btn
.actions-btn {
  min-width:100px;
  margin: 0px 15px;
}
</style>