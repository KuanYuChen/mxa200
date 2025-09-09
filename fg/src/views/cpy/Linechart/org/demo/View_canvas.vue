<template>
  <v-main>
    <v-card>
      <v-card-title style="flex-shrink: 0;">
        <div :style="{ 'display': 'flex', 'width': '40%', 'margin-top': '10px' }">
          <div style="width: 100%;margin-left: 10px;">
            <h4>開始日期</h4>
            <v-menu :close-on-content-click="false">
              <template #activator="{ props }">
                <v-text-field :value="combinationDate(dateS)" variant="outlined" density="compact" hide-details readonly
                  v-bind="props" @blur="validateDate(dateS)">
                  <template v-slot:append-inner><v-icon color="black" icon="mdi-calendar-range" /></template>
                </v-text-field>
              </template>
              <v-card style="border: 2px solid #dbdbdb;">
                <div style="display: flex;">
                  <v-date-picker v-model="dateS.value" :max="dateE.value" @click="dateS.dday = formatDate(dateS.value)">
                    <template v-slot:title>
                      <h2 style="margin-top: 10px;">日期</h2>
                    </template>
                  </v-date-picker>
                  <v-time-picker v-model="dateS.dtime" format="24hr" use-seconds>
                    <template v-slot:title>
                      <h2>時間</h2>
                    </template>
                  </v-time-picker>
                </div>
              </v-card>
            </v-menu>
          </div>
          <div style="width: 100%;margin-left: 10px;">
            <h4>結束日期</h4>
            <v-menu :close-on-content-click="false">
              <template #activator="{ props }">
                <v-text-field :value="combinationDate(dateE)" variant="outlined" density="compact" hide-details readonly
                  v-bind="props" @blur="validateDate(dateE)">
                  <template v-slot:append-inner><v-icon color="black" icon="mdi-calendar-range" /></template>
                </v-text-field>
              </template>
              <v-card style="border: 2px solid #dbdbdb;">
                <div style="display: flex;">
                  <v-date-picker v-model="dateE.value" :min="dateS.value" :max="new Date()"
                    @click="dateE.dday = formatDate(dateE.value)">
                    <template v-slot:title>
                      <h2 style="margin-top: 10px;">日期</h2>
                    </template>
                  </v-date-picker>
                  <v-time-picker v-model="dateE.dtime" format="24hr" use-seconds>
                    <template v-slot:title>
                      <h2>時間</h2>
                    </template>
                  </v-time-picker>
                </div>
              </v-card>
            </v-menu>
          </div>
          <div style="width: 100%;margin-left: 10px;">
            <h4>查詢方法</h4>
            <v-select v-model="selectType" :items="selecttype_list" item-title="title" item-value="value"
              variant="outlined" density="compact" />
          </div>
          <v-btn style="margin: 30px 0px 0px 10px;" variant="outlined" :loading=getChartLoading
            @click="randomizeAllData()">
            <h3>搜尋</h3>
          </v-btn>
        </div>
      </v-card-title>
      <div class="optimized-canvas-graph-container">
        <div class="canvas-wrapper" ref="canvasWrapper" @mousedown="handleMouseDown" @mousemove="handleMouseMove"
          @mouseup="handleMouseUp" @mouseout="handleMouseOut" @wheel="handleMouseWheel"
          @contextmenu.prevent="handleContextMenu">
          <!-- canvas 的 width 和 height 屬性由 JS 動態設定 -->
          <canvas ref="graphCanvas" :width="canvasWidth" :height="canvasHeight"></canvas>

          <!-- 使用絕對定位的 div 作為 Tooltip -->
          <div v-if="tooltipData" class="tooltip" :style="tooltipStyle">
            <!-- 顯示 X 軸時間 (使用 tooltipData.targetDataX 因為它是鼠標對應的數據 X 值) -->
            <div class="tooltip-time">時間: {{ formatTimestamp(tooltipData.targetDataX, viewMaxX - viewMinX) }}</div>
            <!-- 顯示每個線條的 Y 軸數值 -->
            <div v-for="(lineInfo, index) in tooltipData.lineValues" :key="index" class="tooltip-line-value">
              <div class="tooltip-line-color" :style="{ backgroundColor: lineInfo.color }"></div>
              <!-- 顯示線條名稱和對應點的數值 -->
              {{ lineInfo.name || `線條 ${lineInfo.id}` }}: {{ lineInfo.dataPoint ? lineInfo.dataPoint.y.toFixed(2) :
                'N/A' }}
            </div>
            <!-- 提示文字 -->
            <div class="tooltip-hint">(滾輪縮放，拖拽平移)</div> <!-- 提示文字改回滾輪縮放 -->
          </div>
        </div>
        <div class="line-controls">
          <v-btn v-for="(line, index) in graphLinesData" :key="line.id" :color="line.visible ? line.color : '#ccc'"
            @click="toggleLineVisibility(index)">
            <h3>{{ line.name || line.id }}</h3>
          </v-btn>
        </div>
        <!-- <h2>數據與顯示控制</h2>
        <div>
          <button @click="randomizeAllData">隨機生成所有數據</button>
          <button @click="resetView">重置視圖</button>
        </div>
        <div>
            <label>
              顯示所有點：
              <input type="checkbox" v-model="drawPoints">
            </label>
            <label>
              線條粗細：
              <input type="number" v-model.number="lineWidth" min="0.5" max="5" step="0.1">
            </label>
            <label>
              網格線顏色：
              <input type="color" v-model="gridColor">
            </label>
            <label>
              標籤顏色：
              <input type="color" v-model="labelColor">
            </label>
        </div> -->
      </div>
    </v-card>
  </v-main>
</template>

<script>
import { useSetup } from '@/store/module/setup';

