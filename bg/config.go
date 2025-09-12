package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sort"
	"time"

	"github.com/google/uuid"
)

// =============================================================================
// 數據結構定義
// =============================================================================

// VirtualPoint 虛擬點結構 points.json
type VirtualPoint struct {
	Idx         int      `json:"idx"`                   // 陣列索引，用於標識此資料在陣列中的位置
	UUID        string   `json:"uuid"`                  // 系統生成的唯一識別碼（只讀）
	Enable      bool     `json:"enable"`                // 是否啟用：true/false
	Protocol    string   `json:"protocol"`              // 協定類型："vp" 固定值（虛擬點）
	Name        string   `json:"name"`                  // 點位顯示名稱
	Description string   `json:"description,omitempty"` // 點位說明描述
	Opt         string   `json:"opt"`                   // 運算操作：NONE/CDATE/CTIME/RANDOM/ADD/MUL/MIN/MAX/AVG/SUB/DIV
	RealValue   any      `json:"realvalue"`             // 當前實際值（系統自動更新）
	DataType    string   `json:"datatype"`              // 資料類型：BOOL/INT/INT16/UINT16/FLOAT/STRING
	InitValue   any      `json:"initvalue"`             // 點位初始值
	Correction  float64  `json:"correctionvalue"`       // 校正值（用於加總或乘數運算）
	SaveType    string   `json:"savetype"`              // 儲存類型：temp/keep
	RExpr       string   `json:"RExpr"`                 // 讀取運算表達式（預留功能）
	WExpr       string   `json:"WExpr"`                 // 寫入運算表達式（預留功能）
	Online      bool     `json:"online"`                // 線上狀態（系統自動更新，只讀）
	PTUUIDs     []string `json:"ptuuids"`               // 關聯的來源點UUID列表（可引用其他實體點或虛擬點）
}

// PointerTaskConfig 點位任務配置（使用工作來表示要執行的任務） pttasks.json
type PointerTaskConfig struct {
	Name         string   `json:"name"`                   // 任務名稱
	Function     string   `json:"function"`               // Modbus 功能碼（如 read_coils, read_holding_registers 等）
	Address      uint16   `json:"address,omitempty"`      // Modbus 起始地址
	Quantity     uint16   `json:"quantity,omitempty"`     // Modbus 讀取數量
	StartOID     string   `json:"start_oid,omitempty"`    // SNMP 起始 OID
	OIDnum       uint32   `json:"oid_num,omitempty"`      // SNMP OID 數量
	Community    string   `json:"community,omitempty"`    // SNMP Community（可在設備層級設定）
	Value        *bool    `json:"value,omitempty"`        // 寫入值（用於寫入操作）
	IntervalMs   int      `json:"interval_ms"`            // 執行間隔（毫秒）
	ProtocolUUID string   `json:"protocoluuid,omitempty"` // 關聯到設備的 UUID（相容舊版）
	PTUUIDs      []string `json:"ptuuids,omitempty"`      // 對應的虛擬點 UUID 列表
	TaskUUID     string   `json:"uuid,omitempty"`         // 任務本身的唯一識別碼
	SlaveID      int      `json:"slaveid,omitempty"`      // Modbus Slave ID（TCP/RTU 通用，預設 1）
}

// DeviceProtocolConfig 設備協定配置 debices.json
type DeviceProtocolConfig struct {
	Name      string              `json:"name"`                // 設備名稱
	IP        string              `json:"ip"`                  // 設備 IP 地址
	Port      int                 `json:"port"`                // 通訊埠號
	Protocol  string              `json:"protocol"`            // 通訊協定：modbus/snmp
	Community string              `json:"community,omitempty"` // SNMP Community 字串
	Enable    bool                `json:"enable"`              // 是否在開機時自動啟動
	UUID      string              `json:"uuid"`                // 設備唯一識別碼（用於與任務對應）
	Tasks     []PointerTaskConfig `json:"tasks"`               // 設備關聯的任務列表

	// Modbus RTU 序列埠參數
	SerialPort string `json:"com,omitempty"`      // 序列埠名稱（如 "COM3" 或 "/dev/ttyUSB0"）
	BaudRate   int    `json:"baudrate,omitempty"` // 鮑率（預設 9600）
	DataBits   int    `json:"databits,omitempty"` // 資料位元數（預設 8）
	Parity     string `json:"parity,omitempty"`   // 校驗位："N"(None),"E"(Even),"O"(Odd)，預設 "N"
	StopBits   int    `json:"stopbits,omitempty"` // 停止位元數（預設 1）

	// 連線參數
	Timeout  int `json:"timeout,omitempty"`  // 連線逾時時間（毫秒，預設 1000）
	Retry    int `json:"retry,omitempty"`    // 重試次數（預設 2）
	Interval int `json:"interval,omitempty"` // 輪詢間隔（毫秒，預設 1000）
}

