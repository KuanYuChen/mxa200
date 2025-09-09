import { saveHistory } from "./keyboard";

// Vue資訊
var that = null;

// 拖拉
var lastMouseMoveTime = 0      // 拖拉更新時間
var dragComponents = false     // 拖拉組件
var dragCanvas = false         // 拖拉畫布
var cpy_selectitem = [];       // 判斷是否有拖拉動作
var startDrag = { x: 0, y: 0 } // 開始拖拉值
var selectionStart = { x: 0, y: 0 } // 可拉選擇方框起點
var dragOriginOffset = { x: 0, y: 0 };

// Resize
var resizeComponents = false  // 是否Resize組件
var resizeItem = null // Resize的物件
var resizeInit = { x: 0, y: 0, width: 0, height: 0 } // Resize初始值

// ======================================= 取得Vue資訊 =======================================
var getVueInfo = function() {
  return that
}

var initVueInfo = function(info) {
  that = info
  saveHistory(); // 保存一開始的狀態
}

// 取得SVG參數 (寬、高、位置)
var getCanvasRect = function() {
  const canvasRect = that.$refs.canvasCard?.$el.getBoundingClientRect()
  if (!canvasRect) return { width: 0, height: 0, left: 0, top: 0 };
  return { width: canvasRect.width - 2, height: canvasRect.height - 2, left: canvasRect.left, top: canvasRect.top }
}

// ======================================= 拖拉函數 =======================================
// 選擇背景時
var handleBackgroundMouseDown = function(event) {
  // 在Ctrl按下時，才能拖動畫布 (不受觀看模式影響)
  dragCanvas = false;
  if (event.ctrlKey) {
    dragComponents = true;
    dragCanvas = true;
    startDrag = { x: event.clientX, y: event.clientY };
    dragOriginOffset = { x: that.svgOffset.x, y: that.svgOffset.y };
  }
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  showContextMenu(event, that.emapInfo["content"], "background"); // 開啟右鍵菜單(右鍵)
  clearComponentEditRect(that.selectcomponent_list) // 清除組件修改Resize四角方塊
  // 點擊背景 => 開始框選 (無Shift、Ctrl)
  if (!event.shiftKey && !event.ctrlKey) {
    that.selectingBox = true;
    const transformedPoint = getCanvasPoint(event);
    selectionStart = { x: parseInt(transformedPoint.x), y: parseInt(transformedPoint.y) };
    that.selectBoxArea = { ...selectionStart, width: 0, height: 0 };
  }
}

// 選擇拖拉物件時
var handleItemsMouseDown = function(event, item) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  that.selectcomponent_list.forEach((item) => item.edit = false) // 原本的選擇列表的修改狀態初始化
  if (event.shiftKey) {
    // Shift + 點擊 => 多選組件
    const index = that.selectcomponent_list.indexOf(item);
    if (index === -1) that.selectcomponent_list.push(item);
    else that.selectcomponent_list.splice(index, 1);
  } else {
    // 單選組件
    if (!that.selectcomponent_list.includes(item)) that.selectcomponent_list = [item];
    if (item.lock) {
      that.selectingBox = true;
      const transformedPoint = getCanvasPoint(event);
      selectionStart = { x: parseInt(transformedPoint.x), y: parseInt(transformedPoint.y) };
      that.selectBoxArea = { ...selectionStart, width: 0, height: 0 };
    }
  }
  cpy_selectitem = JSON.parse(JSON.stringify(that.selectcomponent_list)); // 拖拉前的組件狀態
  showContextMenu(event, that.selectcomponent_list, "items"); // 開啟右鍵菜單(右鍵)
  dragComponents = true;
  startDrag['x'] = event.clientX;
  startDrag['y'] = event.clientY;

  // 磁吸初始狀態
  that.selectcomponent_list.forEach((item) => {
    item.dragOrigin = { x: item.n_x, y: item.n_y };
    if (item.type == 'Group') item.nodes.forEach(node => node.dragOrigin = { x: node.n_x, y: node.n_y });
  })
  
  // 有Ctrl事件時(平移事件)優先處理
  if (event.ctrlKey) {
    that.selectingBox = false;
    dragComponents = false;
    dragCanvas = true;
    startDrag = { x: event.clientX, y: event.clientY };
    dragOriginOffset = { x: that.svgOffset.x, y: that.svgOffset.y };
  } else {
    dragComponents = true;
    dragCanvas = false;
  }
  // 記錄滑鼠起始點，用於組件拖動
  that.dragStartLogicalPoint = getCanvasPoint(event);
}

