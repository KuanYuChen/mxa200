#!/bin/bash

echo "========================================"
echo "i.MX8 系統診斷腳本"
echo "========================================"

echo "1. 檢查目標目錄和檔案..."
ls -la /opt/mxa200/

echo ""
echo "2. 檢查執行檔案權限和架構..."
if [ -f "/opt/mxa200/iot-agent_linux_arm64" ]; then
    file /opt/mxa200/iot-agent_linux_arm64
    ls -la /opt/mxa200/iot-agent_linux_arm64
else
    echo "執行檔案不存在: /opt/mxa200/iot-agent_linux_arm64"
fi

echo ""
echo "3. 檢查系統架構..."
uname -m
cat /proc/cpuinfo | grep -i processor | head -1

echo ""
echo "4. 檢查是否有必要的動態庫..."
if [ -f "/opt/mxa200/iot-agent_linux_arm64" ]; then
    ldd /opt/mxa200/iot-agent_linux_arm64 2>/dev/null || echo "靜態連結的執行檔或無法檢查動態庫依賴"
fi

echo ""
echo "5. 嘗試直接執行檔案..."
if [ -f "/opt/mxa200/iot-agent_linux_arm64" ]; then
    echo "嘗試執行: /opt/mxa200/iot-agent_linux_arm64"
    cd /opt/mxa200
    timeout 5s ./iot-agent_linux_arm64 || echo "執行失敗或超時"
fi

echo ""
echo "6. 檢查 systemd 服務日誌..."
journalctl -u plc.service -n 20 --no-pager

echo ""
echo "7. 檢查 PLC 程式..."
if [ -f "/opt/mxa200/plc" ]; then
    ls -la /opt/mxa200/plc
    file /opt/mxa200/plc
else
    echo "PLC 程式不存在: /opt/mxa200/plc"
fi
