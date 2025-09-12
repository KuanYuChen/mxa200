package main

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"sort"
	"strconv"
	"sync"

	"github.com/gin-gonic/contrib/static"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// DeviceConfig 是設備的配置結構體 用來表示這個設備目前的狀態與設定檔案
type DeviceState struct {
	Config      DeviceProtocolConfig   // 設備配置
	IsRunning   bool                   // 是否正在執行
	LastResults map[string]interface{} // 上次執行結果

}

var (
	deviceStates = make(map[string]*DeviceState)
	stateMutex   sync.RWMutex
)

// 將dist資料夾Embed執行檔案內
//
//go:embed dist/*
var embedFs embed.FS

func RegisterRoutes(r *gin.Engine, cfg *Config) {
	r.GET("/api/sysinfo", sysInfo)
	r.GET("/api/reload", reloadSchedules)

	r.GET("/api/devices", listDevices)
	r.POST("/api/devices", addDevice)
	r.PUT("/api/devices/:name", updateDevice)
	r.DELETE("/api/devices/:name", deleteDevice)

	r.POST("/api/devices/:name/start", startDevice)
	r.POST("/api/devices/:name/stop", stopDevice)

	r.GET("/api/points", getpointStates)
	r.GET("/api/points/:uuid", getPointByUUID)
	// r.POST("/api/points", createPoint) // 新增虛擬點位
	r.PUT("/api/points/:uuid", updatePointByUUID)
	r.DELETE("/api/points/:uuid", deletePointByUUID)

	r.GET("/api/vpoints", getvpointVal)
	r.GET("/api/avpoints", func(c *gin.Context) { getAvailableVirtualPoints(c, cfg) })

	// 任務管理 API
	r.GET("/api/tasks", listTasks)
	r.POST("/api/tasks", addTask)
	r.PUT("/api/tasks/:uuid", updateTask)
	r.DELETE("/api/tasks/:uuid", deleteTask)
	r.GET("/api/tasks/:uuid", getTask)

	// r.GET("/api/devices/:name/tasks/:task/now", getTaskNowFromBuffer)
	r.GET("/api/modbustb", getModbusTable)

	r.Use(static.Serve("/image", static.LocalFile("./image/", true)))

	//讀取目前./dist/assets這些資料 Embed功能
	fdist, _ := fs.Sub(embedFs, "dist")     //資料夾
	fassets, _ := fs.Sub(fdist, "assets")   //資料夾
	r.StaticFS("/assets", http.FS(fassets)) //資料夾
	r.GET("/", func(c *gin.Context) {
		c.FileFromFS("/", http.FS(fdist))
	})
	//取得ico
	r.GET("favicon.ico", func(c *gin.Context) {
		file, _ := embedFs.ReadFile("dist/favicon.ico")
		c.Data(
			http.StatusOK,
			"image/x-icon",
			file,
		)
	})
	//如果路由出錯導向/
	r.NoRoute(func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/")
	})

}

func getModbusTable(c *gin.Context) {
	pts, err := LoadPoints(POINTSFILENAME) //讀取點位
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load points: " + err.Error()})
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=modbus_table.csv")

	// 創建 CSV 內容，加入 UTF-8 BOM
	csvContent := "\xef\xbb\xbfaddress,name\n"

	for i, point := range pts {
		address := i + 1 // 從 1 開始的地址
		csvContent += fmt.Sprintf("%d,%s\n",
			address,
			point.Name,
		)

	}

	c.String(http.StatusOK, csvContent)
}

func sysInfo(c *gin.Context) {

	// Version    = "1.0.0"
	// Commit     = "none"
	// BuildTime  = "unknown"
	// Feature    = "standard" // 軟體功能區分：standard, professional, enterprise
	// MaxPointer = 300        // 系統允許的最大點位數量
	// Module     = "MXA-200"

	c.JSON(http.StatusOK, gin.H{"Version": Version, "Module": Module})

}

func reloadSchedules(c *gin.Context) {
	ReloadSchedules()
	c.JSON(http.StatusOK, gin.H{
		"message": "排程重新載入請求已發送",
		"success": true,
	})
}

func listDevices(c *gin.Context) {
	stateMutex.RLock()
	defer stateMutex.RUnlock()
	result := make(map[string]interface{})
	for name, state := range deviceStates {
		result[name] = state.Config
		// result[name] = gin.H{
		// 	"ip":        state.Config.IP,
		// 	"port":      state.Config.Port,
		// 	"protocol":state.Config.Protocol,
		// 	"timeout":state.
		// 	"isRunning": state.IsRunning,
		// 	"enable":    state.Config.Enable,
		// }
	}
	c.JSON(http.StatusOK, result)
}