// Config 主要配置結構
type Config struct {
	Devices []DeviceProtocolConfig `json:"devices"`          // 設備列表
	Points  []VirtualPoint         `json:"points,omitempty"` // 虛擬點列表
	Tasks   []PointerTaskConfig    `json:"tasks,omitempty"`  // 扁平化的任務清單
}

// ConnectionStatus 連線狀態資訊
type ConnectionStatus struct {
	FailureCount int       // 連線失敗次數
	LastError    string    // 最後一次錯誤訊息
	LastSuccess  time.Time // 最後成功連線時間
	IsOnline     bool      // 目前是否線上
}

// =============================================================================
// Points.json 相關操作
// =============================================================================

// LoadPoints 從檔案載入虛擬點配置，並根據 idx 欄位排序
func LoadPoints(path string) ([]VirtualPoint, error) {

	// 讀取 points.json
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	// decode 成 slice
	var pts []VirtualPoint
	if err := json.Unmarshal(data, &pts); err != nil {
		return nil, err
	}

	// 依照 idx 排序
	sort.Slice(pts, func(i, j int) bool {
		return pts[i].Idx < pts[j].Idx
	})

	// 測試輸出
	// for _, p := range pts {
	// 	fmt.Printf("Idx=%d, Name=%s, UUID=%s\n", p.Idx, p.Name, p.UUID)
	// }
	return pts, nil

}

// SavePoints 儲存虛擬點配置到檔案
func SavePoints(path string, pts []VirtualPoint) error {
	b, err := json.MarshalIndent(pts, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0644)
}

const ()

// GenDefaultPoints 系統啟動時如未存在 points.json，自動產生預設的虛擬點
func GenDefaultPoints(n int) []VirtualPoint {
	out := make([]VirtualPoint, 0, n)
	for i := 1; i <= n; i++ {
		u := uuid.New().String()
		out = append(out, VirtualPoint{
			Idx:         i - 1, // 從 0 開始的索引
			UUID:        u,
			Enable:      false,
			Protocol:    "",
			Name:        fmt.Sprintf("%s%07d", POINT_PREFIX, i),
			Description: "",
			Opt:         "NONE",
			RealValue:   0.0,
			DataType:    "",
			InitValue:   0.0,
			Correction:  0.0,
			SaveType:    "",
			RExpr:       "{.}",
			WExpr:       "{.}",
			Online:      false,
			PTUUIDs:     []string{},
		})
	}
	return out
}

// getAvailableVirtualPointUUIDs 取得未被任務引用的 VirtualPoint UUID，依 idx 排序
func getAvailableVirtualPointUUIDs(cfg *Config) []string {
	used := make(map[string]bool)
	// 收集所有任務已用到的 UUID
	for _, task := range cfg.Tasks {
		for _, uuid := range task.PTUUIDs {
			used[uuid] = true
		}
	}
	// 依 idx 排序 Points，並收集未被用到的 UUID
	type idxUUID struct {
		idx  int
		uuid string
	}
	var available []idxUUID
	for _, pt := range cfg.Points {
		if !used[pt.UUID] {
			available = append(available, idxUUID{pt.Idx, pt.UUID})
		}
	}
	// 排序
	sort.Slice(available, func(i, j int) bool {
		return available[i].idx < available[j].idx
	})
	// 只回傳 UUID 陣列
	result := make([]string, len(available))
	for i, v := range available {
		result[i] = v.uuid
	}
	return result
}

