// Composables
import { createRouter, createWebHistory } from 'vue-router'

import Headerbar from '@/components/Headerbar.vue'
import Navigationbar from '@/components/Navigationbar'

import FirstPage from '@/views/FirstPage.vue'   // 首頁跳轉頁面
import NotFound from '@/components/NotFound'    // 無此路徑跳轉頁面
import Login from '@/views/Login.vue'           // 登入頁面

// ================================= 功能設定區 =================================
// 資料收集
import Protocols from '@/views/DataCollection/Protocols.vue'      // 通訊協議設定頁面
import Datapoint from '@/views/DataCollection/Datapoint.vue'      // 點位設定頁面

// 通知中心
import Event from '@/views/Message/Event.vue'                     // 事件設定
import Alarm from '@/views/Message/Alarm.vue'                     // 告警設定

// 日誌
import RecordHistory from '@/views/Recordhistory.vue'             // 日誌頁面

// 曲線圖
import ViewChart from '@/views/Linechart/index.vue'               // 曲線圖頁面

// 用戶
import OrganizeAndUser from '@/views/OrganizeAndUser/index.vue'   // 組織與用戶 (2025.07.02)

// 系統設定
import Schedule from '@/views/System/Schedule.vue'                // 排程設定
import TimeRange from '@/views/System/TimeRange.vue'              // 時段設定
import Notify from '@/views/System/Notify.vue'                    // 推撥設定
import BackupRestore from '@/views/System/BackupRestore.vue'      // 備份/還原設定
import SystemConfig from '@/views/System/SystemConfig.vue'        // 系統設定

// 自訂頁面
import AssetManagement from '@/views/Custom/AssetManagement.vue'  // 資產管理頁面

// 其他整合
import AccessControl from '@/views/Other/AccessControl.vue'       // 門禁設定
import Media from '@/views/Other/Media.vue'                       // 影像設定

// ================================= 頁面編輯區 =================================
// E-map頁面
import EditEmap from '@/views/Emap/Edit.vue'          // 編輯頁面
import ViewEmap from '@/views/Emap/View.vue'          // 預覽頁面

// 自訂頁面
import Module from '@/views/Custom/Module.vue'               // 模組頁面
import HistoryChart from '@/views/Custom/HistoryChart.vue'   // 自訂歷史曲線圖頁面

// ================================= 未使用/測試用 =================================
import Account from '@/views/Account.vue'       // 帳戶設定頁面 (未定)
import Organize from '@/views/Organize.vue'     // 組織設定頁面 (未定)
import Demo from '@/test/Demo.vue'              // 測試用

const routes = [
  // 首頁跳轉
  {
    path: '/',
    name: '首頁跳轉',
    // redirect: '/edit/1',
    components: {
      default: FirstPage,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // 捕捉所有未知路徑，導向 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    components: {
      headerbar: Headerbar,
      nav: Navigationbar,
      default: NotFound
    }
  },
  {
    path: '/login',
    name: 'Login',
    components: { default: Login },
  },
  // ============================== 資料收集 ==============================
  {
    path: '/protocols',
    name: '通訊協定設定',
    components: {
      default: Protocols,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/datapoint',
    name: '點位設定',
    components: {
      default: Datapoint,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // ============================== 通知中心 ==============================
  {
    path: '/event',
    name: '事件設定',
    components: {
      default: Event,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/alarm',
    name: '告警設定',
    components: {
      default: Alarm,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // ============================== 日誌 ==============================
  {
    path: '/record_history',
    name: '紀錄表歷史',
    components: {
      default: RecordHistory,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // ============================== 曲線圖 ==============================
  {
    path: '/linechart',
    name: 'ViewLineChart',
    components: {
      default: ViewChart,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // ============================== 用戶 ==============================
  {
    path: '/organize_user_setting',
    name: '組織與用戶',
    components: {
      default: OrganizeAndUser,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // ============================== 系統 ==============================
  {
    path: '/schedule',
    name: '排程設定',
    components: {
      default: Schedule,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/time_range',
    name: '時段設定',
    components: {
      default: TimeRange,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/notify',
    name: '推撥設定',
    components: {
      default: Notify,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/backup_restore',
    name: '備份/還原設定',
    components: {
      default: BackupRestore,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/system_config',
    name: '系統設定',
    components: {
      default: SystemConfig,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // ============================== 資產管理 ==============================
  {
    path: '/assetmanagement/:pathnow',
    name: '資產管理資訊',
    components: {
      default: AssetManagement,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // ============================== 其他整合 ==============================
  {
    path: '/access_control',
    name: '門禁設定',
    components: {
      default: AccessControl,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/media',
    name: '影像設定',
    components: {
      default: Media,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  // ============================== 頁面編輯 ==============================
  {
    path: '/edit/:pathnow',
    name: 'E-map(Edit)',
    components: {
      default: EditEmap,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
    // beforeEnter: (to, from, next) => {
    //   to.name = `E-map修改(第${to.params.pathnow}頁)`;
    //   next();
    // },
  },
  {
    path: '/view/:pathnow',
    name: 'E-map(View)',
    components: {
      default: ViewEmap,
      // headerbar: Headerbar,
      // nav: Navigationbar,
    },
  },
  {
    path: '/mod/:pathnow',
    name: '模組資訊',
    components: {
      default: Module,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/historychart/:pathnow',
    name: '曲線圖資訊',
    components: {
      default: HistoryChart,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },  
  
  // =====================================================
  {
    path: '/account',
    name: '帳戶設定',
    components: {
      default: Account,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/organize/:pathnow',
    name: '組織列表',
    components: {
      default: Organize,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  },
  {
    path: '/demo',
    name: 'Demo',
    components: {
      default: Demo,
      headerbar: Headerbar,
      nav: Navigationbar,
    },
  }
]


const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

export default router