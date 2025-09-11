package main

import (
	"log"
	"sync"
	"time"

	"github.com/gosnmp/gosnmp"
)

type ScheduledTask struct {
	DeviceName string
	PtTask     PointerTaskConfig
	Client     *ModbusClient
}

type TaskSchedule struct {
	DeviceName   string
	PtTask       PointerTaskConfig
	Client       *ModbusClient
	NextExecTime time.Time
	IntervalMs   int
	Enabled      bool
}

var (
	TaskQueue      chan ScheduledTask
	AllSchedules   []*TaskSchedule
	schedMutex     sync.RWMutex
	shutdownSignal chan struct{} // 新增關閉信號通道
	reloadSignal   chan struct{} // 新增重新載入信號通道
)

// === 點位狀態（與 deviceStates 類似） ===
// type PointState struct {
// 	Point  VirtualPoint
// 	Online bool
// 	Value  any
// }

var (
	modbusClientMap           = make(map[string]*ModbusClient)  // 全域 Modbus client map
	snmpClientMap             = make(map[string]*gosnmp.GoSNMP) // 全域 SNMP client map
	virtualPointMap           = make(map[string]*VirtualPoint)  // key: Point.UUID
	virtualPointMapMutex      sync.RWMutex
	virtualPointValueCache    = make(map[string]any) // key: Point.UUID, value: Point.Value
	virtualPointValueCacheMux sync.RWMutex
	deviceProtocolStatusMap   = make(map[string]map[string]*ConnectionStatus) //連線狀態
	deviceProtocolStatusMutex sync.RWMutex                                    //連線狀態鎖

)

// SetPointStateValue 根據 uuid 設定 pointStates map 中的 value
func SetPointStateValue(uuid string, value any) {
	virtualPointMapMutex.Lock()
	defer virtualPointMapMutex.Unlock()

	vp, exists := virtualPointMap[uuid]
	if !exists {
		// UUID 不存在時輸出警告並跳過
		log.Printf("警告: 找不到 UUID %s 的虛擬點位，跳過更新", uuid)
		return
	}

	if vp == nil {
		log.Printf("警告: UUID %s 對應的虛擬點位為 nil，跳過更新", uuid)
		return
	}

	vp.RealValue = value

	// 安全地將 value 轉換為 uint16 以更新 Modbus Holding Register
	var uint16Value uint16
	switch v := value.(type) {
	case uint8:
		uint16Value = uint16(v)
	case uint16:
		uint16Value = v
	case int:
		if v >= 0 && v <= 65535 {
			uint16Value = uint16(v)
		} else {
			log.Printf("警告: 值 %d 超出 uint16 範圍，設為 0", v)
			uint16Value = 0
		}
	case bool:
		if v {
			uint16Value = 1
		} else {
			uint16Value = 0
		}
	case float32:
		if v >= 0 && v <= 65535 {
			uint16Value = uint16(v)
		} else {
			log.Printf("警告: 值 %f 超出 uint16 範圍，設為 0", v)
			uint16Value = 0
		}
	case float64:
		if v >= 0 && v <= 65535 {
			uint16Value = uint16(v)
		} else {
			log.Printf("警告: 值 %f 超出 uint16 範圍，設為 0", v)
			uint16Value = 0
		}
	default:
		log.Printf("警告: 無法將類型 %T 轉換為 uint16，設為 0", value)
		uint16Value = 0
	}

	// log.Println("更新 Modbus Holding Register:", vp.Idx, "=", uint16Value, vp.Name)
	// 檢查 mbserv 是否已初始化，防止空指標錯誤
	if mbserv != nil {
		mbserv.HoldingRegisters[vp.Idx] = uint16Value // 更新 Modbus Holding Register
	} else {
		log.Printf("警告: Modbus Server 未初始化，跳過更新 Holding Register[%d]", vp.Idx)
	}

}

var taskResultBuffer = make(map[string]map[string]interface{})
var bufferMutex sync.RWMutex