// 拖動所有選中的組件
var onMouseMove = function(event) {
  const now = performance.now();
  if (now - lastMouseMoveTime < 16) return; // 限制更新頻率 (約60FPS)
  lastMouseMoveTime = now;
  if (that.componentChange && !dragCanvas) return; // 觀看模式下只能拖動畫布
  if (that.selectingBox) {
    const transformedPoint = getCanvasPoint(event);
    that.selectBoxArea = {
      x: Math.min(selectionStart.x, transformedPoint.x),
      y: Math.min(selectionStart.y, transformedPoint.y),
      width: Math.abs(transformedPoint.x - selectionStart.x),
      height: Math.abs(transformedPoint.y - selectionStart.y),
    };
  }
  if (dragCanvas && event.ctrlKey) {
    // 1. 計算滑鼠相對於【初始點】的總位移
    const dx_pixel = event.clientX - startDrag.x;
    const dy_pixel = event.clientY - startDrag.y;
    // 2. 新的偏移量 = 【畫布的初始偏移量】 + 【滑鼠的總位移】
    that.svgOffset.x = dragOriginOffset.x + dx_pixel;
    that.svgOffset.y = dragOriginOffset.y + dy_pixel;
  } else if (dragComponents) {
    // 1. 獲取滑鼠在「邏輯世界」的當前點
    const currentLogicalPoint = getCanvasPoint(event);

    // 2. 在「邏輯世界」中計算精確的位移 dx, dy
    const dx = currentLogicalPoint.x - that.dragStartLogicalPoint.x;
    const dy = currentLogicalPoint.y - that.dragStartLogicalPoint.y;
    
    let allowedDx = dx;
    let allowedDy = dy;
    // 3. 使用固定的initViewBox作為畫布邊界
    const canvasWidth = that.initViewBox.width;
    const canvasHeight = that.initViewBox.height;

    that.selectcomponent_list.forEach((item) => {
      if (item.lock) return;
      // 磁吸效果
      if (that.selectcomponent_list.length == 1) {
        const SNAP_DISTANCE = 10;
        const targetX = item.dragOrigin.x + dx;
        const targetY = item.dragOrigin.y + dy;
        that.svg_nodes.forEach(other => {
          if (item === other || that.selectcomponent_list.includes(other)) return;
          if (Math.abs((targetX + item.width) - other.n_x) < SNAP_DISTANCE) allowedDx = other.n_x - item.width - item.dragOrigin.x;
          else if (Math.abs(targetX - (other.n_x + other.width)) < SNAP_DISTANCE) allowedDx = (other.n_x + other.width) - item.dragOrigin.x;
          if (Math.abs((targetY + item.height) - other.n_y) < SNAP_DISTANCE) allowedDy = other.n_y - item.height - item.dragOrigin.y;
          else if (Math.abs(targetY - (other.n_y + other.height)) < SNAP_DISTANCE) allowedDy = (other.n_y + other.height) - item.dragOrigin.y;
        });
      }
      // 應用位移並進行邊界檢測
      if (item.type === 'Group') computedGroupNodeDistance(item, canvasWidth, canvasHeight, allowedDx, allowedDy);
      else {
        let newX = item.dragOrigin.x + allowedDx;
        let newY = item.dragOrigin.y + allowedDy;
        // item.n_x = Math.max(0, Math.min(newX, canvasWidth - item.width));
        // item.n_y = Math.max(0, Math.min(newY, canvasHeight - item.height));
        item.n_x = newX;
        item.n_y = newY;
      }
    });
  }
};