func addDevice(c *gin.Context) {
	var cfg DeviceProtocolConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	// 輸入驗證
	if cfg.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Device name is required"})
		return
	}
	// 根據協定類型驗證必要欄位
	if cfg.Protocol == "modbus_rtu" {
		if cfg.SerialPort == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "SerialPort (com) is required for modbus_rtu"})
			return
		}
	} else if cfg.Protocol == "modbus_tcp" || cfg.Protocol == "snmp" {
		if cfg.IP == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "IP is required for modbus_tcp and snmp"})
			return
		}
	}
	if cfg.Protocol != "modbus_tcp" && cfg.Protocol != "modbus_rtu" && cfg.Protocol != "snmp" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Protocol must be  modbus_tcp, modbus_rtu, or snmp"})
		return
	}
	cfg.UUID = uuid.New().String()

	// 建立基本的 tasks 陣列並連結 pttasks.json 的內容
	cfg.Tasks = make([]PointerTaskConfig, 0)

	// 載入 pttasks.json 並尋找匹配的任務
	allTasks, err := LoadPtTasks(TASKSFILENAME)
	if err != nil {
		log.Printf("Warning: Failed to load tasks from %s: %v", TASKSFILENAME, err)
	} else {
		// 尋找與設備 UUID 匹配的任務
		for _, task := range allTasks {
			// 使用 protocoluuid 來匹配設備
			if task.ProtocolUUID == cfg.UUID {
				// 更新任務的設備 UUID 以確保一致性
				task.ProtocolUUID = cfg.UUID
				cfg.Tasks = append(cfg.Tasks, task)
			}
		}
		log.Printf("Device %s: Found %d matching tasks in pttasks.json", cfg.Name, len(cfg.Tasks))
	}

	stateMutex.Lock()
	defer stateMutex.Unlock()
	if _, exists := deviceStates[cfg.Name]; exists {
		c.JSON(http.StatusConflict, gin.H{"error": "device already exists"})
		return
	}
	deviceStates[cfg.Name] = &DeviceState{
		Config:      cfg,
		IsRunning:   false,
		LastResults: make(map[string]interface{}),
	}
	// 新增時預設不啟動，如果要啟動由 /start API 控制
	AddDeviceSchedules(cfg)
	if err := SaveSplit(DEVICESFILENAME, TASKSFILENAME); err != nil {
		log.Printf("Failed to save config: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"message": "device added successfully",
		// "tasks_loaded": len(cfg.Tasks),
		"device": gin.H{
			"name":     cfg.Name,
			"uuid":     cfg.UUID,
			"protocol": cfg.Protocol,
			// "tasks_count": len(cfg.Tasks),
		},
	})
}

func updateDevice(c *gin.Context) {
	name := c.Param("name")
	var cfg DeviceProtocolConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	stateMutex.Lock()
	defer stateMutex.Unlock()
	if _, exists := deviceStates[name]; exists {
		deviceStates[name] = &DeviceState{
			Config:      cfg,
			IsRunning:   false, // 修改後預設關閉，由 /start 控制
			LastResults: make(map[string]interface{}),
		}
		_ = SaveSplit(DEVICESFILENAME, TASKSFILENAME)
		c.JSON(http.StatusOK, gin.H{"message": "device updated"})
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
	}
}

func deleteDevice(c *gin.Context) {
	name := c.Param("name")
	stateMutex.Lock()
	defer stateMutex.Unlock()
	if _, exists := deviceStates[name]; exists {
		// 先停用所有任務
		SetDeviceTasksEnabled(name, false)
		delete(deviceStates, name)
		_ = SaveSplit(DEVICESFILENAME, TASKSFILENAME)
		c.JSON(http.StatusOK, gin.H{"message": "device deleted"})
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "device not found"})
	}
}

func startDevice(c *gin.Context) {
	name := c.Param("name")
	SetDeviceTasksEnabled(name, true)
	stateMutex.Lock()
	if state, exists := deviceStates[name]; exists {
		state.IsRunning = true
		state.Config.Enable = true
		_ = SaveSplit(DEVICESFILENAME, TASKSFILENAME)
	}
	stateMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "device started"})
}

