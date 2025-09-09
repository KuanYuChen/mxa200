<!-- =================================================== 點位設定頁面 =================================================== -->
<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;padding: 15px;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
        <v-card-title style="padding: 30px 0px 0px 30px;">
          <div style="display: flex;">
            <v-btn variant="outlined" @click="openPoint('ADD')"><h3>點位設定</h3></v-btn>
            <v-spacer></v-spacer>
            <v-text-field
              style="max-width: 15%; margin: 0px 20px 10px 0px;"
              v-model="pointSearch"
              variant="outlined"
              density="compact"
              label="搜尋"
              single-line
              hide-details
            >
              <template v-slot:append-inner><v-icon icon="mdi-magnify" /></template>
            </v-text-field>
          </div>
        </v-card-title>
        <v-data-table
          class="point-scroll"
          :search="pointSearch"
          :headers="point_header"
          :items="point_list"
          :mobile="Setup.isPhone"
          hover
          item-value="name"
          :expanded="expandedItems"
        >
          <template #no-data><h3>無資料</h3></template>
          <template v-slot:item.name="{ item }" class="isExpanded(item)">
            <div :style="{ 'border-left': Setup.isPhone ? '' :isExpanded(item) ? '5px solid red' : '' }">
              <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ item.name }}</span>
            </div>
          </template>
          <template v-slot:item.event_count="{ item }">
            <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ getEventCount(item) }}</span>
          </template>
          <template v-slot:item.actions="{ item }">
            <div class="test" style="display: flex;justify-content: center;">
              <v-btn style="color: green;margin: 0px 10px;" variant="outlined" @click="openPoint('EDIT', item)">
                <h3>編輯</h3>
              </v-btn>
              <v-btn style="color: red;margin: 0px 10px;" variant="outlined" @click="openPoint('DELETE', item)">
                <h3>刪除</h3>
              </v-btn>
            </div>
          </template>
          <template v-slot:item.data-table-expand="{ item }">
            <v-btn
              variant="plain"
              :icon="isExpanded(item) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="toggleExpand(item)"
            />
          </template>
          <template v-slot:expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" style="padding: 20px;">
                <div style="padding: 20px;border: 2px solid #b9b7b7;">
                  <h2 style="margin-top: 10px;">點位事件詳細參數:</h2>
                  <table class="point_info" style="margin: 10px 0px 20px 0px; width: 100%;" border="1">
                    <tr>
                      <th>啟用狀態</th>
                      <th>事件描述</th>
                      <th>閥值</th>
                      <th>觸發次數</th>
                      <th>最大觸發次數</th>
                      <th>間隔時間</th>
                      <th>等級</th>
                    </tr>
                    <tr v-for="(event, index) in item['events']" :key="index">
                      <td :style="{ 'text-align': 'center',  'width': '10%', 'color': event['enabled'] ? 'green' : 'red' }">
                        {{ event["enabled"] ? '啟用' : '禁用' }}
                      </td>
                      <td>{{ event["description"] }}</td>
                      <td>{{ event["operator"] }}{{ event["threshold"] }}</td>
                      <td>{{ event["trigger_count"] }}</td>
                      <td>{{ event["max_trigger_count"] }}</td>
                      <td>{{ event["debounce_time"] }}</td>
                      <td>{{ event["level"] }}</td>
                    </tr>
                  </table>
                  <v-divider></v-divider>
                  <h2 style="margin-top: 10px;">點位事件警報歷史紀錄:</h2>
                  <table class="point_info" style="margin: 10px 0px 20px 0px; width: 100%;" border="1">
                    <tr>
                      <th>事件描述</th>
                      <th>點位數值</th>
                      <th>狀態</th>
                      <th>等級</th>
                      <th>時間</th>
                      <th></th>
                    </tr>
                    <tr v-for="(history, index) in getAlarmHistoryList(item['alarmHistory'])" :key="index">
                      <td>{{ history["description"] }}</td>
                      <td>{{ history["value"] }}</td>
                      <td>{{ history["status"] }}</td>
                      <td>{{ history["level"] }}</td>
                      <td style="width: 25%;">{{ transformTS(history["ts"]) }}</td>
                      <td style="width: 5%;">
                        <v-icon style="font-size: 25px;" @click="clearAlarmHistory(item, history)">mdi-trash-can</v-icon>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>
    </div>
  </v-main>
  <v-dialog v-model="point['dialog']" width="900" persistent>
    <v-card v-if="point['state'] != 'DELETE'">
      <v-card-title>
        <h2 style="margin: 20px; text-align: center;">{{ point['state'] == 'ADD' ? '新增' : '修改' }}點位設定</h2>
      </v-card-title>
      <div style="display: flex;">
        <v-checkbox style="margin-bottom: 20px; margin-left: 15px;" v-model="point['item']['apply_offset']" hide-details>
          <template v-slot:label>
            <h2>{{ point['item']['apply_offset'] ? '啟用' : '禁用' }}偏移量</h2>
          </template>
        </v-checkbox>
        <v-text-field v-if="point['state'] == 'ADD'"
          style="margin: 0px 0px 0px 30px; width: 6%;"
          v-model="point['item']['name']"
          label="點位名稱"
          variant="outlined"
        ></v-text-field>
        <v-text-field
          style="margin: 0px 0px 0px 30px; width: 6%;"
          v-model="point['item']['value']"
          label="點位預設數值"
          variant="outlined"
          type="number" hide-spin-buttons @keydown="blockInvalidKeys"
        ></v-text-field>
        <v-text-field
          style="margin: 0px 30px; width: 6%;"
          v-model="point['item']['offset_value']"
          label="偏移量數值"
          variant="outlined"
          type="number" hide-spin-buttons @keydown="blockInvalidKeys"
        ></v-text-field>
      </div>
      
      <div v-for="(item, index) in point['item']['events']" :key="index" style="margin: 0px 30px;">
        <v-checkbox v-model="item['enabled']" hide-details>
          <template v-slot:label><h2>{{ item['enabled'] ? '啟用' : '禁用' }}事件</h2></template>
        </v-checkbox>
        <div style="width: 100%; display: flex;">
          <div style="width: 95%;">
            <v-row>
              <v-col style="padding: 10px 0px 0px 10px;">
                <v-text-field v-model="item['description']" style="margin: 0px 15px 0px 10px;" label="事件描述" variant="outlined" />
              </v-col>
              <v-col style="padding: 10px 0px 0px 0px;">
                <v-text-field v-model="item['threshold']" style="margin: 0px 15px 0px 10px;" label="閥值" variant="outlined" type="number" hide-spin-buttons @keydown="blockInvalidKeys" />
              </v-col>
              <v-col style="padding: 10px 0px 0px 10px;">
                <v-text-field v-model="item['trigger_count']" style="margin: 0px 15px 0px 10px;" label="觸發次數" variant="outlined" type="number" hide-spin-buttons @keydown="blockInvalidKeys" />
              </v-col>
              <v-col style="padding: 10px 0px 0px 0px;">
                <v-text-field v-model="item['max_trigger_count']" style="margin: 0px 15px 0px 10px;" label="最大觸發次數" variant="outlined" type="number" hide-spin-buttons @keydown="blockInvalidKeys" />
              </v-col>
            </v-row>
            <v-row>
              <v-col style="padding: 10px 0px 0px 10px;">
                <v-select 
                  v-model="item['operator']"
                  :items="operator_list"
                  style="margin: 0px 15px 0px 10px;"
                  label="操作參數" 
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col style="padding: 10px 0px 0px 0px;">
                <v-select 
                  v-model="item['level']"
                  :items="level_list"
                  style="margin: 0px 15px 0px 10px;"
                  label="Level" 
                  variant="outlined"
                ></v-select>
              </v-col>
              <v-col style="padding: 10px 0px 0px 0px;">
                <v-text-field v-model="item['debounce_time_int']" style="margin: 0px 15px 0px 10px;" label="間隔時間(秒)" variant="outlined" type="number" hide-spin-buttons @keydown="blockInvalidKeys" />
              </v-col>
            </v-row>
          </div>
          <div style="width: 5%;">
            <v-icon style="margin: 55px 50px 0px 10px; font-size: 40px;" @click="removeEvent(index)">mdi-trash-can-outline</v-icon>
          </div>
        </div>
        <v-divider style="width: 100%; margin: 20px 0px 30px;"></v-divider>
      </div>
      <v-btn style="width: 1%;margin: 0px 0px 20px 40px;" variant="outlined" @click="addEvent()">
        <v-icon>mdi-plus</v-icon>
      </v-btn>
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closePoint()">
            <h3>關閉</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="point['state'] == 'ADD' ? addPoint() : editPoint()" @keydown="keyboardDialogEvent">
            <h3>{{ point['state'] == 'ADD' ? '新增' : '修改' }}</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
    <v-card v-else>
      <v-card-title>
        <h2 style="margin: 20px; text-align: center;">確定要刪除點位設定?</h2>
      </v-card-title>
      <v-card-actions>
        <div style="width: 100%;display: flex;margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="closePoint()">
            <h3>否</h3>
          </v-btn>
          <v-btn class="actions-btn" style="color: black;" variant="outlined" @click="removePoint()">
            <h3>是</h3>
          </v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>

