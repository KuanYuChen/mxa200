package main

import (
	"fmt"
	"log"
	"plc/mbserver"
	"time"
)

var mbserv *mbserver.Server

func InitModbusSlave() {
	mbserv = mbserver.NewServer()
	log.Println("✅ Modbus Server 初始化完成")
}

func ModbusSlave() {
	addr := fmt.Sprintf("0.0.0.0:5020")
	fmt.Println("Modbus TCP listen on", addr)

	// mbserv 應該已經在 InitModbusSlave() 中初始化了
	if mbserv == nil {
		log.Println("錯誤: Modbus Server 未初始化")
		return
	}

	//serv.SimValue() // 實時模擬數據

	//server.HoldingRegisters[i]=

	err := mbserv.ListenTCP(addr)
	if err != nil {
		log.Printf("%v\n", err)
	}
	defer mbserv.Close()

	// Wait forever
	for {
		time.Sleep(1 * time.Second)

	}
}