// StartWorkerPool 啟動工作池，並為每個工作者分配任務
// 這個函數會啟動指定數量的 goroutine，每個 goroutine 都會從 TaskQueue 中取出任務並執行
// 每個工作者會不斷地從 TaskQueue 中取出任務，直到 TaskQueue 被關閉
func StartWorkerPool(numWorkers int) {
	log.Println("\n\n=== 啟動工作池 ===")
	for i := 0; i < numWorkers; i++ {
		log.Println("啟動工作者:", i)
		go func(id int) {
			for task := range TaskQueue {
				log.Println("工作者", id, "執行任務:", task.DeviceName, task.PtTask.Name)
				// deviceStates 由 webapi.go 全局維護
				devState, ok := deviceStates[task.DeviceName]
				if !ok {
					log.Printf("[Worker %d] Device %s not found", id, task.DeviceName)
					continue
				}
				ok2 := ExecuteScheduledTask(devState.Config, task)
				if !ok2 {
					log.Printf("[Worker %d] Execute %s/%s failed", id, task.DeviceName, task.PtTask.Name)
				}
			}
		}(i)
	}
}

// ReloadSchedules 重新載入排程配置
func ReloadSchedules() {
	select {
	case reloadSignal <- struct{}{}:
		log.Println("🔄 已發送排程重新載入信號")
	default:
		log.Println("⚠️ 重新載入信號通道已滿，跳過此次重新載入請求")
	}
}

// SchedulerLoopPrecise 是一個精確的排程器循環，使用時間戳來確保任務在正確的時間執行
// 這個函數會在每次迴圈中檢查所有排程的執行時間，並將符合條件的任務放入 TaskQueue
func SchedulerLoopPrecise() {
	baseTime := time.Now().Truncate(time.Second)
	var schedules []*TaskSchedule

	// 初始載入排程
	schedMutex.RLock()
	schedules = make([]*TaskSchedule, len(AllSchedules))
	copy(schedules, AllSchedules)
	schedMutex.RUnlock()

	for {
		select {
		case <-shutdownSignal:
			// 收到關閉信號，安全退出
			log.Println("Scheduler received shutdown signal, exiting...")
			return
		case <-reloadSignal:
			// 收到重新載入信號，重新載入排程
			log.Println("🔄 收到重新載入信號，正在重新載入排程...")
			schedMutex.RLock()
			schedules = make([]*TaskSchedule, len(AllSchedules))
			copy(schedules, AllSchedules)
			schedMutex.RUnlock()
			log.Printf("✅ 排程重新載入完成，目前有 %d 個排程", len(schedules))
			continue
		default:
			// 正常執行邏輯
		}

		now := time.Now()

		for _, s := range schedules {
			if !s.Enabled {
				continue
			}
			// interval 秒同步到 baseTime, e.g. 每隔1秒在每個整秒執行
			elapsed := int(now.Sub(baseTime).Seconds())
			if elapsed < 0 {
				continue
			}
			interval := s.IntervalMs / 1000
			if interval == 0 {
				interval = 1
			}
			if elapsed%interval == 0 {
				// 放到taskQueue的排列中，但要安全地檢查通道是否已關閉
				select {
				case TaskQueue <- ScheduledTask{
					DeviceName: s.DeviceName,
					PtTask:     s.PtTask,
					Client:     s.Client,
				}:
					// 成功發送
				case <-time.After(100 * time.Millisecond):
					// 超時，可能通道已滿或已關閉，跳過此次任務
					log.Printf("Warning: TaskQueue send timeout for task %s", s.PtTask.Name)
				case <-shutdownSignal:
					// 在發送過程中收到關閉信號
					return
				}
				// 強制下次觸發等下一個 tick
				s.NextExecTime = baseTime.Add(time.Duration(elapsed+interval) * time.Second)
			}
		}
		// 精確 sleep 到下一秒，但也要檢查關閉信號
		select {
		case <-time.After(time.Until(now.Truncate(time.Second).Add(time.Second))):
			// 正常等待
		case <-shutdownSignal:
			// 在等待過程中收到關閉信號
			return
		}
	}
}

