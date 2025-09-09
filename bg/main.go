package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/mattn/go-sqlite3"
)

const (
	DEVICESFILENAME = "devices.json"
	TASKSFILENAME   = "pttasks.json"
	POINTSFILENAME  = "points.json"
	WEBSERVERPORT   = 8080
)

var (
	Version    = "1.0.0"
	Commit     = "none"
	BuildTime  = "unknown"
	Feature    = "standard" // 軟體功能區分：standard, professional, enterprise
	MaxPointer = 500        // 系統允許的最大點位數量
	Module     = "MXA-200"
)

func InitModbusClients(config *Config) {
	for _, dev := range config.Devices {
		if dev.Protocol == "modbus_tcp" || dev.Protocol == "modbus_rtu" {
			modbusClientMap[dev.Name] = NewModbusClientFromDevice(dev)
		}
	}
}

func InitSnmpClients(config *Config) {
	for _, dev := range config.Devices {
		if dev.Protocol == "snmp" {
			for _, t := range dev.Tasks {
				if _, ok := snmpClientMap[dev.Name]; !ok {
					snmp := NewSnmpClient(dev, t)
					if snmp != nil {
						snmpClientMap[dev.Name] = snmp
					}
				}
			}
		}

	}
}

// 將點為的資料存放在pointStates  的map 內 方便快查
func InitPointStatesFromConfig(cfg *Config) {
	virtualPointMapMutex.Lock()
	defer virtualPointMapMutex.Unlock()
	for _, vp := range cfg.Points {
		virtualPointMap[vp.UUID] = &vp
	}
	log.Printf("Initialized %d point states\n", len(virtualPointMap))
	// log.Println(pointStates)
}

// 將設備的狀態存放在deviceStates  的map 內 方便快查
func showConfig(cfg Config) {
	log.Println("Configuration:")
	for _, dev := range cfg.Devices {
		log.Printf("Device: %s, IP: %s, Protocol: %s, Enable: %v, Tasks: %d\n", dev.Name, dev.IP, dev.Protocol, dev.Enable, len(dev.Tasks))
		for _, t := range dev.Tasks {
			log.Printf("  Task: %s, Interval: %dms, DeviceUUID: %s, ProtocolUUID: %s, PTUUIDs: %d\n", t.Name, t.IntervalMs, t.DeviceUUID, t.ProtocolUUID, len(t.PTUUIDs))
		}
	}

	for _, pt := range cfg.Points {
		log.Printf("Point: %s, Enable: %t Type: %s\n", pt.Name, pt.Enable, pt.DataType)
		if pt.Enable {
			virtualPointValueCache[pt.UUID] = pt.InitValue
		}
	}

	for _, task := range cfg.Tasks {
		log.Printf("Task Name:%s, Interval:%dms,  PTUUIDs: %d\n", task.Name, task.IntervalMs, len(task.PTUUIDs))
	}

}

func main() {

	log.Println("設定虛擬點位數量為:", MaxPointer)
	pts, err := LoadPoints(POINTSFILENAME) //讀取點位
	if err != nil {
		log.Printf("警告: 載入點位設定失敗: %v", err)
		log.Printf("自動產生 %d 個預設虛擬點位...", MaxPointer)

		// 產生預設點位
		pts = GenDefaultPoints(MaxPointer)

		// 儲存到檔案
		if saveErr := SavePoints(POINTSFILENAME, pts); saveErr != nil {
			log.Printf("錯誤: 儲存點位設定失敗: %v", saveErr)
		} else {
			log.Printf("✅ 已成功產生並儲存 %d 個預設點位到 %s", len(pts), POINTSFILENAME)
		}
	} else {
		log.Printf("✅ 從 %s 載入了 %d 個點位", POINTSFILENAME, len(pts))

	}

	// 載入 config
	// 讀取分離檔並合併成內部 Config
	config, err := LoadConfigFromSplit(DEVICESFILENAME, TASKSFILENAME)
	if err != nil {
		log.Println("載入設定檔錯誤:", err)
		return
	}
	config.Points = pts // 加入點位

	// for i, pt := range pts {
	// 	fmt.Println(i, pt)
	// }
	// // return
	InitPointStatesFromConfig(config)

	log.Println("---------------------------------------------------------------------")
	fmt.Printf("App Version: %s, Feature: %s, Commit: %s, BuildTime: %s\n", Version, Feature, Commit, BuildTime)
	log.Println("---------------------------------------------------------------------")
	// log.Println("Config:", config)

	//modbus client初始化
	InitModbusClients(config)
	InitSnmpClients(config) // ⭐ 初始化 snmpClientMap

	// 初始化 Modbus Slave
	// 先同步初始化 mbserv，避免競爭條件
	InitModbusSlave()
	go ModbusSlave()

	log.Println("✅ 連線設定初始化完成")

	// Worker pool 與排程
	TaskQueue = make(chan ScheduledTask, 4096)
	shutdownSignal = make(chan struct{}) // 初始化關閉信號
	InitSchedulesFromConfig(config)
	InitDeviceStatesFromConfig(config) //

	// return
	// 根據 CPU 自動決定 worker 數
	cpuCount := runtime.NumCPU()
	workerCount := cpuCount * 2
	log.Printf("Detected CPU Cores: %d, Start Worker Pool: %d\n", cpuCount, workerCount)

	// go SchedulerLoop()
	go SchedulerLoopPrecise()
	StartWorkerPool(workerCount)

	// 啟動 Gin REST API
	r := gin.Default()
	RegisterRoutes(r)
	go func() {
		port := fmt.Sprintf(":%d", WEBSERVERPORT)
		if err := r.Run(port); err != nil {
			log.Println("Gin server 啟動失敗:", err)
			os.Exit(1)
		}
	}()

	// 優雅退出
	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	<-sigs
	log.Println("⏹️ 關閉中...")

	// 發送關閉信號給所有 goroutines
	close(shutdownSignal)

	// 先關閉任務佇列，讓 worker 完成手上的工作
	close(TaskQueue)

	// 給 worker 一些時間完成工作
	time.Sleep(2 * time.Second)

	// 關閉所有 Modbus 連線
	for name, client := range modbusClientMap {
		log.Printf("正在關閉 Modbus 連線: %s", name)
		if client.TCP != nil {
			_ = client.TCP.Close()
		}
		if client.RTU != nil {
			_ = client.RTU.Close()
		}
	}

	// 關閉所有 SNMP 連線
	for name := range snmpClientMap {
		log.Printf("正在關閉 SNMP 連線: %s", name)
		CloseSNMPDevice(name)
	}

	log.Println("✅ 所有連線已關閉")
}
