<!-- =================================================== 編輯頁面 - 組件設定Dialog =================================================== -->
<template>
  <div>
    <v-dialog v-model="component['dialog']" width="700" persistent>
      <v-card>
        <v-card-title>
          <h2 style="text-align: center;margin: 10px;font-size: 40px;">{{ component['state'] == 'ADD' ? '新增組件' : '修改組件類型' }}</h2>
        </v-card-title>

        <div style="display: flex;">
          <v-checkbox style="margin-bottom: 20px; margin-left: 25px;" v-model="component['info']['showComponent']" hide-details>
            <template v-slot:label>
              <h2>{{ component['info']['showComponent'] ? '顯示' : '隱藏' }}</h2>
            </template>
          </v-checkbox>
          <v-select v-if="component['state'] == 'ADD'" v-model="component['info']['type']" style="margin: 0px 30px;" :items="component_type" item-title="name" item-value="value" variant="outlined" label="選擇組件類型" />
          <h3 v-else style="margin-top: 15px; margin-left: 25px;">
            組件類型: {{ $utils.findObjectByKey(component_type, 'value', component['info']['type'])['name'] || '' }}
          </h3>
        </div>

        <div style="display: flex;">
          <v-text-field v-model="component['info']['title']" style="margin: 0px 30px;" label="組件標題" variant="outlined" />
          <!-- <v-select v-model="component['info']['point']" style="margin: 0px 30px 0px 10px; width: 8%;" :items="Setup.datapoint_list" item-title="name" item-value="value" variant="outlined" label="選擇點位" /> -->
          <!-- <v-autocomplete
            v-model="component['info']['point']"
            style="margin: 0px 30px 0px 10px; width: 8%;"
            :items="Setup.datapoint_list"
            item-title="name" item-value="value"
            variant="outlined" label="選擇點位"
          /> -->
        </div>
        
        <div style="display: flex; gap: 20px; margin: 0px 30px;">
          <v-text-field v-model="component['info']['width']" label="寬度" variant="outlined" min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" />
          <v-text-field v-model="component['info']['height']" label="高度" variant="outlined" min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" />
        </div>

        <div style="display: flex; gap: 20px; margin: 0px 30px;">
          <v-text-field v-model="component['info']['n_x']" label="X" variant="outlined" min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" />
          <v-text-field v-model="component['info']['n_y']" label="Y" variant="outlined" min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" />
        </div>

        <!-- 多筆點位 -->
        <v-autocomplete v-model="component['info']['point']" style="margin: 0px 30px;" :items="Setup.datapoint_list" item-title="name" item-value="value" multiple variant="outlined" label="選擇點位" >
          <template v-slot:item="{ item, on, attrs }">
            <v-list-item v-bind="attrs" @click.stop="togglePointItem(item.value)">
              <v-list-item-action>
                <v-checkbox :model-value="component['info']['point'].includes(item.value)" :label="item.title" hide-details />
              </v-list-item-action>
            </v-list-item>
          </template>
        </v-autocomplete>

        
        <div style="display: flex;">
          <v-checkbox style="margin-bottom: 20px; margin-left: 25px;" v-model="component['info']['showBorder']" hide-details>
            <template v-slot:label>
              <h2>{{ component['info']['showBorder'] ? '顯示' : '隱藏' }}邊框</h2>
            </template>
          </v-checkbox>
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['borderColor']" label="邊框顏色" />
        </div>
        <v-divider style="margin: 0px 20px 20px 20px;"></v-divider>
        <!-- ============================================== 按鈕組件 ============================================== -->
        <template v-if="component['info']['type'] == 'button'">
          <v-checkbox style="margin-bottom: 20px; margin-left: 25px;" v-model="component['info']['btnReadonly']" hide-details>
            <template v-slot:label>
              <h2>按鈕唯讀: {{ component['info']['btnReadonly'] ? '開啟' : '關閉' }}</h2>
            </template>
          </v-checkbox>
          <div style="display: flex; gap: 20px; margin: 0px 30px;">
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['textColor']" label="按鈕文字顏色" />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['bgColor']" label="按鈕背景顏色" />
          </div>
          <div style="display: flex; gap: 20px; margin: 0px 30px;">
            <v-text-field style="width: 50%;" v-model="component['info']['fontSize']" 
              label="按鈕文字大小" variant="outlined" 
              min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <v-select style="width: 50%;" v-model="component['info']['shadowSize']" :items="btn_shadowsize" variant="outlined" label="按鈕陰影大小" />
          </div>
          <div style="display: flex; gap: 20px; margin: 0px 30px;">
            <v-text-field style="width: 50%;" v-model="component['info']['btnRadius']" 
              label="按鈕圓角" variant="outlined" 
              min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <v-select style="width: 50%;" v-model="component['info']['btnOpacity']" 
              :items="btn_opacity_list" item-title="name" item-value="value" 
              variant="outlined" label="選擇按鈕透明度" 
            />
          </div>
          <v-select 
            style="margin: 0px 30px;" 
            v-model="component['info']['textAlign']" 
            :items="text_align_list" item-title="name" item-value="value" 
            variant="outlined" label="選擇文字位置" 
          />
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['pointText']" label="點位文字敘述" variant="outlined" />
          <v-textarea style="margin: 0px 30px;" v-model="component['info']['func']" variant="outlined" label="點擊指令" rows="3" />
        </template>

        <!-- ============================================== 輸入框組件 ============================================== -->
        <template v-if="component['info']['type'] == 'input'">
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['fontSize']" 
            label="文字大小" variant="outlined" 
            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
          />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['textColor']" label="文字顏色" />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['bgColor']" label="組件底色" />
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['textRadius']" 
            label="組件圓角" variant="outlined" 
            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
          />
          <v-select 
            style="margin: 0px 30px;" 
            v-model="component['info']['textAlign']" 
            :items="text_align_list" item-title="name" item-value="value" 
            variant="outlined" label="選擇文字位置"
          />
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['pointText']" label="點位文字敘述" variant="outlined" />
        </template>

        <!-- ============================================== 時間組件 ============================================== -->
        <template v-if="component['info']['type'] == 'timer'">
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['fontSize']" 
            label="文字大小" variant="outlined" 
            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
          />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['textColor']" label="文字顏色" />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['bgColor']" label="組件底色" />
          <v-text-field style="margin: 0px 10px 0px 30px;" v-model="component['info']['textRadius']" 
            label="組件圓角" variant="outlined" 
            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
          />
          <div style="display: flex; margin: 0px 30px;">
            <h2 style="font-size: 25px;margin: 3px 15px 0px 0px;">時間格式</h2>
            <v-radio-group v-model="component['info']['timeFormat']" inline>
              <v-radio label="西元" value="ad"></v-radio>
              <v-radio label="民國" value="tw"></v-radio>
            </v-radio-group>
          </div>
        </template>

        <!-- ============================================== 跑馬燈組件 ============================================== -->
        <template v-if="component['info']['type'] == 'marquee'">
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['fontSize']" 
            label="文字大小" variant="outlined" 
            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
          />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['textColor']" label="文字顏色" />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['bgColor']" label="組件底色" />
          <v-text-field style="margin: 0px 10px 0px 30px;" v-model="component['info']['textRadius']" 
            label="組件圓角" variant="outlined" 
            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
          />
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['pointText']" label="點位文字敘述" variant="outlined" />
        </template>

        <!-- ============================================== 圖片組件 ============================================== -->
        <template v-if="component['info']['type'] == 'image'">
          <v-file-input 
            style="margin: 0px 30px;" accept=".jpg,.png,.svg" 
            variant="outlined" label="選擇圖片" prepend-icon="" 
            @change="uploadImg" @click:clear="imgImport = null" 
          />
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['fontSize']" 
            label="文字大小" variant="outlined" 
            min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
          />
          <v-select 
            style="margin: 0px 30px;" 
            v-model="component['info']['textAlign']" 
            :items="text_align_list" item-title="name" item-value="value" 
            variant="outlined" label="選擇文字位置"
          />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['textColor']" label="文字顏色" />
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['pointText']" label="點位文字敘述" variant="outlined" />
          <v-textarea style="margin: 0px 30px;" v-model="component['info']['func']" variant="outlined" label="點擊指令" rows="3" />
        </template>

        <!-- ============================================== ICON組件 ============================================== -->
        <template v-if="component['info']['type'] == 'icon'">
          <div style="display: flex; margin: -10px 30px 10px;">
            <h3 style="margin: 10px 15px 0px 0px ;">選擇ICON: </h3>
            <v-menu :close-on-content-click="false" offset-y>
              <template #activator="{ props }">
                <v-btn v-bind="props" icon><v-icon>{{ component['info']['icon'] || 'mdi-keyboard-outline' }}</v-icon></v-btn>
              </template>
              <v-card style="width: 500px;">
                <v-sheet class="pa-3">
                  <div class="keyboard-grid">
                    <v-btn v-for="(icon, index) in Setup.icon_list" :key="index" icon size="36" @click="component['info']['icon'] = icon">
                      <v-icon>{{ icon }}</v-icon>
                    </v-btn>
                  </div>
                </v-sheet>
              </v-card>
            </v-menu>
          </div>
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['iconColor']" label="ICON顏色" />
          <v-textarea style="margin: 0px 30px;" v-model="component['info']['func']" variant="outlined" label="點擊指令" rows="3" />
        </template>

        <!-- ============================================== 即時曲線圖組件 ============================================== -->
        <template v-if="component['info']['type'] == 'linechart'">
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['bgColor']" label="曲線圖底色" />
          <div style="display: flex; gap: 20px; margin: 0px 30px;">
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['linechartXColor']" label="曲線圖X軸顏色" />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['linechartYColor']" label="曲線圖Y軸顏色" />
          </div>

          <div style="display: flex; gap: 10px; margin: 0px 30px;">
            <v-text-field  v-model="component['info']['charttitle']['text']" label="曲線圖標題文字" variant="outlined" />
            <v-text-field  v-model="component['info']['xaxistitle']['text']" label="曲線圖X軸文字" variant="outlined" />
            <v-text-field  v-model="component['info']['yaxistitle']['text']" label="曲線圖Y軸文字" variant="outlined" />
          </div>
          <div style="display: flex; gap: 10px; margin: 0px 30px;">
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['charttitle']['color']" label="曲線圖標題顏色" />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['xaxistitle']['color']" label="曲線圖X軸標題顏色" />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['yaxistitle']['color']" label="曲線圖Y軸標題顏色" />
          </div>

          <div style="display: flex; gap: 10px; margin: 0px 30px;">
            <v-text-field v-model="component['info']['charttitle']['fontSize']" 
              label="曲線圖標題文字大小" variant="outlined" 
              min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
            />
            <v-text-field v-model="component['info']['xaxistitle']['fontSize']" 
              label="曲線圖X軸文字大小" variant="outlined" 
              min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
            />
            <v-text-field v-model="component['info']['yaxistitle']['fontSize']" 
              label="曲線圖Y軸文字大小" variant="outlined" 
              min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
            />
          </div>

          <div v-for="(chartItem, index) in component['info']['content']" :key="index" style="display: flex; margin: 0px 30px; gap: 10px;">
            <v-text-field style="margin-right: 15px;" v-model="chartItem['title']" label="曲線標題" variant="outlined" />
            <ColorPicker fieldStyle="" v-model:colorModel="chartItem['color']" label="曲線顏色" />
            <v-text-field style="margin-right: 15px;" v-model="chartItem['point']" label="曲線點位" variant="outlined" />
            <v-icon style="margin: 15px 0px 0px 10px;" @click="removeChartArrayIdx(index)">mdi-trash-can</v-icon>
          </div>
          <v-btn style="margin: 0px 30px;" icon="mdi-plus" @click="addChartArray()"></v-btn>
        </template>

        <!-- ============================================== 歷史曲線圖組件 ============================================== -->
        <template v-if="component['info']['type'] == 'historychart'">
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['bgColor']" label="曲線圖底色" />
          <div style="display: flex; gap: 20px; margin: 0px 30px;">
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['linechartXColor']" label="曲線圖X軸顏色" />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['linechartYColor']" label="曲線圖Y軸顏色" />
          </div>

          <div style="display: flex; gap: 10px; margin: 0px 30px;">
            <v-text-field  v-model="component['info']['charttitle']['text']" label="曲線圖標題文字" variant="outlined" />
            <v-text-field  v-model="component['info']['xaxistitle']['text']" label="曲線圖X軸文字" variant="outlined" />
            <v-text-field  v-model="component['info']['yaxistitle']['text']" label="曲線圖Y軸文字" variant="outlined" />
          </div>
          <div style="display: flex; gap: 10px; margin: 0px 30px;">
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['charttitle']['color']" label="曲線圖標題顏色" />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['xaxistitle']['color']" label="曲線圖X軸標題顏色" />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['yaxistitle']['color']" label="曲線圖Y軸標題顏色" />
          </div>

          <div style="display: flex; gap: 10px; margin: 0px 30px;">
            <v-text-field v-model="component['info']['charttitle']['fontSize']" 
              label="曲線圖標題文字大小" variant="outlined" 
              min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
            />
            <v-text-field v-model="component['info']['xaxistitle']['fontSize']" 
              label="曲線圖X軸文字大小" variant="outlined" 
              min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
            />
            <v-text-field v-model="component['info']['yaxistitle']['fontSize']" 
              label="曲線圖Y軸文字大小" variant="outlined" 
              min="0" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)"
            />
          </div>

          <div v-for="(chartItem, index) in component['info']['content']" :key="index" style="display: flex; margin: 0px 30px; gap: 10px;">
            <v-text-field style="margin-right: 15px;" v-model="chartItem['title']" label="曲線標題" variant="outlined" />
            <ColorPicker fieldStyle="" v-model:colorModel="chartItem['color']" label="曲線顏色" />
            <v-text-field style="margin-right: 15px;" v-model="chartItem['point']" label="曲線點位" variant="outlined" />
            <v-icon style="margin: 15px 0px 0px 10px;" @click="removeChartArrayIdx(index)">mdi-trash-can</v-icon>
          </div>
          <v-btn style="margin: 0px 30px;" icon="mdi-plus" @click="addChartArray()"></v-btn>
        </template>

        <!-- ============================================== 設備資料表組件 ============================================== -->
        <template v-if="component['info']['type'] == 'devtable'">
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['textColor']" label="文字顏色" />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['tableColor']" label="資料表顏色" />
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['tabletextColor']" label="資料表文字顏色" />
          <h2 style="text-align: center;margin: 10px;">資料表Header</h2>
          <div v-for="(devItem, index) in component['info']['header']" :key="index" style="display: flex; margin: 0px 30px;">
            <v-checkbox style="margin-right: 15px;" v-model="devItem['show']" />
            <v-text-field style="margin-right: 15px;" v-model="devItem['title']" label="Header標題" variant="outlined" />
            <v-text-field style="margin-right: 15px;" v-model="devItem['key']" label="Key" variant="outlined" />
            <v-icon style="margin: 15px 0px 0px 10px;" @click="removeDevHeader(index)">mdi-trash-can</v-icon>
          </div>
          <v-btn style="width: 1%;margin: 0px 0px 20px 30px;" variant="outlined" @click="addDevHeader()">
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </template>

        <!-- ============================================== 監視器組件 ============================================== -->
        <template v-if="component['info']['type'] == 'monitor'">
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['monitor']" label="攝影機URL" variant="outlined" />
        </template>

        <!-- ============================================== 儀表板組件 ============================================== -->
        <template v-if="component['info']['type'] == 'gaugechart'">
          <div style="display: flex; margin: 0px 30px;">
            <v-radio-group v-model="component['info']['gaugechartStyle']" inline>
              <v-radio label="樣式1" value="gaugechartV1"></v-radio>
              <v-radio label="樣式2" value="gaugechartV2"></v-radio>
              <v-radio label="樣式3" value="gaugechartV3"></v-radio>
              <v-radio label="樣式4" value="gaugechartV4"></v-radio>
              <v-radio label="樣式5" value="gaugechartV5"></v-radio>
            </v-radio-group>
          </div>
          
          <div v-if="component['info']['gaugechartStyle'] == 'gaugechartV1'">
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['ringColor'][0]" label="裝飾環顏色 (外層)" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['ringColor'][1]" label="裝飾環顏色 (內層)" />
            </div>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['bgColor']" label="背景顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['scaleColor']" label="刻度顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['scaleTextColor']" label="刻度文字顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['needleColor']" label="指針顏色" />
            </div>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['dashboardColor'][0]" label="儀表盤顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['dashboardColor'][1]" label="儀表盤顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['dashboardColor'][2]" label="儀表盤顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['dashboardColor'][3]" label="儀表盤顏色" />
            </div>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['titleColor']" label="標題文字顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style1']['pointColor']" label="點位文字顏色" />
            </div>
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style1']['maxValue']" 
              label="指針最大刻度" variant="outlined" 
              min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />

            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <v-text-field  v-model="component['info']['style1']['titleText']" label="標題文字" variant="outlined" />
              <v-text-field v-model="component['info']['style1']['pointText']" label="點位文字敘述" variant="outlined" />
            </div>
          </div>
          <!-- =========================================================  -->
          <div v-if="component['info']['gaugechartStyle'] == 'gaugechartV2'">
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['top']['pointColor']" label="上點位顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['top']['scaleColor']" label="刻度顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['top']['scaleTextColor']" label="刻度文字顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['top']['needleColor']" label="指針顏色" />
            </div>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <v-text-field style="max-width: 21.5%;" v-model="component['info']['style2']['top']['maxValue']"
                label="指針最大刻度" variant="outlined" 
                min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
              />
              <v-text-field v-model="component['info']['style2']['top']['pointText']" label="上點位文字敘述" variant="outlined" />
            </div>

            <v-divider style="margin: 10px 10px 30px 10px;"></v-divider>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['bottom']['pointColor']" label="下點位顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['bottom']['scaleColor']" label="刻度顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['bottom']['scaleTextColor']" label="刻度文字顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['bottom']['needleColor']" label="指針顏色" />
            </div>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <v-text-field style="max-width: 21.5%;" v-model="component['info']['style2']['bottom']['maxValue']" 
                label="指針最大刻度" variant="outlined" 
                min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
              />
              <v-text-field v-model="component['info']['style2']['bottom']['pointText']" label="下點位文字敘述" variant="outlined" />
            </div>

            <v-divider style="margin: 10px 10px 30px 10px;"></v-divider>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['center']['centerTitleColor']" label="中點位標題顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['center']['pointColor']" label="中點位顏色" />
            </div>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <v-text-field v-model="component['info']['style2']['center']['centerTitle']" label="中點位標題" variant="outlined" />
              <v-text-field v-model="component['info']['style2']['center']['pointText']" label="中點位文字敘述" variant="outlined" />
            </div>
            <v-divider style="margin: 10px 10px 30px 10px;"></v-divider>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['gauge']['titleBGColor']" label="內層背景" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['gauge']['scaleBGColor']" label="刻度背景" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style2']['gauge']['pointerTrailColor']" label="指針軌跡顏色" />
            </div>
          </div>
          <!-- =========================================================  -->
          <div v-if="component['info']['gaugechartStyle'] == 'gaugechartV3'">
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style3']['pointColor']" label="點位顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style3']['titleColor']" label="標題顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style3']['bgColor']" label="背景顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style3']['shortScaleColor']" label="短刻度顏色" />
            </div>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style3']['largeScaleColor'][0]" label="長刻度顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style3']['largeScaleColor'][1]" label="長刻度顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style3']['largeScaleColor'][2]" label="長刻度顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style3']['largeScaleColor'][3]" label="長刻度顏色" />
            </div>
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style3']['maxValue']" 
              label="指針最大刻度" variant="outlined" 
              min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style3']['titleText']" label="標題文字" variant="outlined" />
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style3']['pointText']" label="點位文字" variant="outlined" />
          </div>
          <!-- =========================================================  -->
          <div v-if="component['info']['gaugechartStyle'] == 'gaugechartV4'">
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style4']['pointColor']" label="點位顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style4']['titleColor']" label="標題顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style4']['bgColor']" label="背景顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style4']['shortScaleColor']" label="短刻度顏色" />
            </div>
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style4']['largeScaleColor']" label="長刻度顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style4']['largeScaleLimitColor']" label="長刻度顏色(limit狀態)" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style4']['largeScaleOverColor']" label="長刻度顏色(Over狀態)" />
            </div>
            <v-text-field style="margin: 0px 30px;"  v-model="component['info']['style4']['limitValue']" 
              label="指針限制刻度" variant="outlined" 
              min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style4']['maxValue']" 
              label="指針最大刻度" variant="outlined" 
              min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style4']['titleText']" label="標題文字" variant="outlined" />
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style4']['pointText']" label="點位文字" variant="outlined" />
          </div>

          <!-- =========================================================  -->
          <div v-if="component['info']['gaugechartStyle'] == 'gaugechartV5'">
            <div style="display: flex; gap: 20px; margin: 0px 30px;">
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style5']['pointColor']" label="點位顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style5']['titleColor']" label="標題顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style5']['bgColor']" label="背景顏色" />
              <ColorPicker fieldStyle="" v-model:colorModel="component['info']['style5']['unitColor']" label="單位文字顏色" />
            </div>
            <v-text-field style="margin: 0px 30px;"  v-model="component['info']['style5']['maxValue']" 
              label="指針最大刻度" variant="outlined" 
              min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style5']['titleText']" label="標題文字" variant="outlined" />
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style5']['unitText']" label="單位文字" variant="outlined" />
            <v-text-field style="margin: 0px 30px;" v-model="component['info']['style5']['pointText']" label="點位文字" variant="outlined" />
          </div>
        </template>

        <!-- ============================================== 內嵌網頁組件 ============================================== -->
        <template v-if="component['info']['type'] == 'website'">
          <v-text-field style="margin: 0px 30px;" v-model="component['info']['weburl']" label="內嵌網頁URL" variant="outlined" />
        </template>

        <!-- ============================================== 折線組件(未使用) ============================================== -->
        <template v-if="component['info']['type'] == 'polyline'">
          <ColorPicker fieldStyle="margin: 0px 30px;" v-model:colorModel="component['info']['polylineColor']" label="折線顏色" />
          <div style="display: flex; gap: 20px; margin: 0px 30px;">
            <v-text-field v-model="component['info']['start']['x']" 
              label="起始點X" variant="outlined" 
              min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <v-text-field v-model="component['info']['start']['y']" 
              label="起始點Y" variant="outlined" 
              min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['start']['color']" label="起始點圓點顏色" />
          </div>

          <div style="display: flex; gap: 20px; margin: 0px 30px;">
            <v-text-field v-model="component['info']['end']['x']" 
              label="結束點X" variant="outlined" 
              min="1"  type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <v-text-field v-model="component['info']['end']['y']" 
              label="結束點Y" variant="outlined" 
              min="1" type="number" hide-spin-buttons @keydown="$utils.blockInvalidKeys($event)" 
            />
            <ColorPicker fieldStyle="" v-model:colorModel="component['info']['end']['color']" label="結束點圓點顏色" />
          </div>
        </template>

        <!-- ============================================== 預覽頁面 (舊版) ============================================== -->
        <!-- <v-navigation-drawer v-if="!navDrawer && ['button', 'input', 'timer', 'marquee', 'image', 'icon', 'devtable', 'gaugechart'].includes(component['info']['type'])"
          :style="{ height: `${component['info']['height'] < 400 ? 400 : component['info']['height'] + 30}px`, 'top': '200px' }"
          v-model="navDrawer"
          :width="parseInt(component['info']['width']) < 400 ? 400 : parseInt(component['info']['width']) + 30"
        >
          <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
            <div :style="previewComponentStyle(component['info'])">
              <div style="width: 100%; height: 100%;">
                <div v-if="component['info']['type'] == 'button'" style="width: 100%; height: 100%;">
                  <ButtonBox :componentChange="false" :item="component['info']" />
                </div>
                <div v-if="component['info']['type'] == 'input'" style="width: 100%; height: 100%;">
                  <InputBox :componentChange="false" :item="component['info']" />
                </div>
                <div v-if="component['info']['type'] == 'timer'" style="width: 100%; height: 100%;">
                  <TimerBox :componentChange="false" :item="component['info']" />
                </div>
                <div v-if="component['info']['type'] == 'marquee'" style="width: 100%; height: 100%;">
                  <MarqueeBox :componentChange="false" :item="component['info']" />
                </div>
                <div v-if="component['info']['type'] == 'image'">
                  <ImageBox :componentChange="false" :item="component['info']" />
                </div>
                <div v-if="component['info']['type'] == 'icon'">
                  <IconBox :componentChange="false" :item="component['info']" />
                </div>
                <div v-if="component['info']['type'] == 'devtable'">
                  <Devtable :componentChange="false" :item="component['info']" />
                </div>
                <div v-if="component['info']['type'] == 'gaugechart'">
                  <GaugeChartV1 v-if="component['info']['gaugechartStyle'] == 'gaugechartV1'" :componentChange="false" :item="component['info']" />
                  <GaugeChartV2 v-else-if="component['info']['gaugechartStyle'] == 'gaugechartV2'" :componentChange="false" :item="component['info']" />
                  <GaugeChartV3 v-else-if="component['info']['gaugechartStyle'] == 'gaugechartV3'" :componentChange="false" :item="component['info']" />
                  <GaugeChartV4 v-else-if="component['info']['gaugechartStyle'] == 'gaugechartV4'" :componentChange="false" :item="component['info']" />
                  <GaugeChartV5 v-else-if="component['info']['gaugechartStyle'] == 'gaugechartV5'" :componentChange="false" :item="component['info']" />
                </div>
              </div>
            </div>
          </div>
        </v-navigation-drawer> -->

        <v-card-actions>
          <div style="width: 100%;display: flex;margin: 20px 0px;">
            <v-spacer></v-spacer>
            <v-btn class="actions-btn" variant="outlined" @click="navDrawer = !navDrawer"><h3>預覽畫面</h3></v-btn>
            <v-btn class="actions-btn" style="color: red;" variant="outlined" @click="clickToCloseComponent()">
              <h3>關閉</h3>
            </v-btn>
            <v-btn v-if="component['state'] == 'ADD'" class="actions-btn" style="color: black;" variant="outlined" @click="addComponent()">
              <h3>新增</h3>
            </v-btn>
            <v-btn v-else-if="component['state'] == 'EDIT'" class="actions-btn" style="color: black;" variant="outlined" @click="editComponent()">
              <h3>修改</h3>
            </v-btn>
            <v-spacer></v-spacer>
          </div>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ============================================== 預覽頁面 (新版) ============================================== -->
    <v-dialog class="preview" v-model="navDrawer">
      <div style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;">
        <div :style="previewComponentStyle(component['info'])">
          <div style="width: 100%; height: 100%;">
            <div v-if="component['info']['type'] == 'button'" style="width: 100%; height: 100%;">
              <ButtonBox :componentChange="false" :item="component['info']" />
            </div>
            <div v-if="component['info']['type'] == 'input'" style="width: 100%; height: 100%;">
              <InputBox :componentChange="false" :item="component['info']" />
            </div>
            <div v-if="component['info']['type'] == 'timer'" style="width: 100%; height: 100%;">
              <TimerBox :componentChange="false" :item="component['info']" />
            </div>
            <div v-if="component['info']['type'] == 'marquee'" style="width: 100%; height: 100%;">
              <MarqueeBox :componentChange="false" :item="component['info']" />
            </div>
            <div v-if="component['info']['type'] == 'image'">
              <ImageBox :componentChange="false" :item="component['info']" />
            </div>
            <div v-if="component['info']['type'] == 'icon'">
              <IconBox :componentChange="false" :item="component['info']" />
            </div>
            <div v-if="component['info']['type'] == 'linechart'">
              <LinechartBox :componentChange="false" :item="component['info']" targetElement=".preview" />
            </div>
            <div v-if="component['info']['type'] == 'historychart'">
              <HistoryChartBox :componentChange="false" :item="component['info']" targetElement=".preview" />
            </div>
            <div v-if="component['info']['type'] == 'devtable'">
              <Devtable :componentChange="false" :item="component['info']" />
            </div>
            <div v-if="component['info']['type'] == 'gaugechart'">
              <GaugeChartV1 v-if="component['info']['gaugechartStyle'] == 'gaugechartV1'" :componentChange="false" :item="component['info']" />
              <GaugeChartV2 v-else-if="component['info']['gaugechartStyle'] == 'gaugechartV2'" :componentChange="false" :item="component['info']" />
              <GaugeChartV3 v-else-if="component['info']['gaugechartStyle'] == 'gaugechartV3'" :componentChange="false" :item="component['info']" />
              <GaugeChartV4 v-else-if="component['info']['gaugechartStyle'] == 'gaugechartV4'" :componentChange="false" :item="component['info']" />
              <GaugeChartV5 v-else-if="component['info']['gaugechartStyle'] == 'gaugechartV5'" :componentChange="false" :item="component['info']" />
            </div>
          </div>
        </div>
      </div>
    </v-dialog>
  </div>