// GenDefaultPointsWithPreservedUUIDs 產生點位時保留指定的 UUID 和其完整屬性
// func GenDefaultPointsWithPreservedUUIDs(n int, preservedUUIDs map[string]bool) []VirtualPoint {
// 	// 首先嘗試載入現有的點位資料
// 	existingPoints, err := LoadPoints(POINTSFILENAME)
// 	if err != nil {
// 		log.Printf("警告: 載入現有點位失敗: %v", err)
// 		return nil
// 	}

// 	return existingPoints
// }

// =============================================================================
// 分離式檔案操作（devices.json + pttasks.json）
// =============================================================================
// LoadDevices 載入設備配置檔案 (devices.json)
func LoadDevices(path string) ([]DeviceProtocolConfig, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var devicesProtocol []DeviceProtocolConfig
	if err := json.Unmarshal(b, &devicesProtocol); err != nil {
		return nil, err
	}
	return devicesProtocol, nil
}

// LoadPtTasks 載入任務配置檔案 (pttasks.json)
func LoadPtTasks(path string) ([]PointerTaskConfig, error) {

	b, err := os.ReadFile(path)
	if err != nil {
		// 如果是檔案不存在，則自動建立空的 pttasks.json
		if os.IsNotExist(err) {
			empty := []byte("[]")
			if werr := os.WriteFile(path, empty, 0644); werr != nil {
				return nil, fmt.Errorf("自動建立空的 pttasks.json 失敗: %w", werr)
			}
			// 建立後再讀一次
			b, err = os.ReadFile(path)
			if err != nil {
				return nil, fmt.Errorf("自動建立後讀取 pttasks.json 仍失敗: %w", err)
			}
		} else {
			return nil, err
		}
	}

	var PtTasks []PointerTaskConfig
	if err := json.Unmarshal(b, &PtTasks); err != nil {
		return nil, err
	}
	return PtTasks, nil
}

// MergeDevicesAndTasks 將任務按照 ProtocolUUID 掛載到對應的設備
func MergeDevicesAndTasks(devs []DeviceProtocolConfig, tasks []PointerTaskConfig) *Config {
	byUUID := make(map[string]*DeviceProtocolConfig, len(devs))
	for i := range devs {
		byUUID[devs[i].UUID] = &devs[i]
	}

	for _, t := range tasks {
		// 使用 ProtocolUUID 來匹配設備
		link := t.ProtocolUUID
		if link == "" {
			fmt.Printf("[WARN] Task %q 無對應 UUID（protocoluuid 為空）已略過\n", t.Name)
			continue
		}

		d := byUUID[link]
		if d == nil {
			fmt.Printf("[WARN] Task %q 指向不存在的裝置 UUID=%s\n", t.Name, link)
			continue
		}

		// 若任務未填 community，則繼承裝置預設值（對 SNMP 有用）
		if t.Community == "" && d.Community != "" {
			t.Community = d.Community
		}
		d.Tasks = append(d.Tasks, t)
	}

	// 收攏回切片
	return &Config{Devices: devs}
}

// =============================================================================
// 分離式檔案儲存操作
// =============================================================================
// SaveDevices 儲存設備基本資料到 devices.json（不包含 Tasks，最外層為陣列）
func SaveDevices(path string) error {
	type deviceRecord struct {
		Name       string `json:"name"`
		IP         string `json:"ip,omitempty"`
		Port       int    `json:"port"`
		Enable     bool   `json:"enable"`
		Protocol   string `json:"protocol"`
		Community  string `json:"community,omitempty"`
		UUID       string `json:"uuid"`
		SerialPort string `json:"com,omitempty"`      // RTU 序列埠
		BaudRate   int    `json:"baudrate,omitempty"` // RTU 鮑率
		DataBits   int    `json:"databits,omitempty"` // RTU 資料位元數
		Parity     string `json:"parity,omitempty"`   // RTU 校驗位
		StopBits   int    `json:"stopbits,omitempty"` // RTU 停止位元數
		Timeout    int    `json:"timeout,omitempty"`  // 連線逾時
		Retry      int    `json:"retry,omitempty"`    // 重試次數
		Interval   int    `json:"interval,omitempty"` // 輪詢間隔
	}

	recs := make([]deviceRecord, 0, len(deviceStates))
	for _, st := range deviceStates {
		dev := st.Config
		recs = append(recs, deviceRecord{
			Name:       dev.Name,
			IP:         dev.IP,
			Port:       dev.Port,
			Enable:     dev.Enable,
			Protocol:   dev.Protocol,
			Community:  dev.Community,
			UUID:       dev.UUID,
			SerialPort: dev.SerialPort,
			BaudRate:   dev.BaudRate,
			DataBits:   dev.DataBits,
			Parity:     dev.Parity,
			StopBits:   dev.StopBits,
			Timeout:    dev.Timeout,
			Retry:      dev.Retry,
			Interval:   dev.Interval,
		})
	}

	b, err := json.MarshalIndent(recs, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0644)
}

