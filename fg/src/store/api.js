import axios from "axios";

const apiClient = axios.create({
  baseURL: `${window.location.protocol}//${window.location.hostname}:${window.location.port}`, // 初始值
});

function updateBaseURL(newBaseURL) {
  apiClient.defaults.baseURL = newBaseURL;
}
export function GET(url, baseURL) {
  // var protocol = window.location.protocol
  // var host = window.location.hostname
  // var port = window.location.port
  // baseURL ? updateBaseURL(baseURL) : updateBaseURL(`${protocol}//${host}:${port}`)
  return new Promise((resolve, reject) => {
    apiClient.get(url)
      .then(
        (response) => resolve(response),
        (err) => reject(err)
      )
      .catch((error) => reject(error));
  });
}
export function POST(url, params, header) {
  var headers = { "Content-Type": "application/json; charset=utf-8" };
  if (header) headers = header;
  return new Promise((resolve, reject) => {
    apiClient.post(url, params, {headers: headers})
      .then(
        (response) => resolve(response),
        (err) => reject(err)
      )
      .catch((error) => reject(error));
  });
}
export function DELETE(url) {
  return new Promise((resolve, reject) => {
    apiClient.delete(url, {headers: { "Content-Type": "application/json; charset=utf-8" }})
      .then(
        (response) => resolve(response),
        (err) => reject(err)
      )
      .catch((error) => reject(error));
  });
}
export function PATCH(url, params) {
  return new Promise((resolve, reject) => {
    apiClient.patch(url, params, {headers: { "Content-Type": "application/json; charset=utf-8" }})
      .then(
        (response) => resolve(response),
        (err) => reject(err)
      )
      .catch((error) => reject(error));
  });
}

export function PUT(url, params, header) {
  var headers = { "Content-Type": "application/json; charset=utf-8" };
  if (header) headers = header;
  return new Promise((resolve, reject) => {
    apiClient.put(url, params, {headers: headers})
      .then(
        (response) => resolve(response),
        (err) => reject(err)
      )
      .catch((error) => reject(error));
  });
}

