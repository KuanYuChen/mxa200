import { saveHistory, getFullscreenState } from "./keyboard";

// Vue資訊
var that = null;

// 拖拉
var lastMouseMoveTime = 0      // 拖拉更新時間
var dragComponents = false     // 拖拉組件
var dragCanvas = false         // 拖拉畫布
var cpy_selectitem = [];       // 判斷是否有拖拉動作
var startDrag = { x: 0, y: 0 } // 開始拖拉值
var selectionStart = { x: 0, y: 0 } // 可拉選擇方框起點

// Resize
var resizeComponents = false  // 是否Resize組件
var resizeItem = null // Resize的物件
var resizeInit = { x: 0, y: 0, width: 0, height: 0 } // Resize初始值

// 裁剪框
var clipBoxIDX = null; // 裁剪框拉取位置 (裁剪框上4個角)
var startClipPoint = { x: 0, y: 0 }; // 開始裁剪位置

// ======================================= 取得Vue資訊 =======================================
var getVueInfo = function() {
  return that
}

var initVueInfo = function(info) {
  that = info
  setTimeout(() => {
    const svgBox = getSVGRect()
    that.initViewBox = { x: 0, y: 0, width: svgBox["width"], height: svgBox["height"] }
    saveHistory(); // 保存一開始的狀態
  }, 10);
}

// 取得SVG參數
var getSVGRect = function() {
  const svgBox = that.$refs.svgContent?.getBoundingClientRect()
  if (!svgBox) return { width: 0, height: 0, left: 0, top: 0 };
  return { width: svgBox.width, height: svgBox.height, left: svgBox.left, top: svgBox.top }
}

// ======================================= 拖拉函數 =======================================
// 選擇背景時
var handleBackgroundMouseDown = function(event) {
  // 在Ctrl按下時，才能拖動畫布 (不受觀看模式影響)
  dragCanvas = false;
  if (event.ctrlKey) {
    dragComponents = true;
    dragCanvas = true;
    startDrag['x'] = event.clientX;
    startDrag['y'] = event.clientY;
  }
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  showContextMenu(event, that.emapInfo["content"], "background"); // 開啟右鍵菜單(右鍵)
  clearComponentEditRect(that.selectcomponent_list) // 清除組件修改Resize四角方塊
  // 點擊背景 => 開始框選 (無Shift、Ctrl)
  if (!event.shiftKey && !event.ctrlKey) {
    that.selectingBox = true;
    const transformedPoint = getSVGPoint(event);
    selectionStart = { x: parseInt(transformedPoint.x), y: parseInt(transformedPoint.y) };
    that.selectBoxArea = { ...selectionStart, width: 0, height: 0 };
  }
}

// 選擇拖拉物件時
var handleItemsMouseDown = function(event, item) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  if (event.shiftKey) {
    // Shift + 點擊 => 多選組件
    const index = that.selectcomponent_list.indexOf(item);
    if (index === -1) that.selectcomponent_list.push(item);
    else that.selectcomponent_list.splice(index, 1);
  } else {
    // 單選組件 (無ctrl)
    if (!that.selectcomponent_list.includes(item) && !event.ctrlKey) that.selectcomponent_list = [item];
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
}

