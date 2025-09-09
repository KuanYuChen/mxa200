package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/google/uuid"
)

// VirtualPoint 虛擬點結構 points.json
type VirtualPoint struct {
	Idx         int      `json:"idx"`
	UUID        string   `json:"uuid"`
	Enable      bool     `json:"enable"`
	Protocol    string   `json:"protocol"`
	Name        string   `json:"name"`
	Description string   `json:"description,omitempty"`
	Opt         string   `json:"opt"`
	RealValue   any      `json:"realvalue"`
	DataType    string   `json:"datatype"`
	InitValue   any      `json:"initvalue"`
	Correction  float64  `json:"correctionvalue"`
	SaveType    string   `json:"savetype"`
	RExpr       string   `json:"RExpr"`
	WExpr       string   `json:"WExpr"`
	Online      bool     `json:"online"`
	PTUUIDs     []string `json:"ptuuids"`
}

// PointerTaskConfig 點位任務配置 pttasks.json
type PointerTaskConfig struct {
	Name         string   `json:"name"`
	Function     string   `json:"function"`
	Address      uint16   `json:"address,omitempty"`
	Quantity     uint16   `json:"quantity,omitempty"`
	StartOID     string   `json:"start_oid,omitempty"`
	OIDnum       uint32   `json:"oid_num,omitempty"`
	Community    string   `json:"community,omitempty"`
	Value        *bool    `json:"value,omitempty"`
	IntervalMs   int      `json:"interval_ms"`
	ProtocolUUID string   `json:"protocoluuid,omitempty"`
	PTUUIDs      []string `json:"ptuuids,omitempty"`
	DeviceUUID   string   `json:"uuid,omitempty"`
	SlaveID      int      `json:"slaveid,omitempty"`
}

// DeviceProtocolConfig 設備協定配置 devices.json
type DeviceProtocolConfig struct {
	Name       string `json:"name"`
	IP         string `json:"ip,omitempty"`
	Port       int    `json:"port,omitempty"`
	Protocol   string `json:"protocol"`
	Community  string `json:"community,omitempty"`
	Enable     bool   `json:"enable"`
	UUID       string `json:"uuid"`
	SerialPort string `json:"com,omitempty"`
	BaudRate   int    `json:"baudrate,omitempty"`
	DataBits   int    `json:"databits,omitempty"`
	Parity     string `json:"parity,omitempty"`
	StopBits   int    `json:"stopbits,omitempty"`
	Timeout    int    `json:"timeout,omitempty"`
	Retry      int    `json:"retry,omitempty"`
	Interval   int    `json:"interval,omitempty"`
}

// 自訂JSON序列化，根據協定類型輸出不同欄位
func (d DeviceProtocolConfig) MarshalJSON() ([]byte, error) {
	// 基礎欄位
	result := map[string]interface{}{
		"name":     d.Name,
		"protocol": d.Protocol,
		"enable":   d.Enable,
		"uuid":     d.UUID,
	}

	// 根據協定類型添加特定欄位
	switch d.Protocol {
	case "modbus_tcp":
		if d.IP != "" {
			result["ip"] = d.IP
		}
		if d.Port != 0 {
			result["port"] = d.Port
		}

	case "modbus_rtu":
		if d.SerialPort != "" {
			result["com"] = d.SerialPort
		}
		if d.BaudRate != 0 {
			result["baudrate"] = d.BaudRate
		}
		if d.DataBits != 0 {
			result["databits"] = d.DataBits
		}
		if d.Parity != "" {
			result["parity"] = d.Parity
		}
		if d.StopBits != 0 {
			result["stopbits"] = d.StopBits
		}

	case "snmp":
		if d.IP != "" {
			result["ip"] = d.IP
		}
		if d.Port != 0 {
			result["port"] = d.Port
		}
		if d.Community != "" {
			result["community"] = d.Community
		}

	default:
		// 對於其他協定，包含所有非空欄位
		if d.IP != "" {
			result["ip"] = d.IP
		}
		if d.Port != 0 {
			result["port"] = d.Port
		}
		if d.Community != "" {
			result["community"] = d.Community
		}
		if d.SerialPort != "" {
			result["com"] = d.SerialPort
		}
		if d.BaudRate != 0 {
			result["baudrate"] = d.BaudRate
		}
		if d.DataBits != 0 {
			result["databits"] = d.DataBits
		}
		if d.Parity != "" {
			result["parity"] = d.Parity
		}
		if d.StopBits != 0 {
			result["stopbits"] = d.StopBits
		}
	}

	// 可選欄位
	if d.Timeout != 0 {
		result["timeout"] = d.Timeout
	}
	if d.Retry != 0 {
		result["retry"] = d.Retry
	}
	if d.Interval != 0 {
		result["interval"] = d.Interval
	}

	return json.Marshal(result)
}

