<!-- ====================================== Data Table V1模板 ====================================== -->
<template>
  <v-main>
    <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
        <v-card-title style="padding: 30px 0px 10px 30px;">
          <div style="display: flex;">
            <v-spacer></v-spacer>
            <div>
              <v-btn style="margin-right: 10px;" variant="text"><h3>設定</h3></v-btn>
              <v-btn style="margin-right: 10px;" variant="text"><h3>匯入</h3></v-btn>
            </div>
            <v-btn style="margin-right: 10px;" variant="text"><h3>匯出</h3></v-btn>
            <v-text-field
              style="max-width: 15%; margin: 0px 20px 10px 0px;"
              v-model="tableSearch"
              variant="outlined" density="compact" label="搜尋"
              append-inner-icon="mdi-magnify" single-line hide-details
            />
          </div>
        </v-card-title>
        <v-data-table
          class="group_table_class"
          :search="tableSearch"
          :headers="group_header"
          :items="group_list"
          mobile-breakpoint="md"
          item-value="uuid"
          :expanded="expand_group"
          :custom-filter="customSearch"
          hover
        >
          <template #no-data><h3>無資料</h3></template>
          <template #item.groupNo="{ item, index }">
            <div :style="{ 'border-left': Setup.isPhone ? '' : expand_group.includes(item.uuid) ? '5px solid red' : '' }">
              <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ index + 1 }}</span>
            </div>
          </template>
          <template #item.enable="{ item }">
            <span :style="{ 'font-size': '20px', color: item['enable'] ? 'green' : 'red'}">{{ formatValue('enable', item['enable']) }}</span>
          </template>
          <template #item.actions="{ item }">
            <div class="test" style="display: flex; justify-content: end; gap: 10px;">
              <v-btn style="color: green; font-size: 18px;" variant="outlined">編輯</v-btn>
              <v-btn style="color: red; font-size: 18px;" variant="outlined">刪除</v-btn>
            </div>
          </template>
          <template #item.data-table-expand="{ item }">
            <v-btn variant="plain" :icon="expand_group.includes(item.uuid) ? 'mdi-chevron-up' : 'mdi-chevron-down'" @click="toggleExpand(item)" />
          </template>
          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" style="padding: 20px;">
                <div style="padding: 20px;border: 2px solid #b9b7b7;">
                  <table class="group_point_info" border="1">
                    <tr style="user-select: none;">
                      <th v-for="(title, index) in ['點位位址', '點位名稱', '初始值', '校正值', '保存型態', 'R-Expr', 'E-Expr', '點位說明']" :key="index">
                        {{ title }}
                      </th>
                      <th style="width: 10%;"></th>
                    </tr>
                    <tr v-for="(info, index) in item['datapoint']" :key="index">
                      <td>{{ info['address'] }} </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['name']" hide-details variant="plain" />
                        <div v-else>{{ info['name'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px', 'width': '10%'}">
                        <v-text-field v-if="info['edit']" 
                          class="edit_datapoint" 
                          v-model="info['initValue']" 
                          hide-details variant="plain" type="number" hide-spin-buttons 
                          @keydown="$utils.blockInvalidKeys($event)" 
                        />
                        <div v-else>{{ info['initValue'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px', 'width': '10%'}">
                        <v-text-field v-if="info['edit']" 
                          class="edit_datapoint"
                          v-model="info['correctionValue']"
                          hide-details variant="plain" type="number" hide-spin-buttons
                          @keydown="$utils.blockInvalidKeys($event)"
                        />
                        <div v-else>{{ info['correctionValue'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-select v-if="info['edit']" class="edit_datapoint" v-model="info['saveType']" :items="save_type" hide-details variant="plain" />
                        <div v-else>{{ info['saveType'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['RExpr']" hide-details variant="plain" />
                        <div v-else>{{ info['RExpr'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['EExpr']" hide-details variant="plain" />
                        <div v-else>{{ info['EExpr'] }}</div>
                      </td>
                      <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                        <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['description']" hide-details variant="plain" />
                        <div v-else>{{ info['description'] }}</div>
                      </td>
                      <td>
                        <v-btn variant="text" @click="changeEditType(info)">
                          <v-icon style="font-size: 30px;" :icon="info['edit'] ? 'mdi-pen' : 'mdi-eye'" />
                        </v-btn>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </v-data-table>
      </v-card>
  </v-main>
</template>



<script>
import { useSetup } from '@/store/module/setup.js' // Pinia

export default {
  data() {
    return {
      Setup: useSetup().$state,
      tableSearch: null,
      // ======================== 群組 ========================
      expand_group: [], // 資料表擴展資料
      group_header: [
        { title: "群組編號", key: "groupNo", align: "center" },
        { title: "設備群組", key: "deviceGroup", align: "center" },
        { title: "設備", key: "selectDevice.title", align: "center" },
        { title: "位址", key: "deviceAddress", align: "center" },
        { title: "功能碼", key: "functioncode", align: "center" },
        { title: "資料型態", key: "datatype", align: "center" },
        { title: "數量", key: "datapointCount", align: "center" },
        { title: "狀態", key: "enable", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      group_list: [],
    }
  },
  created() {
    this.getGroupList()
  },
  methods: {
    // 取得點位群組列表 (先以假資料代替)
    getGroupList() {
      this.group_list = [
        {
          "uuid": "3d5ce825-6f85-4372-bce1-e2c09bf4ee84",
          "deviceGroup": "Group1",
          "enable": true,
          "selectDevice": { title: "device1", type: 'ModbusTCP', desc: '設備一', uuid: 'f65ce9b3-729f-43cb-ae0a-fd07836d98cb' },
          "deviceAddress": "3434",
          "functioncode": "01",
          "datatype": "INT",
          "datapoint": [
            { "uuid": "1ddce825-6f85-4372-bde1-e2c09bf4ee87", "address": "3434", "name": "point1", "description": "說明1", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "3ccce825-6f85-4372-bde1-e2c09bf4ee87", "address": "3435", "name": "point2", "description": "說明2", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "555ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "3436", "name": "point3", "description": "說明3", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "cccce825-6f85-4372-bde1-e2c09bf4ee87", "address": "3437", "name": "point4", "description": "說明4", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
          ],
          "datapointCount": "4"
        },
        {
          "uuid": "1c5ce825-6f85-4372-bde1-e2c09bf4ee87",
          "deviceGroup": "Group2",
          "enable": false,
          "selectDevice": { title: "device2", type: 'SNMP', desc: '設備二', uuid: '555ce825-6f85-4372-bde1-e2c09bf4ee87' },
          "deviceAddress": "2022",
          "functioncode": "03",
          "datatype": "INT",
          "datapoint": [
            { "uuid": "1a5ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "2022", "name": "point1", "description": "說明1", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "2b5ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "2023", "name": "point2", "description": "說明2", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "3cace825-6f85-4372-bde1-e2c09bf4ee87", "address": "2024", "name": "point3", "description": "說明3", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "144ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "2025", "name": "point4", "description": "說明4", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "1c66e825-6f85-4372-bde1-e2c09bf4ee87", "address": "2026", "name": "point5", "description": "說明5", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "775ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "2027", "name": "point6", "description": "說明6", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
          ],
          "datapointCount": "6"
        },
        {
          "uuid": "1ccce825-6f85-4372-bde1-e2c09bf4ee87",
          "deviceGroup": "Group3",
          "enable": false,
          "selectDevice": { title: "device3", type: 'ModbusTCP', desc: '設備三', uuid: '1ddce825-6f85-4372-bde1-e2c09bf4ee87' },
          "deviceAddress": "1122",
          "functioncode": "05",
          "datatype": "INT",
          "datapoint": [
            { "uuid": "2a5ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "1122", "name": "point1", "description": "說明1", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "3b5ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "1123", "name": "point2", "description": "說明2", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "4cace825-6f85-4372-bde1-e2c09bf4ee87", "address": "1124", "name": "point3", "description": "說明3", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "164ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "1125", "name": "point4", "description": "說明4", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "7c66e825-6f85-4372-bde1-e2c09bf4ee87", "address": "1126", "name": "point5", "description": "說明5", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
            { "uuid": "875ce825-6f85-4372-bde1-e2c09bf4ee87", "address": "1127", "name": "point6", "description": "說明6", initValue: 0, correctionValue: 2, saveType: "暫存", RExpr: "{.}", EExpr: "{.}" },
          ],
          "datapointCount": "6"
        },
      ]
      this.getDatapointList();
    },
    // 取得列表資料 (來源為群組列表內點位資料)
    getDatapointList() {
      this.total_datapoint = [];
      this.datapointPageNow = 1;
      for (let i in this.group_list) {
        var pointInfo = this.group_list[i]['datapoint']
        var groupAddr = parseInt(this.group_list[i]['address']) || 0
        for (let j in pointInfo) {
          var point = {
            deviceGroup: this.group_list[i]['deviceGroup'],
            address: groupAddr + parseInt(j),
            ...pointInfo[j]
          }
          this.total_datapoint.push(point)
        }
      }
      for (let i in this.total_datapoint) this.total_datapoint[i]['id'] = parseInt(i) + 1
      console.log("Total DataPoint: ", this.total_datapoint)
    },
    // ========================================== 資料表資訊 ==========================================
    // 展開/收合資料表
    toggleExpand(item) {
      const id = item.uuid;
      const index = this.expand_group.indexOf(id);
      if (index !== -1) this.expand_group.splice(index, 1); // 關閉
      else this.expand_group.push(id); // 展開
    },
    // 統一欄位顯示邏輯
    formatValue(key, val) {
      if (key === 'enable') return val ? '啟用' : '禁用';
      if (key === 'temp') {
        if (val < 30) return '過低';
        if (val > 50) return '過高';
        return '正常';
      }
      return String(val ?? '');
    },
    // 自訂搜尋模式
    customSearch(value, query, item) {
      if (query == null || query.trim() === '') return true;
      const normalizedQuery = query.toLowerCase();
      const { uuid, protocolID, ...searchableData } = item.raw; 
      const simpleValues = Object.entries(searchableData).map(([key, val]) => this.formatValue(key, val)).join(' ');
      return simpleValues.toLowerCase().includes(normalizedQuery);
    },
    // 修改點位模式(編輯、預覽)
    changeEditType(item) {
      if (item.edit == undefined) { item.edit = true; return }
      item.edit = !item.edit
      // TODO API  ==>  item.edit == false (關閉編輯模式時更新)
    },
  }
}
</script>


<style lang="scss" scoped>
// 群組CSS
.group_table_class {
  height: 80vh;
}
.group_point_info {
  width: 100%;
  margin: 10px 0px 20px 0px;
  border-collapse: collapse;
  border: 1px solid rgb(212, 212, 212);
  th, td {
    border: 2px solid rgb(212, 212, 212);
    padding: 12px;
    font-size: 18px;
    text-align: center;
  }
  th {
    background: #000000;
    color: #FFFFFF;
    font-weight: bold;
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


// 點位總覽 CSS
.datapoint_list_class {
  height: 80vh; 
  overflow: auto;
}
.total_point_list {
  width: 100%;
  margin: 10px 0px 20px 0px;
  border: 1px solid rgb(212, 212, 212);
  border-collapse: collapse;
  th, td {
    border: 2px solid white;
    padding: 10px 0px;
    font-size: 18px;
    text-align: center;
  }
  th {
    background: #000000;
    color: #FFFFFF;
    font-weight: bold;
  }
}

// 編輯點位時的select下拉選單文字置中
:deep(.edit_datapoint.v-select .v-field__input) {
  left: 15px;
}
// 編輯點位時的內部padding
:deep(.edit_datapoint .v-field__append-inner) {
  padding-top: 12px !important;
}
// 編輯點位時的內部Text Field文字框文字置中
:deep(.edit_datapoint .v-field__input) {
  padding: 0px !important;
  justify-content: center !important;
  text-align: center !important;
}
</style>