func stopDevice(c *gin.Context) {
	name := c.Param("name")
	SetDeviceTasksEnabled(name, false)
	stateMutex.Lock()
	if state, exists := deviceStates[name]; exists {
		state.IsRunning = false
		state.Config.Enable = false
		_ = SaveSplit(DEVICESFILENAME, TASKSFILENAME)

	}
	stateMutex.Unlock()
	c.JSON(http.StatusOK, gin.H{"message": "device stopped"})
}

func getpointStates(c *gin.Context) {
	virtualPointMapMutex.RLock()
	defer virtualPointMapMutex.RUnlock()

	// 將 map 轉換為 slice 並按照 idx 排序
	points := make([]*VirtualPoint, 0, len(virtualPointMap))
	for _, point := range virtualPointMap {
		points = append(points, point)
	}

	// 按照 idx 欄位排序，確保順序一致
	sort.Slice(points, func(i, j int) bool {
		return points[i].Idx < points[j].Idx
	})

	c.JSON(http.StatusOK, points)
}

func getvpointVal(c *gin.Context) {
	virtualPointValueCacheMux.RLock()
	defer virtualPointValueCacheMux.RUnlock()
	c.JSON(http.StatusOK, virtualPointValueCache)
}

// getAvailableVirtualPoints 取得依 idx 排序且未被任務引用的虛擬點位 UUID
func getAvailableVirtualPoints(c *gin.Context, cfg *Config) {
	// 從查詢參數獲取需要的數量，預設為1
	countParam := c.DefaultQuery("count", "1")
	count := 1
	if n, err := strconv.Atoi(countParam); err == nil && n > 0 {
		count = n
	}

	uuids := getAvailableVirtualPointUUIDs(cfg)
	if len(uuids) > count {
		uuids = uuids[:count]
	}
	c.JSON(http.StatusOK, gin.H{
		"uuids": uuids,
	})
}

// getPointByUUID 根據UUID獲取單一虛擬點位
func getPointByUUID(c *gin.Context) {
	uuid := c.Param("uuid")
	if uuid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "UUID parameter is required"})
		return
	}

	virtualPointMapMutex.RLock()
	defer virtualPointMapMutex.RUnlock()

	if point, exists := virtualPointMap[uuid]; exists {
		c.JSON(http.StatusOK, point)
	} else {
		c.JSON(http.StatusNotFound, gin.H{"error": "Point not found"})
	}
}

// createPoint 新增虛擬點位 (目前不開放此功能，因為點位數量固定且有限)
func createPoint(c *gin.Context) {
	var newPoint VirtualPoint
	if err := c.ShouldBindJSON(&newPoint); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	// 輸入驗證
	if newPoint.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Point name is required"})
		return
	}
	if newPoint.DataType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DataType is required"})
		return
	}

	// 生成UUID如果沒有提供
	if newPoint.UUID == "" {
		newPoint.UUID = uuid.New().String()
	}

	// 設置默認值
	if newPoint.Protocol == "" {
		newPoint.Protocol = "vp"
	}
	if newPoint.Opt == "" {
		newPoint.Opt = "NONE"
	}
	if newPoint.SaveType == "" {
		newPoint.SaveType = "temp"
	}
	if newPoint.RExpr == "" {
		newPoint.RExpr = "{.}"
	}
	if newPoint.WExpr == "" {
		newPoint.WExpr = "{.}"
	}
	if newPoint.PTUUIDs == nil {
		newPoint.PTUUIDs = []string{}
	}

	virtualPointMapMutex.Lock()
	defer virtualPointMapMutex.Unlock()

	// 檢查UUID是否已存在
	if _, exists := virtualPointMap[newPoint.UUID]; exists {
		c.JSON(http.StatusConflict, gin.H{"error": "Point with this UUID already exists"})
		return
	}

	// 添加到記憶體映射
	virtualPointMap[newPoint.UUID] = &newPoint

	// 保存到文件
	if err := savePointsToFile(); err != nil {
		// 如果保存失敗，從記憶體中移除
		delete(virtualPointMap, newPoint.UUID)
		log.Printf("Failed to save points to file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save point configuration"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Point created successfully",
		"uuid":    newPoint.UUID,
		"point":   newPoint,
	})
}