</template>


<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  data() {
    return {
      Setup: useSetup().$state,
      pointSearch: null,
      expandedItems: [], // 資料表擴展資料
      point_header: [
        { title: "點位名稱", key: "name", align: "center", width: "30%" },
        { title: "點位數值", key: "value", align: "center", width: "20%" },
        { title: "偏移量", key: "offset_value_text", align: "center", width: "20%" },
        { title: "事件有效數量", key: "event_count", align: "center", width: "20%" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      point_list: [],
      point: {
        dialog: false,
        state: "ADD",
        item: {
          name: "",
          value: 0,
          apply_offset: false,
          offset_value: 2.5,
          events: [],
        }
      },
      operator_list: ['>', '<', '=', '>=' ,'<='],
      level_list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    }
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.keyboardDialogEvent);
  },
  mounted() {
    this.scanDatapoint();
    window.addEventListener("keydown", this.keyboardDialogEvent);
  },
  methods: {
    // ========================================== 點位資料 ==========================================
    // 取得點位資訊
    getDatapoint() {
      useSetup().getDatapointList().then((res)=> {
        var data = res["data"]
        this.point_list = [];
        for (let i in data) {
          data[i]['offset_value_text'] = data[i]['apply_offset'] ? data[i]['offset_value'] : '未啟用'
          this.point_list.push(data[i])
        }
      })
    },
    // 掃描點位資訊
    scanDatapoint() {
      this.getDatapoint();
      this.stopScanDatapoint();
      this.Setup.datapointInterval = setInterval(() => this.getDatapoint(), 1500)
    },
    // 停止掃描點位資訊
    stopScanDatapoint() {
      clearInterval(this.Setup.datapointInterval);
      this.Setup.datapointInterval = null;
    },
    // ========================================== 資料表資訊 ==========================================
    // 展開/收合資料表
    toggleExpand(item) {
      const name = item.name;
      const index = this.expandedItems.indexOf(name);
      if (index !== -1) {
        this.expandedItems.splice(index, 1); // 關閉
      } else {
        this.expandedItems.push(name); // 展開
      }
    },
    // 判斷資料表是否展開
    isExpanded(item) {
      return this.expandedItems.includes(item.name);
    },
    // 取得事件有效數量
    getEventCount(item) {
      var count = 0
      for (let i in item['events']) if (item['events'][i]['enabled']) count++
      return count
    },
    // 取得警報歷史紀錄列表
    getAlarmHistoryList(history) {
      if (!history) return []
      const copied = [...history]
      if (copied.length < 5) return copied.reverse()
      return copied.slice(-5).reverse()
    },
    // 轉換時間格式
    transformTS(ts) {
      const date = new Date(ts);
      // 將時間格式化為 YYYY-MM-DD hh:mm:ss
      const pad = (n) => String(n).padStart(2, '0');
      const formattedTS = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} 
        ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      return formattedTS
    },
    // ========================================== 點位設定 ==========================================
    // 開啟點位Dialog
    openPoint(state, item) {
      this.stopScanDatapoint();
      this.point['dialog'] = true;
      this.point['state'] = state;
      if (state == 'EDIT' || state == 'DELETE') {
        this.point['item'] = JSON.parse(JSON.stringify(item))
        for (let i in this.point['item']['events']) {
          this.point['item']['events'][i]['debounce_time_int'] = parseInt(this.point['item']['events'][i]['debounce_time'].replace('s', ''))
        }
      }
    },
    // Dialog鍵盤事件
    keyboardDialogEvent(e) {
      if (!this.point['dialog']) return;
      if (e.key == "Escape") this.closePoint();
      if (e.key == "Enter") {
        if (this.point['state'] == 'ADD') this.addPoint();
        else if (this.point['state'] == 'EDIT') this.editPoint()
        else if (this.point['state'] == 'DELETE') this.removePoint();
      }
    },
    // 文字框為只限數字時禁止輸入 e、E、+、-
    blockInvalidKeys(e) {
      if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
    },
    // 新增點位事件
    addEvent() {
      this.point['item']['events'].push({
        "description": "",
        "enabled": true,
        "threshold": 30,
        "operator": ">",
        "level": 1,
        "trigger_count": 0,
        "max_trigger_count": 3,
        "debounce_time_int": 5
      })
    },
    // 刪除點位事件
    removeEvent(index) {
      this.point['item']['events'].splice(index, 1)
    },
    // 新增點位
    addPoint() {
      if (this.point['item']["name"] == "") {
        useSetup().showAlertDialog({ icon: "warn", title: "沒有設定點位名稱" })
        return
      }
      if (this.point['item']['events'].length == 0) {
        useSetup().showAlertDialog({ icon: "warn", title: "沒有設定事件" })
        return
      }
      // 確認數值為正確type
      this.point['item']['value'] = parseFloat(this.point['item']['value'])
      this.point['item']['offset_value'] = parseFloat(this.point['item']['offset_value'])
      for (let i in this.point['item']['events']) {
        var event = this.point['item']['events'][i]
        event['threshold'] = parseFloat(event['threshold'])
        event['trigger_count'] = parseFloat(event['trigger_count'])
        event['max_trigger_count'] = parseFloat(event['max_trigger_count'])
        event['debounce_time'] = `${event['debounce_time_int']}s`
        delete event['debounce_time_int']
      }
      var Query = this.point['item']
      useSetup().setDatapoint(Query).then((res)=> {
        this.point_list.push(res["data"])
        this.closePoint();
      }).catch((err)=> {
        var errorResponse = err.response.data;
        if (errorResponse && errorResponse.error) {
          var errText = errorResponse.error == "DataPoint 已存在" ? "重複的點位名稱" : "新增點位失敗"
          useSetup().showAlertDialog({ icon: "error", title: errText });
        } 
      })
    },
    // 更新點位資料
    editPoint() {
      if (this.point['item']['events'].length == 0) {
        useSetup().showAlertDialog({ icon: "warn", title: "沒有設定事件" })
        return
      }
      // 需要移除的 Key
      const remove_key = ['last_trigger_time', 'debounce_time_int'];
      // 需要轉換為浮點數的 Key
      const float_key = ['threshold', 'trigger_count', 'max_trigger_count'];
      const filterNodes = this.point['item']['events'].map(node => {
        const newNode = {};
        for (const key in node) {
          // 1. 檢查是否需要移除
          if (!remove_key.includes(key)) {
            // 2. 檢查是否需要轉換為浮點數
            if (float_key.includes(key)) newNode[key] = parseFloat(node[key]) || 0;
            else newNode[key] = node[key]; // 複製原始值
          }
        }
        const debounceInt = parseInt(node['debounce_time_int'], 10);
        newNode['debounce_time'] = !isNaN(debounceInt) ? `${debounceInt}s` : '5s'; // 設置默認值(預設5秒)
        return newNode; // 返回處理後的新對象
      });
      var info = {
        name: this.point['item']['name'],
        data: {
          apply_offset: this.point['item']['apply_offset'],
          offset_value: parseFloat(this.point['item']['offset_value']),
          value: parseFloat(this.point['item']['value']),
        }
      }
      var event = { name: this.point['item']['name'], data: filterNodes }
      var api_list = [useSetup().updateDatapointInfo(info), useSetup().updateDatapointEvent(event)]
      Promise.all(api_list).then(()=> {
        const index = this.point_list.findIndex(h => h.name === info.name);
        if (index !== -1) {
          this.point_list[index]['apply_offset'] = info['data']['apply_offset']
          this.point_list[index]['value'] = info['data']['value']
          this.point_list[index]['offset_value'] = info['data']['offset_value']
          this.point_list[index]['events'] = event['data']
          this.closePoint();
        }
      })
    },
    // 刪除點位
    removePoint() {
      var remove = this.point['item']['name']
      useSetup().delDatapoint(remove).then(() =>{
        const index = this.point_list.findIndex(h => h.name === remove);
        if (index !== -1) {
          this.point_list.splice(index, 1);
          this.closePoint();
        }
      })
    },
    // 關閉點位Dialog
    closePoint() {
      this.scanDatapoint();
      this.point['dialog'] = false;
      setTimeout(() => {
        this.point['item'] = {
          name: "",
          value: 0,
          apply_offset: false,
          offset_value: 2.5,
          events: [],
        }
      }, 200);
    },
    // 清除警報歷史紀錄
    clearAlarmHistory(item, history) {
      this.stopScanDatapoint();
      var Query = { name: item['name'], ts: history['ts'] }
      useSetup().clearDatapointAlarm(Query).then(()=> {
        const index = item['alarmHistory'].findIndex(h => h.ts === history.ts);
        if (index !== -1) {
          item['alarmHistory'].splice(index, 1);
          setTimeout(() => this.scanDatapoint(), 3000);
        }
      }).catch(()=> useSetup().showAlertDialog({ icon: "error", title: "刪除失敗" }))
    }
  }
}
</script>


<style lang="scss" scoped>
.point-scroll {
  height: 80vh;
}
.point_info {
  width: 100%;
  border-collapse: collapse;
  th, td {
    border: 1px solid rgb(212, 212, 212);
    padding: 12px;
    font-size: 17px;
    text-align: center;
  }

  th {
    background-color: #f4f4f4;
    font-weight: bold;
  }

  tr:nth-child(even) {
    background-color: #ffffff;
  }
}

// Data Table Header 
:deep(.v-data-table-header__content span) {
  font-size: 20px;
  color: rgb(36, 35, 34);
}

// Data Table Content 
:deep(.v-data-table__tr td) {
  font-size: 18px;
  color: rgb(36, 35, 34);
}
</style>