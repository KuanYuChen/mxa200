import { saveHistory } from "./keyboard";
// ======================================= 操作選單 =======================================
// ============================= 組件層級設定 (最上層/最下層) =============================
// nodes: 畫布上所有組件的列表
// itemToMove: 要移動的組件
// direction: 動作類型 (front: 上移 / back: 下移)
var bringSelectedItems = function(nodes, itemToMove, direction) {
  if (!nodes || !itemToMove || itemToMove.length === 0) return [...nodes];
  const selectedIds = new Set(itemToMove.map(item => item.id));
  const otherItems = [];
  const selectedItemsInOrder = []; // 保持選中項之間的相對順序
  for (const node of nodes) {
      if (selectedIds.has(node.id) && !node.lock) selectedItemsInOrder.push(node);
      else otherItems.push(node);
  }
  return direction == "front" ? [...otherItems, ...selectedItemsInOrder] : [...selectedItemsInOrder, ...otherItems];
}

// ============================= 組件層級設定 (上一層/下一層) =============================
// nodes: 畫布上所有組件的列表
// itemToMoves: 要移動的組件(多選)
// direction: 動作類型 (up: 上移 / down: 下移)
var moveItemsByOverlap = function(that, nodes, itemsToMove, direction) {
  var move = [...itemsToMove]
  if (!nodes || !move.length || (direction !== 'up' && direction !== 'down')) return null;
  const { x: offsetX, y: offsetY, scale: offsetScale } = that.svgOffset;
  // 計算群組的整體邊界框（最小包含矩形）
  const groupBox = move.reduce((box, item) => {
    const left = (item.n_x - offsetX) * offsetScale;
    const top = (item.n_y - offsetY) * offsetScale;
    const right = (item.n_x + item.width - offsetX) * offsetScale;
    const bottom = (item.n_y + item.height - offsetY) * offsetScale;
    return {
      left: Math.min(box.left, left),
      top: Math.min(box.top, top),
      right: Math.max(box.right, right),
      bottom: Math.max(box.bottom, bottom)
    };
  }, {
    left: Infinity,
    top: Infinity,
    right: -Infinity,
    bottom: -Infinity
  });
  // 找到 move 的索引位置（並排序）
  const indicesToMove = move.map(item => nodes.findIndex(node => node.id === item.id))
    .filter(index => index !== -1).sort((a, b) => a - b);
  if (indicesToMove.length !== move.length) return null;

  // 找到可重疊的目標元件
  const coverNodes = nodes.filter((node, index) => {
    if (indicesToMove.includes(index)) return false;
    if (direction === 'down') {
      if (index >= Math.min(...indicesToMove)) return false;
    } else {
      if (index <= Math.max(...indicesToMove)) return false;
    }
    const scaledItem = {
      left: (node.n_x - offsetX) * offsetScale,
      top: (node.n_y - offsetY) * offsetScale,
      right: (node.n_x + node.width - offsetX) * offsetScale,
      bottom: (node.n_y + node.height - offsetY) * offsetScale
    };
    return (
      scaledItem.left < groupBox.right &&
      scaledItem.right > groupBox.left &&
      scaledItem.top < groupBox.bottom &&
      scaledItem.bottom > groupBox.top
    );
  });

  if (!coverNodes.length) return null;
  const targetNode = direction === 'down' ? coverNodes[coverNodes.length - 1] : coverNodes[0];
  const targetIndex = nodes.findIndex(n => n.id === targetNode.id);
  if (targetIndex === -1) return null;

  // --- 執行移動 ---
  const newNodes = [...nodes];
  // 先根據索引將項目移除
  const movingItems = indicesToMove.map(i => newNodes[i]);
  // 反向排序，從後往前刪才不會影響索引
  indicesToMove.slice().reverse().forEach(index => newNodes.splice(index, 1));

  // 根據方向決定插入位置（需重新找目標 index）
  const refreshedTargetIndex = newNodes.findIndex(n => n.id === targetNode.id);
  const insertIndex = direction === 'down' ? refreshedTargetIndex : refreshedTargetIndex + 1;
  newNodes.splice(insertIndex, 0, ...movingItems.map(item => ({ ...item }))); // 保證 Vue 識別為新物件
  return newNodes;
}