// 停止拖動組件
var onMouseUp = function(event) {
  dragComponents = false;
  dragCanvas = false;
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  if (that.selectingBox) {
    that.selectingBox = false;
    // 選取框內的節點 (選取框的邊界和元素的邊界)
    var offsetX = that.svgOffset['x']
    var offsetY = that.svgOffset['y']
    var offsetScale = that.svgOffset['scale']
    const selectionBox = {
      left: (that.selectBoxArea.x - offsetX) * offsetScale,
      top: (that.selectBoxArea.y - offsetY) * offsetScale,
      right: (that.selectBoxArea.x + that.selectBoxArea.width - offsetX) * offsetScale,
      bottom: (that.selectBoxArea.y + that.selectBoxArea.height - offsetY) * offsetScale,
    }
    // 過濾出選取框內的元素 (確保emap node內有值)
    if (that.svg_nodes) {
      that.selectcomponent_list = that.svg_nodes.filter(item => {
        // 根據 Offset X、Y 和 Scale 計算元素的邊界
        const scaledItem = {
          left: (item.n_x - offsetX) * offsetScale,
          top: (item.n_y - offsetY) * offsetScale,
          right: (item.n_x + item.width - offsetX) * offsetScale,
          bottom: (item.n_y + item.height - offsetY) * offsetScale,
        }  
        // 比對元素與選取框的邊界
        return (
          !item.lock &&
          scaledItem.left < selectionBox.right && // 元素的左邊必須小於選取框的右邊
          scaledItem.right > selectionBox.left && // 元素的右邊必須大於選取框的左邊
          scaledItem.top < selectionBox.bottom && // 元素的上邊必須小於選取框的下邊
          scaledItem.bottom > selectionBox.top    // 元素的下邊必須大於選取框的上邊
        );
      });
      cpy_selectitem = JSON.parse(JSON.stringify(that.selectcomponent_list)); // 拖拉前的組件狀態
    }
  }

  // 確保拖拉列表有值
  var drag_list = that.selectcomponent_list
  if (drag_list.length != 0) {
    var checkMove = false
    var moveThreshold = 3; // 定義移動閾值
    for (let i in cpy_selectitem) {
      var selectDragTarget = drag_list.find(item => item['id'] === cpy_selectitem[i]['id'])
      // 判斷是否有移動到x、y
      const diffX = selectDragTarget['n_x'] - cpy_selectitem[i]['n_x'];
      const diffY = selectDragTarget['n_y'] - cpy_selectitem[i]['n_y'];
      if (Math.abs(diffX) >= moveThreshold || Math.abs(diffY) >= moveThreshold) {
        checkMove = true;
        break;
      }
    }
    if (checkMove) {
      saveHistory(); // 組件拖拉結束後保存
      that.changeEmap("組件拖拉結束");
      cpy_selectitem = [];
    }
  }
}

// ======================================= Resize 函數 =======================================
// 縮放視窗
var handleResizeWindow = function() {
  const canvasRect = getCanvasRect()
  if (canvasRect.width != 0 && canvasRect.height != 0) {
    // console.log("AAAAAAAAA", canvasRect)
  }
}
// 選擇Resize物件時
var handleItemsResizeDown = function(event, item, handle) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  event.preventDefault();
  resizeItem = item;
  resizeInit = {
    x: event.clientX, y: event.clientY,
    width: resizeItem.width, height: resizeItem.height,
    left: resizeItem.n_x, top: resizeItem.n_y,
    mode: handle,
  };
  resizeComponents = true;
  // 是否為群組(用來拖拉群組並帶動內部組件用)
  if (item.type === 'Group' && item.nodes) {
    resizeInit.initialNodes = null;
    resizeInit.initialNodes = JSON.parse(JSON.stringify(
      item.nodes.map(n => ({
        id: n.id, n_x: n.n_x, n_y: n.n_y,
        width: n.width, height: n.height
      }))
    ));
  }
  window.addEventListener("mousemove", onResize);
  window.addEventListener("mouseup", onResizeMouseUp);
}