// 通用新增 Device 任務
func AddDeviceToSchedule(dev DeviceProtocolConfig, enabled bool) {
	schedMutex.Lock()
	defer schedMutex.Unlock()

	var client *ModbusClient = nil
	hasModbus := false

	if dev.Protocol == "" || dev.Protocol == "modbus_tcp" || dev.Protocol == "modbus_rtu" {
		hasModbus = true
	}

	if hasModbus {
		c, exists := modbusClientMap[dev.Name]
		if !exists {
			c = NewModbusClientFromDevice(dev) // << 改這裡
			if c != nil {
				modbusClientMap[dev.Name] = c
			}
		}
		client = c
	}

	for _, task := range dev.Tasks {
		ts := &TaskSchedule{
			DeviceName:   dev.Name,
			PtTask:       task,
			Client:       client, // SNMP任務傳nil不影響
			NextExecTime: time.Now().Add(time.Duration(task.IntervalMs) * time.Millisecond),
			IntervalMs:   task.IntervalMs,
			Enabled:      enabled,
		}
		AllSchedules = append(AllSchedules, ts)
	}

	log.Printf("✅ 已將設備 %s 的 %d 個任務加入排程中", dev.Name, len(dev.Tasks))
}

// 初始化時
func InitSchedulesFromConfig(config *Config) {
	for _, dev := range config.Devices {
		AddDeviceToSchedule(dev, dev.Enable)
	}
}

// API 新增時（Web 新增設備）
func AddDeviceSchedules(dev DeviceProtocolConfig) {
	AddDeviceToSchedule(dev, false) // 預設不啟用
}

// AddSingleTaskToSchedule 新增單個任務到排程中
func AddSingleTaskToSchedule(deviceName string, task PointerTaskConfig, enabled bool) {
	// 先檢查設備狀態，避免在持有排程鎖時再獲取狀態鎖
	stateMutex.RLock()
	deviceState, exists := deviceStates[deviceName]
	if !exists {
		stateMutex.RUnlock()
		log.Printf("警告: 無法找到設備 %s，無法新增任務到排程", deviceName)
		return
	}

	// 複製必要的設備配置信息
	deviceConfig := deviceState.Config
	stateMutex.RUnlock()

	// 現在獲取排程鎖
	schedMutex.Lock()
	defer schedMutex.Unlock()

	// 取得設備的 protocol 資訊
	var client *ModbusClient = nil
	hasModbus := false

	protocol := deviceConfig.Protocol
	if protocol == "" || protocol == "modbus_tcp" || protocol == "modbus_rtu" {
		hasModbus = true
	}

	if hasModbus {
		c, exists := modbusClientMap[deviceName]
		if !exists {
			c = NewModbusClientFromDevice(deviceConfig)
			if c != nil {
				modbusClientMap[deviceName] = c
			}
		}
		client = c
	}

	// 創建新的任務排程
	ts := &TaskSchedule{
		DeviceName:   deviceName,
		PtTask:       task,
		Client:       client,
		NextExecTime: time.Now().Add(time.Duration(task.IntervalMs) * time.Millisecond),
		IntervalMs:   task.IntervalMs,
		Enabled:      enabled,
	}

	AllSchedules = append(AllSchedules, ts)
	log.Printf("✅ 已將任務 %s/%s 動態新增到排程中", deviceName, task.Name)
}

// RemoveSingleTaskFromSchedule 從排程中移除單個任務
func RemoveSingleTaskFromSchedule(deviceName string, taskName string) {
	schedMutex.Lock()
	defer schedMutex.Unlock()

	// 找到並移除對應的任務排程
	for i := len(AllSchedules) - 1; i >= 0; i-- {
		s := AllSchedules[i]
		if s.DeviceName == deviceName && s.PtTask.Name == taskName {
			// 從 slice 中移除該元素
			AllSchedules = append(AllSchedules[:i], AllSchedules[i+1:]...)
			log.Printf("✅ 已將任務 %s/%s 從排程中移除", deviceName, taskName)
			return
		}
	}
	log.Printf("⚠️ 未找到要移除的任務 %s/%s", deviceName, taskName)
}

// RemoveDeviceFromSchedule 從排程中移除設備的所有任務
func RemoveDeviceFromSchedule(deviceName string) {
	schedMutex.Lock()
	defer schedMutex.Unlock()

	removedCount := 0
	// 從後往前遍歷，避免索引問題
	for i := len(AllSchedules) - 1; i >= 0; i-- {
		s := AllSchedules[i]
		if s.DeviceName == deviceName {
			// 從 slice 中移除該元素
			AllSchedules = append(AllSchedules[:i], AllSchedules[i+1:]...)
			removedCount++
		}
	}

	if removedCount > 0 {
		log.Printf("✅ 已將設備 %s 的 %d 個任務從排程中移除", deviceName, removedCount)
	} else {
		log.Printf("⚠️ 未找到設備 %s 的任務排程", deviceName)
	}
}