</template>


<script>
import { useSetup } from '@/store/module/setup.js' // Pinia
import ColorPicker from '../../Module/ColorPicker.vue';

import ButtonBox from '../Box/Button.vue';
import InputBox from '../Box/Input.vue';
import TimerBox from '../Box/Timer.vue';
import MarqueeBox from '../Box/Marquee.vue';
import ImageBox from '../Box/Image.vue';
import IconBox from '../Box/Icon.vue';
import LinechartBox from '../Box/Linechart.vue';
import HistoryChartBox from '../Box/HistoryChart.vue';
import Devtable from '../Box/Devtable.vue';
// 儀表板組件
import GaugeChartV1 from '../Box/GaugeChart/V1.vue'
import GaugeChartV2 from '../Box/GaugeChart/V2.vue'
import GaugeChartV3 from '../Box/GaugeChart/V3.vue'
import GaugeChartV4 from '../Box/GaugeChart/V4.vue'
import GaugeChartV5 from '../Box/GaugeChart/V5.vue'


export default {
  components: { 
    ColorPicker, 
    ButtonBox, InputBox, TimerBox, MarqueeBox, ImageBox, IconBox, LinechartBox, HistoryChartBox, Devtable, GaugeChartV1, GaugeChartV2, GaugeChartV3, GaugeChartV4, GaugeChartV5
  },
  props: ["component"],
  data() {
    return {
      navDrawer: false,
      Setup: useSetup().$state,
      searchText: "",
      component_type: [
        { name: "按鈕", value: "button" },
        { name: "文字框", value: "input" },
        { name: "時間", value: "timer" },
        { name: "跑馬燈", value: "marquee" },
        { name: "圖片", value: "image" },
        { name: "ICON", value: "icon" },
        { name: "即時曲線圖", value: "linechart" },
        { name: "歷史曲線圖", value: "historychart" },
        { name: "設備資料表", value: "devtable" },
        { name: "監視器", value: "monitor" },
        { name: "儀表板", value: "gaugechart" },
        { name: "內嵌網頁", value: "website" },
        // { name: "折線", value: "polyline" },
      ],
      btn_shadowsize: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24], // 按鈕陰影大小
      btn_opacity_list: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], // 圖片透明度列表
      text_align_list: [
        { name: "置中", value: "center"},
        { name: "靠左", value: "left"},
        { name: "靠右", value: "right"},
      ]
    }
  },
  computed: {},
  watch: {
    'component.dialog'() {
      if (this.component["state"] == "EDIT") return;
      var initComponent = this.component["info"]
      initComponent["borderColor"] = "#000000"  // 邊框顏色
      initComponent["showBorder"] = false       // 啟用邊框
      initComponent["btnReadonly"] = false      // 按鈕唯讀
      initComponent["textColor"] = "#FFFFFF"    // 文字顏色
      initComponent["bgColor"] = "#000000"      // 背景顏色
      initComponent["fontSize"] = 20            // 文字大小
      initComponent["shadowSize"] = 0           // 按鈕陰影大小
      initComponent["btnRadius"] = 10           // 按鈕圓角
      initComponent["btnOpacity"] = 1           // 按鈕透明度
      initComponent["textAlign"] = "center"     // 文字位置
      initComponent["pointText"] = ""           // 點位文字內容
    },
    'component.info.type'(value) {
      if (this.component["state"] == "EDIT") return;
      // 清除參數
      var remove_list = [
        "textColor", "bgColor", "fontSize", "textRadius", "textAlign", "pointText", "func", // 共通參數
        // 組件自身參數
        "btnReadonly", "shadowSize", "btnRadius", "btnOpacity", // 按鈕參數
        "timeFormat", // 時間
        "image",
        "iconColor", "icon",
        "linechartXColor", "linechartYColor", "content", // 曲線圖
        "tableColor", "tabletextColor", "header", "content", // 設備資料表
        "monitor", 
        "gaugechartStyle", "style1", "style2", "style3", "style4", "style5", // 儀表板
        "weburl", 
        "polylineColor", "start", "end",
      ]
      for (let i in remove_list) delete this.component["info"][remove_list[i]]
      var setComponent = this.component["info"]
      // 設定對應參數預設值
      if (value == 'button') {
        setComponent["btnReadonly"] = false
        setComponent["textColor"] = "#FFFFFF"
        setComponent["bgColor"] = "#000000"
        setComponent["fontSize"] = 20
        setComponent["shadowSize"] = 0
        setComponent["btnRadius"] = 10
        setComponent["btnOpacity"] = 1
        setComponent["textAlign"] = "center"
        setComponent["pointText"] = ""
      }
      else if (value == "input") {
        setComponent["textColor"] = "#FFFFFF"
        setComponent["bgColor"] = "#000000"
        setComponent["fontSize"] = 20
        setComponent["textRadius"] = 10
        setComponent["textAlign"] = "center"
        setComponent["pointText"] = ""
      }
      else if (value == "timer") {
        setComponent["textColor"] = "#FFFFFF"
        setComponent["bgColor"] = "#000000"
        setComponent["fontSize"] = 20
        setComponent["textRadius"] = 10
        setComponent["timeFormat"] = "ad" // 日期切換(民國、西元)
      }
      else if (value == "marquee") {
        setComponent["textColor"] = "#FFFFFF"
        setComponent["bgColor"] = "#000000"
        setComponent["fontSize"] = 20
        setComponent["textRadius"] = 10
        setComponent["pointText"] = ""
      }
      else if (value == "image") {
        setComponent["image"] = ""
        setComponent["textColor"] = "#FFFFFF"
        setComponent["fontSize"] = 20
        setComponent["textAlign"] = "center"
        setComponent["pointText"] = ""
      }
      else if (value == "icon") {
        setComponent["iconColor"] = "#000000" // ICON顏色
        setComponent["icon"] = "mdi-account"  // 選用ICON類型
      }
      else if (value == "linechart") {
        setComponent["bgColor"] = "#FFFFFF"         // 曲線圖背景顏色
        setComponent["linechartXColor"] = "#000000" // 曲線圖X軸顏色
        setComponent["linechartYColor"] = "#000000" // 曲線圖Y軸顏色

        setComponent['charttitle'] = { text: "", color: "#000000", fontSize: 20 } // 曲線圖標題文字樣式
        setComponent['xaxistitle'] = { text: "", color: "#000000", fontSize: 20 } // 曲線圖X軸文字樣式
        setComponent['yaxistitle'] = { text: "", color: "#000000", fontSize: 20 } // 曲線圖Y軸文字樣式
        setComponent["content"] = [] // 曲線圖內容
      }
      else if (value == "historychart") {
        setComponent["bgColor"] = "#FFFFFF"         // 曲線圖背景顏色
        setComponent["linechartXColor"] = "#000000" // 曲線圖X軸顏色
        setComponent["linechartYColor"] = "#000000" // 曲線圖Y軸顏色

        setComponent['charttitle'] = { text: "", color: "#000000", fontSize: 20 } // 曲線圖標題文字樣式
        setComponent['xaxistitle'] = { text: "", color: "#000000", fontSize: 20 } // 曲線圖X軸文字樣式
        setComponent['yaxistitle'] = { text: "", color: "#000000", fontSize: 20 } // 曲線圖Y軸文字樣式
        setComponent["content"] = [] // 曲線圖內容
      }
      else if (value == "devtable") {
        setComponent["textColor"] = "#FFFFFF"
        setComponent["tableColor"] = "#000000"      // Table表顏色(預設黑色)
        setComponent["tabletextColor"] = "#FFFFFF"  // Table文字顏色(預設白色)
        setComponent["header"] = []                 // Table表 HeaderBar
        setComponent["content"] = []                // Table表內容
      }
      else if (value == "monitor") setComponent["monitor"] = "" // 攝影機資訊
      else if (value == "gaugechart") {
        setComponent["gaugechartStyle"] = "gaugechartV1"  // 儀表板樣式選擇
        // V1設定
        setComponent["style1"] = {
          pointText: "",                      // 點位文字 (點位設定)
          pointColor: "#000000",              // 點位顏色
          bgColor: "#FFFFFF",                 // 背景顏色
          needleColor: "#000000",             // 指針顏色
          scaleColor: "#FFFFFF",              // 刻度顏色
          scaleTextColor: "#000000",          // 刻度文字顏色
          dashboardColor: [                   // 儀表盤顏色
            '#D9534F', '#A9CCE3', '#A9CCD3', '#1A5276'
          ],
          titleText: "",                      // 標題文字
          titleColor: "#000000",              // 標題顏色
          ringColor: ["#6FBBEF", "#2C7FB8"],  // 裝飾環顏色
          maxValue: 200,                      // 指針最大值
        }
        // V2設定
        setComponent["style2"] = {}
        setComponent["style2"]["top"] = {
          pointText: "",                  // 上點位文字 (點位設定)
          pointColor: "#000000",          // 上點位顏色
          scaleColor: "#FFFFFF",          // 刻度顏色
          scaleTextColor: "#FFFFFF",      // 刻度文字顏色
          needleColor: "#FF9800",         // 指針顏色
          maxValue: 120,                  // 指針最大刻度
        }
        setComponent["style2"]["center"] = {
          pointText: "",                  // 中點位文字 (點位設定)
          pointColor: "#000000",          // 中點位顏色
          centerTitle: "",                // 中點位標題
          centerTitleColor: "#000000",    // 中點位標題顏色
          centerBGColor: "#FFFFFF",       // 中點位背景顏色
        }
        setComponent["style2"]["bottom"] = {
          pointText: "",                  // 下點位文字 (點位設定)
          pointColor: "#000000",          // 下點位顏色
          scaleColor: "#FFFFFF",          // 刻度顏色
          scaleTextColor: "#FFFFFF",      // 刻度文字顏色
          needleColor: "#FF9800",         // 指針顏色
          maxValue: 220,                  // 指針最大刻度
        }
        setComponent["style2"]["gauge"] = {
          titleBGColor: "#B0B0B0",        // 標題背景
          scaleBGColor: "#00000085",      // 刻度背景
          pointerTrailColor: "#FFFFFF",   // 指針軌跡顏色
        }
        // V3設定
        setComponent["style3"] = {
          pointText: "",                  // 點位文字 (點位設定)
          pointColor: "#FFFFFF",          // 點位顏色
          largeScaleColor: [              // 長刻度顏色
            '#3498db', '#2ecc71', '#f1c40f', '#e74c3c'
          ],
          shortScaleColor: "#505050",     // 短刻度顏色
          bgColor: "#000000",             // 背景顏色
          // circleColor: "#FD3DB5",      // 圓點顏色 (改為長刻度顏色)
          titleText: "",                  // 標題文字
          titleColor: "#FFFFFF",          // 標題顏色
          maxValue: 100,                  // 指針最大刻度
        }
        // V4設定
        setComponent["style4"] = {
          pointText: "",                      // 點位文字 (點位設定)
          pointColor: "#FFFFFF",              // 點位顏色
          bgColor: "#000000",                 // 背景顏色
          largeScaleColor: "#00FFFF",         // 長刻度顏色 (一般狀態)
          largeScaleLimitColor: "#FF5F1F",    // 長刻度顏色 (limit狀態)
          largeScaleOverColor: "#FF0000",     // 長刻度顏色 (limit狀態)
          shortScaleColor: "#FFFFFF",         // 短刻度顏色
          titleText: "",                      // 標題文字
          titleColor: "#FFFFFF",              // 標題顏色
          limitValue: 40,                     // 指針限制刻度
          maxValue: 100,                      // 指針最大刻度
        }

        // V5設定
        setComponent["style5"] = {
          pointText: "",                      // 點位文字 (點位設定)
          pointColor: "#FFFFFF",              // 點位顏色
          bgColor: "#000000",                 // 背景顏色
          titleText: "",                      // 標題文字
          titleColor: "#FFFFFF",              // 標題顏色
          unitText: "",                       // 單位文字
          unitColor: "#000000",               // 單位顏色
          maxValue: 100,                      // 指針最大刻度
        }
      }
      else if (value == "website") setComponent["weburl"] = "" // 內嵌網頁URL
      // else if (value == "polyline") {
      //   setComponent["polylineColor"] = "#000000"
      //   setComponent["start"] = { x: 30, y: 30, color: "#000000" }
      //   setComponent["end"] = { x: 100, y: 100, color: "#000000" }
      // }
      setComponent["title"] = value == '' ? "" : `${value}_Default`
      this.setComponentWH(value)
    },
  },
  methods: {
    // 選擇多筆點位
    togglePointItem(value) {
      const index = this.component["info"]["point"].indexOf(value)
      if (index > -1) this.component["info"]["point"].splice(index, 1)
      else this.component["info"]["point"].push(value)
    },
    // 預覽組件CSS樣式
    previewComponentStyle(item) {
      var cssStyle = {
        width: `${item.width}px`, height: `${item.height}px`,
        border: `2px solid ${item.showBorder ? item.borderColor : "#00000000"}`,
        'will-change':'transform', outlineOffset: '2px',
      }
      switch (item.type) {
        case "button":
          cssStyle['borderRadius'] = `${item.btnRadius}px`;
          break;
        case "devtable":
          cssStyle['border-radius'] = '5px';
          cssStyle['user-select'] = 'none';
          break;
        case "input":
        case "timer": 
        case "marquee":
          cssStyle['border-radius'] = `${item.textRadius}px`;
          cssStyle['background'] = item.bgColor;
          cssStyle['overflow'] = 'hidden';
          break;
      }
      return cssStyle;
    },
    // 設定組件個別寬高
    setComponentWH(v) {
      var componentWH = this.component["info"]
      switch (v) {
        case "button": 
        case "input": 
        case "timer": 
        case "marquee": 
          componentWH["width"] = 200;
          componentWH["height"] = 100;
          return
        case "image": 
          componentWH["width"] = 200;
          componentWH["height"] = 200;
          return
        case "icon": 
          componentWH["width"] = 50;
          componentWH["height"] = 50;
          return
        case "linechart": 
          componentWH["width"] = 800;
          componentWH["height"] = 400;
          return
        case "historychart": 
          componentWH["width"] = 800;
          componentWH["height"] = 400;
          return
        case "devtable": 
        case "monitor": 
          componentWH["width"] = 500;
          componentWH["height"] = 500;
          return
        case "gaugechart":
          componentWH["width"] = 200;
          componentWH["height"] = 200;
        case "website":
          componentWH["width"] = 400;
          componentWH["height"] = 400;
        // case "polyline":
        //   componentWH["n_x"] = 100;
        //   componentWH["n_y"] = 100;
        //   componentWH["width"] = 300;
        //   componentWH["height"] = 300;
        //   return
      }
    },
    // 新增曲線圖曲線資料
    addChartArray() {
      if (this.component['info']['content'].length >= 10) return;
      this.component['info']['content'].push({ id: crypto.randomUUID(), title: "Default", color: "#000000", point: '', values: [] })
    },
    // 移除曲線圖曲線資料
    removeChartArrayIdx(index) {
      this.component['info']['content'].splice(index, 1);
    },
    // 資料表組件新增header
    addDevHeader() {
      this.component['info']['header'].push({ title: "Default", key: "", show: true, align: "center" });
    },
    // 資料表組件新移除header
    removeDevHeader(index) {
      this.component['info']['header'].splice(index, 1);
    },
    // 上傳圖片
    uploadImg(event) {
      var input = event.target;
      if (input.files && input.files[0]) this.component['info']['image'] = input.files[0]['name']
      this.$emit("uploadImg", event);
    },
    // 新增組件
    addComponent() {
      if (this.component['info']['type'] == 'devtable') {
        var findEmptyKey = this.component['info']['header'].filter(item => item["key"] === "" || item["key"] === null || item["key"] === undefined);
        if (findEmptyKey.length != 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "有Key沒有填寫" })
          return
        }
        var repeatKeyList = this.component['info']['header'].filter((item, index, self) =>self.findIndex(t => t["key"] === item["key"]) !== index);
        if (repeatKeyList.length != 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "有重複的Key" })
          return
        }
      }
      this.$emit("addComponent");
    },
    // 編輯組件
    editComponent() {
      if (this.component['info']['type'] == 'devtable') {
        var findEmptyKey = this.component['info']['header'].filter(item => item["key"] === "" || item["key"] === null || item["key"] === undefined);
        if (findEmptyKey.length != 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "有Key沒有填寫" })
          return
        }
        var repeatKeyList = this.component['info']['header'].filter((item, index, self) =>self.findIndex(t => t["key"] === item["key"]) !== index);
        if (repeatKeyList.length != 0) {
          useSetup().showAlertDialog({ icon: "warn", title: "有重複的Key" })
          return
        }
      }
      this.$emit("editComponent");
    },
    // 關閉組件
    clickToCloseComponent() {
      this.$emit("closeComponent");
    },
  }
}
</script>


<style lang="scss" scoped>
.keyboard-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 8px;
}
</style>