var onResize = function(event) {
  if (!resizeComponents) return;
  // 縮放比例
  const scale = that.svgOffset?.scale || 1;
  // 根據 SVG 縮放比例調整滑鼠移動的差異量
  const widthDiff = (event.clientX - resizeInit.x) / scale;
  const heightDiff = (event.clientY - resizeInit.y) / scale;

  // 獲取 SVG 邊界
  const canvasRect = getCanvasRect();
  const canvasWidth = that.initViewBox?.width || canvasRect.width;
  const canvasHeight = that.initViewBox?.height || canvasRect.height;
  const minSize = 10; // 設定最小尺寸

  let newWidth = resizeInit.width;
  let newHeight = resizeInit.height;
  let newX = resizeInit.left;
  let newY = resizeInit.top;

  switch (resizeInit.mode) {
    case "bottom-right": // 右下角: 只改變寬高
      newWidth = resizeInit.width + widthDiff;
      newHeight = resizeInit.height + heightDiff;
      break;
    case "bottom-left": // 左下角: 改變 X、寬、高
      newWidth = resizeInit.width - widthDiff;
      newX = resizeInit.left + widthDiff;
      newHeight = resizeInit.height + heightDiff;
      break;
    case "top-right": // 右上角: 改變 Y、寬、高
      newWidth = resizeInit.width + widthDiff;
      newHeight = resizeInit.height - heightDiff;
      newY = resizeInit.top + heightDiff;
      break;
    case "top-left": // 左上角: 改變 X、Y、寬、高
      newWidth = resizeInit.width - widthDiff;
      newX = resizeInit.left + widthDiff;
      newHeight = resizeInit.height - heightDiff;
      newY = resizeInit.top + heightDiff;
      break;
  }

  // 強制執行最小尺寸 - 如果調整的是左邊或上邊的控制點，達到最小尺寸時需要反向調整位置
  if (newWidth < minSize) {
    if (resizeInit.mode === "bottom-left" || resizeInit.mode === "top-left") newX -= (minSize - newWidth); // 將左邊界向左移回，以維持最小寬度
    newWidth = minSize;
  }
  if (newHeight < minSize) {
    if (resizeInit.mode === "top-right" || resizeInit.mode === "top-left") newY -= (minSize - newHeight); // 將上邊界向上移回，以維持最小高度
    newHeight = minSize;
  }

  // 邊界檢查 - 防止移出 SVG 畫布
  if (newX < 0) { newWidth += newX; newX = 0; } // 左邊界
  if (newY < 0) { newHeight += newY; newY = 0; } // 上邊界
  if (newX + newWidth > canvasWidth) newWidth = canvasWidth - newX; // 右邊界
  if (newY + newHeight > canvasHeight) newHeight = canvasHeight - newY; // 下邊界
  
  // 邊界調整後重新檢查最小尺寸
  newWidth = Math.max(minSize, newWidth);
  newHeight = Math.max(minSize, newHeight);

  // 將最終計算出的值套用到組件上
  resizeItem.n_x = newX;
  resizeItem.n_y = newY;
  resizeItem.width = newWidth;
  resizeItem.height = newHeight;

  // 更新群組內組件尺寸位置
  if (resizeItem.type === 'Group' && resizeInit.initialNodes) updateGroupResize();
}

var onResizeMouseUp = function(event) {
  resizeComponents = false;
  if (event.target.closest('.group-item') && resizeItem) that.changeEmap("組件Resize結束"); // 只在SVG內操作，是否為選擇物件時才會更新
  resizeItem = null;
  resizeInit = { x: 0, y: 0, width: 0, height: 0 };
  saveHistory(); // Resize組件結束後保存
  window.removeEventListener("mousemove", onResize);
  window.removeEventListener("mouseup", onResizeMouseUp);
}

// 點擊2次後可開始縮放
var dbclickEditText = function(item) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  if (item.lock) return;
  item['edit'] = !item['edit']
}

// 取消可縮放
var blurEditText = function(item) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  if (item.lock) return;
  item['edit'] = !item['edit']
}

// ======================================= Zoom函數 (縮放SVG) =======================================
// 滾輪縮放
var onWheelZoom = function(event) {
  if (!event.ctrlKey) return; // 只有按住 Ctrl 鍵時才能縮放
  event.preventDefault();
  const zoomIntensity = 0.1;
  let newScale = that.svgOffset['scale'] - event.deltaY * zoomIntensity * 0.01;
  newScale = Math.min(Math.max(newScale, 0.5), 3); // 限制縮放範圍 1x ~ 3x

  // 取得滑鼠點擊的位置
  const canvasRect = getCanvasRect();
  const mouseX = event.clientX - canvasRect.left;
  const mouseY = event.clientY - canvasRect.top;

  // 計算新的偏移量，使縮放以鼠標為中心
  const scaleRatio = newScale / that.svgOffset['scale'];
  that.svgOffset['x'] = mouseX - (mouseX - that.svgOffset['x']) * scaleRatio;
  that.svgOffset['y'] = mouseY - (mouseY - that.svgOffset['y']) * scaleRatio;
  that.svgOffset['scale'] = newScale;
}