// SavePtTasks 儲存所有排程任務到 pttasks.json（扁平化，每個 task 需帶上 ProtocolUUID）
func SavePtTasks(path string) error {
	all := make([]PointerTaskConfig, 0, 256)

	for _, st := range deviceStates {
		dev := st.Config
		for _, t := range dev.Tasks {
			tt := t
			// 確保有帶上對應的裝置 UUID
			if tt.ProtocolUUID == "" {
				tt.ProtocolUUID = dev.UUID
			}
			// 註：若要避免把從 device 繼承的 community 寫出，可在此視需求清空：
			// if tt.Community == dev.Community { tt.Community = "" }
			all = append(all, tt)
		}
	}

	b, err := json.MarshalIndent(all, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, b, 0644)
}

// SaveSplit 一次性儲存分離的設備和任務檔案
func SaveSplit(devicesPath, pttasksPath string) error {
	if err := SaveDevices(devicesPath); err != nil {
		return fmt.Errorf("儲存 devices 失敗: %w", err)
	}
	if err := SavePtTasks(pttasksPath); err != nil {
		return fmt.Errorf("儲存 pttasks 失敗: %w", err)
	}
	return nil
}

// =============================================================================
// 統合載入操作
// =============================================================================
// LoadConfigFromSplit 從分離的檔案載入完整配置 (devices.json + pttasks.json)
func LoadConfigFromSplit(devPath, pttaskPath string) (*Config, error) {
	// 載入設備配置
	devs, err := LoadDevices(devPath)
	if err != nil {
		// 若檔案不存在則自動建立空檔案
		if os.IsNotExist(err) {
			f, ferr := os.Create(devPath)
			if ferr != nil {
				return nil, fmt.Errorf("自動建立 devices.json 失敗: %w", ferr)
			}
			f.Write([]byte("[]"))
			f.Close()
			devs = []DeviceProtocolConfig{}
		} else {
			return nil, fmt.Errorf("讀取 devices 失敗: %w", err)
		}
	}

	// 載入任務配置
	tasks, err := LoadPtTasks(pttaskPath)
	if err != nil {
		return nil, fmt.Errorf("讀取 tasks 失敗: %w", err)
	}

	// 合併設備與任務配置
	cfg := MergeDevicesAndTasks(devs, tasks)
	if len(cfg.Devices) == 0 {
		// 回傳一個空的 Config 結構，不報錯
		return &Config{
			Devices: []DeviceProtocolConfig{},
			Points:  []VirtualPoint{},
			Tasks:   []PointerTaskConfig{},
		}, nil
	}
	return cfg, nil
}

// =============================================================================
// 設備狀態初始化
// =============================================================================

// InitDeviceStatesFromConfig 根據配置初始化所有設備的狀態
// 這個函數會遍歷配置中的所有設備，為每個設備創建一個 DeviceState 實例
// 並將其添加到全局的 deviceStates map 中
// 這個函數會在系統啟動時調用，確保所有設備的狀態都正確初始化
func InitDeviceStatesFromConfig(config *Config) {
	log.Println("正在從配置初始化設備狀態...")

	deviceStates = make(map[string]*DeviceState)
	for _, dev := range config.Devices {
		deviceStates[dev.Name] = &DeviceState{
			Config:      dev,
			IsRunning:   dev.Enable,
			LastResults: make(map[string]interface{}),
		}
	}

	log.Printf("設備狀態初始化完成：找到 %d 個設備\n", len(deviceStates))
	log.Printf("[deviceStates]: %+v\n", deviceStates)
}