// updatePointByUUID 根據UUID更新虛擬點位
func updatePointByUUID(c *gin.Context) {
	uuid := c.Param("uuid")
	if uuid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "UUID parameter is required"})
		return
	}

	var updatedPoint VirtualPoint
	if err := c.ShouldBindJSON(&updatedPoint); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	// 輸入驗證
	if updatedPoint.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Point name is required"})
		return
	}
	if updatedPoint.DataType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "DataType is required"})
		return
	}

	virtualPointMapMutex.Lock()
	defer virtualPointMapMutex.Unlock()

	// 檢查點位是否存在
	existingPoint, exists := virtualPointMap[uuid]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Point not found"})
		return
	}

	// 保持原有的UUID和其他系統管理的字段
	updatedPoint.UUID = uuid
	updatedPoint.RealValue = existingPoint.RealValue // 保持當前實際值
	updatedPoint.Online = existingPoint.Online       // 保持線上狀態

	// 設置默認值（如果未提供）
	if updatedPoint.Protocol == "" {
		updatedPoint.Protocol = "vp"
	}
	if updatedPoint.Opt == "" {
		updatedPoint.Opt = "NONE"
	}
	if updatedPoint.SaveType == "" {
		updatedPoint.SaveType = "temp"
	}
	if updatedPoint.RExpr == "" {
		updatedPoint.RExpr = "{.}"
	}
	if updatedPoint.WExpr == "" {
		updatedPoint.WExpr = "{.}"
	}
	if updatedPoint.PTUUIDs == nil {
		updatedPoint.PTUUIDs = []string{}
	}

	// 更新記憶體映射
	virtualPointMap[uuid] = &updatedPoint

	// 保存到文件
	if err := savePointsToFile(); err != nil {
		// 如果保存失敗，恢復原有資料
		virtualPointMap[uuid] = existingPoint
		log.Printf("Failed to save points to file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save point configuration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Point updated successfully",
		"point":   updatedPoint,
	})
}

// deletePointByUUID 根據UUID刪除虛擬點位
func deletePointByUUID(c *gin.Context) {
	uuid := c.Param("uuid")
	if uuid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "UUID parameter is required"})
		return
	}

	virtualPointMapMutex.Lock()
	defer virtualPointMapMutex.Unlock()

	// 檢查點位是否存在
	existingPoint, exists := virtualPointMap[uuid]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"error": "Point not found"})
		return
	}

	// 從記憶體映射中刪除
	delete(virtualPointMap, uuid)

	// 保存到文件
	if err := savePointsToFile(); err != nil {
		// 如果保存失敗，恢復資料
		virtualPointMap[uuid] = existingPoint
		log.Printf("Failed to save points to file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save point configuration"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Point deleted successfully",
		"uuid":    uuid,
	})
}

// savePointsToFile 將virtualPointMap中的所有點位保存到文件
func savePointsToFile() error {
	// 將map轉換為slice
	points := make([]VirtualPoint, 0, len(virtualPointMap))

	for _, point := range virtualPointMap {
		points[point.Idx] = *point
	}

	// 保存到文件
	return SavePoints(POINTSFILENAME, points)
}

// =============================================================================
// 任務管理 API (Task Management)
// =============================================================================

// listTasks 取得所有任務
func listTasks(c *gin.Context) {
	tasks, err := LoadPtTasks(TASKSFILENAME)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load tasks: " + err.Error()})
		return
	}

	// 確保所有任務都有 protocoluuid 欄位
	for i := range tasks {
		task := &tasks[i]
		// 如果 protocoluuid 為空，需要記錄警告
		if task.ProtocolUUID == "" {
			// 這種情況下需要根據任務所屬的設備來推斷
			// 但由於資料結構限制，我們無法直接獲得，需要透過其他方式
			log.Printf("Warning: Task %s 缺少設備 UUID 資訊", task.Name)
		}
	}

	c.JSON(http.StatusOK, tasks)
}

