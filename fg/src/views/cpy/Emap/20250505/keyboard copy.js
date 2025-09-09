import { getSVGRect, getVueInfo } from "./emap";
// ======================================= 鍵盤應用 =======================================
var fullscreenState = false;      // 全螢幕狀態
var copy_items = []               // 複製貼上用
var pastedTimes = 0               // 貼上次數
let pasteDebounceTimer = null;    // 用在貼上動作處理防抖的計時器
let pasteDelay = 200;             // 防抖延遲 (毫秒)

var save_history = []        // 儲存歷史狀態
var historyIDX = -1          // 當前狀態位置

var handleKeydown = function(ev) {
  var that = getVueInfo()
  if (that.componentChange) return; // 觀看模式下只能拖動畫布
  if (ev.key === "F11") toggleFullScreen();         // F11
  if (ev.key === "Escape") closeDialogWindow(that); // Esc
  // Enter 
  if (ev.key === "Enter") {
    if (that.componentItem['dialog']) {
      if (that.componentItem['state'] == "ADD") that.addComponent();
      else if (that.componentItem['state'] == "EDIT") that.editComponent();
    }
    if (that.bgItem["dialog"]) that.editBackground();
    if (that.headerbarItem['dialog']) that.editHeaderbar();
    if (that.navbarItem['dialog']) that.editNavbar();
  }
  // 有任何一個Dialog視窗開啟時，不執行以下鍵盤事件
  if (that.componentItem['dialog'] || that.bgItem["dialog"] || that.headerbarItem["dialog"] || that.navbarItem["dialog"]) return;
  const arrow_list = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
  if (arrow_list.includes(ev.key)) moveByArrowKey(that, ev.key);  // 上下左右
  if (ev.key === "Delete") deleteItems();                         // Del
  // Ctrl
  if (ev.ctrlKey) {
    switch (ev.key) {
      case "z":
      case "Z": // Ctrl + Z
        undo(that);
        break;
      case "y":
      case "Y": // Ctrl + Y
        redo(that);
        break;
      case "c":
      case "C": // Ctrl + C
        copyItems('ctrl_c');
        ev.preventDefault();
        break;
      case "v":
      case "V": // Ctrl + V
        ev.preventDefault();
        clearTimeout(pasteDebounceTimer); // 清除之前的延遲任務
        // 在延遲後執行貼上動作
        pasteDebounceTimer = setTimeout(() => pasteItems('ctrl_v') , pasteDelay);
        break;
      case "a":
      case "A": // Ctrl + A
        selectAllItems(that);
        ev.preventDefault();
        break;
      case "s":
      case "S": // Ctrl + S
        that.addSnackbar("Ctrl + S - 儲存畫面");
        save_history = []
        historyIDX = -1
        that.checkToSave(true);
        ev.preventDefault();
        break;
      case "d":
      case "D":
        ev.preventDefault(); // 編輯頁面禁止Ctrl + D
        break;
      case "f":
      case "F": // Ctrl + F
        that.gotoViewPage();
        ev.preventDefault();
        break;
    }
  }
}

// **Arrow - 鍵盤上下左右移動組件**
var moveByArrowKey = function(that, arrow) {
  const svgBox = getSVGRect();
  const svgWidth = svgBox.width;    // SVG 寬度
  const svgHeight = svgBox.height;  // SVG 高度
  for (let i in that.selectcomponent_list) {
    var selectItem = that.selectcomponent_list[i]
    // 群組移動
    if (selectItem['type'] == 'Group') {
      selectItem.nodes.forEach((node, idx) => moveArrowItem(that, arrow, node, svgWidth, svgHeight))
    }
    moveArrowItem(that, arrow, selectItem, svgWidth, svgHeight)
  }
}

// **F11 - 全螢幕開關**
var toggleFullScreen = function() {
  fullscreenState = false;
  let el = document.documentElement; // 讓整個頁面進入全螢幕
  if (el.requestFullscreen) {
    console.log("WINDOW")
    el.requestFullscreen();
    fullscreenState = true;
  } else if (el.mozRequestFullScreen) { // Firefox
    console.log("FIREFOX")
    el.mozRequestFullScreen();
    fullscreenState = true;
  } else if (el.msRequestFullscreen) { // IE / Edge
    console.log("EDGE")
    el.msRequestFullscreen();
    fullscreenState = true;
  }
}

// **ESC - 關閉修改頁面Dialog視窗**
var closeDialogWindow = function(that) {
  const parts = that.$route.path.split('/').map(s => s.trim());
  // 確認路徑為/edit/:pathnow
  if (parts.length == 3 && parts[1] == "edit") {
    if (that.componentItem['dialog']) that.closeComponent();
    if (that.bgItem["dialog"]) that.closeBackground();
    if (that.headerbarItem['dialog']) that.closeHeaderbar();
    if (that.navbarItem['dialog']) that.closeNavbar();
  }
}

