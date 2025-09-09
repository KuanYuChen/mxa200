import { defineStore } from 'pinia'
import api from "../api"

export const useSetup = defineStore('setup', {
  state: () => ({
    systemInfo: { 'Module': 'None', version: '1.0.0' },
    browser: "Chrome",
    fullscreenState: false,
    viewFirstPage: 1,     // 設定的預覽首頁
    isPhone: false,       // 是否為手機模式
    settingDrawer: false, // Navigation Bar 縮放參數 (功能設定)
    pageDrawer: false,    // Navigation Bar 縮放參數 (編輯設定)
    path_list: [],        // Navigation Bar 路徑列表內容
    headerTitle: "",      // Header Bar 標題 
    icon_list: [],        // ICON 列表
    // E-map
    editCount: 0, // 編輯 E-map 次數
    emapInterval: null, // 預覽頁面掃描狀態Interval
    // 點位列表資訊
    datapoint_list: [],
    datapointInterval: null,
    // 曲線圖資訊
    animateChartInterval: null,
    // 清除掃描用Interval名稱列表
    interval_list: ['emapInterval', 'datapointInterval', 'animateChartInterval'],
    // State Text Alert Dialog
    alertDialog: false,
    alertIcon: "",
    alertTitle: "",
    alertWidth: "500",
    // Snackbar Dialog
    snackbarID: 0,
    snackbar_list: [],
  }),
  actions: {
    showAlertDialog(info) {
      this.$state.alertDialog = true;
      this.$state.alertIcon = info.icon;
      this.$state.alertTitle = info.title;
      this.$state.alertWidth = info.width == undefined ? "500" : info.width
    },
    addSnackbarInfo(info) {
      const newSnack = { id: this.$state.snackbarID++, text: info.message, show: false, bgcolor: info.bg };
      this.$state.snackbar_list.push(newSnack);
      setTimeout(() => {
        const index = this.$state.snackbar_list.findIndex(s => s.id === newSnack.id);
        if (index !== -1) {
          this.$state.snackbar_list[index].show = false;
          this.$state.snackbar_list.splice(index, 1);
        }
      }, 3000);
    },
    // ============================================== 登入登出 ==============================================
    login(Query) {
      return api.login(Query);
    },
    logout() {
      return api.logout();
    },
    // ============================================== E-map ==============================================
    uploadImage(Query) {
      return api.uploadImage(Query);
    },
    getEmapHomepage(Query) {
      return api.getEmapHomepage(Query);
    },
    setEmapHomepage(Query) {
      return api.setEmapHomepage(Query);
    },
    getPageInfo(Query) {
      return api.getPageInfo(Query);
    },
    setPageInfo(Query) {
      return api.setPageInfo(Query);
    },
    getRouterPath(Query) {
      return api.getRouterPath(Query);
    },
    setRouterPath(Query) {
      return api.setRouterPath(Query);
    },

    // ============================================== 資料庫操作(舊版資料庫) ==============================================
    queryAllData(Query) {
      return api.queryAllData(Query);
    },
    addData(Query) {
      return api.addData(Query);
    },
    getIDData(Query) {
      return api.getIDData(Query);
    },
    editIDData(Query) {
      return api.editIDData(Query);
    },
    delIDData(Query) {
      return api.delIDData(Query);
    },
    // ============================================== 點位設定 ==============================================
    getDatapointList() {
      return api.getDatapointList();
    },
    getDatapointInfo(Query) {
      return api.getDatapointInfo(Query);
    },
    setDatapoint(Query) {
      return api.setDatapoint(Query);
    },
    updateDatapointInfo(Query) {
      return api.updateDatapointInfo(Query);
    },
    updateDatapointEvent(Query) {
      return api.updateDatapointEvent(Query);
    },
    delDatapoint(Query) {
      return api.delDatapoint(Query);
    },
    getDatapointAlarm(Query) {
      return api.getDatapointAlarm(Query);
    },
    clearDatapointAlarm(Query) {
      return api.clearDatapointAlarm(Query);
    },
    // ============================================== 曲線圖API ==============================================
    queryLinechartData(Query) {
      return api.queryLinechartData(Query);
    },
    // ============================================== 測試API (系統/通訊協議/點位設定) ==============================================
    getSystemInfo() {
      return api.getSystemInfo();
    },

    getVirtualPoints() {
      return api.getVirtualPoints();
    },
    
    getPointList() {
      return api.getPointList();
    },
    getVpointListByCount(Query) {
      return api.getVpointListByCount(Query);
    },
    updatePoint(Query) {
      return api.updatePoint(Query);
    },
    deletePoint(Query) {
      return api.deletePoint(Query);
    },


    getProtocolDevices() {
      return api.getProtocolDevices();
    },
    setProtalcolDevice(Query) {
      return api.setProtalcolDevice(Query);
    },
    updateProtalcolDevice(Query) {
      return api.updateProtalcolDevice(Query);
    },
    deleteProtalcolDevice(Query) {
      return api.deleteProtalcolDevice(Query);
    },


    getTaskList() {
      return api.getTaskList();
    },
    setNewTask(Query) {
      return api.setNewTask(Query);
    },
    updateTask(Query) {
      return api.updateTask(Query);
    },
    deleteTask(Query) {
      return api.deleteTask(Query);
    },

    
  },
})