// getTask 根據 UUID 取得單一任務
func getTask(c *gin.Context) {
	uuid := c.Param("uuid")
	if uuid == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "UUID parameter is required"})
		return
	}

	tasks, err := LoadPtTasks(TASKSFILENAME)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load tasks: " + err.Error()})
		return
	}

	for _, task := range tasks {
		if task.ProtocolUUID == uuid {
			c.JSON(http.StatusOK, task)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
}

// addTask 新增任務
func addTask(c *gin.Context) {
	var task PointerTaskConfig
	if err := c.ShouldBindJSON(&task); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	// 輸入驗證
	if task.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task name is required"})
		return
	}
	// if task.DeviceUUID == "" {
	// 	c.JSON(http.StatusBadRequest, gin.H{"error": "Device UUID is required"})
	// 	return
	// }
	if task.IntervalMs <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Interval must be greater than 0"})
		return
	}

	// 尋找對應的設備並驗證
	stateMutex.Lock()
	defer stateMutex.Unlock()

	var targetDevice *DeviceState
	for _, state := range deviceStates {
		log.Println("Checking device:", state.Config.Name, "UUID:", state.Config.UUID, "against task ProtocolUUID:", task.ProtocolUUID)

		log.Println("task.ProtocolUUID:", task.ProtocolUUID)
		if state.Config.UUID == task.ProtocolUUID {
			targetDevice = state
			break
		}
	}

	if targetDevice == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Device with specified UUID does not exist"})
		return
	}

	// 根據設備協定驗證任務參數
	if err := validateTaskForProtocol(&task, targetDevice.Config.Protocol); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 如果 ptuuids 為空，根據 quantity 或 oid_num 自動分配可用的點位
	if len(task.PTUUIDs) == 0 {
		var requiredCount int
		if targetDevice.Config.Protocol == "modbus_tcp" || targetDevice.Config.Protocol == "modbus_rtu" {
			requiredCount = int(task.Quantity)
		} else if targetDevice.Config.Protocol == "snmp" {
			requiredCount = int(task.OIDnum)
		}

		if requiredCount > 0 {
			availablePoints, err := getAvailablePoints(requiredCount)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get available points: " + err.Error()})
				return
			}
			if len(availablePoints) < requiredCount {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": fmt.Sprintf("Not enough available points. Required: %d, Available: %d",
						requiredCount, len(availablePoints))})
				return
			}
			task.PTUUIDs = availablePoints[:requiredCount]
		}
	}

	// 將被參考到的 points 的 enable 設為 true
	if len(task.PTUUIDs) > 0 {
		// 載入所有點位
		points, err := LoadPoints(POINTSFILENAME)
		if err == nil {
			updated := false
			for i := range points {
				for _, uuid := range task.PTUUIDs {
					if points[i].UUID == uuid && !points[i].Enable {
						points[i].Enable = true
						updated = true
					}
				}
			}
			if updated {
				_ = SavePoints(POINTSFILENAME, points)
			}
		}
	}

	// 檢查任務名稱是否重複
	for _, existingTask := range targetDevice.Config.Tasks {
		if existingTask.Name == task.Name {
			c.JSON(http.StatusConflict, gin.H{"error": "Task with this name already exists for this device"})
			return
		}
	}

	// 設定任務的其他欄位
	task.ProtocolUUID = targetDevice.Config.UUID
	if task.SlaveID == 0 {
		task.SlaveID = 1 // 預設 Slave ID
	}

	// 新增任務到設備
	targetDevice.Config.Tasks = append(targetDevice.Config.Tasks, task)

	// 儲存設定
	if err := SaveSplit(DEVICESFILENAME, TASKSFILENAME); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Task created successfully",
		"task":    task,
	})
}

// updateTask 更新任務
func updateTask(c *gin.Context) {
	taskUUID := c.Param("uuid")
	if taskUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task UUID parameter is required"})
		return
	}

	var updatedTask PointerTaskConfig
	if err := c.ShouldBindJSON(&updatedTask); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	// 輸入驗證
	if updatedTask.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task name is required"})
		return
	}
	if updatedTask.IntervalMs <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Interval must be greater than 0"})
		return
	}

	stateMutex.Lock()
	defer stateMutex.Unlock()

	// 尋找包含該任務的設備
	var targetDevice *DeviceState
	var taskIndex int = -1

	for _, state := range deviceStates {
		for i, task := range state.Config.Tasks {
			// 使用任務名稱和ProtocolUUID來識別任務
			if task.Name == taskUUID || (task.ProtocolUUID == taskUUID) {
				targetDevice = state
				taskIndex = i
				break
			}
		}
		if taskIndex != -1 {
			break
		}
	}

	if targetDevice == nil || taskIndex == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// 根據設備協定驗證任務參數
	if err := validateTaskForProtocol(&updatedTask, targetDevice.Config.Protocol); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 保持一些原有的系統欄位
	originalTask := targetDevice.Config.Tasks[taskIndex]
	updatedTask.ProtocolUUID = originalTask.ProtocolUUID
	if updatedTask.SlaveID == 0 {
		updatedTask.SlaveID = originalTask.SlaveID
		if updatedTask.SlaveID == 0 {
			updatedTask.SlaveID = 1
		}
	}

	// 從排程中移除舊任務
	RemoveSingleTaskFromSchedule(targetDevice.Config.Name, originalTask.Name)

	// 更新任務
	targetDevice.Config.Tasks[taskIndex] = updatedTask

	// 將更新後的任務加入排程
	AddSingleTaskToSchedule(targetDevice.Config.Name, updatedTask, targetDevice.Config.Enable)

	// 儲存設定
	if err := SaveSplit(DEVICESFILENAME, TASKSFILENAME); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Task updated successfully",
		"task":    updatedTask,
	})
}

