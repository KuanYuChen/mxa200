// ========================= 通用Function =========================
// 文字框為只限數字時禁止輸入 e、E、+、-
var blockInvalidKeys = function(ev) {
  if (['e', 'E', '+', '-'].includes(ev.key)) ev.preventDefault();
}


var blockSNMPInvalidKeys = function(ev) {
  // SNMP協議的地址只能是數字和點號
  if (!/^\d*\.?\d*$/.test(ev.key) && ev.key !== 'Backspace' && ev.key !== 'Delete' && ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') {
    ev.preventDefault();
  }
}


/**
 * 整合轉換時間方式
 * @param   {Date}    date                              - 日期
 * @param   {string}  [format = "YYYY-MM-DD hh:mm:ss"]  - 時間格式
 * @param   {boolean} [useUTC = false]                  - 是否啟用UTC
 * @returns {string}  - 轉換後的日期格式
 */
var formatDate = function(date, format = "YYYY-MM-DD hh:mm:ss", useUTC = false) {
  if (!(date instanceof Date)) date = new Date(date); // 若不是 Date 物件，嘗試轉換
  const pad = n => String(n).padStart(2, "0");

  // 根據 useUTC 選擇取值方式
  const year   = useUTC ? date.getUTCFullYear()  : date.getFullYear();
  const month  = useUTC ? date.getUTCMonth() + 1 : date.getMonth() + 1;
  const day    = useUTC ? date.getUTCDate()      : date.getDate();
  const hour   = useUTC ? date.getUTCHours()     : date.getHours();
  const minute = useUTC ? date.getUTCMinutes()   : date.getMinutes();
  const second = useUTC ? date.getUTCSeconds()   : date.getSeconds();

  const map = {
    YYYY: year, MM: pad(month), DD: pad(day),
    hh: pad(hour), mm: pad(minute), ss: pad(second),
  };

  // ISO 標準格式: YYYY-MM-DDThh:mm:ssZ
  if (format === "ISO") return `${map.YYYY}-${map.MM}-${map.DD}T${map.hh}:${map.mm}:${map.ss}Z`;

  return format.replace(/YYYY|MM|DD|hh|mm|ss/g, match => map[match]);
}


// 檢查字串是否為有效的 Email
var isValidEmail = function(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// 檢查字串是否為有效的手機號碼
var isValidMobile = function(phone) {
  return /^09\d{8}$/.test(phone);
}


// 檢查市話號碼
var isValidTelphone = function(phone) {
  // 移除非數字字元（例如括號、空格、-）
  const cleaned = phone.replace(/[^\d]/g, '');
  // 台灣市話通常區碼為 2~3 碼，號碼為 6~8 碼
  const regex = /^0\d{1,2}\d{6,8}$/;
  return regex.test(cleaned);
}


// IPv4 驗證（0.0.0.0 ~ 255.255.255.255）
var isValidIPv4 = function(ip) {
  return /^((25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(25[0-5]|2[0-4]\d|1?\d{1,2})$/.test(ip);
}


// MAC驗證 
var isValidMAC = function(mac) {
  return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(mac) || /^[0-9A-Fa-f]{12}$/.test(mac);
}


var isUuid = function(str) {
  if (typeof str !== 'string' || str.trim() === '') return false;
  return /^[a-f\d]{8}-([a-f\d]{4}-){3}[a-f\d]{12}$/i.test(str);
}


// 統一表單驗證用
var validType = function() {
  return {
    required: (v) => !!v || '此欄位為必填',
    email:  (v) => !v || isValidEmail(v) || '請輸入正確的Email格式',
    mobile: (v) => !v || isValidMobile(v) || '請輸入正確的手機號碼格式 (09XXXXXXXX)',
    telephone: (v) => !v || isValidTelphone(v) || '請輸入正確的市話格式',
    ipv4: (v) => !v || isValidIPv4(v) || '請輸入正確的IP格式',
    mac: (v) => !v || isValidMAC(v) || '請輸入正確的MAC格式',
  }
}


// 字串轉為布林值（支援 "true", "false", "1", "0"）
var toBoolean = function(str) {
  return ['true', '1'].includes(String(str).toLowerCase());
}


// 防止函式被頻繁觸發（如輸入框或scroll事件）
var debounce = function(func, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}


// 節流函式：在特定時間內最多只執行一次
var throttle = function(func, limit = 300) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}


// 數字補零
var padZero = function(num, length = 2) {
  return String(num).padStart(length, '0');
}


// 是否為空值
var isEmpty = function(val) {
  return (
    val === null || val === undefined || (typeof val === 'string' && val.trim() === '') ||
    (Array.isArray(val) && val.length === 0) || (typeof val === 'object' && val !== null && Object.keys(val).length === 0)
  );
}


// 陣列去重（uniq）
var uniqArray = function(arr) {
  return [...new Set(arr)];
}


// 查找陣列中的物件
var findObjectByKey = function(arr, key, value) {
  return arr.find(item => item[key] === value) || null;
  // return arr.filter(item => item[key] === value); // 取得全部結果
}


// 遞迴Object並轉為列表 (包含UUID格式過濾)
var recursionOBJToArray = function(obj, excludedKeys = []) {
  let values = [];
  for (const key in obj) {
    // 確保是物件自身的屬性，而不是原型鏈上的
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (excludedKeys.includes(key)) continue; // 如果 key 在要排除的列表中，跳過
      const value = obj[key];
      // 如果值是物件且不是 null，就遞迴呼叫此函式
      if (typeof value === 'object' && value !== null) values = values.concat(recursionOBJToArray(value, excludedKeys));
      else { if (!isUuid(value)) values.push(value) }
    }
  }
  return values;
}


var generateUUID = function() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8); // RFC4122 v4
    return v.toString(16);
  });
}

