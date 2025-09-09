// snmp_client.go
package main

import (
	"errors"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/gosnmp/gosnmp"
)

/*
功能概要
- 長連線重複使用：首次需求時建立連線，之後重用。
- 自動斷線偵測與重連：每次操作前檢查，失敗時關閉並重連。
- retry/backoff：操作層與連線層都含重試與指數退避。
- 與現有系統整合：
  - RunSNMPTask(DeviceProtocolConfig, PointerTaskConfig) 維持介面不變（工作池直接呼叫）。
  - NewSnmpClient() 保留供啟動時初始化使用（InitSnmpClients 會呼叫）:contentReference[oaicite:2]{index=2}。
*/

// ---- 可調整參數 ----

type SNMPOpts struct {
	// 針對一次 SNMP 操作（GetBulk）允許的最大重試次數（不含首次嘗試）
	OpMaxRetries int

	// 針對連線建立（Connect）允許的最大重試次數（不含首次嘗試）
	DialMaxRetries int

	// 指數退避起始時間（例如 200ms，會成倍增長）
	BaseBackoff time.Duration

	// SNMP 操作逾時（會設到 gosnmp.Timeout）
	OpTimeout time.Duration

	// 連線嘗試的「整體」容忍時間上限（粗略控制）
	// gosnmp 沒獨立 DialTimeout，因此此值只用來限制我們自己重試循環的總時間
	DialBudget time.Duration
}

func defaultSNMPOpts() SNMPOpts {
	return SNMPOpts{
		OpMaxRetries:   3,
		DialMaxRetries: 3,
		BaseBackoff:    200 * time.Millisecond,
		OpTimeout:      1 * time.Second,
		DialBudget:     2 * time.Second,
	}
}

// ---- 你的型別（在 config.go 已定義，此處只列關鍵欄位） ----
// DeviceProtocolConfig: Name, IP, Port, Community, Protocol...
// PointerTaskConfig:    Name, StartOID, OIDnum(uint32), UUIDs...
// 參考：Load/合併、排程與呼叫都已存在:contentReference[oaicite:3]{index=3}:contentReference[oaicite:4]{index=4}。

// ---- 內部連線包裝器 ----

type snmpWrapper struct {
	mu        sync.Mutex
	sess      *gosnmp.GoSNMP
	dev       DeviceProtocolConfig
	community string
	opts      SNMPOpts
}

var (
	wrapMu      sync.Mutex
	snmpWrapMap = map[string]*snmpWrapper{} // 以 dev.Name 為 key
)

// 建立新的 snmpWrapper
func newSNMPWrapper(dev DeviceProtocolConfig, community string, opts SNMPOpts) *snmpWrapper {
	return &snmpWrapper{
		dev:       dev,
		community: community,
		opts:      opts,
	}
}

// 建立新的 *gosnmp.GoSNMP
func (w *snmpWrapper) buildSession() *gosnmp.GoSNMP {
	port := w.dev.Port
	if port <= 0 || port > 65535 {
		port = 161
	}
	return &gosnmp.GoSNMP{
		Target:    w.dev.IP,
		Port:      uint16(port),
		Community: w.community,
		Version:   gosnmp.Version2c,
		// 我們用外部的 retry/backoff 控制，內建 Retries 設 0
		Retries: 0,
		Timeout: w.opts.OpTimeout,
		// Transport 預設 udp
	}
}

// 建立連線（內部使用，須先鎖定 mu）
func (w *snmpWrapper) connectLocked() error {
	if w.dev.IP == "" {
		return errors.New("SNMP connect: empty IP")
	}
	if net.ParseIP(w.dev.IP) == nil {
		return fmt.Errorf("SNMP connect: invalid IP %q", w.dev.IP)
	}
	// 關掉舊連線
	if w.sess != nil && w.sess.Conn != nil {
		_ = w.sess.Conn.Close()
	}
	w.sess = w.buildSession()

	attempts := w.opts.DialMaxRetries + 1
	backoff := w.opts.BaseBackoff
	deadline := time.Now().Add(w.opts.DialBudget)

	var lastErr error
	for i := 0; i < attempts; i++ {
		if time.Now().After(deadline) {
			return fmt.Errorf("SNMP dial budget exceeded after %d attempts: %v", i, lastErr)
		}
		if err := w.sess.Connect(); err == nil {
			return nil
		} else {
			lastErr = err
			if i < attempts-1 {
				time.Sleep(backoff)
				backoff *= 2
			}
		}
	}
	return fmt.Errorf("SNMP connect failed after %d attempts: %w", attempts, lastErr)
}

// 確保連線可用（內部使用，須先鎖定 mu）
func (w *snmpWrapper) ensureConnectedLocked() error {
	if w.sess != nil && w.sess.Conn != nil {
		return nil
	}
	return w.connectLocked()
}