// 合併的 CSV 記錄結構
type MergedCSVRecord struct {
	// Point 相關欄位 (不包含 UUID)
	PointEnable      string
	PointProtocol    string
	PointName        string
	PointDescription string
	PointOpt         string
	PointDataType    string
	PointInitValue   string
	PointCorrection  string
	PointSaveType    string
	PointRExpr       string
	PointWExpr       string

	// Task 相關欄位
	TaskName       string
	TaskFunction   string
	TaskAddress    string
	TaskQuantity   string
	TaskStartOID   string
	TaskOIDnum     string
	TaskCommunity  string
	TaskValue      string
	TaskIntervalMs string
	TaskSlaveID    string

	// Device 相關欄位
	DeviceName       string
	DeviceIP         string
	DevicePort       string
	DeviceProtocol   string
	DeviceEnable     string
	DeviceCommunity  string
	DeviceSerialPort string
	DeviceBaudRate   string
	DeviceDataBits   string
	DeviceParity     string
	DeviceStopBits   string
	DeviceTimeout    string
	DeviceRetry      string
	DeviceInterval   string
}

// 將 JSON 資料轉換為合併的 CSV
func jsonToMergedCSV() error {
	// 讀取所有 JSON 檔案
	pointsData, err := os.ReadFile("points.json")
	if err != nil {
		return fmt.Errorf("無法讀取 points.json: %v", err)
	}

	tasksData, err := os.ReadFile("pttasks.json")
	if err != nil {
		return fmt.Errorf("無法讀取 pttasks.json: %v", err)
	}

	devicesData, err := os.ReadFile("devices.json")
	if err != nil {
		return fmt.Errorf("無法讀取 devices.json: %v", err)
	}

	// 解析 JSON
	var points []VirtualPoint
	var tasks []PointerTaskConfig
	var devices []DeviceProtocolConfig

	if err := json.Unmarshal(pointsData, &points); err != nil {
		return fmt.Errorf("無法解析 points.json: %v", err)
	}

	if err := json.Unmarshal(tasksData, &tasks); err != nil {
		return fmt.Errorf("無法解析 pttasks.json: %v", err)
	}

	if err := json.Unmarshal(devicesData, &devices); err != nil {
		return fmt.Errorf("無法解析 devices.json: %v", err)
	}

	// 建立 UUID 對應表
	deviceMap := make(map[string]DeviceProtocolConfig)

	for _, device := range devices {
		deviceMap[device.UUID] = device
	}

	// 建立合併記錄
	var records []MergedCSVRecord
	processedDevices := make(map[string]bool)

	// 處理有關聯點位的記錄
	for _, point := range points {
		record := MergedCSVRecord{
			PointEnable:      strconv.FormatBool(point.Enable),
			PointProtocol:    point.Protocol,
			PointName:        point.Name,
			PointDescription: point.Description,
			PointOpt:         point.Opt,
			PointDataType:    point.DataType,
			PointCorrection:  strconv.FormatFloat(point.Correction, 'f', -1, 64),
			PointSaveType:    point.SaveType,
			PointRExpr:       point.RExpr,
			PointWExpr:       point.WExpr,
		}

		if point.InitValue != nil {
			record.PointInitValue = fmt.Sprintf("%v", point.InitValue)
		}

		// 尋找對應的 task（直接遍歷 tasks，檢查 ptuuids）
		for _, task := range tasks {
			for _, ptUUID := range task.PTUUIDs {
				if ptUUID == point.UUID {
					record.TaskName = task.Name
					record.TaskFunction = task.Function
					record.TaskAddress = strconv.FormatUint(uint64(task.Address), 10)
					record.TaskQuantity = strconv.FormatUint(uint64(task.Quantity), 10)
					record.TaskStartOID = task.StartOID
					record.TaskOIDnum = strconv.FormatUint(uint64(task.OIDnum), 10)
					record.TaskCommunity = task.Community
					record.TaskIntervalMs = strconv.Itoa(task.IntervalMs)
					record.TaskSlaveID = strconv.Itoa(task.SlaveID)

					if task.Value != nil {
						record.TaskValue = strconv.FormatBool(*task.Value)
					}

					// 尋找對應的 device（使用 task 的 ProtocolUUID）
					if task.ProtocolUUID != "" {
						if device, exists := deviceMap[task.ProtocolUUID]; exists {
							record.DeviceName = device.Name
							record.DeviceIP = device.IP
							record.DevicePort = strconv.Itoa(device.Port)
							record.DeviceProtocol = device.Protocol
							record.DeviceEnable = strconv.FormatBool(device.Enable)
							record.DeviceCommunity = device.Community
							record.DeviceSerialPort = device.SerialPort
							record.DeviceBaudRate = strconv.Itoa(device.BaudRate)
							record.DeviceDataBits = strconv.Itoa(device.DataBits)
							record.DeviceParity = device.Parity
							record.DeviceStopBits = strconv.Itoa(device.StopBits)
							record.DeviceTimeout = strconv.Itoa(device.Timeout)
							record.DeviceRetry = strconv.Itoa(device.Retry)
							record.DeviceInterval = strconv.Itoa(device.Interval)
							processedDevices[device.UUID] = true
						}
					}
					break
				}
			}
		}

		records = append(records, record)
	}

	// 添加沒有關聯點位的設備作為空記錄
	for _, device := range devices {
		if !processedDevices[device.UUID] {
			record := MergedCSVRecord{
				// Point 欄位留空，表示這是純設備記錄
				PointEnable:      "false",
				PointProtocol:    "",
				PointName:        "_DEVICE_ONLY_",
				PointDescription: "Device without associated points",
				PointDataType:    "STRING",
				PointCorrection:  "0",
				PointSaveType:    "",

				// Device 資訊
				DeviceName:       device.Name,
				DeviceIP:         device.IP,
				DevicePort:       strconv.Itoa(device.Port),
				DeviceProtocol:   device.Protocol,
				DeviceEnable:     strconv.FormatBool(device.Enable),
				DeviceCommunity:  device.Community,
				DeviceSerialPort: device.SerialPort,
				DeviceBaudRate:   strconv.Itoa(device.BaudRate),
				DeviceDataBits:   strconv.Itoa(device.DataBits),
				DeviceParity:     device.Parity,
				DeviceStopBits:   strconv.Itoa(device.StopBits),
				DeviceTimeout:    strconv.Itoa(device.Timeout),
				DeviceRetry:      strconv.Itoa(device.Retry),
				DeviceInterval:   strconv.Itoa(device.Interval),
			}
			records = append(records, record)
		}
	}

	// 寫入 CSV 檔案
	file, err := os.Create("merged_data.csv")
	if err != nil {
		return err
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// 寫入標頭
	headers := []string{
		"PointEnable", "PointProtocol", "PointName", "PointDescription",
		"PointOpt", "PointDataType", "PointInitValue", "PointCorrection", "PointSaveType",
		"PointRExpr", "PointWExpr", "TaskName", "TaskFunction", "TaskAddress",
		"TaskQuantity", "TaskStartOID", "TaskOIDnum", "TaskCommunity", "TaskValue",
		"TaskIntervalMs", "TaskSlaveID", "DeviceName", "DeviceIP", "DevicePort",
		"DeviceProtocol", "DeviceEnable", "DeviceCommunity", "DeviceSerialPort",
		"DeviceBaudRate", "DeviceDataBits", "DeviceParity", "DeviceStopBits",
		"DeviceTimeout", "DeviceRetry", "DeviceInterval",
	}
	if err := writer.Write(headers); err != nil {
		return err
	}

	// 寫入資料
	for _, record := range records {
		row := []string{
			record.PointEnable, record.PointProtocol, record.PointName,
			record.PointDescription, record.PointOpt, record.PointDataType, record.PointInitValue,
			record.PointCorrection, record.PointSaveType, record.PointRExpr, record.PointWExpr,
			record.TaskName, record.TaskFunction, record.TaskAddress, record.TaskQuantity,
			record.TaskStartOID, record.TaskOIDnum, record.TaskCommunity, record.TaskValue,
			record.TaskIntervalMs, record.TaskSlaveID, record.DeviceName, record.DeviceIP,
			record.DevicePort, record.DeviceProtocol, record.DeviceEnable, record.DeviceCommunity,
			record.DeviceSerialPort, record.DeviceBaudRate, record.DeviceDataBits, record.DeviceParity,
			record.DeviceStopBits, record.DeviceTimeout, record.DeviceRetry, record.DeviceInterval,
		}
		if err := writer.Write(row); err != nil {
			return err
		}
	}

	return nil
}

// 載入原始資料以保持UUID一致性
func loadOriginalData() ([]VirtualPoint, []PointerTaskConfig, []DeviceProtocolConfig) {
	var points []VirtualPoint
	var tasks []PointerTaskConfig
	var devices []DeviceProtocolConfig

	// 讀取原始檔案
	if pointsData, err := os.ReadFile("points.json"); err == nil {
		json.Unmarshal(pointsData, &points)
	}
	if tasksData, err := os.ReadFile("pttasks.json"); err == nil {
		json.Unmarshal(tasksData, &tasks)
	}
	if devicesData, err := os.ReadFile("devices.json"); err == nil {
		json.Unmarshal(devicesData, &devices)
	}

	return points, tasks, devices
}

// 從合併的 CSV 轉換回三個 JSON 檔案
func mergedCSVToJSON() error {
	// 首先讀取原始檔案以保持UUID一致性
	originalPoints, originalTasks, originalDevices := loadOriginalData()

	// 建立UUID對應表
	pointUUIDs := make(map[string]string)  // pointName -> UUID
	taskUUIDs := make(map[string]string)   // taskKey -> UUID
	deviceUUIDs := make(map[string]string) // deviceKey -> UUID

	// 從原始資料建立對應表
	for _, point := range originalPoints {
		pointUUIDs[point.Name] = point.UUID
	}
	for _, task := range originalTasks {
		taskKey := fmt.Sprintf("%s-%s-%d-%d", task.Name, task.Function, task.Address, task.Quantity)
		taskUUIDs[taskKey] = task.DeviceUUID
	}
	for _, device := range originalDevices {
		deviceKey := fmt.Sprintf("%s-%s-%d", device.Name, device.IP, device.Port)
		deviceUUIDs[deviceKey] = device.UUID
	}

	file, err := os.Open("merged_data.csv")
	if err != nil {
		return err
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return err
	}

	if len(records) < 2 {
		return fmt.Errorf("CSV 檔案沒有足夠的資料")
	}

	var points []VirtualPoint
	deviceMap := make(map[string]*DeviceProtocolConfig)
	taskMap := make(map[string]*PointerTaskConfig)

	// 跳過標頭行
	for i := 1; i < len(records); i++ {
		record := records[i]
		if len(record) < 35 {
			continue
		}

		// 跳過純設備記錄（PointName 為 _DEVICE_ONLY_）
		if record[2] == "_DEVICE_ONLY_" {
			// 處理純設備記錄
			if record[21] != "" { // DeviceName 不為空
				deviceKey := fmt.Sprintf("%s-%s-%s", record[21], record[22], record[23])

				if _, exists := deviceMap[deviceKey]; !exists {
					port, _ := strconv.Atoi(record[23])
					deviceEnable, _ := strconv.ParseBool(record[25])
					baudRate, _ := strconv.Atoi(record[28])
					dataBits, _ := strconv.Atoi(record[29])
					stopBits, _ := strconv.Atoi(record[31])
					timeout, _ := strconv.Atoi(record[32])
					retry, _ := strconv.Atoi(record[33])
					interval, _ := strconv.Atoi(record[34])

					// 使用原始UUID或產生新的
					var deviceUUID string
					if originalUUID, exists := deviceUUIDs[deviceKey]; exists {
						deviceUUID = originalUUID
					} else {
						deviceUUID = uuid.New().String()
					}

					device := &DeviceProtocolConfig{
						Name:       record[21],
						IP:         record[22],
						Port:       port,
						Protocol:   record[24],
						Community:  record[26],
						Enable:     deviceEnable,
						UUID:       deviceUUID,
						SerialPort: record[27],
						BaudRate:   baudRate,
						DataBits:   dataBits,
						Parity:     record[30],
						StopBits:   stopBits,
						Timeout:    timeout,
						Retry:      retry,
						Interval:   interval,
					}
					deviceMap[deviceKey] = device
				}
			}
			continue
		}

		// 處理正常的點位記錄
		pointEnable, _ := strconv.ParseBool(record[0])
		pointCorrection, _ := strconv.ParseFloat(record[7], 64)

		var initValue interface{}
		if record[6] != "" {
			initValue = parseValue(record[6], record[5])
		}

		// 使用原始UUID或產生新的
		var pointUUID string
		if originalUUID, exists := pointUUIDs[record[2]]; exists {
			pointUUID = originalUUID
		} else {
			pointUUID = uuid.New().String()
		}

		point := VirtualPoint{
			UUID:        pointUUID,
			Enable:      pointEnable,
			Protocol:    record[1],
			Name:        record[2],
			Description: record[3],
			Opt:         record[4],
			DataType:    record[5],
			InitValue:   initValue,
			Correction:  pointCorrection,
			SaveType:    record[8],
			RExpr:       record[9],
			WExpr:       record[10],
			Online:      false,
			PTUUIDs:     []string{},
		}
		points = append(points, point)

		// 處理 Task 資料（如果有的話）
		if record[11] != "" { // TaskName 不為空
			taskKey := fmt.Sprintf("%s-%s-%s-%s",
				record[11], record[12], record[13], record[14])

			task, exists := taskMap[taskKey]
			if !exists {
				address, _ := strconv.ParseUint(record[13], 10, 16)
				quantity, _ := strconv.ParseUint(record[14], 10, 16)
				oidnum, _ := strconv.ParseUint(record[16], 10, 32)
				intervalMs, _ := strconv.Atoi(record[19])
				slaveID, _ := strconv.Atoi(record[20])

				var value *bool
				if record[18] != "" {
					v, _ := strconv.ParseBool(record[18])
					value = &v
				}

				// 使用原始UUID或產生新的
				var taskUUID string
				if originalUUID, exists := taskUUIDs[taskKey]; exists {
					taskUUID = originalUUID
				} else {
					taskUUID = uuid.New().String()
				}

				task = &PointerTaskConfig{
					Name:         record[11],
					Function:     record[12],
					Address:      uint16(address),
					Quantity:     uint16(quantity),
					StartOID:     record[15],
					OIDnum:       uint32(oidnum),
					Community:    record[17],
					Value:        value,
					IntervalMs:   intervalMs,
					ProtocolUUID: "",
					PTUUIDs:      []string{},
					DeviceUUID:   taskUUID,
					SlaveID:      slaveID,
				}
				taskMap[taskKey] = task
			}

			task.PTUUIDs = append(task.PTUUIDs, pointUUID)

			// 處理 Device 資料（如果有的話）
			if record[21] != "" { // DeviceName 不為空
				deviceKey := fmt.Sprintf("%s-%s-%s", record[21], record[22], record[23])

				device, exists := deviceMap[deviceKey]
				if !exists {
					port, _ := strconv.Atoi(record[23])
					deviceEnable, _ := strconv.ParseBool(record[25])
					baudRate, _ := strconv.Atoi(record[28])
					dataBits, _ := strconv.Atoi(record[29])
					stopBits, _ := strconv.Atoi(record[31])
					timeout, _ := strconv.Atoi(record[32])
					retry, _ := strconv.Atoi(record[33])
					interval, _ := strconv.Atoi(record[34])

					// 使用原始UUID或產生新的
					var deviceUUID string
					if originalUUID, exists := deviceUUIDs[deviceKey]; exists {
						deviceUUID = originalUUID
					} else {
						deviceUUID = uuid.New().String()
					}

					device = &DeviceProtocolConfig{
						Name:       record[21],
						IP:         record[22],
						Port:       port,
						Protocol:   record[24],
						Community:  record[26],
						Enable:     deviceEnable,
						UUID:       deviceUUID,
						SerialPort: record[27],
						BaudRate:   baudRate,
						DataBits:   dataBits,
						Parity:     record[30],
						StopBits:   stopBits,
						Timeout:    timeout,
						Retry:      retry,
						Interval:   interval,
					}
					deviceMap[deviceKey] = device
				}

				// 設置 task 的 ProtocolUUID 為 device 的 UUID
				task.ProtocolUUID = device.UUID
			}
		}
	}

	// 轉換 map 為 slice
	var tasks []PointerTaskConfig
	var devices []DeviceProtocolConfig

	for _, task := range taskMap {
		tasks = append(tasks, *task)
	}
	for _, device := range deviceMap {
		devices = append(devices, *device)
	}

	// 寫入 JSON 檔案
	if len(points) > 0 {
		data, _ := json.MarshalIndent(points, "", "  ")
		os.WriteFile("points_new.json", data, 0644)
		fmt.Println("points_new.json 已產生")
	}

	if len(tasks) > 0 {
		data, _ := json.MarshalIndent(tasks, "", "  ")
		os.WriteFile("pttasks_new.json", data, 0644)
		fmt.Println("pttasks_new.json 已產生")
	}

	if len(devices) > 0 {
		data, _ := json.MarshalIndent(devices, "", "  ")
		os.WriteFile("devices_new.json", data, 0644)
		fmt.Println("devices_new.json 已產生")
	}

	return nil
}

// 輔助函數：根據資料類型解析值
func parseValue(valueStr, dataType string) interface{} {
	switch strings.ToUpper(dataType) {
	case "BOOL":
		v, _ := strconv.ParseBool(valueStr)
		return v
	case "INT", "INT16":
		v, _ := strconv.ParseInt(valueStr, 10, 64)
		return int(v)
	case "UINT16":
		v, _ := strconv.ParseUint(valueStr, 10, 16)
		return uint16(v)
	case "FLOAT":
		v, _ := strconv.ParseFloat(valueStr, 64)
		return v
	case "STRING":
		return valueStr
	default:
		if v, err := strconv.ParseFloat(valueStr, 64); err == nil {
			return v
		}
		return valueStr
	}
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("使用方法:")
		fmt.Println("  產生合併 CSV: go run converter.go to-csv")
		fmt.Println("  從合併 CSV 轉回 JSON: go run converter.go from-csv")
		return
	}

	switch os.Args[1] {
	case "to-csv":
		if err := jsonToMergedCSV(); err != nil {
			log.Printf("轉換錯誤: %v", err)
		} else {
			fmt.Println("merged_data.csv 已產生完成")
		}

	case "from-csv":
		if err := mergedCSVToJSON(); err != nil {
			log.Printf("轉換錯誤: %v", err)
		} else {
			fmt.Println("JSON 檔案轉換完成")
		}

	default:
		fmt.Println("無效的參數。使用 'to-csv' 或 'from-csv'")
	}
}
