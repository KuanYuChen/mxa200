// modbus_client.go
package main

import (
	"encoding/binary"
	"fmt"
	"log"
	"net"
	"sync"
	"time"

	"github.com/goburrow/modbus"
)

/*
支援：
- Modbus TCP 與 Modbus RTU（序列埠）
- 長連線重用 + 自動斷線重連 + retry/backoff
- 與既有系統相容：
  - RunModbusTask(*ModbusClient, PointerTaskConfig) 維持不變
  - NewModbusClientFromDevice(dev) 依 device.Protocol 自動建立 TCP/RTU
*/

// ===== 可調參數 =====

type ModbusOpts struct {
	OpMaxRetries   int           // 單次操作重試（不含第一次）
	DialMaxRetries int           // 連線重試（不含第一次）
	BaseBackoff    time.Duration // 退避起始值（指數成長）
	OpTimeout      time.Duration // 單次操作逾時
	DialBudget     time.Duration // 連線嘗試總預算
}

func defaultModbusOpts() ModbusOpts {
	return ModbusOpts{
		OpMaxRetries:   3,
		DialMaxRetries: 3,
		BaseBackoff:    200 * time.Millisecond,
		OpTimeout:      800 * time.Millisecond, // 與你原本相同
		DialBudget:     2 * time.Second,
	}
}

// ===== Client 結構 =====

type ModbusClient struct {
	// 二擇一：TCP 或 RTU
	TCP *modbus.TCPClientHandler
	RTU *modbus.RTUClientHandler

	Client modbus.Client

	mu   sync.Mutex
	opts ModbusOpts
}

// 與原檔一致的公開變數（保持相容）
var ModbusTimeOut = time.Duration(800) * time.Millisecond // 供外部參考

// ===== 建立器 =====

func NewModbusClientTCP(ip string, port int, opts ModbusOpts) *ModbusClient {

	if net.ParseIP(ip) == nil {
		// 讓 Connect() 自行失敗即可
	}
	if port <= 0 || port > 65535 {
		port = 502
	}
	addr := fmt.Sprintf("%s:%d", ip, port)

	h := modbus.NewTCPClientHandler(addr)
	h.Timeout = opts.OpTimeout

	c := &ModbusClient{TCP: h, opts: opts}
	c.Client = modbus.NewClient(h)
	return c
}
func NewModbusClientRTU(serialPort string, baud, dataBits int, parity string, stopBits int, opts ModbusOpts) *ModbusClient {
	if baud <= 0 {
		baud = 9600
	}
	if dataBits <= 0 {
		dataBits = 8
	}
	if parity == "" {
		parity = "N"
	}
	if stopBits <= 0 {
		stopBits = 1
	}

	h := modbus.NewRTUClientHandler(serialPort)
	h.BaudRate = baud
	h.DataBits = dataBits
	h.Parity = parity
	h.StopBits = stopBits

	h.Timeout = opts.OpTimeout

	log.Println("Modbus RTU on", serialPort, "baud", baud, "dataBits", dataBits, "parity", parity, "stopBits", stopBits)
	c := &ModbusClient{RTU: h, opts: opts}
	c.Client = modbus.NewClient(h)
	return c
}

// 依據 DeviceProtocolConfig 自動建立 TCP/RTU
func NewModbusClientFromDevice(dev DeviceProtocolConfig) *ModbusClient {
	opts := defaultModbusOpts()

	log.Println("建立 Modbus :", dev.Name, "Protocol:", dev.Protocol)
	switch dev.Protocol {
	case "modbus_rtu":
		log.Println("Modbus RTU on", dev.SerialPort, "baud", dev.BaudRate, "dataBits", dev.DataBits, "parity", dev.Parity, "stopBits", dev.StopBits)
		return NewModbusClientRTU(
			dev.SerialPort, dev.BaudRate, dev.DataBits, dev.Parity, dev.StopBits,
			opts,
		)
	case "modbus_tcp", "modbus", "": // "" 當 TCP
		log.Println("Modbus TCP to", dev.IP, "port", dev.Port)
		return NewModbusClientTCP(dev.IP, dev.Port, opts)

	default: // "modbus_tpc" 或空字串時當 TCP
		return nil

	}
}

// ===== 內部：連線管理 =====

func (cli *ModbusClient) setTimeoutLocked() {
	if cli.TCP != nil {
		cli.TCP.Timeout = cli.opts.OpTimeout
	}
	if cli.RTU != nil {
		cli.RTU.Timeout = cli.opts.OpTimeout
	}
}

func (cli *ModbusClient) setSlaveIDLocked(id uint8) {
	if id == 0 {
		id = 1
	}
	if cli.TCP != nil {
		cli.TCP.SlaveId = id
	}
	if cli.RTU != nil {
		cli.RTU.SlaveId = id
	}
}

func (cli *ModbusClient) closeLocked() {
	if cli.TCP != nil {
		_ = cli.TCP.Close()
	}
	if cli.RTU != nil {
		_ = cli.RTU.Close()
	}
}

func (cli *ModbusClient) connectLocked() error {
	// 關舊開新
	cli.closeLocked()
	cli.setTimeoutLocked()

	attempts := cli.opts.DialMaxRetries + 1
	backoff := cli.opts.BaseBackoff
	deadline := time.Now().Add(cli.opts.DialBudget)

	var lastErr error
	for i := 0; i < attempts; i++ {
		if time.Now().After(deadline) {
			return fmt.Errorf("modbus dial budget exceeded after %d attempts: %v", i, lastErr)
		}
		var err error
		if cli.TCP != nil {
			err = cli.TCP.Connect()
		} else if cli.RTU != nil {
			err = cli.RTU.Connect()
		} else {
			return fmt.Errorf("no modbus handler (TCP/RTU) configured")
		}
		if err == nil {
			return nil
		}
		lastErr = err
		if i < attempts-1 {
			time.Sleep(backoff)
			backoff *= 2
		}
	}
	return fmt.Errorf("modbus connect failed after %d attempts: %w", attempts, lastErr)
}

