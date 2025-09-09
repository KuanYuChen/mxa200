
````markdown

# Joint Data Center (JDC) 數據監測中心

JDC 是一個專業的工業自動化資料收集系統，支援多種通訊協定從工業設備讀取資料，並提供完整的 Web API 管理介面。

## 系統概述

這是一個高可靠性的工業數據監測平台，專為中小型工業環境的設備監控和資料收集而設計。系統採用模組化架構，支援多協定通訊，具備完善的錯誤處理和自動重連機制。

## 核心功能特色

### 🌐 多協定支援
- **Modbus TCP/RTU**：支援讀取線圈、離散輸入、保持暫存器、輸入暫存器
- **SNMP**：支援 GetBulk 操作讀取多個 OID
- **統一介面**：透過相同的 API 管理不同協定的設備

### 🔄 高可靠性設計
- **自動重連**：連線中斷時自動重新建立連線
- **指數退避**：智能重試機制，避免過度負載
- **故障偵測**：即時監控連線狀態，自動標記離線設備
- **併發安全**：完整的鎖機制保護共享資源

### 📊 靈活的點位系統
- **大容量支援**：最大支援 300-1000 個虛擬點位（可調整）
- **多資料類型**：BOOL、INT、INT16、UINT16、FLOAT、STRING
- **虛擬點位運算**：支援 ADD、MUL、MIN、MAX、AVG、RANDOM 等運算
- **動態管理**：支援即時新增、修改、刪除點位

### ⚡ 精確排程系統
- **毫秒級精度**：基於時間戳的精確排程器
- **工作池並發**：根據 CPU 核心數自動調整工作者數量
- **任務隔離**：每個設備任務獨立執行，互不影響

### 🌐 完整的 Web API
- **設備管理**：新增、修改、刪除、啟停設備
- **點位管理**：查詢、更新虛擬點位配置
- **任務管理**：建立、修改任務排程
- **系統監控**：即時狀態查詢和系統資訊

### 📁 配置檔案分離
- **模組化配置**：設備、任務、點位分離管理
- **動態載入**：支援運行時重新載入配置
- **版本相容**：向下相容舊版配置檔案

## 技術架構

### 核心模組組成

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web API       │    │  排程系統        │    │  通訊客戶端      │
│  (webapi.go)    │    │ (workpool.go)   │    │ (modbus/snmp)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
         ┌─────────────────────────────────────────┐
         │        設定管理 (config.go)              │
         │  - DeviceProtocolConfig                 │
         │  - VirtualPoint                         │
         │  - PointerTaskConfig                    │
         └─────────────────────────────────────────┘
```

### 主要資料結構
- **`DeviceProtocolConfig`**：設備配置（IP、協定、連線參數）
- **`VirtualPoint`**：虛擬點位（資料點、運算規則）
- **`PointerTaskConfig`**：任務配置（讀取指令、執行間隔）
- **`ScheduledTask`**：排程任務（工作池執行單元）
- **`DeviceState`**：設備運行狀態（線上狀態、執行結果）

### 併發安全機制
- **資源保護**：使用 `sync.Mutex` 和 `sync.RWMutex` 保護共享資源
- **優雅關閉**：完整的關閉信號處理，避免資源洩漏
- **連線池管理**：安全的客戶端連線生命週期管理

## 系統需求與部署

### 系統需求
- **作業系統**：Linux (推薦 Ubuntu 18.04+)
- **Go 版本**：1.23.5+
- **記憶體**：最少 512MB，建議 1GB+
- **網路**：支援 TCP/UDP 通訊

### 主要相依套件
```go
require (
    github.com/gin-gonic/gin v1.10.0      // Web 框架
    github.com/goburrow/modbus v0.1.0     // Modbus 通訊
    github.com/gosnmp/gosnmp v1.40.0      // SNMP 通訊
    github.com/google/uuid v1.6.0         // UUID 生成
    github.com/mattn/go-sqlite3 v1.14.28  // SQLite 資料庫
)
```

### 檔案結構
```
plc_modbus_tcp_reader_wp/
├── main.go              # 主程式入口，系統初始化
├── config.go            # 配置檔案處理，資料結構定義
├── modbus_client.go     # Modbus TCP/RTU 客戶端
├── snmp_client.go       # SNMP 客戶端
├── webapi.go           # REST API 介面
├── workpool.go         # 任務排程與工作池
├── go.mod              # Go 模組定義
├── README.md           # 專案文件
├── devices.json        # 設備配置檔案
├── pttasks.json        # 任務配置檔案  
├── points.json         # 虛擬點位配置檔案
├── cfg/                # 配置檔案範例目錄
│   ├── 1/              # 配置範例 1
│   └── 2/              # 配置範例 2
├── gen/                # 程式碼產生工具
├── run/                # 執行檔案目錄
└── uuid/               # UUID 工具模組
```

## 編譯與執行

### 編譯程式
```bash
# 標準編譯
go build -o plc_reader .