// 拖動所有選中的組件
var onMouseMove = function(event) {
  const svgBox = getSVGRect();
  const svgWidth = svgBox.width; // SVG 寬度
  const svgHeight = svgBox.height; // SVG 高度
  const now = performance.now();
  if (now - lastMouseMoveTime < 16) return; // 限制更新頻率 (約60FPS)
  lastMouseMoveTime = now;
  if (that.componentChange && !dragCanvas) return; // 觀看模式下只能拖動畫布
  if (that.selectingBox) {
    const transformedPoint = getSVGPoint(event);
    that.selectBoxArea = {
      x: Math.min(selectionStart.x, transformedPoint.x),
      y: Math.min(selectionStart.y, transformedPoint.y),
      width: Math.abs(transformedPoint.x - selectionStart.x),
      height: Math.abs(transformedPoint.y - selectionStart.y),
    };
  }
  // 計算縮放後的 dx, dy
  const dx = parseInt((event.clientX - startDrag['x']) / that.svgOffset['scale']);
  const dy = parseInt((event.clientY - startDrag['y']) / that.svgOffset['scale']);
  if (dragCanvas && event.ctrlKey) {
    // 畫布拖拉：改變整個 SVG 的位移(含Ctrl)
    that.svgOffset['x'] += dx;
    that.svgOffset['y'] += dy;
    // 更新拖拉起始點
    startDrag['x'] = event.clientX;
    startDrag['y'] = event.clientY;
  } else if (dragComponents) {
    // 組件拖拉
    let allowedDx = dx;
    let allowedDy = dy;
    that.selectcomponent_list.forEach((item) => {
      if (item.lock) return;
      // ================================== 磁吸效果 ==================================
      const SNAP_DISTANCE = 10 // 磁吸間距
      const targetX = item.dragOrigin.x + dx;
      const targetY = item.dragOrigin.y + dy;
      that.svg_nodes.forEach(other => {
        if (item === other || that.selectcomponent_list.includes(other)) return;
        // 橫向吸附
        if (Math.abs((targetX + item.width) - other.n_x) < SNAP_DISTANCE) allowedDx = other.n_x - item.width - item.dragOrigin.x;
        else if (Math.abs(targetX - (other.n_x + other.width)) < SNAP_DISTANCE) allowedDx = (other.n_x + other.width) - item.dragOrigin.x;
        // 垂直吸附
        if (Math.abs((targetY + item.height) - other.n_y) < SNAP_DISTANCE) allowedDy = other.n_y - item.height - item.dragOrigin.y;
        else if (Math.abs(targetY - (other.n_y + other.height)) < SNAP_DISTANCE) allowedDy = (other.n_y + other.height) - item.dragOrigin.y;
      });

      if (item.type === 'Group') computedGroupNodeDistance(item, svgWidth, svgHeight, allowedDx, allowedDy)
      else {
        let newX = item.dragOrigin.x + allowedDx;
        let newY = item.dragOrigin.y + allowedDy;
        item.n_x = Math.max(0, Math.min(newX, svgWidth - item.width));
        item.n_y = Math.max(0, Math.min(newY, svgHeight - item.height));
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
    }
  }
  // 更新群組的位置與大小
  // if (!resizeComponents) {
  //   that.svg_nodes.forEach(group => {
  //     if (group['type'] === "Group" && group['nodes'].length > 0) updateGroupDragBorder(group)
  //   });
  // }
  // 確保拖拉列表有值
  var drag_list = that.selectcomponent_list
  if (drag_list.length != 0) {
    var checkMove = false
    for (let i in cpy_selectitem) {
      // 判斷是否有移動到x、y
      var moveX = drag_list[i]['n_x'] != cpy_selectitem[i]['n_x']
      var moveY = drag_list[i]['n_y'] != cpy_selectitem[i]['n_y']
      if (moveX || moveY) checkMove = true
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
  const svgBox = getSVGRect()
  if (svgBox.width > that.svgViewBox.width || svgBox.height > that.svgViewBox.height && getFullscreenState() == false) {
    that.initViewBox = { x: 0, y: 0, width: svgBox.width, height: svgBox.height };
    that.svgViewBox = { x: 0, y: 0, width: svgBox.width, height: svgBox.height };
    that.clipBox = JSON.parse(JSON.stringify(that.svgViewBox));
  }
}

// 選擇Resize物件時
var handleItemsResizeDown = function(event, item) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  event.preventDefault();
  resizeItem = item;
  resizeInit = {
    x: event.clientX, y: event.clientY,
    width: resizeItem.width, height: resizeItem.height,
    left: resizeItem.n_x, top: resizeItem.n_y,
    mode: event.target.id,
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
  const svgBox = getSVGRect();
  const svgWidth = that.svgViewBox?.width || svgBox.width;
  const svgHeight = that.svgViewBox?.height || svgBox.height;
  const minSize = 50; // 設定最小尺寸

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
  // 左邊界
  if (newX < 0) {
    newWidth += newX;
    newX = 0;
  }
  // 上邊界
  if (newY < 0) {
    newHeight += newY;
    newY = 0;
  }
  if (newX + newWidth > svgWidth) newWidth = svgWidth - newX; // 右邊界
  if (newY + newHeight > svgHeight) newHeight = svgHeight - newY; // 下邊界
  
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
  newScale = Math.min(Math.max(newScale, 1), 3); // 限制縮放範圍 1x ~ 3x

  // 取得滑鼠點擊的位置
  const svgBox = getSVGRect();
  const mouseX = event.clientX - svgBox.left;
  const mouseY = event.clientY - svgBox.top;

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

// ======================================= 裁剪背景圖片函數 (沒有保存參數，暫時隱藏) =======================================
// 啟用/禁用裁剪
var toggleCropMode = function() {
  that.cropMode = !that.cropMode;
}

// 開始Resize裁剪框
var startResizeClipBox = function(index, event) {
  clipBoxIDX = index;
  startClipPoint = { x: event.clientX, y: event.clientY };
  window.addEventListener("mousemove", resizingClipBox);
  window.addEventListener("mouseup", endResizeClipBox);
}

// 裁剪框資訊
var resizeClipBoxHandles = function() {
  const clipbox = that.clipBox;
  return [
    { x: clipbox.x, y: clipbox.y }, // 左上
    { x: clipbox.x + clipbox.width, y: clipbox.y }, // 右上
    { x: clipbox.x, y: clipbox.y + clipbox.height }, // 左下
    { x: clipbox.x + clipbox.width, y: clipbox.y + clipbox.height }, // 右下
  ];
}

// 拖拉裁剪框中
var resizingClipBox = function(event) {
  var resizeClipbox = that.clipBox;
  let dx = event.clientX - startClipPoint.x;
  let dy = event.clientY - startClipPoint.y;
  switch (clipBoxIDX) {
    case 0: 
      resizeClipbox.x += dx;
      resizeClipbox.y += dy;
      resizeClipbox.width -= dx;
      resizeClipbox.height -= dy;
      break;
    case 1: 
      resizeClipbox.y += dy;
      resizeClipbox.width += dx;
      resizeClipbox.height -= dy;
      break;
    case 2: 
      resizeClipbox.x += dx;
      resizeClipbox.width -= dx;
      resizeClipbox.height += dy;
      break;
    case 3: 
      resizeClipbox.width += dx;
      resizeClipbox.height += dy;
      break;
  }
  startClipPoint = { x: event.clientX, y: event.clientY };
}

// 結束拖拉裁剪框
var endResizeClipBox = function() {
  clipBoxIDX = null;
  window.removeEventListener("mousemove", resizingClipBox);
  window.removeEventListener("mouseup", endResizeClipBox);
}

// ======================================= 右鍵菜單(區分背景、物件) =======================================
// 顯示右鍵菜單
var showContextMenu = function(ev, item, type) {
  hideContextMenu(); // 關閉右鍵菜單
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  if (ev.button !== 2) return; // 只處理右鍵點擊事件
  document.addEventListener('contextmenu', (e) => closeDefaultContextMenu(e));

  // 取得滑鼠點擊的位置
  const svgBox = getSVGRect(); // 取得 SVG 的位置
  const menuWidth = 250; // 右鍵菜單寬度
  const menuHeight = type == 'background' ? 200 : 300; // 右鍵菜單高度 (背景/物件 高度不一樣)

  // 轉換為相對於 SVG 的座標
  let mouseX = ev.clientX - svgBox.left;
  let mouseY = ev.clientY - svgBox.top;

  // 計算右鍵菜單位置，確保不超出邊界
  let posX = Math.min(mouseX + 20, svgBox.width - menuWidth);  // 限制 X 軸
  let posY = Math.min(mouseY + 20, svgBox.height - menuHeight); // 限制 Y 軸
 // 存儲當前選擇的物件
  that.rightclickMenu = { show: true, type: type, x: posX, y: posY, item: item };
}

// 隱藏右鍵菜單
var hideContextMenu = function() {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  that.rightclickMenu.show = false;
  document.removeEventListener('contextmenu', (e) => closeDefaultContextMenu(e));
}

var closeDefaultContextMenu = function(e) {
  e.preventDefault();
}

// ======================================== Function ========================================
// 轉換滑鼠坐標到 SVG 座標
function getSVGPoint(event) {
  const point = that.$refs.svgContent.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  // 取得 SVG 內部的變換矩陣
  const svgTransform = that.$refs.svgContent.getScreenCTM().inverse();
  // 轉換滑鼠座標到 SVG `viewBox` 座標
  const transformedPoint = point.matrixTransform(svgTransform);
  transformedPoint.x = (transformedPoint.x - that.svgOffset['x']) / that.svgOffset['scale'];
  transformedPoint.y = (transformedPoint.y - that.svgOffset['y']) / that.svgOffset['scale'];
  return transformedPoint
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
    minX = Math.min(minX, newX);
    minY = Math.min(minY, newY);
    maxX = Math.max(maxX, newX + sub.width);
    maxY = Math.max(maxY, newY + sub.height);
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

// 更新群組邊界位置(超出群組邊界時更新群組邊界)
// function updateGroupDragBorder(g) {
//   let minX = Infinity, minY = Infinity;
//   let maxX = -Infinity, maxY = -Infinity;
//   // 遍歷所有群組內的 nodes
//   g.nodes.forEach(node => {
//     minX = Math.min(minX, node.n_x);
//     minY = Math.min(minY, node.n_y);
//     maxX = Math.max(maxX, node.n_x + node.width);
//     maxY = Math.max(maxY, node.n_y + node.height);
//   });
//   g.n_x = minX;
//   g.n_y = minY;
//   g.width = maxX - minX;
//   g.height = maxY - minY;
// }

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
  getSVGRect,

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
  toggleCropMode,
  startResizeClipBox,
  resizeClipBoxHandles,
  resizingClipBox,
  endResizeClipBox,

  // 右鍵Menu函數
  hideContextMenu,
}



// var handleResizeWindow = function() {
//   const svgBox = that.$refs.svgContent.getBoundingClientRect()
//   if (svgBox.width > that.svgViewBox.width || svgBox.height > that.svgViewBox.height && fullscreenState == false) {
//     that.initViewBox = { x: 0, y: 0, width: svgBox.width, height: svgBox.height };
//     that.svgViewBox = { x: 0, y: 0, width: svgBox.width, height: svgBox.height };
//     that.clipBox = JSON.parse(JSON.stringify(that.svgViewBox));
//   }
//   // TODO: RWD Resize視窗更新組件位置
//   // // 計算視圖比例變化
//   // const svgBox = that.$refs.svgContent.getBoundingClientRect();
//   // const scaleX = svgBox.width / initSVGViewBox.width;
//   // const scaleY = svgBox.height / initSVGViewBox.height;
//   // // 更新所有組件的位置
//   // that.svg_nodes.forEach((item) => {
//   //   // // 如果是第一次縮放，先計算相對百分比
//   //   // if (!item.percentX || !item.percentY) {
//   //   //   item.percentX = item.n_x / initSVGViewBox.width;
//   //   //   item.percentY = item.n_y / initSVGViewBox.height;
//   //   // }
//   //   // // 根據新的 SVG 大小計算新位置
//   //   // item.n_x = parseInt(item.percentX * svgBox.width);
//   //   // item.n_y = parseInt(item.percentY * svgBox.height);
//   //   // console.log("#######", item.n_x, item.n_y, item.percentX, item.percentY)
//   //   item.n_x = item.n_x * scaleX;
//   //   item.n_y = item.n_y * scaleY;
//   // });
//   // // 更新視圖框
//   // that.svgViewBox = { x: 0, y: 0, width: svgBox.width, height: svgBox.height };
//   // that.clipBox = JSON.parse(JSON.stringify(that.svgViewBox));
//   // // 記錄新的 SVG 初始值
//   // initSVGViewBox = JSON.parse(JSON.stringify(that.svgViewBox));
// }