export default {
  // ============================================== 登入登出 ==============================================
  login(Query) {
    let url = "/api/login";
    return POST(url, Query);
  },
  logout() {
    let url = "/api/logout";
    return GET(url);
  },
  // ============================================== E-map ==============================================
  // 新增圖片
  uploadImage(Query) {
    let url = `/api/uploadimage`;
    var Header = {'Content-Type': 'multipart/form-data;'};
    return POST(url, Query.file, Header);
  },
  // 取得Emap 首頁ID(ID為對應圖片位置)
  getEmapHomepage(Query) {
    let url = `/api/page/home`;
    return GET(url)
  },
  // 設定Emap 首頁
  setEmapHomepage(Query) {
    let url = `/api/page/home`;
    return POST(url, Query)
  },
  // 取得Emap索引資訊
  getPageInfo(Query) {
    let url = `/api/page/idx/${Query.idx}`;
    return GET(url)
  },
  // 編輯Emap索引資訊
  setPageInfo(Query) {
    let url = `/api/page/idx/${Query.idx}`;
    return POST(url, Query.data)
  },
  // 取得抽屜欄位路徑列表
  getRouterPath() {
    let url = `/api/path`
    return GET(url)
  },
  // 編輯抽屜欄位路徑
  setRouterPath(Query) {
    let url = `/api/path`
    return POST(url, Query.data)
  },
  // ============================================== 動態資料庫操作 ==============================================
  queryAllData(Query) {
    let url = `/api/db/${Query.table}/queryall`
    return GET(url); // 無使用
  },
  addData(Query) {
    let url = `/api/db/${Query.table}`
    return POST(url, Query.data); // 目前用於 新增模組Table
  },
  getIDData(Query) {
    let url = `/api/db/${Query.table}/${Query.id}`
    return GET(url); // 目前用於 取得模組Table內的Header、List
  },
  editIDData(Query) {
    let url = `/api/db/${Query.table}/${Query.id}`
    return PUT(url, Query.data); // 目前用於 修改模組Table內的Header、List
  },
  delIDData(Query) {
    let url = `/api/db/${Query.table}/${Query.id}`
    return DELETE(url); // 無使用
  },
  // ============================================== 點位設定 (API之後調正) ==============================================
  // 點位列表
  getDatapointList() {
    let url = `/api/datapoints`
    return GET(url);
  },
  // 取得單獨點位資訊
  getDatapointInfo(Query) {
    let url = `/api/datapoint/${Query}`
    return GET(url)
  },
  // 設定點位
  setDatapoint(Query) {
    let url = `/api/datapoint`
    return POST(url, Query);
  },
  // 更新點位資訊
  updateDatapointInfo(Query) {
    let url = `/api/datapoint/${Query.name}`
    return PATCH(url, Query.data)
  },
  // 更新點位事件
  updateDatapointEvent(Query) {
    let url = `/api/datapoint/${Query.name}/events`
    return PUT(url, Query.data)
  },
  // 刪除點位
  delDatapoint(Query) {
    let url = `/api/datapoint/${Query}`
    return DELETE(url)
  },
  // 取得點位Alarm列表
  getDatapointAlarm(Query) {
    let url = `/api/datapoint/${Query}/alarms`
    return GET(url)
  },
  // 清除點位Alarm歷史資料
  clearDatapointAlarm(Query) {
    let url = `/api/datapoint/${Query.name}/alarms/${Query.ts}/clear`
    return POST(url)
  },

  // ============================================== 測試API: http://192.168.15.211:8080 (曲線圖) ==============================================
  queryLinechartData(Query) {
    let url = `/api-211/query/group?table=data_1&start=${Query.start}&end=${Query.end}&limit=1000&granularity=${Query.type}`
    return GET(url)
  },
  // ============================================== 測試API: http://192.168.15.124:8080 (系統/通訊協議/點位設定) ==============================================
  // 註: 若要打包dist給老闆則要改為/api (指向老闆的api名稱)
  getSystemInfo() {
    let url = `/api/sysinfo`
    return GET(url)
  },

  // 取得虛擬點位實際數值
  getVirtualPoints() {
    let url = `/api/vpoints`
    return GET(url)
  },
  
  // 取得點位總覽列表
  getPointList() {
    let url = `/api/points`
    return GET(url)
  },
  // 透過數量取得可用的虛擬點位 UUID
  getVpointListByCount(Query) {
    let url = `/api/avpoints?count=${Query.count}`
    return GET(url)
  },
  // 更新點位
  updatePoint(Query) {
    let url = `/api/points/${Query.target}`
    return PUT(url, Query.data)
  },
  // 刪除點位
  deletePoint(Query) {
    let url = `/api/points/${Query.target}`
    return DELETE(url)
  },
  

  // 取得通訊協議設備資料
  getProtocolDevices() {
    let url = `/api/devices`
    return GET(url)
  },
  // 新增通訊協議
  setProtalcolDevice(Query) {
    let url = `/api/devices`
    return POST(url, Query)
  },
  // 更新通訊協議
  updateProtalcolDevice(Query) {
    let url = `/api/devices/${Query.target}`
    return PUT(url, Query.data)
  },
  // 刪除通訊協議
  deleteProtalcolDevice(Query) {
    let url = `/api/devices/${Query.target}`
    return DELETE(url)
  },


  // 取得任務列表
  getTaskList() {
    let url = `/api/tasks`
    return GET(url)
  },
  // 新增任務
  setNewTask(Query) {
    let url = `/api/tasks`
    return POST(url, Query)
  },
  // 更新任務
  updateTask(Query) {
    let url = `/api/tasks/${Query.target}`
    return PUT(url, Query.data)
  },
  // 刪除任務
  deleteTask(Query) {
    let url = `/api/tasks/${Query.target}`
    return DELETE(url)
  },
};