# 編譯並設定版本資訊
go build -ldflags "-X main.Version=1.0.0 -X main.BuildTime=$(date +%Y-%m-%d_%H:%M:%S)" -o plc_reader .
```

### 執行程式
```bash
# 預設執行（產生 300 個點位）
./plc_reader

# 啟動後會看到：
# 2025/01/07 10:30:00 設定虛擬點位數量為: 300
# 2025/01/07 10:30:00 App Version: 1.0.0, Feature: standard, BuildTime: 2025-01-07_10:30:00
# 2025/01/07 10:30:00 Detected CPU Cores: 8, Start Worker Pool: 16
```

### Web API 服務
程式啟動後會在 **8081 埠** 提供 REST API 服務：
```
http://localhost:8081/api/sysinfo      # 系統資訊
http://localhost:8081/api/devices      # 設備管理
http://localhost:8081/api/points       # 點位管理
http://localhost:8081/api/tasks        # 任務管理
```

## API 介面文件

### 系統資訊 API
```bash
# 取得系統版本資訊
GET /api/sysinfo
Response: {"Version":"1.0.0","Module":"MXA-200"}
```

### 設備管理 API
```bash
# 列出所有設備
GET /api/devices

# 新增設備
POST /api/devices
Body: {
  "name": "PLC001",
  "ip": "192.168.1.100", 
  "port": 502,
  "protocol": "modbus_tcp",
  "enable": true
}

# 修改設備
PUT /api/devices/{name}

# 刪除設備  
DELETE /api/devices/{name}

# 啟動設備
POST /api/devices/{name}/start

# 停止設備
POST /api/devices/{name}/stop
```

### 點位管理 API
```bash
# 取得所有點位狀態
GET /api/points

# 取得點位即時值
GET /api/vpoints  

# 取得指定點位
GET /api/points/{uuid}

# 修改點位設定
PUT /api/points/{uuid}

# 刪除點位
DELETE /api/points/{uuid}

# 取得可用點位
GET /api/avpoints?count=10
```

### 任務管理 API  
```bash
# 列出所有任務
GET /api/tasks

# 新增任務
POST /api/tasks
Body: {
  "name": "ReadHoldingRegisters",
  "function": "read_holding_registers",
  "address": 0,
  "quantity": 10,
  "interval_ms": 1000,
  "device_uuid": "device-uuid-here",
  "slaveid": 1
}

# 修改任務
PUT /api/tasks/{uuid}

# 刪除任務
DELETE /api/tasks/{uuid}

# 取得指定任務
GET /api/tasks/{uuid}
```

## 配置檔案說明

### devices.json - 設備配置
```json
[
  {
    "name": "PLC001",
    "ip": "192.168.1.100",
    "port": 502,
    "protocol": "modbus_tcp", 
    "enable": true,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "timeout": 1000,
    "retry": 3,
    "interval": 1000
  }
]
```

### points.json - 虛擬點位配置
```json
[
  {
    "uuid": "point-uuid-1",
    "enable": true,
    "protocol": "modbus_tcp", 
    "name": "溫度感測器_1",
    "description": "區域1溫度",
    "opt": "NONE",
    "realvalue": 25.6,
    "datatype": "FLOAT",
    "initvalue": 0.0,
    "online": true,
    "ptuuids": []
  }
]
```

### pttasks.json - 任務配置
```json
[
  {
    "name": "ReadTemperature",
    "function": "read_holding_registers",
    "address": 0,
    "quantity": 1,
    "interval_ms": 1000,
    "device_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "ptuuids": ["point-uuid-1"],
    "slaveid": 1
  }
]
```

## 疑難排解

### 常見問題與解決方法

#### 🔧 系統啟動問題
**問題：無法啟動服務**
```bash
# 檢查埠號佔用
netstat -tulpn | grep :8081