// 初始化縮放
var initZoom = function() {
  that.svgOffset = { x: 0, y: 0, scale: 1 };
}

// ======================================= 右鍵菜單(區分背景、物件) =======================================
// 顯示右鍵菜單
var showContextMenu = function(ev, item, type) {
  hideContextMenu(); // 關閉右鍵菜單
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  if (ev.button !== 2) return; // 只處理右鍵點擊事件
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // 取得滑鼠點擊的位置
  const canvasRect = getCanvasRect(); // 取得 SVG 的位置
  const menuWidth = 250; // 右鍵菜單寬度
  const menuHeight = type == 'background' ? 200 : 300; // 右鍵菜單高度 (背景/物件 高度不一樣)

  // 轉換為相對於 SVG 的座標
  let mouseX = ev.clientX - canvasRect.left;
  let mouseY = ev.clientY - canvasRect.top;

  // 計算右鍵菜單位置，確保不超出邊界
  let posX = Math.min(mouseX + 20, canvasRect.width - menuWidth);  // 限制 X 軸
  let posY = Math.min(mouseY + 50, canvasRect.height - menuHeight); // 限制 Y 軸
 // 存儲當前選擇的物件
  that.rightclickMenu = { show: true, type: type, x: posX, y: posY, item: item };
}

// 隱藏右鍵菜單
var hideContextMenu = function() {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  that.rightclickMenu.show = false;
  document.removeEventListener('contextmenu', (e) => e.preventDefault());
}


// ======================================== Function ========================================
// 轉換滑鼠坐標
function getCanvasPoint(event) {
  // 獲取自適應 SVG 容器元素
  const svgElement = that.$refs.adaptiveSvgContainer;
  if (!svgElement) return { x: 0, y: 0 };

  // 1. 獲取 SVG 在螢幕上的【物理容器】尺寸和位置
  const containerRect = svgElement.getBoundingClientRect();

  // 2. 獲取我們固定的【邏輯畫布】尺寸
  const logicalWidth = that.initViewBox.width;
  const logicalHeight = that.initViewBox.height;

  // 3. 計算物理容器和邏輯畫布的長寬比
  const containerRatio = containerRect.width / containerRect.height;
  const logicalRatio = logicalWidth / logicalHeight;

  // 4. ★★★ 核心邏輯：計算出內容被 `meet` 屬性縮放後，在容器內的【實際渲染尺寸】和【白邊偏移量】 ★★★
  let renderedWidth, renderedHeight, offsetX, offsetY;

  if (containerRatio > logicalRatio) {
    // 容器比內容更「寬」，高度填滿，寬度居中，左右產生白邊
    renderedHeight = containerRect.height;
    renderedWidth = renderedHeight * logicalRatio;
    offsetY = 0;
    offsetX = (containerRect.width - renderedWidth) / 2;
  } else {
    // 容器比內容更「高」，寬度填滿，高度居中，上下產生白邊
    renderedWidth = containerRect.width;
    renderedHeight = renderedWidth / logicalRatio;
    offsetX = 0;
    offsetY = (containerRect.height - renderedHeight) / 2;
  }

  // 5. 計算滑鼠點相對於【實際渲染區域】左上角的像素位置
  const mouseOnContentX = event.clientX - containerRect.left - offsetX;
  const mouseOnContentY = event.clientY - containerRect.top - offsetY;
  
  // 如果點擊在白邊區域，直接返回（或可以進行邊界吸附，但返回最穩健）
  if (mouseOnContentX < 0 || mouseOnContentX > renderedWidth || mouseOnContentY < 0 || mouseOnContentY > renderedHeight) {
    // 為了避免拖動時跳躍，我們可以返回一個基於邊界的值，但更簡單的做法是讓調用者處理
    // 這裡我們返回一個標記或null可能更好，但為了兼容您現有的拖動邏輯，我們暫時不做處理
  }

  // 6. 計算最終的「響應式縮放比例」
  // 這是【邏輯尺寸】與【實際渲染尺寸】的比值
  const responsiveScale = logicalWidth / renderedWidth; // X 和 Y 的比例是相同的

  // 7. 將滑鼠在【渲染區域】的像素位置，轉換為 SVG 的【邏輯座標】
  const logicalMouseX = mouseOnContentX * responsiveScale;
  const logicalMouseY = mouseOnContentY * responsiveScale;

  // 8. 最後，應用您原有的「交互式縮放和平移」的反向計算
  const pointX = (logicalMouseX - that.svgOffset.x) / that.svgOffset.scale;
  const pointY = (logicalMouseY - that.svgOffset.y) / that.svgOffset.scale;

  return { x: pointX, y: pointY };
}