// 組件均分(水平/垂直)
var distributedAlignment = function(that, direction) {
  if (that.selectcomponent_list.length < 2) {
    that.addSnackbar("請至少選擇2個組件", "red");
    return;
  }
  const positionAxis = (direction === 'horizontal') ? 'n_x' : 'n_y';
  const dimensionAxis = (direction === 'horizontal') ? 'width' : 'height';

  // 组件範圍
  var filter_lock = [...that.selectcomponent_list].filter(item => !item.lock)
  let sortedList = filter_lock.map(item => {
    let min_val, dimension;
    if (item.type === "Group") {
      min_val = Math.min(...item.nodes.map(n => n[positionAxis]));
      let max_val = Math.max(...item.nodes.map(n => n[positionAxis] + n[dimensionAxis]));
      dimension = max_val - min_val;
    } else {
      min_val = item[positionAxis];
      dimension = item[dimensionAxis];
    }
    const center = min_val + dimension / 2;
    return { ...item, min_val, dimension, center };
  });

  // 按中心點排序
  sortedList.sort((a, b) => a.center - b.center);
  let firstCenter = sortedList[0].center;
  let lastCenter = sortedList[sortedList.length - 1].center;
  let spaceCount = sortedList.length - 1;
  let totalSpan = lastCenter - firstCenter;
  if (spaceCount <= 0 || totalSpan <= 0) return;
  let gapBetweenCenters = totalSpan / spaceCount;
  // 依據新的中心點重新計算位置
  for (let i = 0; i < sortedList.length; i++) {
    let item = sortedList[i];
    let newCenter = firstCenter + i * gapBetweenCenters;
    let delta = newCenter - item.center;
    item[positionAxis] = item.min_val + delta; // 新的位置
    if (item.type === "Group") item.nodes.forEach(node => node[positionAxis] += delta);
  }
  // 同步更新
  that.selectcomponent_list.forEach(selectedItem => {
    let updatedItem = sortedList.find(s => s.id === selectedItem.id);
    if (updatedItem) Object.assign(selectedItem, updatedItem);
  });
  saveHistory();
  that.changeEmap(`組件${direction === 'horizontal' ? '水平' : '垂直'}分散對齊`);
};

// 組件置中(水平/垂直)
var centerComponents = function(that, direction) {
  if (that.selectcomponent_list.length < 2) {
    that.addSnackbar("請至少選擇2個組件", "red"); 
    return;
  }
  const positionAxis = (direction === 'horizontal') ? 'n_x' : 'n_y';
  const dimensionAxis = (direction === 'horizontal') ? 'width' : 'height';
  // 用來記錄所有元素中線的總和與數量
  let totalCenter = 0;
  let count = 0;
  // 計算全部元件（包括 group）中心平均
  that.selectcomponent_list.forEach(item => {
    if (item.lock) return;
    if (item.type === 'Group' && Array.isArray(item.nodes)) {
      totalCenter += (item[positionAxis] + item[dimensionAxis] / 2);
      count += 1;
    } else {
      totalCenter += (item[positionAxis] + item[dimensionAxis] / 2);
      count += 1;
    }
  });

  if (count === 0) return;
  const centerPos = totalCenter / count;
  // 調整每個元件或 group 的位置
  that.selectcomponent_list.forEach(item => {
    if (item.lock) return;
    const currentCenter = item[positionAxis] + item[dimensionAxis] / 2;
    const offset = centerPos - currentCenter;
    // 群組：整體平移 + 群組內子元件跟著移動
    if (item.type === 'Group' && Array.isArray(item.nodes)) {
      item[positionAxis] += offset;
      item.nodes.forEach(child => { child[positionAxis] += offset });
    } else item[positionAxis] += offset; // 單一元件
  });
  saveHistory();
  that.changeEmap(`元件${direction === 'horizontal' ? '水平' : '垂直'}置中`);
}