func (cli *ModbusClient) EnsureConnected() error {
	cli.mu.Lock()
	defer cli.mu.Unlock()
	return cli.connectLocked()
}

func (cli *ModbusClient) opWithRetry(unitID uint8, fn func() ([]byte, error)) ([]byte, error) {

	cli.mu.Lock()
	defer cli.mu.Unlock()

	// 先確保可用
	if err := cli.connectLocked(); err != nil {
		return nil, err
	}

	cli.setSlaveIDLocked(unitID)
	attempts := cli.opts.OpMaxRetries + 1
	backoff := cli.opts.BaseBackoff

	var lastErr error
	for i := 0; i < attempts; i++ {
		res, err := fn()
		if err == nil {
			return res, nil
		}
		lastErr = err

		// 常見錯誤：對端關閉/RST；策略：關閉→重連→退避重試
		cli.closeLocked()
		if errConn := cli.connectLocked(); errConn != nil {
			return nil, fmt.Errorf("modbus reconnect failed: %w (orig op err: %v)", errConn, err)
		}

		if i < attempts-1 {
			time.Sleep(backoff)
			backoff *= 2
		}
	}
	return nil, fmt.Errorf("modbus operation failed after %d attempts: %w", attempts, lastErr)
}

// ===== 工具 =====

func bytesToBits(data []byte, count int) []uint8 {
	bits := make([]uint8, 0, count)
	for i := 0; i < count; i++ {
		byteIndex := i / 8
		bitIndex := uint(i % 8)
		bit := (data[byteIndex] >> bitIndex) & 0x01
		bits = append(bits, bit)
	}
	return bits
}

// ===== 對外：維持原呼叫介面 =====

const MaxFailureCount = 5 // 與原本一致

func RunModbusTask(cli *ModbusClient, pt PointerTaskConfig) (map[string]interface{}, error) {
	if err := cli.EnsureConnected(); err != nil {
		return nil, fmt.Errorf("connect error: %w", err)
	}

	resultMap := make(map[string]interface{})
	// resultMap["ts"] = time.Now().Format("2006-01-02 15:04:05")

	switch pt.Function {
	case "read_coils":
		res, err := cli.opWithRetry(uint8(pt.SlaveID), func() ([]byte, error) {
			return cli.Client.ReadCoils(pt.Address, pt.Quantity)
		})
		if err != nil {
			return resultMap, fmt.Errorf("read coils error: %w", err)
		}
		bits := bytesToBits(res, int(pt.Quantity))
		for i, v := range bits {
			label := fmt.Sprintf("%s_%d", pt.Name, i)
			if i < len(pt.PTUUIDs) {
				label = pt.PTUUIDs[i]
			}
			resultMap[label] = v
		}

	case "read_discrete_inputs":
		res, err := cli.opWithRetry(uint8(pt.SlaveID), func() ([]byte, error) {
			return cli.Client.ReadDiscreteInputs(pt.Address, pt.Quantity)
		})
		if err != nil {
			return resultMap, fmt.Errorf("read discrete inputs error: %w", err)
		}
		bits := bytesToBits(res, int(pt.Quantity))
		for i, v := range bits {
			label := fmt.Sprintf("%s_%d", pt.Name, i)
			if i < len(pt.PTUUIDs) {
				label = pt.PTUUIDs[i]
			}
			resultMap[label] = v
		}

	case "read_holding_registers":
		res, err := cli.opWithRetry(uint8(pt.SlaveID), func() ([]byte, error) {
			return cli.Client.ReadHoldingRegisters(pt.Address, pt.Quantity)
		})
		if err != nil {
			return resultMap, fmt.Errorf("read holding registers error: %w", err)
		}
		uint16s := make([]uint16, len(res)/2)
		for i := 0; i < len(res); i += 2 {
			uint16s[i/2] = binary.BigEndian.Uint16(res[i : i+2])
		}
		for i, v := range uint16s {
			label := fmt.Sprintf("%s_%d", pt.Name, i)
			if i < len(pt.PTUUIDs) {
				label = pt.PTUUIDs[i]
			}
			resultMap[label] = v
		}

	case "read_input_registers":
		res, err := cli.opWithRetry(uint8(pt.SlaveID), func() ([]byte, error) {
			return cli.Client.ReadInputRegisters(pt.Address, pt.Quantity)
		})
		if err != nil {
			return resultMap, fmt.Errorf("read input registers error: %w", err)
		}
		uint16s := make([]uint16, len(res)/2)
		for i := 0; i < len(res); i += 2 {
			uint16s[i/2] = binary.BigEndian.Uint16(res[i : i+2])
		}
		for i, v := range uint16s {
			label := fmt.Sprintf("%s_%d", pt.Name, i)
			if i < len(pt.PTUUIDs) {
				label = pt.PTUUIDs[i]
			}
			resultMap[label] = v
		}

	case "write_single_coil":
		var value uint16 = 0
		if pt.Value != nil && *pt.Value {
			value = 0xFF00
		}
		_, err := cli.opWithRetry(uint8(pt.SlaveID), func() ([]byte, error) {
			_, e := cli.Client.WriteSingleCoil(pt.Address, value)
			return nil, e
		})
		if err != nil {
			return resultMap, fmt.Errorf("write single coil error: %w", err)
		}
		resultMap["address"] = pt.Address
		resultMap["value"] = value

	default:
		return resultMap, fmt.Errorf("unsupported function: %s", pt.Function)
	}

	return resultMap, nil
}
