<!-- =================================================== 點位設定頁面 =================================================== -->
<template>
  <v-main style="background-color: rgb(233, 233, 233)">
    <div style="width: 100%;padding: 15px;">
      <v-card style="border: 1px solid #dbd7d7; border-radius: 10px;">
        <!-- =================================================================== Header標題 =================================================================== -->
        <v-card-title class="pa-md-4 pa-2">
          <v-row align="center" justify="space-between" class="ga-2">
            <!-- 1. 頁籤區 -->
            <v-col cols="12" md="auto">
              <div class="d-flex flex-wrap ga-2">
                <v-btn variant="text" :color="tableType == 'Modbus' ? '#ed8730' : '#153d63'" @click="changeTableType('Modbus')">
                  <h3 class="font-weight-bold">Modbus</h3>
                </v-btn>
                <v-btn variant="text" :color="tableType == 'SNMP' ? '#ed8730' : '#153d63'" @click="changeTableType('SNMP')">
                  <h3 class="font-weight-bold">SNMP</h3>
                </v-btn>
                <v-btn variant="text" :color="tableType == 'VirtualPoint' ? '#ed8730' : '#153d63'" @click="changeTableType('VirtualPoint')">
                  <h3 class="font-weight-bold">虛擬點位</h3>
                </v-btn>
                <v-btn variant="text" :color="tableType == 'DataPoint' ? '#ed8730' : '#153d63'" @click="changeTableType('DataPoint')">
                  <h3 class="font-weight-bold">點位總覽</h3>
                </v-btn>
              </div>
            </v-col>

            <!-- 2. 操作區 -->
            <v-col cols="12" md="auto">
              <div class="d-flex flex-wrap align-center justify-end ga-2" style="margin: 2px 10px;">
                <div v-if="tableType != 'DataPoint'" class="d-flex ga-2">
                  <v-btn variant="text" @click="openGroup('ADD')"><h3>點位設定</h3></v-btn>
                  <v-btn variant="text"><h3>匯入</h3></v-btn>
                </div>
                <v-btn variant="text"><h3>匯出</h3></v-btn>
                <v-text-field
                  style="width: 250px;"
                  v-model="tableSearch"
                  variant="outlined"
                  density="compact"
                  label="搜尋"
                  append-inner-icon="mdi-magnify"
                  single-line
                  hide-details
                  class="flex-grow-1 flex-sm-grow-0"
                />
              </div>
            </v-col>
          </v-row>
        </v-card-title>
        <!-- =================================================================== Table表 =================================================================== -->
        <div v-if="tableType == 'DataPoint'" class="datapoint_list_class">
          <table class="total_point_list">
            <tr style="user-select: none;">
              <th v-for="(header, index) in total_point_header" :key="index" @click="sortTotalPointList(header['value'])">
                {{ header['title'] }}
                <span v-if="sortKey === header['value']">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th style="width: 10%;"></th>
            </tr>
            <tbody>
              <tr v-for="(info, index) in pagedData" :key="index" :style="{ background: info['edit'] ? '#ccccf1' : index % 2 ? '#e4e4e4' : '#d1d1d1' }">
                <td>{{ info['id'] }} </td>
                <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                  <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['name']" hide-details variant="plain" />
                  <div v-else>{{ info['name'] }}</div>
                </td>
                <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                  <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['description']" hide-details variant="plain" />
                  <div v-else>{{ info['description'] }}</div>
                </td>
                <td :style="{'padding': info['edit'] ? '6px 12px' : '12px', 'width': '10%'}">
                  <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['initvalue']" 
                    hide-details variant="plain" min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
                  />
                  <div v-else>{{ info['initvalue'] }}</div>
                </td>
                <td :style="{'padding': info['edit'] ? '6px 12px' : '12px', 'width': '10%'}">
                  <v-text-field v-if="info['edit']" class="edit_datapoint"v-model="info['correctionvalue']"
                    hide-details variant="plain" min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
                  />
                  <div v-else>{{ info['correctionvalue'] }}</div>
                </td>
                <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                  <v-select v-if="info['edit']" class="edit_datapoint" v-model="info['savetype']" :items="save_type" item-title="title" item-value="value" hide-details variant="plain" />
                  <div v-else>{{ formatValue('savetype', info['savetype']) }}</div>
                </td>
                <td>{{ info['datatype'] }}</td>
                <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                  <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['RExpr']" hide-details variant="plain" />
                  <div v-else>{{ info['RExpr'] }}</div>
                </td>
                <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                  <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['WExpr']" hide-details variant="plain" />
                  <div v-else>{{ info['WExpr'] }}</div>
                </td>
                <td>{{ info['realvalue'] }}</td>
                <td :style="{ 'color': info['online'] ? 'green' : 'red' }">{{ formatValue('online', info['online']) }}</td>
                <td :style="{ 'color': info['enable'] ? 'green' : 'red' }">{{ formatValue('enable', info['enable']) }}</td>
                <td>
                  <v-btn v-if="!info['edit']" variant="text" @click="startEditPoint(info)">
                    <v-icon style="font-size: 30px;" :icon="'mdi-eye'" />
                  </v-btn>
                  <div v-else>
                    <v-btn variant="text" @click="editPointValue(info)">
                      <v-icon style="font-size: 30px;" :icon="'mdi-pen'" />
                    </v-btn>
                    <v-btn variant="text" @click="cancelPointValue(info)">
                      <v-icon style="font-size: 30px;" :icon="'mdi-close'" />
                    </v-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else>
          <v-data-table class="group_table_class"
            v-model:page="tablePageNow"
            v-model:items-per-page="itemsPerPage"
            v-model:expanded="expand_group"
            :search="debouncedSearch" :headers="tableType == 'VirtualPoint' ? virtualpoint_header : group_header" :items="datatableItems"
            mobile-breakpoint="md"
            item-value="uuid"
            hide-default-footer hover
          >
            <template #no-data><h3>無資料</h3></template>
            <template #item.orderId="{ item, index }">
              <div :style="{ 'border-left': Setup.isPhone ? '' : expand_group.includes(item.uuid) ? '5px solid red' : '' }">
                <span style="font-size: 20px; color: rgb(36, 35, 34);">{{ formatValue('orderId', item['orderId']) }}</span>
              </div>
            </template>
            <template #item.enable="{ item }">
              <span :style="{ 'font-size': '20px', color: item['enable'] ? 'green' : 'red'}">{{ formatValue('enable', item['enable']) }}</span>
            </template>
            <template #item.protocoluuid="{ item }">
              <span>{{ formatValue('protocoluuid', item['protocoluuid']) }}</span>
            </template>
            <template #item.quantity="{ item }">
              <span v-if="item.protocol == 'snmp'">{{ formatValue('oid_num', item['oid_num']) }}</span>
              <span v-else>{{ formatValue('quantity', item['quantity']) }}</span>
            </template>
            
            <template #item.actions="{ item }">
              <div class="test" style="display: flex; justify-content: end; gap: 10px;">
                <v-btn style="color: green; font-size: 18px;" variant="outlined" @click="openGroup('EDIT', item)">編輯</v-btn>
                <v-btn style="color: red; font-size: 18px;" variant="outlined" @click="openGroup('DELETE', item)">刪除</v-btn>
              </div>
            </template>
            <template #expanded-row="{ columns, item }">
              <tr v-if="tableType == 'VirtualPoint'"></tr>
              <tr v-else>
                <td :colspan="columns.length" style="padding: 20px;">
                  <div style="padding: 20px;border: 2px solid #b9b7b7;">
                    <table class="group_point_info" border="1">
                      <tr style="user-select: none;">
                        <th v-for="(title, index) in ['點位位址', '點位名稱', '初始值', '校正值', '保存型態', 'R-Expr', 'W-Expr', '點位說明']" :key="index">
                          {{ title }}
                        </th>
                        <th style="width: 10%;"></th>
                      </tr>
                      <tr v-for="(info, index) in item['ptuuids']" :key="index">
                        <td>{{ info['address'] }} </td>
                        <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                          <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['name']" hide-details variant="plain" />
                          <div v-else>{{ info['name'] }}</div>
                        </td>
                        <td :style="{'padding': info['edit'] ? '6px 12px' : '12px', 'width': '10%'}">
                          <v-text-field v-if="info['edit']" 
                            class="edit_datapoint" 
                            v-model="info['initvalue']" 
                            hide-details variant="plain" 
                            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
                          />
                          <div v-else>{{ info['initvalue'] }}</div>
                        </td>
                        <td :style="{'padding': info['edit'] ? '6px 12px' : '12px', 'width': '10%'}">
                          <v-text-field v-if="info['edit']" 
                            class="edit_datapoint"
                            v-model="info['correctionvalue']"
                            hide-details variant="plain" 
                            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
                          />
                          <div v-else>{{ info['correctionvalue'] }}</div>
                        </td>
                        <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                          <v-select v-if="info['edit']" class="edit_datapoint" v-model="info['savetype']" :items="save_type" item-title="title" item-value="value" hide-details variant="plain" />
                          <div v-else>{{ info['savetype'] }}</div>
                        </td>
                        <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                          <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['RExpr']" hide-details variant="plain" />
                          <div v-else>{{ info['RExpr'] }}</div>
                        </td>
                        <td :style="{'padding': info['edit'] ? '6px 12px' : '12px'}">
                          <v-text-field v-if="info['edit']" class="edit_datapoint" v-model="info['WExpr']" hide-details variant="plain" />
                          <div v-else>{{ info['WExpr'] }}</div>
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
        </div>
        
        <!-- =================================================================== 分頁元件 =================================================================== -->
        <v-card-actions class="pa-4" style="user-select: none;" @wheel="handelTurnPageWheel">
          <v-row align="center" justify="center" class="w-100">
            <!-- 每頁筆數選擇器 -->
            <v-col cols="12" sm="auto" class="d-flex justify-center justify-sm-start">
              <v-select
                v-model="itemsPerPage"
                :items="[10, 20, 50, 100, 200]"
                label="每頁筆數"
                density="compact"
                variant="outlined"
                hide-details
                style="max-width: 150px;"
              />
            </v-col>
            
            <!-- 響應式分頁元件 -->
            <v-col cols="12" sm="auto" class="d-flex justify-center">
              <v-pagination v-model="tablePageNow" :length="totalPages" :total-visible="Setup.isPhone ? 5 : 9" color="black">
                <template v-slot:item="{ page, isActive, props }">
                  <v-text-field v-if="isActive && isEditingPagenation" ref="pagenationInput"
                    style="width: 100px; text-align: center;"
                    v-model.number="jumpToPageInput"
                    variant="outlined" type="number" hide-spin-buttons density="compact" hide-details 
                    @keydown.enter="jumpFromInlineInput" @blur="isEditingPagenation = false" 
                  />
                  <v-btn v-else variant="text"
                    :color="isActive ? 'red' : ''"
                    :disabled="props.disabled" hide-details
                    @click="handlePageClick(isActive, page)"
                  >
                    {{ page }}
                  </v-btn>
                </template>
              </v-pagination>
            </v-col>
          </v-row>
        </v-card-actions>
      </v-card>
    </div>
  </v-main>

  <!-- =================================================================== Dialog操作框 =================================================================== -->
  <v-dialog style="user-select: none;" v-model="group['dialog']" width="900" persistent>
    <v-card v-if="group['state'] != 'DELETE'">
      <v-card-title>
        <h2 style="margin: 20px; text-align: center;">{{ group['state'] == 'ADD' ? '' : '修改' }}點位設定</h2>
      </v-card-title>
      <div>
        <h2 style="margin: 0px 30px;">一般設定</h2>
        <div style="display: flex; margin: 20px 30px 10px;">
          <v-autocomplete :style="{ visibility: group['state'] == 'ADD' ? 'visible' : 'hidden' }"
            v-model="selectDevice"
            :items="deviceListWithFormattedTitle" item-title="formattedTitle" return-object
            label="選擇通訊協議" variant="outlined" density="comfortable"
          >
            <template v-slot:item="{ item, props }">
              <v-list-item v-bind="props" :title="item.raw.formattedTitle"></v-list-item>
            </template>
          </v-autocomplete>
          <v-switch style="margin: 0px 0px 20px 20px;" v-model="group['item']['enable']" color="primary" inset hide-details density="comfortable">
            <template v-slot:label>
              <h2 style="font-size: 25px;">{{ group['item']['enable'] ? '啟用' : '禁用' }}</h2>
            </template>
          </v-switch>
        </div>
        <!-- ================================================ 虛擬點位設定 ================================================ -->
        <div v-if="group['item']['protocol'] == 'vp'">
          <div style="display: flex; margin: 0px 30px; gap: 15px;">
            <v-text-field style="width: 50%;" v-model="group['item']['name']" label="虛擬點位名稱" variant="outlined" density="comfortable" />
            <v-text-field style="width: 50%;" v-model="group['item']['description']" label="虛擬點位說明" variant="outlined" density="comfortable" />
          </div>
          <div style="display: flex; margin: 0px 30px; gap: 15px;">
            <v-select style="width: 50%;" v-model="group['item']['opt']" :items="opt_list" label="OPT型態" variant="outlined" density="comfortable" />
            <v-select style="width: 50%;" v-model="group['item']['datatype']" :items="datatype_list" label="資料類型" variant="outlined" density="comfortable" />
          </div>
          <v-text-field v-if="group['item']['opt'] == 'NONE'" style="margin: 0px 30px;" v-model="group['item']['noneValue']" label="預設值" variant="outlined" density="comfortable" />
          <v-text-field style="margin: 0px 30px;" v-model="group['item']['interval_ms']" label="間隔時間" variant="outlined" density="comfortable" />

          <v-divider></v-divider>
          <div v-if="group['item']['opt'] != 'NONE'">
            <h2 style="margin: 10px 30px 20px;">進階設定
              <v-btn @click="addDataPoint()" variant="text">
                <v-icon style="font-size: 30px;" icon="mdi-plus" />
              </v-btn>
            </h2>
            <div v-for="(info, index) in group['item']['ptuuids']" :key="index">
              <div style="display: flex; margin: 0px 30px; gap: 15px;">              
                <LargeDataSearch
                  v-model="group['item']['ptuuids'][index]"
                  :items="group_list"
                  label="點位位址"
                  density="comfortable"
                  item-title="name"
                  item-value="id"
                  :return-object="true"
                />
                <v-icon v-if="group['item']['ptuuids'].length != 1" style="font-size: 30px; margin: 10px 0px 0px 5px;" icon="mdi-trash-can" @click="removeDataPoint(index)" />
              </div>
            </div>
          </div>
        </div>
        <!-- ================================================ 實際點位設定 ================================================ -->
        <div v-else>
          <div style="display: flex; margin: 0px 30px; gap: 15px;">
            <v-text-field style="width: 50%;" v-model="group['item']['name']" label="設備點位名稱" variant="outlined" density="comfortable" />
            <v-text-field style="width: 50%;" v-model="group['item']['description']" label="設備點位說明" variant="outlined" density="comfortable" />
          </div>
          <div style="display: flex; margin: 0px 30px; gap: 15px;">
            <v-text-field style="width: 50%;" v-model="group['item']['deviceGroup']" label="設備群組" variant="outlined" density="comfortable" />
            <v-text-field style="width: 50%;" v-model="selectDevice['descript']" label="通訊協議說明" variant="outlined" density="comfortable" :readonly="true" />
          </div>
          <v-text-field style="margin: 0px 30px;" v-model="group['item']['interval_ms']" label="間隔時間" variant="outlined" density="comfortable" />
          <!-- ============================================= Modbus設定 ============================================= -->
          <div v-if="group['item']['protocol'] == 'modbus_tcp' || group['item']['protocol'] == 'modbus_rtu'">
            <div style="display: flex; margin: 0px 30px; gap: 15px;">
              <v-text-field 
                style="width: 50%;" v-model="group['item']['deviceAddress']" 
                label="設備位址" variant="outlined" density="comfortable" 
                min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
              />
              <v-text-field style="width: 50%;" :model-value="group['item']['ptuuids'].length" label="數量" variant="outlined" density="comfortable" readonly  />
              <v-select style="width: 50%;" v-model="group['item']['datatype']" :items="datatype_list" label="資料類型" variant="outlined" density="comfortable" />
            </div>
            <div style="display: flex; margin: 0px 30px; gap: 15px;">
              <v-select style="width: 50%;" v-model="group['item']['function']" :items="funccode_list" label="設備功能碼" variant="outlined" density="comfortable" />
            </div>
            <v-divider></v-divider>
            <h2 style="margin: 10px 30px 20px;">進階設定
              <v-btn @click="addDataPoint()" variant="text">
                <v-icon style="font-size: 30px;" icon="mdi-plus" />
              </v-btn>
            </h2>
            <div v-for="(info, index) in group['item']['ptuuids']" :key="index">
              <div style="display: flex; margin: 0px 30px; gap: 15px;">
                <v-text-field style="width: 20%;" :model-value="parseInt(group['item']['deviceAddress']) + index || 0" readonly label="點位位址" variant="outlined" density="comfortable" />
                <v-text-field style="width: 33%;" v-model="info['name']" label="點位名稱" variant="outlined" density="comfortable" />
                <v-text-field style="width: 50%;" v-model="info['description']" label="點位說明" variant="outlined" density="comfortable" />
                <v-icon v-if="group['item']['ptuuids'].length != 1" style="font-size: 30px; margin: 10px 0px 0px 5px;" icon="mdi-trash-can" @click="removeDataPoint(index)" />
              </div>
            </div>
          </div>
          <!-- ============================================= SNMP設定 ============================================= -->
          <div v-else-if="group['item']['protocol'] == 'snmp'">
            <div style="display: flex; margin: 0px 30px; gap: 15px;">
              <v-text-field 
                style="width: 50%;" v-model="group['item']['deviceAddress']" 
                label="OID" variant="outlined" density="comfortable" 
                @keydown="$utils.blockSNMPInvalidKeys($event)"
              />
              <v-text-field style="width: 50%;" :model-value="group['item']['ptuuids'].length" label="數量" variant="outlined" density="comfortable" readonly />
              <v-select style="width: 50%;" v-model="group['item']['datatype']" :items="datatype_list" label="資料類型" variant="outlined" density="comfortable" />
            </div>
            <div style="display: flex; margin: 0px 30px; gap: 15px;">
              <v-select style="width: 50%;" v-model="group['item']['function']" :items="snmp_funccode_list" label="設備功能碼" variant="outlined" density="comfortable" />
            </div>
            <v-divider></v-divider>
            <h2 style="margin: 10px 30px 20px;">進階設定
              <v-btn v-if="group['item']['function'] == 'GET BULK'" @click="addDataPoint()" variant="text">
                <v-icon style="font-size: 30px;" icon="mdi-plus" />
              </v-btn>
            </h2>
            <div v-for="(info, index) in group['item']['ptuuids']" :key="index">
              <div style="display: flex; margin: 0px 30px; gap: 15px;">
                <v-text-field style="width: 50%;" :model-value="group['item']['deviceAddress'] ? `${group['item']['deviceAddress']}.${(index + 1)}` : ''" readonly label="OID" variant="outlined" density="comfortable" />
                <v-text-field style="width: 33%;" v-model="info['name']" label="點位名稱" variant="outlined" density="comfortable" />
                <v-text-field style="width: 50%;" v-model="info['description']" label="點位說明" variant="outlined" density="comfortable" />
                <v-icon v-if="group['item']['ptuuids'].length != 1" style="font-size: 30px; margin: 10px 0px 0px 5px;" icon="mdi-trash-can" @click="removeDataPoint(index)" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <v-card-actions>
        <div style="width: 100%; display: flex; margin: 10px 0px 20px;">
          <v-spacer></v-spacer>
          <v-btn class="actions-btn" style="color: white; background: #a6c9eb; font-size: 18px;" @click="closeGroupDialog()">取消</v-btn>
          <v-btn class="actions-btn" style="color: white; background: #1f5d97; font-size: 18px;" @click="group['state'] == 'ADD' ? addGroup() : editGroup()">確定</v-btn>
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
          <v-btn class="actions-btn" style="color: white; background: #a6c9eb; font-size: 18px;" @click="closeGroupDialog()">取消</v-btn>
          <v-btn class="actions-btn" style="color: white; background: #1f5d97; font-size: 18px;" @click="removeGroup()">確定</v-btn>
          <v-spacer></v-spacer>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>