// 簡單的防抖函數
function debounce(func, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export default {
  name: 'OptimizedCanvasGraph',
  // props 中不再接收 graphLinesData
  // props: { /* ... 其他可能的 props */ },
  data() {
    return {
      dateS: { dday: "", dtime: null, value: null },
      dateE: { dday: "", dtime: null, value: null },
      selectType: "5min",
      selecttype_list: [
        { value: 'sec', title: '每秒一筆' },
        { value: '5min', title: '每五分鐘一筆' },
        { value: 'hour_average', title: '每小時一筆/平均' },
        { value: 'day_average', title: '每日平均' },
        { value: 'season_average', title: '每季(3個月)平均' },
        { value: 'year', title: '每年一筆' },
      ],
      getChartLoading: false,


      // 圖表配置
      canvasWidth: 0, // 由 JS 動態設定
      canvasHeight: 0, // 由 JS 動態設定

      padding: 80, // 增加邊距以容納較長的日期時間標籤
      axisColor: '#bdc3c7',
      gridColor: '#ecf0f1', // 網格線顏色
      gridLineWidth: 1,
      labelColor: '#2c3e50', // 標籤文字顏色
      labelFont: '12px Arial', // 標籤字體
      tooltipFont: '10px Arial', // Tooltip 字體
      tooltipBgColor: 'rgba(255, 255, 255, 0.9)', // Tooltip 背景
      tooltipBorderColor: '#333', // Tooltip 邊框

      lineWidth: 1.5, // 線條粗細
      drawPoints: false, // 是否繪製點 (現在控制是否繪製所有點，不是 Tooltip 點)
      pointRadius: 3,
      pointColor: '#2c3e50',

      // 數據 (現在直接儲存在 data 屬性中)
      graphLinesData: [], // 使用你提供的格式

      // 內部狀態
      ctx: null, // Canvas 2D Context
      drawingWidth: 0, // 繪圖區域寬度
      drawingHeight: 0, // 繪圖區域高度

      // 全局數據範圍 (不會因縮放平移改變)
      globalMinX: 0,
      globalMaxX: 0,
      globalMinY: 0,
      globalMaxY: 0,

      // 當前視圖範圍 (因縮放平移改變)
      viewMinX: 0,
      viewMaxX: 0,
      viewMinY: 0,
      viewMaxY: 0,

      // 平移相關狀態
      isPanning: false,
      lastMouseX: 0,
      lastMouseY: 0,

      // Tooltip 相關狀態 (HTML div 用)
      tooltipData: null, // 儲存要顯示的 tooltip 數據 { targetDataX: number, canvasX: number, lineValues: Array<{ lineIndex: number, id: string, name: string, color: string, dataPoint: {x: number, y: number}, canvasX: number, canvasY: number }> }
      tooltipPixelX: 0, // Tooltip div 顯示的 Canvas 像素位置 X (鼠標 X)
      tooltipPixelY: 0, // Tooltip div 顯示的 Canvas 像素位置 Y (鼠標 Y)


      // 繪圖優化相關
      needsRedraw: false, // 標記是否需要在下一幀重繪
      animationFrameId: null, // requestAnimationFrame 的 id
      resizeTimer: null, // 用於 resize 防抖
    };
  },
  computed: {
    // 根據 graphLinesData 計算出適合內部繪圖使用的數據結構
    // 這個計算屬性將過濾掉 invisible 的線條，並將時間字符串轉換為時間戳
    processedLines() {
      if (!this.graphLinesData || this.graphLinesData.length === 0) {
        return [];
      }
      // 過濾 visible 為 true 的線條，並處理數據點
      return this.graphLinesData
        .filter(line => line.visible) // 只處理可見的線條
        .map(line => {
          // 使用 originalValues
          const sourceValues = line.originalValues && line.originalValues.length > 0 ? line.originalValues : [];

          const points = sourceValues
            .map(val => ({
              x: new Date(val.time).getTime(), // 轉換為時間戳
              y: val.value
            }))
            // 確保點是按時間排序的，這對於查找 closestPointIndex 很重要
            .sort((a, b) => a.x - b.x);

          return {
            id: line.id,
            name: line.name,
            visible: true, // 在這個陣列裡的都是 visible 的
            color: line.color || '#000', // 提供默認顏色
            points: points
          };
        });
    },
    // 計算 Tooltip div 的樣式 (位置)
    tooltipStyle() {
      if (!this.tooltipData) return { display: 'none' }; // 隱藏 Tooltip

      // Tooltip 尺寸需要根據內容動態計算，或者估計一個最大值
      const estimatedLineHeight = parseInt(this.tooltipFont) * 1.2;
      // 時間行 + 數據行 (每條線一行) + 提示行
      const numLinesInTooltip = (this.tooltipData.lineValues ? this.tooltipData.lineValues.length : 0) + 2;
      const estimatedTooltipHeight = estimatedLineHeight * numLinesInTooltip + 8 * 2; // 總行高 + padding

      // 估計寬度需要考慮最長的一行文字
      let estimatedTooltipWidth = 0;
      if (this.tooltipData.lineValues && this.ctx) { // 確保 ctx 存在才能測量文字
        estimatedTooltipWidth = Math.max(estimatedTooltipWidth, this.ctx.measureText(`時間: ${this.formatTimestamp(this.tooltipData.targetDataX, this.viewMaxX - this.viewMinX)}`).width);
        this.tooltipData.lineValues.forEach(lineInfo => {
          const text = `${lineInfo.name || `線條 ${lineInfo.id}`}: ${lineInfo.dataPoint ? lineInfo.dataPoint.y.toFixed(2) : 'N/A'}`;
          estimatedTooltipWidth = Math.max(estimatedTooltipWidth, this.ctx.measureText(text).width);
        });
        estimatedTooltipWidth += 12 + 5; // 加上顏色方塊寬度和間距
      }
      estimatedTooltipWidth += 8 * 2; // 加上 padding

      const offsetX = 15; // 從鼠標 X 座標向右偏移
      const offsetY = 15; // 從鼠標 Y 座標向下偏移

      let finalX = this.tooltipPixelX + offsetX;
      let finalY = this.tooltipPixelY + offsetY;

      // 邊界調整：確保 Tooltip 不超出 Canvas 容器的 padding 區域
      // 檢查右邊界
      if (finalX + estimatedTooltipWidth > this.canvasWidth - this.padding) {
        finalX = this.tooltipPixelX - offsetX - estimatedTooltipWidth; // 改到鼠標左邊
      }
      // 檢查左邊界
      if (finalX < this.padding) {
        finalX = this.padding; // 緊貼左邊界
      }

      // 檢查下邊界
      if (finalY + estimatedTooltipHeight > this.canvasHeight - this.padding) {
        finalY = this.tooltipPixelY - offsetY - estimatedTooltipHeight; // 改到鼠標上方
      }
      // 檢查上邊界
      if (finalY < this.padding) {
        finalY = this.padding; // 緊貼頂部邊界
      }


      return {
        position: 'absolute',
        left: `${finalX}px`,
        top: `${finalY}px`,
        // 其他樣式寫在 CSS 中
      };
    },
    // Tooltip 中線條顏色方塊的顏色由 v-for 內部處理
  },
  mounted() {
    this.getDatetimeNow();
    // 初始化 Canvas 尺寸 (獲取容器實際尺寸)
    this.updateCanvasSize();
    // 獲取 Canvas Context 並綁定事件監聽器
    this.initCanvas();
    // 監聽窗口 resize 事件 (防抖)
    window.addEventListener('resize', this.handleResize);

    // 啟動繪圖循環 (基於 requestAnimationFrame)
    this.startDrawLoop();

    // 初始繪圖將由 graphLinesData watch 觸發 -> processedLines computed -> findGlobalDataRange -> resetView -> view watch -> needsRedraw = true
  },
  beforeDestroy() {
    // 組件銷毀前，移除所有事件監聽器，停止繪圖循環，清除定時器
    const wrapper = this.$refs.canvasWrapper;
    if (wrapper) {
      wrapper.removeEventListener('mousedown', this.handleMouseDown);
      wrapper.removeEventListener('mousemove', this.handleMouseMove);
      wrapper.removeEventListener('mouseup', this.handleMouseUp);
      wrapper.removeEventListener('mouseout', this.handleMouseOut);
      wrapper.removeEventListener('wheel', this.handleMouseWheel);
      wrapper.removeEventListener('contextmenu', this.handleContextMenu);
    }
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
    this.stopDrawLoop(); // 停止動畫幀循環
  },
  watch: {
    // 監聽組件內部 graphLinesData 數據變化 (不再是 prop)
    graphLinesData: {
      handler() {
        console.log("graphLinesData changed (internal data)");
        this.findGlobalDataRange(); // 基於 processedLines 重新計算全局範圍
        // 如果有數據，且當前視圖無效（例如剛清空數據又加載了），則重置視圖
        const viewRangeX = this.viewMaxX - this.viewMinX;
        const viewRangeY = this.viewMaxY - this.viewMinY;
        if (this.processedLines.length > 0 && (viewRangeX <= 0 || viewRangeY <= 0 || (this.viewMinX === 0 && this.viewMaxX === 0 && this.viewMinY === 0 && this.viewMaxY === 0))) {
          console.log("Resetting view due to data change or invalid view");
          this.resetView();
        } else {
          // 數據改變，但視圖範圍有效，設置需要重繪標誌
          console.log("Data changed, needs redraw");
          this.needsRedraw = true;
        }
        // 清除 Tooltip，因為數據變化點的位置也可能變了
        this.tooltipData = null;
      },
      deep: true
    },
    // 監聽 Canvas 尺寸和 Padding 的變化，需要重新計算繪圖區域並設置重繪標誌
    // 注意：這裡不再直接觸發 drawGraph，而是觸發 updateDrawingDimensionsAndDraw
    canvasWidth: 'updateDrawingDimensionsAndDraw',
    canvasHeight: 'updateDrawingDimensionsAndDraw',
    padding: 'updateDrawingDimensionsAndDraw',

    // 監聽其他影響繪圖的屬性變化，設置需要重繪標誌
    lineWidth() { this.needsRedraw = true; },
    drawPoints() { this.needsRedraw = true; },
    axisColor() { this.needsRedraw = true; },
    gridColor() { this.needsRedraw = true; },
    gridLineWidth() { this.needsRedraw = true; },
    labelColor() { this.needsRedraw = true; },
    labelFont() { this.needsRedraw = true; },
    pointRadius() { this.needsRedraw = true; },
    pointColor() { this.needsRedraw = true; },

    // 監聽視圖範圍變化，設置需要重繪標誌
    viewMinX() { this.needsRedraw = true; },
    viewMaxX() { this.needsRedraw = true; },
    viewMinY() { this.needsRedraw = true; },
    viewMaxY() { this.needsRedraw = true; },

    // 監聽 tooltip 數據變化，設置需要重繪標誌 (用於繪製垂直游標線)
    tooltipData() { this.needsRedraw = true; },
  },
  methods: {
    // 繪圖循環
    startDrawLoop() {
      const loop = () => {
        if (this.needsRedraw) {
          this.drawGraph();
          this.needsRedraw = false;
        }
        this.animationFrameId = requestAnimationFrame(loop);
      };
      this.animationFrameId = requestAnimationFrame(loop);
    },
    stopDrawLoop() {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    },

    // 獲取 Canvas Context 並綁定事件監聽器
    initCanvas() {
      const canvas = this.$refs.graphCanvas;
      const wrapper = this.$refs.canvasWrapper;

      if (!canvas || !wrapper) {
        console.warn("Canvas or wrapper not found.");
        return;
      }

      this.ctx = canvas.getContext('2d');

      // 處理高清屏模糊問題 (可選)
      // const dpr = window.devicePixelRatio || 1;
      // canvas.style.width = this.canvasWidth + 'px';
      // canvas.style.height = this.canvasHeight + 'px';
      // canvas.width = this.canvasWidth * dpr;
      // canvas.height = this.canvasHeight * dpr;
      // this.ctx.scale(dpr, dpr);


      // 添加事件監聽器到 wrapper 元素 (確保只添加一次)
      wrapper.removeEventListener('mousedown', this.handleMouseDown);
      wrapper.removeEventListener('mousemove', this.handleMouseMove);
      wrapper.removeEventListener('mouseup', this.handleMouseUp);
      wrapper.removeEventListener('mouseout', this.handleMouseOut);
      wrapper.removeEventListener('wheel', this.handleMouseWheel);
      wrapper.removeEventListener('contextmenu', this.handleContextMenu);

      wrapper.addEventListener('mousedown', this.handleMouseDown);
      wrapper.addEventListener('mousemove', this.handleMouseMove);
      wrapper.addEventListener('mouseup', this.handleMouseUp);
      wrapper.addEventListener('mouseout', this.handleMouseOut);
      wrapper.addEventListener('wheel', this.handleMouseWheel);
      wrapper.addEventListener('contextmenu', this.handleContextMenu);

      // 計算繪圖區域尺寸 (在 Canvas 尺寸更新後呼叫)
      // this.updateDrawingDimensionsAndDraw(); // 由 canvasWidth/Height watch觸發
    },

    // 根據 canvas 尺寸和 padding 計算繪圖區域尺寸，並設置重繪標誌
    updateDrawingDimensionsAndDraw() {
      this.drawingWidth = this.canvasWidth - 2 * this.padding;
      this.drawingHeight = this.canvasHeight - 2 * this.padding;

      // 檢查繪圖區域是否有效
      if (this.drawingWidth <= 0 || this.drawingHeight <= 0) {
        console.warn("Drawing area is invalid. Width:", this.drawingWidth, "Height:", this.drawingHeight);
        // 如果繪圖區域無效，設置需要重繪標誌，drawGraph 會處理清空邏輯
      }
      this.needsRedraw = true; // Canvas 尺寸或 Padding 變化，需要重繪
    },

    // 更新 Canvas 的實際像素尺寸
    updateCanvasSize() {
      const wrapper = this.$refs.canvasWrapper;
      if (wrapper) {
        // 使用 clientWidth/clientHeight 獲取元素的內部像素尺寸
        this.canvasWidth = wrapper.clientWidth;
        this.canvasHeight = wrapper.clientHeight;
        // canvasWidth/Height 的 watcher 會觸發 updateDrawingDimensionsAndDraw -> needsRedraw = true
        if (!this.ctx) {
          this.initCanvas();
        }
      }
    },

    // 將數據座標 (x, y) 轉換為 Canvas 像素座標 (canvasX, canvasY)
    mapDataToCanvas(x, y) {
      const viewRangeX = this.viewMaxX - this.viewMinX;
      const viewRangeY = this.viewMaxY - this.viewMinY;

      if (viewRangeX <= 0 || viewRangeY <= 0 || this.drawingWidth <= 0 || this.drawingHeight <= 0) {
        return {
          canvasX: this.padding,
          canvasY: this.canvasHeight - this.padding
        };
      }

      const scaleX = this.drawingWidth / viewRangeX;
      const scaleY = this.drawingHeight / viewRangeY;

      const canvasX = this.padding + (x - this.viewMinX) * scaleX;
      const canvasY = this.canvasHeight - this.padding - (y - this.viewMinY) * scaleY; // Canvas Y 軸反轉

      return { canvasX, canvasY };
    },

    // 將 Canvas 像素座標 (canvasX, canvasY) 轉換回數據座標 (x, y)
    mapCanvasToData(canvasX, canvasY) {
      const viewRangeX = this.viewMaxX - this.viewMinX;
      const viewRangeY = this.viewMaxY - this.viewMinY;

      if (viewRangeX <= 0 || viewRangeY <= 0 || this.drawingWidth <= 0 || this.drawingHeight <= 0) {
        return { x: this.viewMinX, y: this.viewMinY };
      }

      const scaleX = this.drawingWidth / viewRangeX;
      const scaleY = this.drawingHeight / viewRangeY;

      const dataX = this.viewMinX + (canvasX - this.padding) / scaleX;
      const dataY = this.viewMinY + (this.canvasHeight - this.padding - canvasY) / scaleY; // Canvas Y 軸反轉

      return { x: dataX, y: dataY };
    },

    // 尋找所有數據點的全局最大最小值 (用於初始化和重置視圖)
    findGlobalDataRange() {
      // 現在從 processedLines 中獲取數據
      if (!this.processedLines || this.processedLines.length === 0 || this.processedLines.every(line => !line.points || line.points.length === 0)) {
        this.globalMinX = this.globalMaxX = this.globalMinY = this.globalMaxY = 0;
        return;
      }

      let firstValidPoint = null;
      for (const line of this.processedLines) {
        if (line.points && line.points.length > 0) {
          firstValidPoint = line.points[0];
          break;
        }
      }

      if (!firstValidPoint) { // 如果沒有任何 visible 的點
        this.globalMinX = this.globalMaxX = this.globalMinY = this.globalMaxY = 0;
        return;
      }

      this.globalMinX = this.globalMaxX = firstValidPoint.x;
      this.globalMinY = this.globalMaxY = firstValidPoint.y;

      // 遍歷所有 visible 線的所有點
      for (const line of this.processedLines) {
        if (line.points) {
          for (const point of line.points) {
            if (point) {
              this.globalMinX = Math.min(this.globalMinX, point.x);
              this.globalMaxX = Math.max(this.globalMaxX, point.x);
              this.globalMinY = Math.min(this.globalMinY, point.y);
              this.globalMaxY = Math.max(this.globalMaxY, point.y);
            }
          }
        }
      }

      // 如果最大值等於最小值，稍微擴展範圍以避免視圖範圍計算為零或負數
      const epsilon = 1e-9; // 使用一個小的 epsilon
      if (Math.abs(this.globalMaxX - this.globalMinX) < epsilon) {
        this.globalMinX -= 1000; // 例如，擴展1秒鐘的時間範圍
        this.globalMaxX += 1000;
      }
      if (Math.abs(this.globalMaxY - this.globalMinY) < epsilon) {
        this.globalMinY -= 1; // 例如，擴展 Y 範圍 ±1
        this.globalMaxY += 1;
      }
    },

    // 重置視圖範圍到全局數據範圍
    resetView() {
      const globalRangeX = this.globalMaxX - this.globalMinX;
      const globalRangeY = this.globalMaxY - this.globalMinY;

      if (globalRangeX > 0 && globalRangeY > 0) {
        this.viewMinX = this.globalMinX;
        this.viewMaxX = this.globalMaxX;
        this.viewMinY = this.globalMinY;
        this.viewMaxY = this.globalMaxY;
        // viewMin/Max 的 watch 會設置 needsRedraw = true
      } else {
        // 如果全局範圍無效，將視圖範圍設置為一個小範圍，以便 drawGraph 顯示無數據提示
        this.viewMinX = 0; this.viewMaxX = 1;
        this.viewMinY = 0; this.viewMaxY = 1;
        // 設置需要重繪，確保清空 Canvas 和顯示提示
        this.needsRedraw = true;
      }
    },

    // 核心繪圖方法，由 requestAnimationFrame 循環呼叫
    drawGraph() {
      if (!this.ctx || this.canvasWidth <= 0 || this.canvasHeight <= 0 || this.drawingWidth <= 0 || this.drawingHeight <= 0) {
        // Canvas 或繪圖區域無效，清空 Canvas 並返回
        if (this.ctx && this.$refs.graphCanvas) {
          this.ctx.clearRect(0, 0, this.$refs.graphCanvas.width, this.$refs.graphCanvas.height);
        }
        return;
      }

      const ctx = this.ctx;
      const canvas = this.$refs.graphCanvas;

      // 1. 清空 Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 檢查當前視圖範圍和數據是否有效 (使用 processedLines)
      const viewRangeX = this.viewMaxX - this.viewMinX;
      const viewRangeY = this.viewMaxY - this.viewMinY;

      if (viewRangeX <= 0 || viewRangeY <= 0 || this.processedLines.length === 0 || this.processedLines.every(line => !line.points || line.points.length === 0)) {
        // 繪製軸線和網格 (基於當前可能無效的視圖，或一個默認範圍)
        this.drawAxesAndGrid(ctx, this.viewMinX, this.viewMaxX, this.viewMinY, this.viewMaxY);
        // 繪製提示文字
        if (this.drawingWidth > 0 && this.drawingHeight > 0) {
          ctx.font = this.labelFont;
          ctx.fillStyle = this.labelColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(this.processedLines.length === 0 ? '無數據或無可見線條' : '無效視圖範圍', this.canvasWidth / 2, this.canvasHeight / 2);
        }
        return; // 無效情況下只繪製軸線和提示
      }


      // 2. 繪製網格線和座標軸 (基於當前視圖範圍)
      this.drawAxesAndGrid(ctx, this.viewMinX, this.viewMaxX, this.viewMinY, this.viewMaxY);

      // 3. **設定裁切路徑，使曲線不超出軸線區域**
      ctx.save(); // 保存當前 Canvas 狀態 (包括裁切路徑)
      ctx.beginPath();
      // 定義繪圖區域的矩形路徑
      ctx.rect(this.padding, this.padding, this.drawingWidth, this.drawingHeight);
      ctx.clip(); // 設置為裁切路徑

      // 繪製所有 visible 線條 (使用 processedLines)
      this.processedLines.forEach(line => {
        // processedLines 已經過濾了 visible = false 的線
        if (!line.points || line.points.length < 2) {
          return; // 至少需要兩個點才能繪製線
        }

        // **** LTTB 採樣應用在這裡 ****
        let sampledPoints = line.points; // 默認使用所有點

        // 過濾出在當前視圖範圍內或附近的點 (這能顯著減少 LTTB 的輸入數據量)
        // 找到第一個點的索引 >= viewMinX
        let startIndex = line.points.findIndex(p => p.x >= this.viewMinX);
        // 找到第一個點的索引 > viewMaxX (或者到最後)
        let endIndex = line.points.findIndex(p => p.x > this.viewMaxX);
        if (endIndex === -1) endIndex = line.points.length;

        // 考慮包含視圖範圍前一個點和後一個點的緩衝，防止線條被截斷
        const bufferPointsCount = 5; // 在視圖範圍前後多包含 5 個點 (可以調整)
        const actualStartIndex = startIndex > 0 ? Math.max(0, startIndex - bufferPointsCount) : 0;
        const actualEndIndex = endIndex < line.points.length ? Math.min(line.points.length, endIndex + bufferPointsCount) : line.points.length;

        // 提取在視圖範圍內或附近的點的子集
        const pointsInViewOrNearby = line.points.slice(actualStartIndex, actualEndIndex);


        // 確定採樣閾值：目標是繪圖區域寬度像素點數，但至少 2 點
        // 如果視圖內點數很少，就用這些點，不採樣
        const threshold = Math.max(2, Math.floor(this.drawingWidth)); // 例如，閾值等於繪圖區域寬度，每像素大概保留一個點

        // 只有當在視圖範圍內或附近的點數量遠大於閾值時才進行採樣
        if (pointsInViewOrNearby.length > threshold * 1.5) { // 1.5 是個經驗值，防止過度採樣
          try {
            // 對視圖範圍內的點應用 LTTB 算法
            // 注意：lttb 算法需要按 x 排序的點，pointsInViewOrNearby 已經是排序的
            sampledPoints = lttb(pointsInViewOrNearby, threshold);

            // LTTB 算法通常會保留第一個點和最後一個點。
            // 但為了絕對確保線條從視圖邊界開始/結束，我們再次檢查並添加原始視圖範圍的邊界點。
            // 找到原始數據中落在 viewMinX 和 viewMaxX 邊界上的點
            const firstPointAtViewMin = line.points.find(p => p.x >= this.viewMinX);
            const lastPointAtViewMax = line.points.slice().reverse().find(p => p.x <= this.viewMaxX);

            // 如果視圖邊界點存在，並且它們的 X 座標與採樣結果的起始/結束點 X 座標不完全相同，則將其添加到採樣結果中
            // 這裡需要小心處理浮點數精度問題
            const epsilonX = (this.viewMaxX - this.viewMinX) / this.drawingWidth * 0.1; // 1/10 像素的容差

            if (firstPointAtViewMin && sampledPoints.length > 0 && Math.abs(firstPointAtViewMin.x - sampledPoints[0].x) > epsilonX) {
              sampledPoints.unshift(firstPointAtViewMin); // 添加到最前面
            }
            if (lastPointAtViewMax && sampledPoints.length > 0 && Math.abs(lastPointAtViewMax.x - sampledPoints[sampledPoints.length - 1].x) > epsilonX) {
              sampledPoints.push(lastPointAtViewMax); // 添加到最後面
            }
            // 重新排序採樣點（因為添加了邊界點）
            if (sampledPoints.length > 1) {
              sampledPoints.sort((a, b) => a.x - b.x);
            }


          } catch (e) {
            console.error("LTTB sampling failed:", e);
            // 採樣失敗時，回退到使用視圖範圍內的點子集 (可能卡頓)
            sampledPoints = pointsInViewOrNearby;
          }
        } else {
          // 如果在視圖範圍內或附近的點數量不多，則直接使用這些點，不採樣
          sampledPoints = pointsInViewOrNearby;
        }


        // 如果採樣後點不足兩個，則無法繪製線條
        if (sampledPoints.length < 2) {
          // 但是如果 drawPoints 是 true，還是可以畫點
          if (this.drawPoints && sampledPoints.length >= 1) { // >=1 個點就可以畫點
            sampledPoints.forEach(point => { // 畫採樣後的點
              const { canvasX, canvasY } = this.mapDataToCanvas(point.x, point.y);
              ctx.fillStyle = line.color; // 使用線條顏色畫點
              ctx.beginPath();
              ctx.arc(canvasX, canvasY, this.pointRadius, 0, Math.PI * 2);
              ctx.fill();
            });
          }
          return; // 少於兩個點不畫線
        }

        // 繪製採樣後的線條
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = this.lineWidth;

        // 移動到採樣後的第一個點
        const firstSamplePoint = sampledPoints[0];
        const { canvasX: startX, canvasY: startY } = this.mapDataToCanvas(firstSamplePoint.x, firstSamplePoint.y);
        ctx.moveTo(startX, startY);

        // 連接到採樣後的後續點
        for (let i = 1; i < sampledPoints.length; i++) {
          const point = sampledPoints[i];
          const { canvasX, canvasY } = this.mapDataToCanvas(point.x, point.y);
          ctx.lineTo(canvasX, canvasY); // 繪製直線段連接採樣點
        }

        ctx.stroke();


      }); // 遍歷 processedLines 結束

      // 4. 繪製所有點 (如果需要且在視圖範圍內)
      // 注意：這裡依然遍歷所有原始點。在高縮放時繪製所有點可能仍然導致卡頓。
      // 如果想在高縮放時減少點數，也需要對點的繪製進行採樣，或者只繪製 Tooltip 附近的點。
      // 目前為了簡單和清晰，保持繪製所有原始點。在高縮放時點會重疊在一起。
      // 建議在高縮放級別下，關閉 drawPoints 選項，或者對點的繪製也應用採樣。
      // 一種簡單的點採樣策略是：只有在放大到每個點在 X 軸上佔據超過 N 個像素時才繪製點。
      const dataUnitsPerPixelX = (this.viewMaxX - this.viewMinX) / this.drawingWidth;
      const pixelThresholdForPoints = 5; // 例如，每個點至少佔據 5 像素才顯示
      const dataThresholdForPoints = dataUnitsPerPixelX * pixelThresholdForPoints;


      if (this.drawPoints) {
        this.processedLines.forEach(line => {
          if (line.points) {
            // 可以對點的繪製也進行採樣，例如只繪製 X 軸上相隔 dataThresholdForPoints 的點
            // 或者只繪製在視圖範圍內的點
            line.points.forEach(point => {
              // 只繪製在當前視圖範圍內且滿足點採樣閾值的點
              if (point && point.x >= this.viewMinX && point.x <= this.viewMaxX &&
                point.y >= this.viewMinY && point.y <= this.viewMaxY
                // 可以添加額外的點採樣條件 here
                // 例如：只有在放大到一定程度時才繪製點 (viewRangeX < globalRangeX / ZoomLevelThreshold)
                // 或者：只繪製相隔一定 X 距離的點 (需要一個額外的遍歷邏輯)
              ) {
                const { canvasX, canvasY } = this.mapDataToCanvas(point.x, point.y);
                // 由於已經設定了裁切路徑，這裡不需要額外檢查點的 Canvas 座標是否在繪圖區域內
                ctx.fillStyle = this.pointColor; // 使用固定的點顏色
                ctx.beginPath();
                ctx.arc(canvasX, canvasY, this.pointRadius, 0, Math.PI * 2);
                ctx.fill();
              }
            });
          }
        });
      }

      // 5. **恢復 Canvas 狀態，移除裁切路徑**
      ctx.restore();

      // 6. 繪製 Tooltip 的垂直游標線 (如果 tooltipData 有值) - 不受裁切影響
      // 游標線和 Tooltip 點標記依然基於 Tooltip 查找到的原始點數據，不受繪圖採樣影響
      this.drawTooltipCursor(ctx);

      // TODO: 如果需要繪製平滑曲線，修改步驟 3 的線條繪製邏輯，替換 lineTo 為貝塞爾曲線方法
      // 注意：為平滑曲線應用採樣更複雜，需要計算採樣點的控制點。
    },

    // 繪製座標軸和網格 (基於當前視圖範圍)
    drawAxesAndGrid(ctx, currentMinX, currentMaxX, currentMinY, currentMaxY) { // 傳入當前視圖範圍
      if (!ctx || this.drawingWidth <= 0 || this.drawingHeight <= 0) return;

      ctx.strokeStyle = this.gridColor;
      ctx.lineWidth = this.gridLineWidth;
      ctx.font = this.labelFont;
      ctx.fillStyle = this.labelColor;

      this.drawYAxisGridAndLabels(ctx, currentMinY, currentMaxY);
      this.drawXAxisGridAndLabels(ctx, currentMinX, currentMaxX);

      this.drawAxes(ctx); // 最後繪製軸線，疊在網格上面
    },

    // 繪製基本的 X 和 Y 軸線
    drawAxes(ctx) {
      if (!ctx || this.drawingWidth <= 0 || this.drawingHeight <= 0) return;

      ctx.strokeStyle = this.axisColor;
      ctx.lineWidth = 1.5;

      // Y 軸 (左邊)
      ctx.beginPath();
      ctx.moveTo(this.padding, this.canvasHeight - this.padding);
      ctx.lineTo(this.padding, this.padding);
      ctx.stroke();

      // X 軸 (底部)
      ctx.beginPath();
      ctx.moveTo(this.padding, this.canvasHeight - this.padding);
      ctx.lineTo(this.canvasWidth - this.padding, this.canvasHeight - this.padding);
      ctx.stroke();

      // 繪製軸標題 (可選)
      // ...
    },

    // 繪製 Y 軸網格線和標籤 (參數為當前視圖範圍的 MinY, MaxY)
    drawYAxisGridAndLabels(ctx, currentMinY, currentMaxY) {
      if (!ctx || this.drawingHeight <= 0) return;

      const numTicks = 5;
      const yRange = currentMaxY - currentMinY;
      if (yRange <= 0) return;

      let roughTickInterval = yRange / numTicks;
      let tickInterval = this.getNiceInterval(roughTickInterval);

      let firstTickValue = Math.floor(currentMinY / tickInterval) * tickInterval;
      while (firstTickValue < currentMinY) {
        firstTickValue += tickInterval;
      }

      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      // 繪製網格線和標籤，直到超過最大 Y 範圍 + 一個間隔的緩衝
      for (let value = firstTickValue; value <= currentMaxY + tickInterval * 1.5; value += tickInterval) {
        const { canvasY } = this.mapDataToCanvas(this.viewMinX, value); // 使用視圖的 minX 定位到 Y 軸線上對應的 Y 像素

        // 繪製水平網格線
        ctx.beginPath();
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = this.gridLineWidth;
        ctx.moveTo(this.padding, canvasY);
        ctx.lineTo(this.canvasWidth - this.padding, canvasY);
        ctx.stroke();

        // 繪製 Y 軸標籤 (稍微偏移到左邊)
        // 檢查標籤是否超出頂部或底部邊界太多
        if (canvasY > this.padding - 15 && canvasY < this.canvasHeight - this.padding + 15) { // 15像素的緩衝
          const label = value.toFixed(yRange > 10 ? 0 : (yRange > 1 ? 1 : 2)); // 根據範圍調整小數點
          ctx.fillStyle = this.labelColor;
          ctx.fillText(label, this.padding - 10, canvasY);
        }

        // 繪製 Y 軸上的小刻度線 (可選)
        // 只在靠近 Y 軸的繪圖區域邊界繪製
        if (canvasY >= this.padding && canvasY <= this.canvasHeight - this.padding) {
          ctx.beginPath();
          ctx.strokeStyle = this.axisColor;
          ctx.lineWidth = 1;
          ctx.moveTo(this.padding - 5, canvasY);
          ctx.lineTo(this.padding, canvasY);
          ctx.stroke();
        }
      }
    },

    // 找到一個“好讀”的刻度間隔
    getNiceInterval(roughInterval) {
      if (roughInterval <= 0) return 1;

      const niceNumbers = [1, 2, 5];
      const exponent = Math.floor(Math.log10(roughInterval));
      const fraction = roughInterval / Math.pow(10, exponent);
      let niceFraction;

      if (fraction < niceNumbers[0]) niceFraction = niceNumbers[0];
      else if (fraction < niceNumbers[1]) niceFraction = niceNumbers[1];
      else if (fraction < niceNumbers[2]) niceFraction = niceNumbers[2];
      else niceFraction = 10;

      return niceFraction * Math.pow(10, exponent);
    },

    // 繪製 X 軸網格線和標籤 (日期時間) (參數為當前視圖範圍的 MinX, MaxX - 時間戳)
    drawXAxisGridAndLabels(ctx, currentMinX, currentMaxX) {
      if (!ctx || this.drawingWidth <= 0) return;

      const timeSpan = currentMaxX - currentMinX; // 當前視圖的時間跨度 (毫秒)
      if (timeSpan <= 0) return;

      const maxLabels = Math.floor(this.drawingWidth / 120); // 估計 X 軸最多能放多少個標籤 (每個標籤假設佔用 120 像素寬)
      if (maxLabels < 2) return;

      const interval = this.getSuitableTimeInterval(timeSpan, maxLabels);

      if (!interval || interval <= 0) return;

      // 計算第一個刻度時間戳
      let firstTickTime = Math.ceil(currentMinX / interval) * interval;
      while (firstTickTime < currentMinX) {
        firstTickTime += interval;
      }

      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // 繪製網格線和標籤，直到超過最大 X 範圍 + 一個間隔的緩衝
      for (let timestamp = firstTickTime; timestamp <= currentMaxX + interval * 1.5; timestamp += interval) {
        if (timestamp > currentMaxX + interval * 2) break; // 防止浮點數誤差

        const { canvasX } = this.mapDataToCanvas(timestamp, this.viewMinY); // 使用視圖的 minY 定位到 X 軸線上對應的 X 像素

        // 繪製垂直網格線
        ctx.beginPath();
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = this.gridLineWidth;
        ctx.moveTo(canvasX, this.canvasHeight - this.padding);
        ctx.lineTo(canvasX, this.padding);
        ctx.stroke();

        // 繪製 X 軸標籤 (稍微偏移到下方)
        // 檢查標籤是否超出左右邊界太多
        const label = this.formatTimestamp(timestamp, timeSpan);
        const labelLineHeight = parseInt(ctx.font) * 1.2;
        const lines = label.split('\n');
        const estimatedLabelHeight = labelLineHeight * lines.length;

        // 檢查底部空間是否足夠繪製標籤
        if (this.canvasHeight - this.padding + 10 + estimatedLabelHeight < this.canvasHeight) {
          ctx.fillStyle = this.labelColor;
          lines.forEach((line, lineIndex) => {
            // 這裡可以根據文字寬度調整位置，以避免靠近邊界時被裁切 (較複雜，暫不實現)
            ctx.fillText(line, canvasX, this.canvasHeight - this.padding + 10 + lineIndex * labelLineHeight);
          });
        }


        // 繪製 X 軸上的小刻度線 (可選)
        // 只在靠近 X 軸的繪圖區域邊界繪製
        if (canvasX >= this.padding && canvasX <= this.canvasWidth - this.padding) {
          ctx.beginPath();
          ctx.strokeStyle = this.axisColor;
          ctx.lineWidth = 1;
          ctx.moveTo(canvasX, this.canvasHeight - this.padding);
          ctx.lineTo(canvasX, this.canvasHeight - this.padding + 5);
          ctx.stroke();
        }
      }
    },

    // 找到一個適合的日期時間間隔 (返回毫秒)
    getSuitableTimeInterval(timeSpan, maxLabels) {
      if (timeSpan <= 0 || maxLabels <= 0) return 0;

      const intervals = [
        1000,           // 1 second
        5 * 1000,       // 5 seconds
        10 * 1000,      // 10 seconds
        30 * 1000,      // 30 seconds
        60 * 1000,      // 1 minute
        5 * 60 * 1000,  // 5 minutes
        10 * 60 * 1000, // 10 minutes
        30 * 60 * 1000, // 30 minutes
        60 * 60 * 1000, // 1 hour
        3 * 60 * 60 * 1000, // 3 hours
        6 * 60 * 60 * 1000, // 6 hours
        12 * 60 * 60 * 1000, // 12 hours
        24 * 60 * 60 * 1000, // 1 day
        7 * 24 * 60 * 60 * 1000, // 1 week
        30.44 * 24 * 60 * 60 * 1000, // ~1 month (average)
        91.31 * 24 * 60 * 60 * 1000, // ~3 months
        365.25 * 24 * 60 * 60 * 1000 // ~1 year (average)
      ];

      const targetInterval = timeSpan / maxLabels;
      let bestInterval = intervals[0];
      for (const interval of intervals) {
        if (interval < targetInterval * 0.2) continue; // 至少達到目標的 20%
        if (interval >= targetInterval) {
          bestInterval = interval;
          break;
        }
        bestInterval = interval; // 如果都小於目標，則暫存當前間隔
      }

      // 如果最終選出的最佳間隔仍然導致標籤過多，選擇下一個更大的標準間隔
      while (timeSpan / bestInterval > maxLabels * 1.2 && intervals.indexOf(bestInterval) < intervals.length - 1) {
        const currentIndex = intervals.indexOf(bestInterval);
        bestInterval = intervals[currentIndex + 1];
      }

      return bestInterval;
    },

    // 將時間戳格式化為字符串 (根據視圖時間跨度調整精度)
    formatTimestamp(timestamp, viewTimeSpan) { // 接收視圖總時間跨度 (毫秒)
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = ('0' + (date.getMonth() + 1)).slice(-2);
      const day = ('0' + date.getDate()).slice(-2);
      const hours = ('0' + date.getHours()).slice(-2);
      const minutes = ('0' + date.getMinutes()).slice(-2);
      const seconds = ('0' + date.getSeconds()).slice(-2);

      const oneSecond = 1000;
      const oneMinute = 60 * oneSecond;
      const oneHour = 60 * oneMinute;
      const oneDay = 24 * oneHour;
      const oneMonth = 30 * oneDay;
      const oneYear = 365 * oneDay;

      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    },

    // ----------------- 事件處理 -----------------

    handleMouseDown(event) {
      const rect = this.$refs.graphCanvas.getBoundingClientRect();
      const mouseCanvasX = event.clientX - rect.left;
      const mouseCanvasY = event.clientY - rect.top;

      if (mouseCanvasX >= this.padding && mouseCanvasX <= this.canvasWidth - this.padding &&
        mouseCanvasY >= this.padding && mouseCanvasY <= this.canvasHeight - this.padding) {
        this.isPanning = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
        this.$refs.canvasWrapper.style.cursor = 'grabbing';
        event.preventDefault();
        // 在開始拖拽時隱藏 tooltip div
        this.tooltipData = null; // 隱藏 tooltip div
        // 設置需要重繪，因為游標線可能要消失
        this.needsRedraw = true;
      }
    },

    handleMouseMove(event) {
      const rect = this.$refs.graphCanvas.getBoundingClientRect();
      const mouseCanvasX = event.clientX - rect.left;
      const mouseCanvasY = event.clientY - rect.top;

      if (this.isPanning) {
        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;

        const viewRangeX = this.viewMaxX - this.viewMinX;
        const viewRangeY = this.viewMaxY - this.viewMinY;

        if (this.drawingWidth <= 0 || this.drawingHeight <= 0 || viewRangeX <= 0 || viewRangeY <= 0) return;

        const dataDeltaX = deltaX * (viewRangeX / this.drawingWidth);
        const dataDeltaY = deltaY * (viewRangeY / this.drawingHeight);

        // 更新視圖範圍 (這會觸發 view watch，設置 needsRedraw = true)
        this.viewMinX -= dataDeltaX;
        this.viewMaxX -= dataDeltaX;
        this.viewMinY += dataDeltaY;
        this.viewMaxY += dataDeltaY;

        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY; // 注意這裡修正為 event.clientY

        // 繪圖由 requestAnimationFrame 循環處理

      } else {
        // 如果不在平移狀態，檢查是否更新 tooltip div
        // 只有鼠標在繪圖區域內才檢查 tooltip
        if (mouseCanvasX >= this.padding && mouseCanvasX <= this.canvasWidth - this.padding &&
          mouseCanvasY >= this.padding && mouseCanvasY <= this.canvasHeight - this.padding) {
          this.checkTooltip(mouseCanvasX, mouseCanvasY); // 這會更新 tooltipData 和 tooltipPixelX/Y
          this.$refs.canvasWrapper.style.cursor = 'grab'; // 在繪圖區域內設置 grab 光標
        } else {
          // 鼠標移出繪圖區域或容器，隱藏 tooltip div
          this.tooltipData = null;
          this.$refs.canvasWrapper.style.cursor = 'default';
          // 如果移出繪圖區域，但還在 Canvas 範圍內，也清除 Tooltip
          if (this.tooltipData !== null) {
            this.tooltipData = null;
            this.needsRedraw = true; // 清除游標線
          }
        }
      }
    },

    handleMouseUp() {
      if (this.isPanning) {
        this.isPanning = false;
        // 在停止平移時檢查一次 Tooltip
        const rect = this.$refs.graphCanvas.getBoundingClientRect();
        const mouseCanvasX = event.clientX - rect.left;
        const mouseCanvasY = event.clientY - rect.top;
        // 只有鼠標在繪圖區域內才重新檢查 tooltip
        if (mouseCanvasX >= this.padding && mouseCanvasX <= this.canvasWidth - this.padding &&
          mouseCanvasY >= this.padding && mouseCanvasY <= this.canvasHeight - this.padding) {
          this.checkTooltip(mouseCanvasX, mouseCanvasY);
        } else {
          this.tooltipData = null; // 鼠標在邊距區域釋放，隱藏 tooltip
        }


        // 恢復鼠標樣式
        const wrapper = this.$refs.canvasWrapper;
        if (wrapper) {
          const rect = wrapper.getBoundingClientRect();
          const mouseX = event.clientX;
          const mouseY = event.clientY;
          // 如果鼠標還在 wrapper 內，且在繪圖區域內，恢復 grab 光標
          if (mouseX >= rect.left && mouseX <= rect.right &&
            mouseY >= rect.top && mouseY <= rect.bottom &&
            mouseCanvasX >= this.padding && mouseCanvasX <= this.canvasWidth - this.padding &&
            mouseCanvasY >= this.padding && mouseCanvasY <= this.canvasHeight - this.padding) {
            this.$refs.canvasWrapper.style.cursor = 'grab';
          } else {
            this.$refs.canvasWrapper.style.cursor = 'default';
          }
        } else {
          this.$refs.canvasWrapper.style.cursor = 'default';
        }
      }
    },

    handleMouseOut() {
      // 鼠標移出容器時停止平移並隱藏 tooltip div
      this.isPanning = false;
      this.tooltipData = null;
      this.$refs.canvasWrapper.style.cursor = 'default';
      this.needsRedraw = true; // 清除游標線
    },

    // 阻止右鍵菜單的事件處理函數
    handleContextMenu(event) {
      event.preventDefault();
    },


    handleMouseWheel(event) {
      const delta = event.deltaY; // 滾輪向上是負值，向下是正值

      // **** 修改這裡：根據 deltaY 計算 zoomFactor ****
      const scaleAmount = 1.05; // 每次滾動縮放的係數
      let zoomFactor;

      if (delta < 0) { // 滾輪向上，放大 (zoomFactor < 1)
        zoomFactor = 1 / scaleAmount;
      } else if (delta > 0) { // 滾輪向下，縮小 (zoomFactor > 1)
        zoomFactor = scaleAmount;
      } else { // deltaY === 0，沒有滾動
        return; // 不進行任何操作
      }

      const rect = this.$refs.graphCanvas.getBoundingClientRect();
      const mouseCanvasX = event.clientX - rect.left;
      const mouseCanvasY = event.clientY - rect.top;

      // 確保縮放中心在繪圖區域內 (只在繪圖區域內觸發縮放)
      if (mouseCanvasX < this.padding || mouseCanvasX > this.canvasWidth - this.padding ||
        mouseCanvasY < this.padding || mouseCanvasY > this.canvasHeight - this.padding) {
        event.preventDefault(); // 仍然阻止頁面滾動
        // 如果在邊距區域滾動，可能需要檢查 tooltip
        this.checkTooltip(mouseCanvasX, mouseCanvasY); // 這裡仍然呼叫 checkTooltip 來更新 tooltipData
        return; // 不在繪圖區域內不進行縮放計算
      }

      const currentViewRangeX = this.viewMaxX - this.viewMinX;
      const currentViewRangeY = this.viewMaxY - this.viewMinY;

      if (currentViewRangeX <= 0 || currentViewRangeY <= 0) {
        console.warn("Cannot zoom with invalid current view range.");
        event.preventDefault(); // 阻止頁面滾動
        return;
      }

      // 將鼠標的 Canvas 像素位置轉換為數據座標 (作為縮放中心)
      const zoomCenterData = this.mapCanvasToData(mouseCanvasX, mouseCanvasY);
      const zoomCenterX = zoomCenterData.x;
      const zoomCenterY = zoomCenterData.y;

      // 計算新的視圖範圍
      let nextViewMinX = zoomCenterX - (zoomCenterX - this.viewMinX) * zoomFactor;
      let nextViewMaxX = zoomCenterX + (this.viewMaxX - zoomCenterX) * zoomFactor;
      let nextViewMinY = zoomCenterY - (zoomCenterY - this.viewMinY) * zoomFactor;
      let nextViewMaxY = zoomCenterY + (this.viewMaxY - zoomCenterY) * zoomFactor;


      // 設置縮放限制 (可選)
      const globalRangeX = this.globalMaxX - this.globalMinX;
      const globalRangeY = this.globalMaxY - this.globalMinY;
      // 最小允許的視圖範圍（最大放大程度）
      const minAllowedRangeX = globalRangeX > 0 ? globalRangeX / 5000 : 1; // 放大到全局範圍的 1/5000
      const minAllowedRangeY = globalRangeY > 0 ? globalRangeY / 5000 : 1;
      // 最大允許的視圖範圍（最大縮小程度，防止縮小到超過全局範圍太多）
      const maxAllowedRangeX = globalRangeX > 0 ? globalRangeX * 10 : 100; // 縮小到全局範圍的 10 倍
      const maxAllowedRangeY = globalRangeY > 0 ? globalRangeY * 10 : 100;


      let nextViewRangeX = nextViewMaxX - nextViewMinX;
      let nextViewRangeY = nextViewMaxY - nextViewMinY;

      // 應用放大限制 (如果新的範圍小於最小允許範圍，則按比例調整回最小值)
      if (nextViewRangeX < minAllowedRangeX) {
        const factor = minAllowedRangeX / nextViewRangeX;
        nextViewMinX = zoomCenterX - (zoomCenterX - nextViewMinX) * factor;
        nextViewMaxX = zoomCenterX + (nextViewMaxX - zoomCenterX) * factor;
      }
      if (nextViewRangeY < minAllowedRangeY) {
        const factor = minAllowedRangeY / nextViewRangeY;
        nextViewMinY = zoomCenterY - (zoomCenterY - nextViewMinY) * factor;
        nextViewMaxY = zoomCenterY + (nextViewMaxY - zoomCenterY) * factor;
      }

      // 應用縮小限制 (如果新的範圍大於最大允許範圍，則按比例調整回最大值)
      if (nextViewRangeX > maxAllowedRangeX) {
        const factor = maxAllowedRangeX / nextViewRangeX;
        nextViewMinX = zoomCenterX - (zoomCenterX - nextViewMinX) * factor;
        nextViewMaxX = zoomCenterX + (nextViewMaxX - zoomCenterX) * factor;
      }
      if (nextViewRangeY > maxAllowedRangeY) {
        const factor = maxAllowedRangeY / nextViewRangeY;
        nextViewMinY = zoomCenterY - (zoomCenterY - nextViewMinY) * factor;
        nextViewMaxY = zoomCenterY + (nextViewMaxY - zoomCenterY) * factor;
      }


      // 更新視圖範圍 (這會觸發 view watch，設置 needsRedraw = true)
      this.viewMinX = nextViewMinX;
      this.viewMaxX = nextViewMaxX;
      this.viewMinY = nextViewMinY;
      this.viewMaxY = nextViewMaxY;

      event.preventDefault(); // 阻止頁面滾動

      // 隱藏 tooltip div
      this.tooltipData = null; // 縮放時隱藏 tooltip

      // 繪圖由 requestAnimationFrame 循環處理
    },

    // 窗口 resize 事件處理 (防抖)
    handleResize() {
      if (this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }
      this.resizeTimer = setTimeout(() => {
        this.updateCanvasSize(); // 更新 Canvas 尺寸 (觸發 watcher)
        // updateCanvasSize 會觸發 canvasWidth/Height watch -> updateDrawingDimensionsAndDraw -> needsRedraw = true
        // 這裡不需要額外重置視圖，視圖範圍應該保持不變，只是繪製比例尺改變了
        // Tooltip 也會隱藏因為 canvas 尺寸變了，需要重新 checkTooltip
        this.tooltipData = null; // 隱藏 tooltip
      }, 100); // 100ms 防抖延遲
    },

    // ----------------- Tooltip 相關 -----------------

    // 繪製 Tooltip 的垂直游標線和點標記
    drawTooltipCursor(ctx) {
      if (!this.tooltipData || !ctx || this.drawingWidth <= 0 || this.drawingHeight <= 0) {
        return;
      }

      const cursorX = this.tooltipData.canvasX; // Tooltip 數據中的 Canvas X 座標 (對應 mouseDataX 的 Canvas X)

      // 確保游標線在繪圖區域內
      if (cursorX >= this.padding && cursorX <= this.canvasWidth - this.padding) {
        ctx.save(); // 保存當前狀態
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; // 半透明黑色
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]); // 繪製虛線
        ctx.beginPath();
        ctx.moveTo(cursorX, this.padding); // 從繪圖區域頂部開始
        ctx.lineTo(cursorX, this.canvasHeight - this.padding); // 到繪圖區域底部結束
        ctx.stroke();
        ctx.restore(); // 恢復之前狀態
      }

      // 在每條線與游標線 X 座標對應的點位置繪製一個小圓點或標記
      if (this.tooltipData.lineValues) {
        this.tooltipData.lineValues.forEach(lineInfo => {
          // 這個點已經是距離 targetDataX 最近的點
          // 使用該點的 Canvas X 座標來定位圓點
          const pointCanvasX = this.mapDataToCanvas(lineInfo.dataPoint.x, this.viewMinY).canvasX; // 確保使用該點的實際 X 數據轉換的 CanvasX
          const pointCanvasY = lineInfo.canvasY; // 該點的 Canvas Y 座標

          // 確保點在繪圖區域內 (使用該點的實際 Canvas X 和 Canvas Y 判斷)
          if (pointCanvasX >= this.padding && pointCanvasX <= this.canvasWidth - this.padding &&
            pointCanvasY >= this.padding && pointCanvasY <= this.canvasHeight - this.padding) {
            ctx.fillStyle = lineInfo.color || '#000'; // 使用線條顏色
            ctx.beginPath();
            // 在該點的實際 Canvas 位置繪製標記
            ctx.arc(pointCanvasX, pointCanvasY, this.pointRadius + 1, 0, Math.PI * 2); // 稍微大一點的點
            ctx.fill();
          }
        });
      }
    },

    // 在給定的有序點陣列中，尋找距離 targetX 最近的點的索引 (X 軸)
    // 這個函數用於找到特定 X 座標在每條線上的對應點
    findClosestPointIndex(linePoints, targetX) {
      if (!linePoints || linePoints.length === 0) return -1;

      let closestIndex = -1;
      let minDiff = Infinity;

      // 簡單線性查找，但對於 200 個點來說足夠快且準確
      for (let i = 0; i < linePoints.length; i++) {
        const point = linePoints[i];
        if (!point) continue;
        const diff = Math.abs(point.x - targetX);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = i;
        }
      }

      return closestIndex;
    },

    // 檢查鼠標位置，更新 tooltipData 和 tooltipPixelX/Y
    checkTooltip(mouseX, mouseY) { // mouseX, mouseY 是 Canvas 像素座標
      // 只有當 Canvas 繪圖區域有效時才檢查 tooltip
      if (this.drawingWidth <= 0 || this.drawingHeight <= 0 || !this.processedLines || this.processedLines.length === 0 || this.processedLines.every(line => !line.points || line.points.length === 0)) {
        if (this.tooltipData !== null) {
          this.tooltipData = null; // 隱藏 tooltip div
          this.needsRedraw = true; // 清除游標線
        }
        return;
      }

      // 將鼠標 X 轉換為數據 X
      const mouseDataX = this.mapCanvasToData(mouseX, mouseY).x;
      // 獲取對應這個數據 X 值的 Canvas X 座標 (用於繪製游標線和 Tooltip div 定位)
      // 注意：這裡使用 mouseDataX 轉換回 Canvas X，而不是直接使用 mouseX
      // 這樣可以確保游標線和 Tooltip 綁定到數據 X 軸位置，而不是像素 X 軸位置
      const tooltipCanvasX = this.mapDataToCanvas(mouseDataX, this.viewMinY).canvasX; // 使用 viewMinY 定位到 X 軸線上

      const lineValues = [];
      // 設置一個閾值，只有當數據點的 X 與鼠標的數據 X 足夠接近時才顯示在 tooltip 中
      // 這個閾值可以根據 Canvas 上的像素距離來計算，例如 10 像素
      const pixelTolerance = 10; // 10 像素的容差
      const dataToleranceX = pixelTolerance / (this.drawingWidth / (this.viewMaxX - this.viewMinX)); // 將像素容差轉換為數據單位容差


      // 遍歷所有 visible 線
      this.processedLines.forEach(line => {
        // processedLines 已經過濾了 visible = false 的線
        if (!line.points || line.points.length === 0) return;

        // 在這條線上尋找距離 mouseDataX 最近的點的索引
        const closestIndex = this.findClosestPointIndex(line.points, mouseDataX);

        if (closestIndex !== -1) {
          const point = line.points[closestIndex];
          // 只有當該點的 X 座標與鼠標所在的數據 X 座標足夠接近時才添加到 tooltip
          // 檢查的是該點的實際 X 數據與 mouseDataX 的差值 (數據單位)
          if (Math.abs(point.x - mouseDataX) <= dataToleranceX) {
            // 將該點轉換為 Canvas 座標 (該點的實際位置)
            const { canvasX: pointCanvasX, canvasY: pointCanvasY } = this.mapDataToCanvas(point.x, point.y);

            lineValues.push({
              lineIndex: this.graphLinesData.findIndex(origLine => origLine.id === line.id), // 找到原始數據中的索引
              id: line.id,
              name: line.name,
              color: line.color,
              dataPoint: point, // 儲存原始數據點
              canvasX: pointCanvasX, // 儲存 Canvas 座標 (該點的實際位置)
              canvasY: pointCanvasY
            });
          }
        }
      });

      // 只有當有找到至少一個線條的點，並且鼠標在繪圖區域內時才顯示 tooltip
      const mouseInDrawingArea = mouseX >= this.padding && mouseX <= this.canvasWidth - this.padding &&
        mouseY >= this.padding && mouseY <= this.canvasHeight - this.padding;


      if (mouseInDrawingArea && lineValues.length > 0) {
        // 更新 tooltipData
        this.tooltipData = {
          targetDataX: mouseDataX, // 記錄鼠標所在的數據 X 值
          canvasX: tooltipCanvasX, // 記錄對應的 Canvas X 座標 (用於游標線)
          lineValues: lineValues // 儲存所有找到的點信息
        };
        // Tooltip div 的像素位置設置為鼠標當前位置
        this.tooltipPixelX = mouseX;
        this.tooltipPixelY = mouseY;
        // 設置需要重繪，以顯示更新後的游標線和點標記
        this.needsRedraw = true;
      } else {
        // 如果鼠標不在繪圖區域內，或者沒有找到附近的點，隱藏 tooltip
        if (this.tooltipData !== null) {
          this.tooltipData = null; // 隱藏 tooltip div
          // 設置需要重繪，以清除游標線
          this.needsRedraw = true;
        }
      }
    },


    // ----------------- 數據生成範例 -----------------
    // 隨機生成數據（模擬新格式）
    randomizeAllData() {
      this.getChartLoading = true;
      var Query = {
        start: `${this.dateS['dday']}T${this.dateS['dtime']}Z`,
        end: `${this.dateE['dday']}T${this.dateE['dtime']}Z`,
      }
      useSetup().queryLinechartData(Query).then((res) => {
        var d = res["data"]
        const data = [];
        for (let i in res["data"]) {
          var rawData = res["data"][i]
          const iso = rawData["tgroup"].replace(" ", "T") + ":00:00";
          const timestamp = new Date(iso);
          Object.entries(rawData).forEach(([key, value]) => {
            if (key === "tgroup" || key === "id_avg") return; // 跳過時間欄
            if (i == 0) {
              data.push({
                id: key, name: key, visible: false,
                originalValues: [{ time: timestamp, value: value }],
                displayValues: [],
              });
            } else {
              var findIndex = data.findIndex((d) => d.id == key)
              data[findIndex]['originalValues'].push({ time: timestamp, value: value })
            }
          });
        }
        for (let i in data) {
          data[i]["visible"] = i == 0 ? true : false;
          data[i]["color"] = `hsl(${(Math.random() * 360 + i * (360 / 20)) % 360}, 70%, 50%)`
        }
        this.graphLinesData = data;
        this.tooltipData = null; // 清空數據時隱藏 tooltip
        console.log("Total Chart Data: ", this.graphLinesData)
        this.getChartLoading = false;
      }).catch(() => {
        useSetup().showAlertDialog({ icon: "error", title: "獲取曲線圖資料失敗!" });
        this.getChartLoading = false;
      })

      // const newLinesData = [];
      // const numLines = 20;
      // const numPoints = 200;
      // const baseHue = Math.random() * 360; // 隨機一個起始色相

      // const now = Date.now();
      // const timeIntervalBetweenPoints = 10000; // 每個點間隔 10 秒
      // const startTime = now - (numPoints - 1) * timeIntervalBetweenPoints;

      // for (let i = 0; i < numLines; i++) {
      //     const originalValues = [];
      //     const hue = (baseHue + i * (360 / numLines)) % 360;
      //     const lineColor = `hsl(${hue}, 70%, 50%)`;

      //     for (let j = 0; j < numPoints; j++) {
      //          // 確保 X 座標是嚴格遞增或不變，便於查找 closest point
      //          const timestamp = startTime + j * timeIntervalBetweenPoints + (Math.random() - 0.5) * timeIntervalBetweenPoints * 0.3; // 加點隨機性
      //          // 生成帶一些隨機性的 y 值
      //          const y = Math.sin(j / 50 + i * 0.2) * 20 + Math.random() * 10 + i * 5 + 50; // Y 值增加基礎偏移

      //          originalValues.push({
      //              time: new Date(timestamp).toISOString(), // 轉換為 ISO 格式字符串
      //              value: y
      //          });
      //     }
      //      // 如果隨機性導致 X 亂序，需要排序 (這裡假設間隔足夠大不會亂序)
      //     // originalValues.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      //     newLinesData.push({
      //         id: `col${i + 1}_avg`,
      //         name: `Column ${i + 1}`,
      //         visible: i === 0, // 默認只有第一條線可見
      //         originalValues: originalValues,
      //         color: lineColor
      //     });
      // }
      // // 直接設置到 data 屬性
      // this.graphLinesData = newLinesData;
      // console.log(this.graphLinesData)
      // this.tooltipData = null; // 清空數據時隱藏 tooltip
      // // graphLinesData 的 watch 會觸發 findGlobalDataRange -> resetView -> view watch -> needsRedraw = true
    },

    // 切換線條的可見性
    toggleLineVisibility(index) {
      if (index >= 0 && index < this.graphLinesData.length) {
        // 使用 Vue.set 或深拷貝來確保響應性更新
        // 深拷貝整個陣列並修改單個對象的屬性是安全的
        const updatedData = JSON.parse(JSON.stringify(this.graphLinesData));
        updatedData[index].visible = !updatedData[index].visible;
        this.graphLinesData = updatedData;
        // graphLinesData 的 watch 會處理後續的重繪
      }
    },

    // 阻止右鍵菜單的事件處理函數 (添加到 wrapper)
    handleContextMenu(event) {
      event.preventDefault();
    },


    // ========================================= 搜尋 =========================================
    // 取得當前時間並初始化日期資訊
    getDatetimeNow() {
      var today = new Date();
      this.dateS = { value: today, dday: this.formatDate(today), dtime: "00:00:00" }
      this.dateE = { value: today, dday: this.formatDate(today), dtime: this.formatTime(today) }
    },
    // 組合日期時間 (格式為: YYYY-MM-DD HH:mm:ss)
    combinationDate(info) {
      if (info['dday'] == "") return ""
      if (info['dtime'] == null) return info['dday']
      return `${info['dday']} ${info['dtime']}`
    },
    formatDate(date) {
      if (!date) return '';
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    formatTime(date) {
      if (!date) return '';
      const d = new Date(date);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    },
    validateDate(item) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(item.dday)) item.dday = this.formatDate(item.value);
      else {
        const parsedDate = new Date(item.dday);
        if (!isNaN(parsedDate.getTime())) item.value = parsedDate;
        else item.dday = this.formatDate(item.value);
      }
    },
  }
};
</script>

