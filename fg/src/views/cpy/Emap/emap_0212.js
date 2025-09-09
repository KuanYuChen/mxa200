var that = null;
var cpy_dragitem = []; // 判斷是否有拖拉動作

// 取得Vue資訊
var getVueInfo = function(info) {
  that = info
}

// 轉換滑鼠坐標到 SVG 座標
var getSVGPoint = function(event) {
  const point = that.$refs.svgContent.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  // 取得 SVG 內部的變換矩陣
  const svgTransform = that.$refs.svgContent.getScreenCTM().inverse();
  // 轉換滑鼠座標到 SVG `viewBox` 座標
  const transformedPoint = point.matrixTransform(svgTransform);
  return transformedPoint
}

// ======================================= 拖拉函數 =======================================
// 選擇背景時
var onBackgroundMouseDown = function(event) {
  hideContextMenu(); // 關閉右鍵菜單
  // 在Ctrl按下時，才能拖動畫布
  that.draggingCanvas = false;
  if (event.ctrlKey) {
    that.dragging = true;
    that.draggingCanvas = true;
    that.initDrag['x'] = event.clientX;
    that.initDrag['y'] = event.clientY;
  }
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  // 點擊背景 => 框選 (無Shift、Ctrl)
  if (!event.shiftKey && !event.ctrlKey) {
    that.dragitem_list = [];
    that.selecting = true;
    const transformedPoint = getSVGPoint(event);
    that.selectionStart = { x: parseInt(transformedPoint.x), y: parseInt(transformedPoint.y) };
    that.selectionBox = { ...that.selectionStart, width: 0, height: 0 };
  }
}

// 選擇物件時
var onItemsMouseDown = function(event, item) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  // 右鍵點擊組件 => 開啟右鍵菜單
  if (event.button === 2) {
    event.target.addEventListener("contextmenu", (e) => e.preventDefault());
    that.dragitem_list = [item];
    showContextMenu(event, item);
    return;
  }
  if (event.shiftKey) {
    // Shift + 點擊 => 多選
    const index = that.dragitem_list.indexOf(item);
    if (index === -1) that.dragitem_list.push(item);
    else that.dragitem_list.splice(index, 1);
  } else {
    // 單擊選擇 (無ctrl)
    if (!that.dragitem_list.includes(item) && !event.ctrlKey) that.dragitem_list = [item];
  }
  cpy_dragitem = JSON.parse(JSON.stringify(that.dragitem_list));

  that.dragging = true;
  that.initDrag['x'] = event.clientX;
  that.initDrag['y'] = event.clientY;
}

// 拖動所有選中的物件
var onMouseMove = function(event) {
  if (that.componentChange && !that.draggingCanvas) return; // 在觀看模式下只能拖動畫布

  // *********************** 要調整的部分(框選區域初始位置有問題) ***********************
  if (that.selecting) {
    const transformedPoint = getSVGPoint(event);
    that.selectionBox = {
      x: Math.min(that.selectionStart.x, parseInt(transformedPoint.x)),
      y: Math.min(that.selectionStart.y, parseInt(transformedPoint.y)),
      width: Math.abs(parseInt(transformedPoint.x) - that.selectionStart.x),
      height: Math.abs(parseInt(transformedPoint.y) - that.selectionStart.y),
    };
  }

  const dx = event.clientX - that.initDrag['x'];
  const dy = event.clientY - that.initDrag['y'];
  if (that.draggingCanvas && event.ctrlKey) {
    // 畫布拖拉：改變整個 SVG 的位移 (加上ctrl判斷)
    that.offset['x'] += dx;
    that.offset['y'] += dy;
  } else if (that.dragging) {
    // 組件拖拉
    that.dragitem_list.forEach((item) => {
      item.x += dx;
      item.y += dy;
    });
  }
  that.initDrag['x'] = event.clientX;
  that.initDrag['y'] = event.clientY;
}