# 檢查配置檔案
ls -la devices.json pttasks.json points.json

# 檢查檔案權限
chmod 644 *.json
```

**問題：配置檔案載入失敗**
```bash
# 檢查 JSON 格式
cat devices.json | jq .
cat points.json | jq .

# 重新產生預設配置
rm *.json
./plc_reader
```

#### 🌐 連線問題
**問題：Modbus TCP 連線失敗**
- 檢查目標設備 IP 和埠號
- 確認防火牆設定
- 檢查 Slave ID 設定

**問題：SNMP 連線失敗**  
- 驗證 Community 字串
- 檢查 SNMP 服務是否啟用
- 確認 OID 路徑正確

#### 💾 記憶體與效能
**問題：記憶體使用過高**
```bash
# 檢查記憶體使用
free -h
top -p $(pgrep plc_reader)

# 調整點位數量
# 編輯 main.go 中的 MaxPointer 變數
```

**問題：CPU 使用率高**
- 調整任務執行間隔（interval_ms）
- 減少併發工作者數量
- 檢查是否有頻繁的錯誤重試

#### 📊 資料收集問題
**問題：資料更新不正常**
```bash
# 檢查設備線上狀態
curl http://localhost:8081/api/devices

# 檢查即時點位值
curl http://localhost:8081/api/vpoints

# 檢查系統日誌
tail -f app.log
```

### 系統監控建議

#### 日誌監控
```bash
# 監控系統日誌
tail -f /path/to/app.log | grep "ERROR\|WARN"

# 檢查連線狀態
grep "連線.*失敗" /path/to/app.log
```

#### 效能監控
```bash
# CPU 和記憶體使用率
top -p $(pgrep plc_reader)

# 網路連線狀態
netstat -an | grep :502  # Modbus TCP
netstat -an | grep :161  # SNMP
```

## 進階使用

### 自訂協定擴展
系統採用模組化設計，可以輕鬆擴展新的通訊協定：

1. **新增協定客戶端**：建立新的 `*_client.go` 檔案
2. **實作標準介面**：實作 `Run*Task()` 函數
3. **註冊協定**：在 `workpool.go` 中添加協定判斷

### 大規模部署
針對大型工業環境的部署建議：

- **負載均衡**：使用多個實例分散設備連線
- **資料儲存**：整合 InfluxDB 或 TimescaleDB
- **監控告警**：結合 Prometheus + Grafana
- **高可用性**：設定主備模式和故障切換

### 客製化開發
```go
// 自訂虛擬點位運算
func CustomCalculation(point *VirtualPoint, sourceValues []interface{}) interface{} {
    // 實作自訂運算邏輯
    return result
}