// 設定組件固定位置(靠左/右/上/下對齊)
var setItemPosition = function(that, position) {
  if (that.selectcomponent_list.length < 2) {
    that.addSnackbar("請至少選擇2個組件", "red");
    return;
  }
  var filter_lock = [...that.selectcomponent_list].filter(item => !item.lock)
  let minX = Math.min(...filter_lock.map(it => it.n_x));
  let maxX = Math.max(...filter_lock.map(it => it.n_x + it.width));
  let minY = Math.min(...filter_lock.map(it => it.n_y));
  let maxY = Math.max(...filter_lock.map(it => it.n_y + it.height));

  for (let i in filter_lock) {
    let targetX = filter_lock[i].n_x, targetY = filter_lock[i].n_y;
    if (["top", "bottom", "left", "right"].includes(position)) {
      if (position === "left")   targetX = minX;
      if (position === "right")  targetX = maxX - filter_lock[i].width;
      if (position === "top")    targetY = minY;
      if (position === "bottom") targetY = maxY - filter_lock[i].height;
      // 計算平移量
      let deltaX = targetX - filter_lock[i].n_x;
      let deltaY = targetY - filter_lock[i].n_y;
      // 如果是群組，則平移內部 nodes
      if (filter_lock[i].type === "Group" && filter_lock[i].nodes) {
        filter_lock[i].nodes.forEach(node => {
          node.n_x += deltaX;
          node.n_y += deltaY;
        })
      }
      filter_lock[i].n_x = targetX;
      filter_lock[i].n_y = targetY;
    } 
    // else {
    //   let cx = target_cx - filter_lock[i].width / 2;
    //   let cy = target_cy - filter_lock[i].height / 2;
    //   cx = Math.max(0, Math.min(w - filter_lock[i].width, cx));
    //   cy = Math.max(0, Math.min(h - filter_lock[i].height, cy));
    //   filter_lock[i].n_x = cx;
    //   filter_lock[i].n_y = cy;
    // }
  }
  saveHistory();
  that.changeEmap("設定組件位置");
};

// 組件照SVG大小均分(水平/垂直) (目前沒用到)
// var distributeEvenly = function(that, direction) {
//   if (that.selectcomponent_list.length < 2) {
//     that.addSnackbar("請至少選擇2個組件", "red");
//     return;
//   }
//   const positionAxis = (direction === 'horizontal') ? 'n_x' : 'n_y';
//   const dimensionAxis = (direction === 'horizontal') ? 'width' : 'height';
  
//   let svgDimension = that.initViewBox[dimensionAxis]; // SVG寬度
//   let sortedList = [...that.selectcomponent_list].sort((a, b) => a[positionAxis] - b[positionAxis]);
//   let totalDimension = sortedList.reduce((sum, item) => sum + item[dimensionAxis], 0);
//   let spaceCount = sortedList.length - 1; // 組件間距數量
//   let totalSpace = svgDimension - totalDimension;
//   if (spaceCount <= 0 || totalSpace <= 0) return;
//   let gapSize = totalSpace / spaceCount; // 計算組件間距

//   let currentValue = 0; // 從最左側開始
//   for (let i = 0; i < sortedList.length; i++) {
//     let item = sortedList[i];
//     let deltaValue = currentValue - item[positionAxis]; // 計算偏移量
//     item[positionAxis] += deltaValue; // 更新組件位置
//     if (item.type === "Group") item.nodes.forEach(node => node[positionAxis] += deltaValue); // 同步移動群組內部組件
//     currentValue += item[dimensionAxis] + gapSize; // 更新下一個組件的起點
//   }
//   saveHistory();
//   that.addSnackbar(`組件${direction === 'horizontal' ? '水平' : '垂直'}均分`);
//   that.changeEmap(`組件${direction === 'horizontal' ? '水平' : '垂直'}均分`);
// };


export {
  // 操作選單函數
  bringSelectedItems,
  moveItemsByOverlap,
  distributedAlignment,
  centerComponents,
  setItemPosition,
}