// 停止拖動
var onMouseUp = function(event) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  
  if (that.selecting) {
    that.selecting = false;
    // 選取框內的節點
    // that.dragitem_list = that.emap_node.filter(item => {
    //   // console.log(item.x >= that.selectionBox.x ,
    //   //   item.y >= that.selectionBox.y ,
    //   //   item.x <= that.selectionBox.x + that.selectionBox.width ,
    //   //   item.y <= that.selectionBox.y + that.selectionBox.height, item.text)
    //   // return (
    //   //   item['groupstate'] && 
    //   //   item.x >= that.selectionBox.x &&
    //   //   item.y >= that.selectionBox.y &&
    //   //   item.x <= that.selectionBox.x + that.selectionBox.width &&
    //   //   item.y <= that.selectionBox.y + that.selectionBox.height
    //   // );
    // });

    // 假設你已經有選取框的邊界和元素的邊界
    const selectionBoxLeft = (that.selectionBox.x - that.offset.x) * that.offset.scale;
    const selectionBoxTop = (that.selectionBox.y - that.offset.y) * that.offset.scale;
    const selectionBoxRight = (that.selectionBox.x + that.selectionBox.width - that.offset.x) * that.offset.scale;
    const selectionBoxBottom = (that.selectionBox.y + that.selectionBox.height - that.offset.y) * that.offset.scale;

    // 過濾出選取框內的元素
    that.dragitem_list = that.emap_node.filter(item => {
      // 根據 offset 和 scale 計算元素的邊界
      const scaledItemX = (item.x - that.offset.x) * that.offset.scale;
      const scaledItemY = (item.y - that.offset.y) * that.offset.scale;
      const scaledItemRight = (item.x + item.width - that.offset.x) * that.offset.scale;
      const scaledItemBottom = (item.y + item.height - that.offset.y) * that.offset.scale;

      // 比對元素與選取框的邊界
      return (
        item['groupstate'] &&
        scaledItemX < selectionBoxRight && // 元素的左邊必須小於選取框的右邊
        scaledItemRight > selectionBoxLeft && // 元素的右邊必須大於選取框的左邊
        scaledItemY < selectionBoxBottom && // 元素的上邊必須小於選取框的下邊
        scaledItemBottom > selectionBoxTop // 元素的下邊必須大於選取框的上邊
      );
    });
  }
  that.dragging = false;
  that.draggingCanvas = false;
  // 確認點擊的是Node，而非背景
  if (event.target.closest(".group-item") != null) {
    for (let i in cpy_dragitem) {
      var judge = that.dragitem_list[i]['x'] != cpy_dragitem[i]['x'] && that.dragitem_list[i]['y'] != cpy_dragitem[i]['y'] // 判斷是否有移動到x、y
      if (judge) {
        saveHistory();
        that.updateEmap();
      }
    }
  }
}


// ======================================= Resize 函數 =======================================
var onResizeMouseDown = function(event, item) {
  if (!that.componentChange) {
    event.preventDefault();
    that.resizeItem = item;
    that.initResize = {
      x: event.clientX,
      y: event.clientY,
      width: item.width,
      height: item.height,
    };
    that.resizing = true;
    document.addEventListener("mousemove", (e) => onResize(e), { passive: false });
    document.addEventListener("mouseup", (e) => onResizeMouseUp(e), { once: true });
  }
}

var onResize = function(event) {
  if (that.resizing) {
    const widthDiff = event.clientX - that.initResize.x;
    const heightDiff = event.clientY - that.initResize.y;
    that.resizeItem.width = Math.max(that.initResize.width + widthDiff, 50); // 限制最小宽度
    that.resizeItem.height = Math.max(that.initResize.height + heightDiff, 50); // 限制最小高度
  }
}

var onResizeMouseUp = function(event) {
  that.resizing = false;
  that.resizeItem = null;
  that.initResize = { x: 0, y: 0, width: 0, height: 0 };
  document.removeEventListener("mousemove", (e) => onResize(e));
  if (that.updateEmap) that.updateEmap();
}

var dbclickEditText = function(item) {
  if (!that.componentChange) {
    that.itemText = JSON.parse(JSON.stringify(item))
    item['edit'] = !item['edit']
  }
}

var blurEditText = function(item) {
  item['edit'] = !item['edit']
  that.updateEmap()
}

// ======================================= 縮放函數 =======================================
// 滾輪縮放
var onWheelZoom = function(event) {
  if (!event.ctrlKey) return; // 只有按住 Ctrl 鍵時才能縮放
  const zoomIntensity = 0.1;
  let newScale = that.offset['scale'] - event.deltaY * zoomIntensity * 0.01;
  newScale = Math.min(Math.max(newScale, 0.5), 3); // 限制縮放範圍 0.5x ~ 3x

  // 取得滑鼠點擊的位置
  const rect = that.$refs.svgContent.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // 計算新的偏移量，使縮放以鼠標為中心
  const scaleRatio = newScale / that.offset['scale'];
  that.offset['x'] = mouseX - (mouseX - that.offset['x']) * scaleRatio;
  that.offset['y'] = mouseY - (mouseY - that.offset['y']) * scaleRatio;
  that.offset['scale'] = newScale;
}