<style scoped>
/* 局部作用域的樣式 */
.optimized-canvas-graph-container {
  text-align: center;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  color: #2c3e50;
  padding: 0px 30px 30px 30px;
  width: 100%;
}

.canvas-wrapper {
  margin: 20px auto;
  /* 可以在這裡設置外邊距 */
  border: 1px solid #eee;
  display: block;
  /* 通常圖表佔一整行 */
  background-color: #fff;
  /* Canvas 背景，方便看網格 */
  cursor: grab;
  /* 提示用戶可以拖拽 */
  user-select: none;
  /* 阻止文本選擇 */
  -webkit-user-select: none;
  -ms-user-select: none;
  -moz-user-select: none;

  /* 設定 wrapper 的動態尺寸 */
  width: 100%;
  height: 70vh;
  /* 這裡設定為視窗高度的 80% */
  box-sizing: border-box;
  /* 將 border 包含在 width/height 內 */
  position: relative;
  /* 為內部絕對定位的 Tooltip div 提供定位上下文 */
}

/* 讓 Canvas 元素的顯示尺寸佔滿其 wrapper 容器 */
.canvas-wrapper canvas {
  display: block;
  /* 避免 canvas 下方的小空隙 */
  width: 100%;
  height: 100%;
}

.tooltip {
  /* Tooltip div 的樣式 */
  position: absolute;
  /* 相對於 .canvas-wrapper 定位 */
  background-color: rgba(255, 255, 255, 0.95);
  /* 更不透明一點 */
  border: 1px solid #333;
  padding: 8px;
  border-radius: 4px;
  pointer-events: none;
  /* 確保 tooltip div 不會捕獲鼠標事件 */
  /* white-space: nowrap; /* 如果內容多，可以允許換行 */
  z-index: 10;
  /* 確保 Tooltip 在 Canvas 上方 */
  /* 繼承父元素的字體和顏色，或者在這裡設定 */
  font-size: 10px;
  /* 使用 data中的tooltipFont */
  color: #2c3e50;
  /* 使用 data 中的 labelColor */
  text-align: left;
  /* Tooltip 文字左對齊 */
  box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.2);
  /* 添加一點陰影 */
  max-height: 80%;
  /* 限制最大高度 */
  overflow-y: auto;
  /* 如果內容超出最大高度，顯示滾動條 */
}

.tooltip-time,
.tooltip-hint {
  font-weight: bold;
  margin-bottom: 5px;
  padding-bottom: 3px;
  border-bottom: 1px solid #eee;
}

.tooltip-hint {
  font-size: 9px;
  font-weight: normal;
  margin-top: 5px;
  padding-top: 3px;
  border-top: 1px solid #eee;
  border-bottom: none;
  /* 移除底部邊框 */
}


.tooltip-line-value {
  display: flex;
  /* 讓顏色方塊和文字在同一行 */
  align-items: center;
  /* 垂直居中 */
  margin-bottom: 3px;
}

.tooltip-line-color {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: 5px;
  border-radius: 2px;
  flex-shrink: 0;
  /* 防止在 flex 佈局中被擠壓 */
}

.tooltip-line-value div:last-child {
  flex-grow: 1;
  /* 文字內容佔據剩餘空間 */
}


button {
  margin: 5px;
  padding: 8px 15px;
  cursor: pointer;
}

label {
  margin: 0 10px;
}

.line-controls {
  margin-bottom: 10px;
}
</style>