// 清除組件修改Resize四角方塊
function clearComponentEditRect(items) {
  items.forEach(item => delete item.edit);
  items = [];
}

// ======================================== 群組Function ========================================
// 計算所有子元件的新位置是否會出界
function computedGroupNodeDistance(item, w, h, x, y) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  item.nodes.forEach(sub => {
    const newX = sub.dragOrigin.x + x;
    const newY = sub.dragOrigin.y + y;
    // minX = Math.min(minX, newX);
    // minY = Math.min(minY, newY);
    // maxX = Math.max(maxX, newX + sub.width);
    // maxY = Math.max(maxY, newY + sub.height);
  });

  // 根據邊界修正
  if (minX < 0) x += -minX;
  if (minY < 0) y += -minY;
  if (maxX > w) x -= maxX - w;
  if (maxY > h) y -= maxY - h;

  // 移動群組與子元件
  item.n_x = item.dragOrigin.x + x;
  item.n_y = item.dragOrigin.y + y;
  item.nodes.forEach(node => {
    node.n_x = node.dragOrigin.x + x;
    node.n_y = node.dragOrigin.y + y;
  });
}

// 更新Resize的群組內組件位置、大小
function updateGroupResize() {
  const group = resizeItem;
  const initialGroupState = resizeInit; // 拖拉開始時的整體狀態
  const initialNodesData = initialGroupState.initialNodes; // // 拖拉開始時儲存的群組的子節點初始array
  if (!group || !initialGroupState || !initialNodesData) return; // 更新時缺少參數
  
  // 群組拖拉開始時的初始狀態
  const initialX = initialGroupState.left;
  const initialY = initialGroupState.top;
  const initialW = initialGroupState.width;
  const initialH = initialGroupState.height;

  // 群組在此次 resize 步驟後的最終狀態
  const finalX = group.n_x;
  const finalY = group.n_y;
  const finalW = group.width;
  const finalH = group.height;

  // 計算群組整體的 X 和 Y 軸縮放比例
  const scaleX = (initialW !== 0) ? finalW / initialW : 1;
  const scaleY = (initialH !== 0) ? finalH / initialH : 1;

  // 遍歷群組中當前的實際子節點
  group.nodes.forEach(currentNode => {
    // 在儲存的初始子節點數據中找到與當前節點 ID 匹配的初始狀態
    const initialNode = initialNodesData.find(n => n.id === currentNode.id);
    if (!initialNode) return; // 找不到初始數據則跳過

    // 計算子節點相對於【初始】群組左上角的位置
    const initialRelativeX = initialNode.n_x - initialX;
    const initialRelativeY = initialNode.n_y - initialY;

    // 將這個【相對位置】乘以群組的整體縮放比例
    const scaledRelativeX = initialRelativeX * scaleX;
    const scaledRelativeY = initialRelativeY * scaleY;

    // 子節點的【新的絕對位置】 = 群組的【最終位置】 + 縮放後的【相對位置】
    currentNode.n_x = finalX + scaledRelativeX;
    currentNode.n_y = finalY + scaledRelativeY;

    // 4子節點的【新的尺寸】 = 子節點的【初始尺寸】 * 群組的整體縮放比例
    currentNode.width = initialNode.width * scaleX;
    currentNode.height = initialNode.height * scaleY;
  });
}


export {
  getVueInfo,
  initVueInfo,
  getCanvasRect,

  // 拖拉函數
  handleBackgroundMouseDown,
  handleItemsMouseDown,
  onMouseMove,
  onMouseUp,

  // Resize函數
  handleResizeWindow,
  handleItemsResizeDown,
  onResize,
  onResizeMouseUp,
  dbclickEditText,
  blurEditText,

  // Zoom函數
  onWheelZoom,
  initZoom,

  // 裁剪背景圖片函數
  // toggleCropMode,
  // startResizeClipBox,
  // resizeClipBoxHandles,
  // resizingClipBox,
  // endResizeClipBox,

  // 右鍵Menu函數
  hideContextMenu,
}