// 初始化縮放
var initZoom = function() {
  that.offset = { x: 0, y: 0, scale: 1 };
}

// ======================================= 右鍵菜單 =======================================
var showContextMenu = function(event, item) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  // 取得滑鼠點擊的位置
  const svgRect = that.$refs.svgContent.getBoundingClientRect(); // 取得 SVG 的位置
  const mouseX = event.clientX - svgRect.left; // 轉換為相對於 SVG 的座標
  const mouseY = event.clientY - svgRect.top;

  // 設定右鍵菜單的位置
  that.contextMenu = {
    show: true,
    x: mouseX + 20, // 用滑鼠點擊位置
    y: mouseY + 20,
    item: item, // 存儲當前選擇的物件
  };
  console.log("右鍵菜單", that.contextMenu);
  event.target.addEventListener("contextmenu", (e) => e.preventDefault());
}
var hideContextMenu = function() {
  that.contextMenu.show = false;
}

// ======================================= 鍵盤應用 =======================================
var handleKeydown = function(event) {
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  if (event.key === "Delete") deleteItems();      // Delete
  if (event.ctrlKey) {
    event.preventDefault();
    if (event.key === "c") copyItems();           // Ctrl + C
    else if (event.key === "v") pasteItems();     // Ctrl + V
    else if (event.key === "a") selectAllItems(); // Ctrl + A
    else if (event.key === "z") undo();           // Ctrl + Z
    else if (event.key === "y") redo();           // Ctrl + Y
  }
}

// **Ctrl + C - 複製**
var copyItems = function() {
  if (that.dragitem_list.length > 0) {
    that.copy_items = that.dragitem_list.map(item => ({ ...item })); // 深拷貝
    console.log("複製:", that.copy_items);
  }
}

// **Ctrl + V - 貼上**
var pasteItems = function() {
  if (that.copy_items.length > 0) {
    const pastedItems = that.copy_items.map(item => ({
      ...item,
      id: Math.floor(Math.random() * 10000000),
      x: item.x + 20, // 偏移一點，防止重疊
      y: item.y + 20
    }));
    for (let i in pastedItems) that.emap_node.push(pastedItems[i]);
    that.updateEmap();
    console.log("貼上:", pastedItems);
  }
}

// **Delete - 刪除**
var deleteItems = function() {
  if (that.dragitem_list.length > 0) {
    that.emap_node = that.emap_node.filter(item => !that.dragitem_list.includes(item));
    that.emap_list[that.bgIdx].nodes = that.emap_node;
    that.updateEmap();
    console.log("刪除:", that.dragitem_list);
    that.dragitem_list = [];
  }
}

// **Ctrl + A - 全選**
var selectAllItems = function() {
  that.dragitem_list = that.emap_node;
  console.log("全選");
}

// 儲存當前狀態
var saveHistory = function() {
  that.history = that.history.slice(0, that.historyIndex + 1); // 刪除未來的狀態
  that.history.push(JSON.stringify(that.emap_node)); // 儲存物件的快照 (使用 JSON 避免引用問題)
  that.historyIndex++;
}

// **Ctrl + Z - 上一步**
var undo = function() {
  if (that.historyIndex > 0) {
    that.historyIndex--;
    that.emap_node = JSON.parse(that.history[that.historyIndex]);
    console.log("上一步");
    that.emap_list[that.bgIdx].nodes = that.emap_node;
    that.updateEmap();
  }
}

// **Ctrl + Y - 下一步**
var redo = function() {
  if (that.historyIndex < that.history.length - 1) {
    that.historyIndex++;
    that.emap_node = JSON.parse(that.history[that.historyIndex]);
    console.log("下一步");
    that.emap_list[that.bgIdx].nodes = that.emap_node;
    that.updateEmap();
  }
}


export {
  getVueInfo,

  onBackgroundMouseDown,
  onItemsMouseDown,
  onMouseMove,
  onMouseUp,
  
  onResizeMouseDown,
  onResize,
  onResizeMouseUp,
  dbclickEditText,
  blurEditText,

  onWheelZoom,
  initZoom,

  showContextMenu,
  hideContextMenu,

  handleKeydown,
  copyItems,
  deleteItems,
}