// **Del - 刪除**
var deleteItems = function(that) {
  var that = getVueInfo()
  if (that.selectcomponent_list.length > 0) {
    for (let i in that.selectcomponent_list) {
      // 過濾鎖定組件
      if (!that.selectcomponent_list[i].lock) {
        var targetId = that.selectcomponent_list[i]['id']
        that.svg_nodes = that.svg_nodes.filter(item => {
          // 删除组件nodes的id
          if (item.type === "Group" && Array.isArray(item.nodes)) {
            item.nodes = item.nodes.filter(node => node.id !== targetId);
            return item.nodes.length > 0 && item.id !== targetId;
          }
          return item.id !== targetId; // 删除组件
        });
      }
    }
    saveHistory(); // 刪除組件結束後保存
    that.changeEmap("Delete - 刪除組件");
    console.log("刪除:", that.selectcomponent_list, that.svg_nodes);
    that.selectcomponent_list = [];
  }
}

// **Ctrl + Z - 上一步**
var undo = function(that) {
  if (historyIDX > 0) {  // 確保可以執行上一步
    historyIDX--;  // 移動到上一個狀態
    that.svg_nodes = JSON.parse(save_history[historyIDX]);  // 讀取上一步的狀態
    console.log("上一步");
    that.changeEmap("Ctrl + Z - 上一步");
  } else {
    that.addSnackbar("已經是最後一步，無法再上一步", "red");
    console.log("已經是第一步，無法再上一步");
    that.Setup.editCount = 0;  // 取消編輯狀態
  }
}

// **Ctrl + Y - 下一步**
var redo = function(that) {
  if (historyIDX < save_history.length - 1) {  // 確保可以執行下一步
    historyIDX++;  // 移動到下一個狀態
    that.svg_nodes = JSON.parse(save_history[historyIDX]);  // 讀取下一步的狀態
    console.log("下一步");
    that.changeEmap("Ctrl + Y - 下一步");
  } else {
    that.addSnackbar("已經是最後一步，無法再下一步", "red");
    console.log("已經是最後一步，無法再下一步");
  }
}

// **Ctrl + C - 複製**
var copyItems = function(type) {
  var that = getVueInfo()
  pastedTimes = 0
  copy_items = []
  copy_items = that.selectcomponent_list.filter(item => !item.lock).map(item => ({ ...item })); // 深拷貝 (過濾鎖定組件)
  console.log("複製:", copy_items);
  that.addSnackbar(type == 'ctrl_c' ? "鍵盤動作 -> Ctrl + C - 複製組件" : "複製組件");
}

// **Ctrl + V - 貼上**
var pasteItems = function(type) {
  if (copy_items.length == 0) return; // 沒有複製的項目，則不執行貼上
  var that = getVueInfo()
  pastedTimes ++
  const svgBox = getSVGRect();
  const svgWidth = svgBox.width;    // SVG 寬度
  const svgHeight = svgBox.height;  // SVG 高度
  const pastedItemsData = JSON.parse(JSON.stringify(copy_items)); // 深拷貝複製的項目

  const finalPastedItems = pastedItemsData.map(item => {
    // --- 計算理想的偏移後位置 ---
    let idealX = item.n_x + (pastedTimes * 30);
    let idealY = item.n_y + (pastedTimes * 20);

    // --- 邊界限制 ---
    // 確保左邊界不小於 0
    idealX = Math.max(0, idealX);
    // 確保右邊界不超過 svgWidth
    // 如果 idealX 加上寬度超出了，將 idealX 設為能容納寬度的最大值
    if (idealX + item.width > svgWidth) {
      idealX = Math.max(0, svgWidth - item.width); // 確保 x 不會因寬度限制變為負數
    }

    // 確保上邊界不小於 0
    idealY = Math.max(0, idealY);
    // 確保下邊界不超過 svgHeight
    if (idealY + item.height > svgHeight) {
      idealY = Math.max(0, svgHeight - item.height); // 確保 y 不會因高度限制變為負數
    }
    // --- 創建新項目 ---
    let newItem = {
      ...item,
      id: crypto.randomUUID(), // Math.floor(Math.random() * 10000000),
      n_x: idealX, // 使用限制後的 X
      n_y: idealY, // 使用限制後的 Y
    };

    // --- 如果是 Group，遞歸處理子節點 ---
    if (newItem.type === "Group" && Array.isArray(newItem.nodes)) {
      // 計算應用於子節點的【實際】偏移量
      // 子節點的偏移應該基於父 Group 【實際】的偏移量
      const actualDx = newItem.n_x - item.n_x; // 父 Group 實際 X 偏移
      const actualDy = newItem.n_y - item.n_y; // 父 Group 實際 Y 偏移

      newItem.nodes = newItem.nodes.map(node => {
        // 計算子節點的理想新位置
        let idealNodeX = node.n_x + actualDx;
        let idealNodeY = node.n_y + actualDy;
        // 子節點也進行邊界限制
        idealNodeX = Math.max(0, idealNodeX);
        if (idealNodeX + node.width > svgWidth) {
          idealNodeX = Math.max(0, svgWidth - node.width);
        }
        idealNodeY = Math.max(0, idealNodeY);
        if (idealNodeY + node.height > svgHeight) {
          idealNodeY = Math.max(0, svgHeight - node.height);
        }
        return {
          ...node,
          id: crypto.randomUUID(), // Math.floor(Math.random() * 10000000),
          n_x: idealNodeX, // 使用限制後的子節點 X
          n_y: idealNodeY, // 使用限制後的子節點 Y
        };
      });
    }
    return newItem;
  });
  for (let i in finalPastedItems) {
    setTypeCount(finalPastedItems[i]);
    that.svg_nodes.push(finalPastedItems[i]);
  }
  that.selectcomponent_list = finalPastedItems
  console.log("貼上:", finalPastedItems);
  saveHistory();
  that.changeEmap("Ctrl + V - 貼上組件");
}