// deleteTask 刪除任務
func deleteTask(c *gin.Context) {
	taskUUID := c.Param("uuid")
	if taskUUID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Task UUID parameter is required"})
		return
	}

	stateMutex.Lock()
	defer stateMutex.Unlock()

	// 尋找包含該任務的設備
	var targetDevice *DeviceState
	var taskIndex int = -1
	var deletedTask PointerTaskConfig

	for _, state := range deviceStates {
		for i, task := range state.Config.Tasks {
			// 使用任務名稱和ProtocolUUID來識別任務
			if task.Name == taskUUID || task.ProtocolUUID == taskUUID {
				targetDevice = state
				taskIndex = i
				deletedTask = task
				break
			}
		}
		if taskIndex != -1 {
			break
		}
	}

	if targetDevice == nil || taskIndex == -1 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	// 從設備的任務列表中移除任務
	targetDevice.Config.Tasks = append(
		targetDevice.Config.Tasks[:taskIndex],
		targetDevice.Config.Tasks[taskIndex+1:]...)

	// 從排程中移除任務 (新增這行來同步移除排程中的任務)
	RemoveSingleTaskFromSchedule(targetDevice.Config.Name, deletedTask.Name)

	// 儲存設定
	if err := SaveSplit(DEVICESFILENAME, TASKSFILENAME); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save configuration: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Task deleted successfully",
		"task":    deletedTask,
	})
}

// validateTaskForProtocol 根據設備協定驗證任務參數
func validateTaskForProtocol(task *PointerTaskConfig, protocol string) error {
	if protocol == "modbus_tcp" || protocol == "modbus_rtu" {
		// Modbus 協定驗證
		if task.Function == "" {
			return errors.New("function is required for Modbus tasks")
		}
		if task.Quantity == 0 {
			return errors.New("quantity must be greater than 0 for Modbus tasks")
		}
		if len(task.PTUUIDs) != int(task.Quantity) {
			return fmt.Errorf("ptuuids count (%d) must equal quantity (%d) for Modbus tasks",
				len(task.PTUUIDs), task.Quantity)
		}
		// 清空 SNMP 相關欄位
		task.StartOID = ""
		task.OIDnum = 0
	} else if protocol == "snmp" {
		// SNMP 協定驗證
		if task.StartOID == "" {
			return errors.New("start_oid is required for SNMP tasks")
		}
		if task.OIDnum == 0 {
			return errors.New("oid_num must be greater than 0 for SNMP tasks")
		}
		if len(task.PTUUIDs) != int(task.OIDnum) {
			return fmt.Errorf("ptuuids count (%d) must equal oid_num (%d) for SNMP tasks",
				len(task.PTUUIDs), task.OIDnum)
		}
		// 清空 Modbus 相關欄位
		task.Function = ""
		task.Address = 0
		task.Quantity = 0
	}

	return nil
}

// getAvailablePoints 取得指定數量的可用點位 UUID
func getAvailablePoints(count int) ([]string, error) {
	// 載入所有虛擬點位
	points, err := LoadPoints(POINTSFILENAME)
	if err != nil {
		return nil, fmt.Errorf("failed to load points: %w", err)
	}

	// 收集所有已使用的點位 UUID
	usedPoints := make(map[string]bool)

	// 遍歷所有設備的所有任務，收集已使用的點位
	stateMutex.RLock()
	for _, state := range deviceStates {
		for _, task := range state.Config.Tasks {
			for _, ptUUID := range task.PTUUIDs {
				usedPoints[ptUUID] = true
			}
		}
	}
	stateMutex.RUnlock()

	// 尋找可用的點位（未被使用且已啟用的）
	var availablePoints []string
	for _, point := range points {
		// 檢查點位是否未被使用且已啟用
		if !usedPoints[point.UUID] && point.Enable {
			availablePoints = append(availablePoints, point.UUID)

			// 如果已找到足夠數量的點位，提前結束
			if len(availablePoints) >= count {
				break
			}
		}
	}

	return availablePoints, nil
}