/**
 * 智慧更新資料，保留參數狀態 (主要應用於參數更新時的UI更新問題)
 * 會根據 uniqueKey 檢查 target 陣列中是否已有項目：
 *  - 如果存在則更新原有項目的屬性（不會替換整個物件引用）。
 *  - 如果不存在則新增項目。
 * @param   {Object[]}  target    - 目標資料陣列（會被直接修改）
 * @param   {string}    uniqueKey - 用來判斷唯一性的屬性名稱
 * @param   {Object[]}  newItems  - 要合併進 target 的新資料陣列
 */
var updateDataSmartly = function(target, uniqueKey, newItems) {
  const itemsMap = new Map(target.map(item => [item[uniqueKey], item]));
  newItems.forEach(newItem => {
    const existingItem = itemsMap.get(newItem[uniqueKey]);
    if (existingItem) {
      // 只更新屬性，不替換整個物件引用
      Object.assign(existingItem, newItem);
    } else {
      // 如果是全新資料，則加入
      target.push(newItem);
    }
  });
}


// ========================= 點位設定用 =========================
/**
 * 查詢是否有 ${點位名稱} 的格式文字並取代為實際點位數值
 * @param   {string}    str           - 原始字串，可能包含 ${點位名稱} 格式的佔位符
 * @param   {Object}    dataObj       - key-value 對應表
 * @returns {object}                  - 包含替換結果與原始資訊
 */
var replacePlaceholders = function(str, dataObj) {
  const matches = [...str.matchAll(/\$\{([^{}]+)\}/g)];
  const usedKeys = matches.map(match => match[1]);
  const undefinedKeys = usedKeys.filter(key => !(key in dataObj));
  const usedValues = [];

  let replaced = str;
  usedKeys.forEach(key => {
    if (key in dataObj) {
      usedValues.push(dataObj[key]);
      replaced = replaced.replaceAll(`\${${key}}`, dataObj[key]);
    }
  });

  return {
    replacedText: replaced,           // 替換後的字串
    usedKeys: [...new Set(usedKeys)], // 用到的 key
    usedValues,                       // 用到的 value
    undefinedKeys                     // 沒找到的 key
  };
}

/**
 * 查詢是否有 ${點位名稱} 的格式文字並取代為${P}
 * @param   {string}    str           - 原始字串，包含 ${點位名稱} 格式的佔位符
 * @returns {string}                  - 替換結果文字
 */
var replacePointText = function(str) {
  var matches = [...str.matchAll(/\$\{([^{}]+)\}/g)];
  const usedKeys = matches.map(match => match[1]);
  usedKeys.forEach(key => {
    if (key != 'R') str = str.replaceAll(`\${${key}}`, '${P}');  // 在編輯頁面 若為${點位名稱}則顯示${P}
  });
  return str; // 在編輯頁面 顯示原始文字
}

// ========================= LocalStorage 暫存Function (在沒有API的情況下才會使用) =========================
var saveToLocalStorage = function(key, value) {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem(key, json);
  } catch (e) {
    console.error('儲存到 localStorage 失敗:', e);
  }
}

var loadFromLocalStorage = function(key) {
  try {
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.error('讀取 localStorage 時解析失敗:', e);
    return null;
  }
}

var removeFromLocalStorage = function(key) {
  localStorage.removeItem(key);
  console.log("刪除localStorage 資料: ", key)
}



export {
  blockInvalidKeys, blockSNMPInvalidKeys, 
  formatDate, 
  isValidEmail, isValidMobile, isValidTelphone, isValidIPv4, isValidMAC, validType,
  toBoolean,
  debounce, throttle,
  padZero,
  isEmpty,
  uniqArray,
  generateUUID,
  findObjectByKey, recursionOBJToArray, updateDataSmartly,

  replacePlaceholders, replacePointText, // 點位設定用
  saveToLocalStorage, loadFromLocalStorage, removeFromLocalStorage // LocalStorage
}