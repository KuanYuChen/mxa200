<template>
  <nav>
    <v-app-bar flat :height="isEditRoute ? 30 : 64" class="headerbar" >
    <v-app-bar-nav-icon 
      :color="Setup.settingDrawer ? '#f3a28f' : 'white'" 
      @click="Setup.settingDrawer = !Setup.settingDrawer; Setup.pageDrawer = false;" 
    />
    <v-app-bar-nav-icon v-if="Setup.systemInfo['Module'] != 'MXA-200'"
      :color="Setup.pageDrawer ? '#f3a28f' : 'white'" icon="mdi-arrow-left-right"
      @click="Setup.pageDrawer = !Setup.pageDrawer; Setup.settingDrawer = false;" 
    />
    <span class="font-weight-bold ml-2 header-title" :style="{'user-select':'none', 'font-size': `${isEditRoute ? 20 : 35}px` }"> 
      {{ Setup.headerTitle }} 
    </span>
    <v-spacer></v-spacer>
    <v-btn @click="checkLogout = true">
      <v-icon size="large" style="color: white">mdi-location-exit</v-icon> 
    </v-btn>
  </v-app-bar>
    <v-dialog v-model="checkLogout" width="550px">
      <v-card>
        <v-card-title>
          <v-container>
            <h2>Are you sure to logout ?</h2>
          </v-container>
        </v-card-title>
        <v-card-actions>
          <v-container>
            <v-row>
              <v-spacer></v-spacer>
              <v-btn style="color: red;" @click="checkLogout = false">Cancel</v-btn>
              <v-btn @click="logout()">Logout</v-btn>
            </v-row>
          </v-container>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </nav>
</template>

<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  data() {
    return {
      Setup: useSetup().$state,
      // =========================
      datetimeNow: Math.floor(new Date().getTime() / 1000), //現在時間
      countTime: 1, // 測試時間是否正確
      logoutTimer: 6000,
      // scanState: false,
      checkLogout: false,
      isEditRoute: true,
    };
  },
  watch: {
    $route(info) {
      this.getRoutePath(info.path);
      this.updateFullscreenState();
    },
  },
  created() {
    if (localStorage.getItem("User") == undefined) this.$router.push("/login")
    this.getRoutePath(this.$route.path);
    this.getWindowState();
    window.onresize = () => this.getWindowState();
  },
  mounted() {
    // 監聽 API 全螢幕的變化
    document.addEventListener('fullscreenchange', this.updateFullscreenState);
    document.addEventListener('mozfullscreenchange', this.updateFullscreenState);
    document.addEventListener('webkitfullscreenchange', this.updateFullscreenState);
    document.addEventListener('msfullscreenchange', this.updateFullscreenState);

    // 監聽 resize 事件，主要用來偵測 F11 模式的進出
    window.addEventListener('resize', this.updateFullscreenState);
    
    // 初始化時檢查一次，確保狀態正確
    this.updateFullscreenState();
  },
  beforeUnmount() {
    // 移除所有事件監聽器，避免記憶體洩漏
    document.removeEventListener('fullscreenchange', this.updateFullscreenState);
    document.removeEventListener('mozfullscreenchange', this.updateFullscreenState);
    document.removeEventListener('webkitfullscreenchange', this.updateFullscreenState);
    document.removeEventListener('msfullscreenchange', this.updateFullscreenState);
    
    // 移除 resize 監聽器
    window.removeEventListener('resize', this.updateFullscreenState);
  },
  methods: {
    getWindowState() {
      if (window.innerWidth < 700) this.Setup.isPhone = true;
      else this.Setup.isPhone = false;
    },
    getRoutePath(Path) {
      this.isEditPath();
      window.onmousemove = null
      clearInterval(this.logoutInterval);
      if (Path != "/") {
        this.startTimer();
        window.onmousemove = () => {
          this.datetimeNow = Math.floor(new Date().getTime() / 1000);
          localStorage.CountTime = Math.floor(new Date().getTime() / 1000);
          this.counts();
        };
      }
    },
    // 確認路徑為/edit/:pathnow
    isEditPath() {
      const parts = this.$route.path.split('/').map(s => s.trim());
      this.isEditRoute = parts.length == 3 && parts[1] == "edit" ? true : false;
    },
    // 開始計時
    startTimer() {
      localStorage.WebState == undefined ? this.$router.push("/login") : this.counts();
    },
    // 計時到閒置時間到時登出
    counts() {
      clearInterval(this.logoutInterval);
      this.logoutInterval = setInterval(() => {
        localStorage.CountTime = Math.floor(new Date().getTime() / 1000);
        this.countTime = localStorage.CountTime - this.datetimeNow
        // console.log("timer:", this.countTime);
        if (localStorage.CountTime - this.datetimeNow == this.logoutTimer) {
          clearInterval(this.logoutInterval);
          this.logout();
        }
      }, 1000);
    },
    toggleFullScreen() {
      // 檢查當前是否已處於任何一種全螢幕模式
      if (!this.Setup.fullscreenState) {
        // --- 進入全螢幕 (API) ---
        const el = document.documentElement;
        if (el.requestFullscreen) {
          el.requestFullscreen();
        } else if (el.mozRequestFullScreen) { // Firefox
          el.mozRequestFullScreen();
        } else if (el.webkitRequestFullscreen) { // Chrome, Safari, Opera
          el.webkitRequestFullscreen();
        } else if (el.msRequestFullscreen) { // IE/Edge
          el.msRequestFullscreen();
        }
      } else {
        // --- 退出全螢幕 (API) ---
        // 注意：如果目前是 F11 模式，這段程式碼不會有作用，
        // 使用者仍需手動按 F11 退出。
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
          document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari, Opera
          document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
          document.msExitFullscreen();
        }
      }
    },
    // 核心方法：檢查並更新全螢幕狀態
    updateFullscreenState() {
      // 判斷式 1: 檢查 Fullscreen API 的狀態
      const isApiFullscreen = !!(
        document.fullscreenElement ||
        document.mozFullScreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );

      // 判斷式 2: 檢查 F11 模式的狀態 (間接偵測)
      // 使用 >= 和一個很小的容錯值 (例如 5px) 來避免因作業系統工具列自動隱藏等造成的微小誤差
      const isF11Fullscreen = window.innerHeight >= (screen.height - 5);
      // 只要其中一種模式為 true，我們就認定為全螢幕
      this.Setup.fullscreenState = isApiFullscreen || isF11Fullscreen;
      // console.log("Full Screen State: ", isApiFullscreen, isF11Fullscreen, this.Setup.fullscreenState)
    },
    logout() {
      useSetup().logout().finally(()=>{
        this.$router.push("/login");
      })
    }
  },
};
</script>

<style lang="scss" scoped>
.headerbar {
  background-color: #E97132 !important;
}
.header-title {
  font-size:35px;
  color: white;
}

:deep(.v-toolbar__content) {
  // height: inherit !important; /* 確保內容容器也繼承高度 */
  align-items: center; /* 確保內容垂直居中 */
}
</style>