// SetDeviceTasksEnabled 設定指定設備的所有任務是否啟用
// 這個函數會鎖定排程器，並遍歷所有排程，找到指定設備的任務並更新其啟用狀態
func SetDeviceTasksEnabled(deviceName string, enabled bool) {
	schedMutex.Lock()
	defer schedMutex.Unlock()
	for _, s := range AllSchedules {
		if s.DeviceName == deviceName {
			s.Enabled = enabled
			if enabled {
				s.NextExecTime = time.Now()
			}
		}
	}
}

func ExecuteScheduledTask(dev DeviceProtocolConfig, task ScheduledTask) bool {
	var resultMap map[string]interface{}
	var err error

	log.Println("執行任務:", dev.Name, task.PtTask.Name)

	pttask := task.PtTask
	deviceName := task.DeviceName
	client := task.Client //modbus client or nil
	protocol := dev.Protocol

	// 執行
	// log.Printf("執行任務: %s/%s Protocol: %s", deviceName, pttask.Name, protocol)
	switch protocol {
	case "snmp":
		resultMap, err = RunSNMPTask(dev, pttask)
	case "modbus_rtu":
		resultMap, err = RunModbusTask(client, pttask)
	case "modbus_tcp":
		resultMap, err = RunModbusTask(client, pttask)
	default: //modbus
		return false
		// resultMap, err = RunModbusTask(client, pttask)
	}

	// log.Println("----> Protocol Status:", deviceProtocolStatusMap)
	// ---- protocolStatusMap 狀態管理 ----
	deviceProtocolStatusMutex.Lock()
	if _, ok := deviceProtocolStatusMap[deviceName]; !ok {
		//沒有的話就建立
		deviceProtocolStatusMap[deviceName] = make(map[string]*ConnectionStatus)
	}
	status, ok := deviceProtocolStatusMap[deviceName][protocol]
	if !ok {
		status = &ConnectionStatus{}
		deviceProtocolStatusMap[deviceName][protocol] = status
	}
	deviceProtocolStatusMutex.Unlock()
	// log.Println("<----- Protocol Status:", deviceProtocolStatusMap)

	if err != nil {
		log.Printf("連線/執行錯誤 [%s/%s]: %v", deviceName, protocol, err)
		status.FailureCount++
		status.LastError = err.Error()
		status.IsOnline = status.FailureCount < MaxFailureCount
		if !status.IsOnline {
			log.Printf("❌ %s(%s) 連續失敗 %d 次，標記為離線", deviceName, protocol, status.FailureCount)
			if resultMap != nil {
				log.Println(resultMap["ts"])
			}
		}
		if protocol == "snmp" {
			snmp := NewSnmpClient(dev, pttask)
			snmpClientMap[dev.Name] = snmp

		}
		return false
	}
	// 成功
	status.FailureCount = 0
	status.LastSuccess = time.Now()
	status.IsOnline = true

	deviceProtocolStatusMutex.Lock()
	deviceProtocolStatusMap[deviceName][protocol] = status
	deviceProtocolStatusMutex.Unlock()

	// buffer 寫入
	bufferMutex.Lock()
	if _, exists := taskResultBuffer[deviceName]; !exists {
		taskResultBuffer[deviceName] = make(map[string]interface{})
	}
	taskResultBuffer[deviceName][pttask.Name] = resultMap
	bufferMutex.Unlock()

	log.Println("任務結果:", resultMap)

	for uuid, val := range resultMap {
		// log.Println(uuid, val)
		SetPointStateValue(uuid, val)

		// 安全地取得虛擬點位名稱
		virtualPointMapMutex.RLock()
		vp, exists := virtualPointMap[uuid]
		if exists && vp != nil {
			key := vp.Name
			virtualPointMapMutex.RUnlock()

			// log.Println("更新點位:", key, "=", val)
			virtualPointValueCacheMux.Lock()
			virtualPointValueCache[key] = val
			virtualPointValueCacheMux.Unlock()
		} else {
			virtualPointMapMutex.RUnlock()
			log.Printf("警告: UUID %s 對應的虛擬點位不存在，跳過緩存更新", uuid)
		}
	}

	return true
}