// 自訂任務類型
func RunCustomTask(config CustomConfig) (map[string]interface{}, error) {
    // 實作自訂任務邏輯
    return resultMap, nil
}
```

## 開發資訊

### 技術規格
- **Go 版本**：1.23.5+ (建議使用最新穩定版)
- **架構支援**：Linux x64, ARM64  
- **網路協定**：TCP, UDP, Serial
- **資料格式**：JSON, Binary
- **API 風格**：RESTful

### 主要技術特點

#### 🏗️ 架構設計
- **模組化設計**：清晰的職責分離，易於擴展
- **插件式協定**：支援動態添加新的通訊協定  
- **無狀態 API**：RESTful 設計，支援水平擴展
- **配置驅動**：透過配置檔案控制系統行為

#### 🔒 安全特性  
- **併發安全**：完整的 mutex 保護機制
- **資源管理**：自動連線池管理，防止資源洩漏
- **錯誤隔離**：單一設備故障不影響其他設備
- **優雅關閉**：安全的系統關閉流程

#### ⚡ 效能最佳化
- **長連線重用**：減少連線建立開銷
- **智能重試**：指數退避算法避免系統過載
- **緩存機制**：即時資料緩存提升查詢效率
- **併發控制**：根據硬體資源動態調整工作者數量

### 潛在改進建議

#### 📈 監控與可觀測性
- **結構化日誌**：整合 logrus 或 zap 提升日誌品質
- **指標收集**：加入 Prometheus 指標，支援 Grafana 視覺化
- **分散式追蹤**：整合 Jaeger 或 Zipkin 進行請求追蹤
- **健康檢查**：提供 `/health` 端點支援負載均衡器

#### 💾 資料處理增強
- **時序資料庫**：整合 InfluxDB 或 TimescaleDB 儲存歷史資料
- **批量操作**：支援批量讀寫，提升大規模部署效率
- **資料驗證**：加強輸入驗證和資料完整性檢查
- **壓縮傳輸**：支援 gzip 壓縮減少網路頻寬

#### 🔐 安全性強化
- **身份認證**：加入 JWT 或 OAuth2 認證機制
- **傳輸加密**：支援 HTTPS 和 TLS 加密通訊
- **存取控制**：實作 RBAC (角色基存取控制)
- **稽核日誌**：記錄所有操作行為，支援合規要求

#### 📋 API 文件化
- **OpenAPI 規格**：生成標準的 API 文件
- **Swagger UI**：提供互動式 API 測試介面
- **SDK 生成**：自動產生多語言 SDK
- **版本管理**：API 版本化支援向下相容

### 部署方案

#### 🐳 容器化部署
```dockerfile
FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o plc_reader .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/plc_reader .
CMD ["./plc_reader"]
```

#### 📊 監控整合
```yaml
# docker-compose.yml
version: '3.8'
services:
  plc-reader:
    build: .
    ports:
      - "8081:8081"
  
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

### 貢獻指南

#### 開發環境設置
```bash
# 克隆專案
git clone https://github.com/KuanYuChen/jdc.git
cd jdc

# 安裝相依套件
go mod download

# 執行測試
go test ./...

# 執行程式
go run main.go config.go modbus_client.go snmp_client.go webapi.go workpool.go
```

#### 程式碼風格
- 遵循 Go 官方程式碼風格指南
- 使用 `gofmt` 格式化程式碼  
- 使用 `golint` 進行程式碼檢查
- 撰寫單元測試，保持測試覆蓋率 > 80%

## 版權與授權

### 專案資訊
- **專案名稱**：Joint Data Center (JDC)
- **版本**：1.0.0
- **作者**：KuanYuChen
- **儲存庫**：https://github.com/KuanYuChen/jdc

### 使用場景
適用於以下工業自動化場景：
- **工廠監控**：生產線設備資料收集
- **樓宇自動化**：HVAC、照明、安防系統整合  
- **能源管理**：電力、水務、燃氣監控
- **環境監測**：溫濕度、空氣品質、噪音監測
- **設施管理**：數據中心、醫院、學校設備監控

### 技術支援
如有技術問題或建議，歡迎透過以下方式聯繫：
- **Issues**：https://github.com/KuanYuChen/jdc/issues
- **Discussions**：https://github.com/KuanYuChen/jdc/discussions

---

## 結論

JDC 是一個設計良好的工業自動化資料收集系統，具有以下核心優勢：

✅ **架構清晰**：模組化設計，職責分明，易於維護和擴展  
✅ **可靠性高**：完善的錯誤處理、自動重連和故障恢復機制  
✅ **擴展性佳**：支援多協定，易於添加新功能和自訂擴展  
✅ **併發安全**：正確使用鎖機制，保護共享資源的併發存取  
✅ **使用者友善**：提供完整的 REST API 和詳盡的文件說明

系統特別適合用於中小型工業環境的設備監控和資料收集場景，通過持續的最佳化和功能擴展，能夠滿足不斷增長的工業自動化需求。

````