// **Ctrl + A - 全選**
var selectAllItems = function(that) {
  that.selectcomponent_list = that.svg_nodes;
  console.log("全選");
  that.addSnackbar("鍵盤動作 -> Ctrl + A - 組件全選");
}


// ======================================== 鍵盤參數Function ========================================
// 方向鍵移動判斷
function moveArrowItem(that, arrow, item, svgW, svgH) {
  if (item.lock == false) {
    that.changeEmap(`方向鍵: ${arrow}`, false);
    switch (arrow) {
      case "ArrowUp": 
        item.n_y -= 1; 
        item.n_y = Math.max(0, Math.min(svgH - item.height, item.n_y));
        break;
      case "ArrowDown": 
        item.n_y += 1; 
        item.n_y = Math.max(0, Math.min(svgH - item.height, item.n_y));
        break;
      case "ArrowLeft": 
        item.n_x -= 1; 
        item.n_x = Math.max(0, Math.min(svgW - item.width, item.n_x));
        break;
      case "ArrowRight": 
        item.n_x += 1; 
        item.n_x = Math.max(0, Math.min(svgW - item.width, item.n_x));
        break;
    }
  }
}

// 儲存當前狀態為歷史紀錄
var saveHistory = function() {
  var that = getVueInfo()
  let currentState = JSON.stringify(that.svg_nodes);
  if (historyIDX === -1 || save_history.length === 0) {
    save_history.push(currentState); // **存入第一個狀態**
    historyIDX = 0;
  } else {
    // **如果最新狀態與當前狀態相同，不存重複的狀態**
    if (save_history[historyIDX] !== currentState) {
      save_history = save_history.slice(0, historyIDX + 1); // **刪除未來的狀態**
      save_history.push(currentState);
      historyIDX++;
    }
  }
}

// 取得全螢幕狀態
var getFullscreenState = function() {
  return fullscreenState
}

// ======================================== 設定組件類型 Function ========================================
var setTypeCount = function(newComponentData) {
  var that = getVueInfo()
  const findMaxIndexForType = (type, nodes) => {
    let maxIndex = 0;
    const typePrefix = `${type}_`;
    function traverse(nodeList) {
      for (const node of nodeList) {
        if (node.type === type && node.idname && node.idname.startsWith(typePrefix)) {
          const parts = node.idname.split('_');
          if (parts.length === 2) {
            const index = parseInt(parts[1], 10);
            if (!isNaN(index) && index > maxIndex) maxIndex = index;
          }
        }
        if (node.type === 'Group' && Array.isArray(node.nodes)) traverse(node.nodes); // 遞歸處理Group內部節點
      }
    }
    traverse(nodes);
    return maxIndex;
  };
  // 組件設置 idname
  const newComponentType = newComponentData.type;
  const maxExistingIndex = findMaxIndexForType(newComponentType, that.svg_nodes);
  newComponentData.idname = `${newComponentType}_${maxExistingIndex + 1}`;
  // 組件是 Group => 內部組件設置 idname
  if (newComponentData.type === 'Group' && Array.isArray(newComponentData.nodes)) {
    const nodesForInnerLookup = [...that.svg_nodes, newComponentData]; // 包含新父組件
    newComponentData.nodes.forEach(innerNode => {
       const innerNodeType = innerNode.type;
       const maxInnerExistingIndex = findMaxIndexForType(innerNodeType, nodesForInnerLookup);
       innerNode.idname = `${innerNodeType}_${maxInnerExistingIndex + 1}`;
       nodesForInnerLookup.push(innerNode);
    });
  }
}


export {
  handleKeydown, 
  copyItems, 
  pasteItems, 
  deleteItems,
  saveHistory,
  getFullscreenState,
  setTypeCount
}