// 執行 GetBulk（內部使用，須先鎖定 mu）
func (w *snmpWrapper) doGetBulk(oids []string, nonRepeaters uint8, maxRepetitions uint32) (*gosnmp.SnmpPacket, error) {
	w.mu.Lock()
	defer w.mu.Unlock()

	if err := w.ensureConnectedLocked(); err != nil {
		return nil, err
	}

	attempts := w.opts.OpMaxRetries + 1
	backoff := w.opts.BaseBackoff

	var lastErr error
	for i := 0; i < attempts; i++ {
		pkt, err := w.sess.GetBulk(oids, nonRepeaters, maxRepetitions)
		if err == nil {
			return pkt, nil
		}
		lastErr = err

		// 失敗：關閉並重連再試
		if w.sess != nil && w.sess.Conn != nil {
			_ = w.sess.Conn.Close()
			w.sess.Conn = nil
		}
		if errConn := w.connectLocked(); errConn != nil {
			// 連線也上不來，提早結束
			return nil, fmt.Errorf("SNMP reconnect failed: %w (orig op err: %v)", errConn, err)
		}

		if i < attempts-1 {
			time.Sleep(backoff)
			backoff *= 2
		}
	}
	return nil, fmt.Errorf("SNMP GetBulk failed after %d attempts: %w", attempts, lastErr)
}

// ---- 供其他模組呼叫的 API ----
// NewSnmpClient：保留給啟動初始化使用（InitSnmpClients 會呼叫並放入 snmpClientMap）:contentReference[oaicite:5]{index=5}。
// 這裡回傳「已連線」的 *gosnmp.GoSNMP；若失敗回傳 nil。
func NewSnmpClient(dev DeviceProtocolConfig, task PointerTaskConfig) *gosnmp.GoSNMP {
	opts := defaultSNMPOpts()

	community := dev.Community
	if task.Community != "" {
		community = task.Community
	}

	// 取得/建立 wrapper
	wrapMu.Lock()
	w, ok := snmpWrapMap[dev.Name]
	if !ok {
		w = newSNMPWrapper(dev, community, opts)
		snmpWrapMap[dev.Name] = w
	}
	wrapMu.Unlock()

	// 建立連線（若成功，回傳 session；失敗回 nil）
	w.mu.Lock()
	defer w.mu.Unlock()
	if err := w.ensureConnectedLocked(); err != nil {
		fmt.Printf("❌ SNMP connect error for %s: %v\n", dev.Name, err)
		return nil
	}
	return w.sess
}

// GetOrCreateSNMPSession：如需直接拿到可用 session 可呼叫此函式。
func GetOrCreateSNMPSession(dev DeviceProtocolConfig, task PointerTaskConfig) (*gosnmp.GoSNMP, error) {
	opts := defaultSNMPOpts()

	community := dev.Community
	if task.Community != "" {
		community = task.Community
	}

	// 取得/建立 wrapper
	wrapMu.Lock()
	w, ok := snmpWrapMap[dev.Name]
	if !ok {
		w = newSNMPWrapper(dev, community, opts)
		snmpWrapMap[dev.Name] = w
	}
	wrapMu.Unlock()

	// 確保已連線
	w.mu.Lock()
	defer w.mu.Unlock()
	if err := w.ensureConnectedLocked(); err != nil {
		return nil, err
	}
	return w.sess, nil
}

// RunSNMPTask：由工作池在排程時呼叫:contentReference[oaicite:6]{index=6}。
// 從 StartOID 以 GetBulk 讀取 OIDnum 筆資料。
func RunSNMPTask(dev DeviceProtocolConfig, pt PointerTaskConfig) (map[string]interface{}, error) {
	opts := defaultSNMPOpts()

	community := dev.Community
	if pt.Community != "" {
		community = pt.Community
	}

	// 取得/建立 wrapper
	wrapMu.Lock()
	w, ok := snmpWrapMap[dev.Name]
	if !ok {
		w = newSNMPWrapper(dev, community, opts)
		snmpWrapMap[dev.Name] = w
	}
	wrapMu.Unlock()

	// 進行帶自動重連 + retry 的 GetBulk
	maxReps := uint32(1)
	if pt.OIDnum > 0 {
		if pt.OIDnum > 255 {
			maxReps = 255
		} else {
			maxReps = uint32(pt.OIDnum)
		}
	}
	pkt, err := w.doGetBulk([]string{pt.StartOID}, 0, maxReps)
	if err != nil {
		return nil, err
	}

	// 組裝結果
	valueMap := make(map[string]interface{}, len(pkt.Variables)+1)
	//valueMap["ts"] = time.Now().Format("2006-01-02 15:04:05")

	for i, v := range pkt.Variables {
		label := fmt.Sprintf("%s_%d", pt.Name, i)
		if i < len(pt.PTUUIDs) && pt.PTUUIDs[i] != "" {
			label = pt.PTUUIDs[i]
		}
		switch v.Type {
		case gosnmp.OctetString:
			if b, ok := v.Value.([]byte); ok {
				valueMap[label] = string(b)
			} else {
				valueMap[label] = v.Value
			}
		default:
			valueMap[label] = v.Value
		}
	}
	return valueMap, nil
}

// CloseSNMPDevice：手動關閉並移除某裝置的 SNMP 連線（需要時可呼叫）
func CloseSNMPDevice(deviceName string) {
	wrapMu.Lock()
	w, ok := snmpWrapMap[deviceName]
	if ok {
		delete(snmpWrapMap, deviceName)
	}
	wrapMu.Unlock()

	if ok {
		w.mu.Lock()
		if w.sess != nil && w.sess.Conn != nil {
			_ = w.sess.Conn.Close()
			w.sess.Conn = nil
		}
		w.mu.Unlock()
	}
}