<script>
import { useSetup } from '@/store/module/setup.js' // Pinia
import LargeDataSearch from '@/components/Module/LargeDataSearch.vue'

export default {
  components: { LargeDataSearch },
  data() {
    return {
      Setup: useSetup().$state,
      // 分為Modbus、SNMP (群組點位)、VirtualPoint (虛擬點位)、DataPoint (點位總覽)
      // Modbus、SNMP: 相同的Table Header (group_header)
      // VirtualPoint: 不同的Table Header (virtualpoint_header)
      // DataPoint: 點位總覽              (total_point_header)
      tableType: 'Modbus',
      pointInterval: null, // 點位總覽掃描
      // ======================== Table表資料、Header ========================
      group_header: [
        { title: "編號", key: "orderId", align: "center" },
        { title: "設備群組", key: "name", align: "center" },
        { title: "設備", key: "protocoluuid", align: "center" },
        { title: "位址", key: "deviceAddress", align: "center" },
        { title: "功能碼", key: "function", align: "center" },
        { title: "資料型態", key: "datatype", align: "center" },
        { title: "數量", key: "quantity", align: "center" },
        { title: "狀態", key: "enable", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      virtualpoint_header: [
        { title: "編號", key: "orderId", align: "center" },
        { title: "點位名稱", key: "name", align: "center" },
        { title: "點位說明", key: "description", align: "center" },
        { title: "OPT型態", key: "opt", align: "center" },
        { title: "資料型態", key: "datatype", align: "center" },
        { title: "數量", key: "quantity", align: "center" },
        { title: "狀態", key: "enable", align: "center" },
        { title: "", key: "actions", align: "center", sortable: false, width: "10px" },
        { title: '', key: 'data-table-expand' },
      ],
      total_point_header: [
        { title: '點位編號', value: 'id'},
        { title: '點位名稱', value: 'name'},
        { title: '點位說明', value: 'description'},
        { title: '初始值', value: 'initvalue'},
        { title: '校正值', value: 'correctionvalue'},
        { title: '保存型態', value: 'savetype'},
        { title: '資料型態', value: 'datatype'},
        { title: 'R-Expr', value: 'RExpr'},
        { title: 'W-Expr', value: 'WExpr'},
        { title: '實際值', value: 'realvalue'},
        { title: '連線狀態', value: 'online'},
        { title: '啟用狀態', value: 'enable'},
      ],
      group_list: [],         // 點位群組列表 (包含Modbus、SNMP)
      virtualpoint_list: [],  // 虛擬點位列表
      totalpoint_list: [],    // 點位總覽資料
      expand_group: [],       // 資料表擴展資料
      // ======================== Table表搜尋、頁數、排序參數 ========================
      tableSearch: null,          // Table表搜尋輸入框
      debouncedSearch: '',        // 防抖動後的搜尋文字

      itemsPerPage: 10,           // 單頁顯示筆數
      isThrottled: false,         // 用於節流的標記

      tablePageNow: 1,            // 資料表現在的頁數
      isEditingPagenation: false, // 是否正在編輯頁數
      jumpToPageInput: null,      // 跳轉到的頁數輸入框
      sortKey: null,              // 排序的Key名稱 (null為不排序)
      sortOrder: null,            // 排序方式 ===> asc(升序) → desc(降序) → null(重置)
      // ======================== Dialog操作框參數 / 編輯點位總覽參數 ========================
      selectDevice: {},       // 選擇通訊協議
      group: { dialog: false, state: "ADD", item: {} },
      editTotalPoint: {},     // 編輯點位總覽儲存資訊
      // ==================== 實際點位資料 ====================
      // 通訊協議列表 (從通訊協議頁面取得資料)
      protocol_list: [],
      funccode_list: [ "read_discrete_inputs", "read_holding_registers", "01" ], // Modbus設備功能碼列表
      snmp_funccode_list: [ "GET", "SET", "GET BULK" ], // SNMP設備功能碼列表
      datatype_list: [ "BOOL", "INT", "INT16", "UINT16", "FLOAT", "STRING" ], // 資料格式列表
      save_type: [ { title: '暫存', value: 'temp' }, { title: '永久保存', value: 'keep' } ], // 保存型態列表
      // ==================== 虛擬點位資料 ====================
      opt_list: ['NONE', 'CTIME', 'RANDOM', 'ADD', 'MUL', 'MIN', 'MAX', 'AVG', 'SUB', 'DIV'],
    }
  },
  computed: {
    // 用於Data table列表資料 (Modbus、SNMP、虛擬點位)
    datatableItems() {
      if (this.tableType === 'VirtualPoint') return this.virtualpoint_list.map((item, index) => ({ ...item, orderId: index + 1 }));
      const filter_list = [];
      let orderCounter = 1;
      for (const item of this.group_list) {
        const typeOk =
          (this.tableType === 'Modbus' && (item.protocol === 'modbus_tcp' || item.protocol === 'modbus_rtu')) ||
          (this.tableType === 'SNMP'   && item.protocol === 'snmp');
        if (typeOk) {
          filter_list.push({ ...item, orderId: orderCounter }); 
          orderCounter++;
        }
      }
      return filter_list;
    },
    // 過濾搜尋文字對應欄位
    filteredData() {
      var table_list = this.tableType == 'DataPoint' ? this.totalpoint_list : this.datatableItems;
      // 沒有搜尋文字，回傳全部資料
      if (!this.tableSearch) return table_list
      const keyword = this.tableSearch.trim().toLowerCase();
      return table_list.filter((item, index) => {
        const rowText = Object.entries(item).filter(([key]) => key !== 'id').map(([key, val]) => this.formatValue(key, val)).join(' ').toLowerCase();
        return rowText.includes(keyword);
      });
    },
    // 排序處理 (主要為點位總覽用)
    sortedData() {
      if (!this.sortKey || !this.sortOrder) return this.filteredData;
      return [...this.filteredData].sort((a, b) => {
        // ID為數字不用轉string
        const aVal = this.sortKey == "id" ? a[this.sortKey] : String(a[this.sortKey]).toLowerCase();
        const bVal = this.sortKey == "id" ? b[this.sortKey] : String(b[this.sortKey]).toLowerCase();
        if (aVal < bVal) return this.sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return this.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    },
    // 分頁顯示的資料
    pagedData() {
      const start = (this.tablePageNow - 1) * this.itemsPerPage;
      return this.sortedData.slice(start, start + this.itemsPerPage);
    },
    // 分頁總數
    totalPages() { return Math.ceil(this.sortedData.length / this.itemsPerPage) },
    // 建立一個新的列表，每個物件都包含一個格式化好的通訊協議類型標題
    deviceListWithFormattedTitle() {
      return this.protocol_list.map(device => { return { ...device, formattedTitle: `${device.title} (${device.type})` }});
    },
  },
  watch: {
    // 搜尋輸入框 (防抖動)
    tableSearch(newValue) {
      if (this.searchTimeout) clearTimeout(this.searchTimeout);
      // 如果使用者快速輸入，舊的計時器會被清除，只有最後一次輸入會生效
      this.searchTimeout = setTimeout(() => this.debouncedSearch = newValue, 300);
    },
    // 透過選擇通訊協議類型，設定對應的資料格式
    selectDevice(dev) {
      if (this.group.state === 'ADD') {
        // 如果是新增狀態，則初始化虛擬點位
        if (dev == undefined) {
          this.selectDevice = this.initVirtulePointTemplate();
          return;
        }
        if (dev.type === 'vp') this.group.item = this.getVirtualPointTemplate();
        else this.group.item = this.getProtocolTemplate(dev);
      }
    },
    // 監聽功能碼變化，針對SNMP動態調整點位數量
    'group.item.function'(value) {
      var groupItem = this.group.item
      if (groupItem.protocol === 'snmp') {
        if (value !== 'GET BULK' && groupItem.ptuuids.length > 1) {
          // 如果從 GET BULK 切換到其他功能碼，且目前有多個點位，則保留第一個點位並移除其他點位
          groupItem.ptuuids = [groupItem.ptuuids[0]];
        }
      }
    }
  },
  mounted() {
    // 產生假資料 (測試用)
    this.generateProtocolList();
    this.generateGroupList('init');
    // setInterval(() => {
    //   // 確保沒有展開群組或編輯框未開啟時，才持續更新群組資料
    //   if (this.expand_group.length == 0 && this.group['dialog'] == false) this.generateGroupList('scan');
    // }, 1000);
    // this.generateVirtualPointList();
    window.addEventListener("keydown", this.keyboardDialogEvent);
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.keyboardDialogEvent);
  },
  methods: {
    // 換頁後初始化搜尋、頁數等資訊
    changeTableType(type) {
      this.tableSearch = ""
      this.tableType = type
      this.tablePageNow = 1; // 重置頁數
      clearInterval(this.pointInterval)
      if (type == 'DataPoint') {
        this.generatePointList();
        this.pointInterval = setInterval(() => {
          // 確保沒有編輯框未編輯時，才持續更新API資料
          var editState = false;
          for (let i in this.totalpoint_list) {
            if (this.totalpoint_list[i]['edit']) editState = true;
          }
          if (editState == false) this.generatePointList('scan');
        }, 3000);
      }
    },
    // 點位總覽資料列表
    generatePointList() {
      useSetup().getPointList().then((res)=> {
        var point_list = Object.prototype.toString.call(res['data']) === '[object Object]' ? res['data'] : {}
        this.totalpoint_list = []
        var count = 1
        for (let i in point_list) {
          // 點位總覽
          var total = { id: count, ...point_list[i]}
          this.totalpoint_list.push(total)
          count++
        }
        console.log("點位原始資料: ", point_list)
        console.log("點位總覽: ", this.totalpoint_list)
      }).catch((err)=> console.error(err))
    },
    // ================================================== 模擬用資料 ==================================================
    // 生成隨機通訊協議資料 (假資料)
    generateProtocolList(count = 100) {
      const list = [{ title: "虛擬點位", type: "vp", descript: "", uuid: "" }];
      const protocolTypes = ['modbus_tcp', 'modbus_rtu', 'snmp'];
      for (let i = 1; i < count; i++) {
        const type = protocolTypes[Math.floor(Math.random() * protocolTypes.length)];
        list.push({
          title: `設備${i}`, type, descript: `描述${i}`,
          uuid: crypto.randomUUID?.() || Math.random().toString(36).slice(2)
        });
      }
      this.protocol_list = list;
      console.log("Generated Protocol List: ", this.protocol_list);
    },
    // 生成隨機點位群組列表 (假資料)
    generateGroupList(state = 'init') {
      if (state == 'init') {
        this.group_list = generateMockData(this.protocol_list)
        return;
      }
      var newData = generateMockData(this.protocol_list)
      if (this.group_list.length != newData.length) this.group_list = newData; // 判斷資料長度
      this.$utils.updateDataSmartly(this.group_list, 'uuid', newData);
      
      console.log("Generated Group List: ", this.group_list);
      function generateMockData(devList, count = 5000) {
        // 過濾掉 VirtualPoint
        const realDevices = devList.filter(d => d.type !== 'vp');

        const result = [];
        for (let i = 0; i < count; i++) {
          const dev = realDevices[i % realDevices.length];   // 輪流配置
          const protocol = dev.type;
          const baseAddr = 1000 + i;
          const quantity = 3 + Math.floor(Math.random() * 4);
          const datapoints = [];

          for (let d = 0; d < quantity; d++) {
            let address;
            address = protocol === 'snmp' ? `${baseAddr}.${d + 1}` : String(baseAddr + d);
            datapoints.push({
              uuid: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
              address,
              name: `${protocol.toLowerCase()}-pt${d + 1}`,
              description: `說明${d + 1}`,
              initvalue: 0,
              correctionvalue: 2,
              savetype: "暫存",
              RExpr: "{.}",
              WExpr: "{.}"
            });
          }
          var Group = {
            uuid: i, // crypto.randomUUID?.() || Math.random().toString(36).slice(2), // 暫且以i當uuid
            protocol: protocol,
            name: `設備_${i}`,
            description: `設備說明_${i}`,
            deviceGroup: `群組_${Math.floor(i / 10) + 1}`,
            interval_ms: 1000,
            enable: true,
            protocoluuid: dev.uuid,
            deviceAddress: protocol === 'snmp' ? baseAddr.toString() : String(baseAddr),
            function: protocol === 'snmp' ? 'GET' : '01',
            datatype: 'INT',
            ptuuids: datapoints,
          }
          if (protocol === 'snmp') Group['oid_num'] = datapoints.length;
          else Group['quantity'] = datapoints.length;
          result.push(Group);
        }
        return result;
      }
    },
    // 生成虛擬點位列表 (假資料)
    generateVirtualPointList(count = 5000) {
      this.virtualpoint_list = []
      for (let i = 0; i < count; i++) {
        var virtualpointItem = this.getVirtualPointTemplate()
        virtualpointItem['uuid'] = crypto.randomUUID?.() || Math.random().toString(36).slice(2)
        virtualpointItem['name'] = `虛擬點位${i+1}`
        virtualpointItem['description'] = `虛擬點位說明${i+1}`
        this.virtualpoint_list.push(virtualpointItem)
      }
      console.log("Generated Virtual Point List: ", this.virtualpoint_list);
    },
    // ========================================== 滾輪換頁事件 ==========================================
    handelTurnPageWheel(event) {
      event.preventDefault();
      if (this.isThrottled) return; // 正在節流冷卻中，則不執行
      this.isThrottled = true;      // 立即進入冷卻狀態
      if (event.deltaY > 0) this.nextPage();          // 向下滾動 -> 下一頁
      else if (event.deltaY < 0) this.prevPage();     // 向上滾動 -> 上一頁
      setTimeout(() => this.isThrottled = false, 50); // 50毫秒後解除冷卻
    },
    // 獨立的下一頁/上一頁方法
    nextPage() { if (this.tablePageNow < this.totalPages) this.tablePageNow++; },
    prevPage() { if (this.tablePageNow > 1) this.tablePageNow--; },
    // ========================================== 輸入框換頁方式 ==========================================
    handlePageClick(isActive, page) {
      let cleanedString = page.replace(/,/g, ''); 
      let pageNumber = parseInt(cleanedString, 10);
      if (isActive) {
        this.isEditingPagenation = true;
        this.jumpToPageInput = pageNumber;
        this.$nextTick(() => { this.$refs.pagenationInput?.focus() });
      } else this.tablePageNow = pageNumber;
    },
    jumpFromInlineInput() {
      if (this.jumpToPageInput === null || this.jumpToPageInput === '') {
        this.isEditingPagenation = false;
        return;
      }
      const pageNumber = parseInt(this.jumpToPageInput);
      // 有效頁數才跳轉
      if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= this.totalPages) {
        this.tablePageNow = pageNumber;
      }
      this.isEditingPagenation = false;
    },
    // ========================================== 一般資料表資訊 ==========================================
    // 修改Table表模式 (Vuetify Table表: Nodbus、SNMP、虛擬點位，原生Table表: 點位總覽)
    // 統一欄位顯示邏輯 (可擴充自訂文字)
    formatValue(key, val) {
      if (key === 'enable') return val ? '啟用' : '禁用';
      if (key === 'protocoluuid') return this.$utils.findObjectByKey(this.protocol_list, 'uuid', val)?.title || '';

      if (key === 'online') return val ? '已連線' : '未連線'
      if (key === 'savetype') return val == 'temp' ? '暫存' : '永久保存'
      return String(val ?? '');
    },
    // 修改點位模式(編輯、預覽)
    changeEditType(item) {
      if (item.edit == undefined) { item.edit = true; return}
      item.edit = !item.edit
      // TODO API  ==>  item.edit == false (關閉編輯模式時更新)
    },
    // ========================================== 點位總覽 Table表用 ==========================================
    // 排序點位總覽列表資料
    sortTotalPointList(key) {
      if (this.sortKey !== key) { // 換欄位 → 從 asc 開始
        this.sortKey = key;
        this.sortOrder = 'asc';
      } else { // 同欄位：asc (升序) → desc (降序) → null（重置）
        if (this.sortOrder === 'asc') this.sortOrder = 'desc';
        else if (this.sortOrder === 'desc') {
          this.sortKey = null;
          this.sortOrder = null;
        } else this.sortOrder = 'asc';
      }
    },
    // 確認是否開始編輯點位
    startEditPoint(item) {
      if (item.edit == undefined || item.edit == false) { 
        item.edit = true;
        this.editTotalPoint[item.uuid] = JSON.parse(JSON.stringify(item))
        return;
      }
    },
    // 編輯完成
    editPointValue(item) {
      delete this.editTotalPoint[item.uuid]
      item.edit = false;
    },
    // 取消編輯
    cancelPointValue(item) {
      for (let i in this.totalpoint_list) {
        if (this.totalpoint_list[i]['uuid'] == item.uuid) {
          Object.assign(this.totalpoint_list[i], this.editTotalPoint[item.uuid]);
        }
      }
      delete this.editTotalPoint[item.uuid]
      item.edit = false;
    },
    // ========================================== 群組設定 Dialog ==========================================
    // 開啟群組設定Dialog
    openGroup(state, item) {
      this.group['dialog'] = true;
      this.group['state'] = state;
      if (state == 'EDIT' || state == 'DELETE') {
        this.selectDevice = this.$utils.findObjectByKey(this.protocol_list, 'uuid', item.protocoluuid) || { title: "", type: item['protocol'], descript: '', uuid: '' };
        this.group['item'] = JSON.parse(JSON.stringify(item))
      } else {
        // 新增時初始狀態 (預設為虛擬點位)
        this.selectDevice = this.initVirtulePointTemplate();
        this.group.item = this.getVirtualPointTemplate();
      }
    },
    // Dialog鍵盤事件
    keyboardDialogEvent(e) {
      if (!this.group['dialog']) return;
      if (e.key == "Escape") this.closeGroupDialog();
      if (e.key == "Enter") {
        if (this.group['state'] == 'ADD') this.addGroup();
        else if (this.group['state'] == 'EDIT') this.editGroup()
        else if (this.group['state'] == 'DELETE') this.removeGroup();
      }
    },
    // 新增一筆點位列表
    addDataPoint() {
      var point = this.group['item']['ptuuids']
      if (point.length >= 10) { useSetup().showAlertDialog({ icon: "warn", title: "點位數量已達最大上限(10筆)" }); return; }
      point.push({ name: '', description: '', initvalue: 0, correctionvalue: 0, savetype: '暫存', RExpr: '{.}', WExpr: '{.}' })
    },
    // 移除一筆點位列表
    removeDataPoint(index) {
      var point = this.group['item']['ptuuids']
      point.splice(index, 1)
    },
    // 新增群組 (無API)
    addGroup() {
      if (this.group['item']['name'] == "") {
        useSetup().showAlertDialog({ icon: "warn", title: "請設定設備群組名稱" })
        return
      }

      var item = this.group['item']
      var type = item['protocol']
      for (let i in item['ptuuids']) {
        if (!item.ptuuids[i].name) {
          useSetup().showAlertDialog({ icon: "warn", title: "有點位名稱尚未設定" });
          return;
        }
        // 設定 address
        if (type === 'modbus_tcp' || type === 'modbus_rtu') item['ptuuids'][i].address = String(parseInt(item.deviceAddress) + parseInt(i)); // EX: 2152
        else if (type === 'snmp') item['ptuuids'][i].address = `${item.deviceAddress}.${parseInt(i) + 1}`; // EX: 1.2.33.2515.1
      }
      if (type == 'snmp') item.oid_num = item.ptuuids.length;
      else item.quantity = item.ptuuids.length;

      this.group['item']['protocoluuid'] = this.selectDevice['uuid'] // 取出通訊協議資訊UUID
      var ADD = { uuid: crypto.randomUUID(), ...this.group['item'] }
      // 區分虛擬點位與群組點位 (TODO API)
      if (type == "vp") this.virtualpoint_list.push(ADD)
      else this.group_list.push(ADD);
      this.closeGroupDialog();
    },
    // 更新群組資料 (無API)
    editGroup() {
      if (this.group['item']['name'] == "") {
        useSetup().showAlertDialog({ icon: "warn", title: "請設定設備群組名稱" })
        return
      }
      
      var item = this.group['item']
      var type = item['protocol']
      for (let i in item['ptuuids']) {
        if (!item.ptuuids[i].name) {
          useSetup().showAlertDialog({ icon: "warn", title: "有點位名稱尚未設定" });
          return;
        }
        // 設定 address
        if (type === 'modbus_tcp' || type === 'modbus_rtu') item['ptuuids'][i].address = String(parseInt(item.deviceAddress) + parseInt(i)); // EX: 2152
        else if (type === 'snmp') item['ptuuids'][i].address = `${item.deviceAddress}.${parseInt(i) + 1}`; // EX: 1.2.33.2515.1
      }
      
      if (type == 'snmp') item.oid_num = item.ptuuids.length;
      else item.quantity = item.ptuuids.length;

      this.group['item']['protocoluuid'] = this.selectDevice['uuid'] // 取出通訊協議資訊UUID
      // 區分虛擬點位與群組點位 (TODO API)
      if (type == "vp") {
        for (let i in this.virtualpoint_list) {
          if (this.virtualpoint_list[i]['uuid'] == this.group['item']['uuid']) {
            this.virtualpoint_list[i] = this.group['item']
            this.closeGroupDialog();
          }
        }
      } else {
        for (let i in this.group_list) {
          if (this.group_list[i]['uuid'] == this.group['item']['uuid']) {
            this.group_list[i] = this.group['item']
            this.closeGroupDialog();
          }
        }
      }
    },
    // 刪除群組 (無API)
    removeGroup() {
      // 區分虛擬點位與群組點位 (TODO API)
      if (this.group['item']['protocol'] == "vp") {
        for (let i in this.virtualpoint_list) {
          if (this.virtualpoint_list[i]['uuid'] == this.group['item']['uuid']) {
            this.virtualpoint_list.splice(i, 1);
            this.closeGroupDialog();
          }
        }
      } else {
        for (let i in this.group_list) {
          if (this.group_list[i]['uuid'] == this.group['item']['uuid']) {
            this.group_list.splice(i, 1);
            this.closeGroupDialog();
          }
        }
      }
    },
    // 關閉群組Dialog
    closeGroupDialog() {
      this.group['dialog'] = false;
      setTimeout(() => {
        this.group['state'] = 'ADD'
      }, 100);
    },
    // ==================================================== 模板設定Function ====================================================
    // 初始化虛擬點位模板
    initVirtulePointTemplate() {
      return { title: "虛擬點位", type: 'vp', descript: '', uuid: '', formattedTitle: `虛擬點位 (VirtualPoint)` };
    },
    // 虛擬點位模板
    getVirtualPointTemplate() {
      return {
        protocol: "vp",
        name: '',
        description: '',
        enable: true,
        opt: 'NONE',
        noneValue: '',  // 預設值 (OPT為NONE時使用)
        datatype: 'INT',
        mainpoint: "",
        ptuuids: [],
        quantity: 0,
        interval_ms: 1000,  // 產生間隔時間
      };
    },

    // 實際點位模板
    getProtocolTemplate(dev) {
      var type = dev.type
      var template = {
        protocol: type,       // 通訊協議類型
        name: "",             // 群組名稱
        description: "",      // 群組說明
        deviceGroup: "",      // 設備群組
        enable: true,         // 啟用狀態
        deviceAddress: "",    // 設備位址
        function: type === 'snmp' ? 'GET' : '01', // 設備功能碼
        datatype: "INT",      // 資料格式
        ptuuids: [
          {
            name: "",           // 點位名稱
            description: "",    // 點位說明
            initvalue: 0,       // 初始值
            correctionvalue: 2, // 校正值
            savetype: "暫存",   // 保存型態
            RExpr: "{.}",       // R-Expr
            WExpr: "{.}"        // R-Expr
          }
        ],
        interval_ms: 1000,      // 產生間隔時間
      };
      // 數量
      if (type === 'snmp') template['oid_num'] = 1;
      else template['quantity'] = 1;
      return template
    },
  }
}
</script>


<style lang="scss" scoped>
// 群組CSS
.group_table_class {
  height: 70vh;
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
  height: 70vh; 
  // overflow: auto;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.total_point_list {
  width: 100%;
  min-width: 800px;
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
