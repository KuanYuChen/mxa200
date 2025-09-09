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
	for i := 0; i < numWorkers; i++ {
		go func(id int) {
			for task := range TaskQueue {
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

// SchedulerLoopPrecise 是一個精確的排程器循環，使用時間戳來確保任務在正確的時間執行
// 這個函數會在每次迴圈中檢查所有排程的執行時間，並將符合條件的任務放入 TaskQueue
func SchedulerLoopPrecise() {
	baseTime := time.Now().Truncate(time.Second)
	schedMutex.RLock()
	schedules := make([]*TaskSchedule, len(AllSchedules))
	copy(schedules, AllSchedules)
	schedMutex.RUnlock()

	for {
		select {
		case <-shutdownSignal:
			// 收到關閉信號，安全退出
			log.Println("Scheduler received shutdown signal, exiting...")
			return
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

// ExecuteScheduledTask
// func ExecuteScheduledTask(dev DeviceProtocolConfig, pttask PointerTaskConfig, deviceName string, client *ModbusClient) bool {

func ExecuteScheduledTask(dev DeviceProtocolConfig, task ScheduledTask) bool {
	var resultMap map[string]interface{}
	var err error

	// log.Println("執行任務:", dev.Name, task.PtTask.Name)
	pttask := task.PtTask
	deviceName := task.DeviceName
	client := task.Client //modbus client or nil
	protocol := dev.Protocol

	// 執行
	// log.Printf("執行任務: %s/%s Protocol: %s", deviceName, pttask.Name, protocol)
	switch protocol {
	case "snmp":
		resultMap, err = RunSNMPTask(dev, pttask)
		break
	case "modbus_rtu":
		resultMap, err = RunModbusTask(client, pttask)
		break
	case "modbus_tcp":
		resultMap, err = RunModbusTask(client, pttask)
		break
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

	// log.Println("任務結果:", resultMap)

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
