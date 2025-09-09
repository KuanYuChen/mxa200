#!/bin/bash

# i.MX8 Debian 部署腳本
# 此腳本將應用程式和配置檔案部署到 /opt/mxa200/ 目錄

set -e

echo "========================================"
echo "i.MX8 Debian 部署腳本"
echo "========================================"

# 檢查是否為 root 用戶
if [ "$EUID" -ne 0 ]; then 
    echo "請以 root 權限執行此腳本"
    echo "使用: sudo ./deploy.sh"
    exit 1
fi

# 創建目標目錄
TARGET_DIR="/opt/mxa200"
echo "創建目標目錄: $TARGET_DIR"
mkdir -p "$TARGET_DIR"

# 檢查建置檔案是否存在
BUILD_FILE="./dist/iot-agent_linux_arm64"
if [ ! -f "$BUILD_FILE" ]; then
    echo "錯誤: 找不到建置檔案 $BUILD_FILE"
    echo "請先執行 ./build-all.sh 進行建置"
    exit 1
fi

# 複製執行檔案
echo "複製執行檔案..."
cp "$BUILD_FILE" "$TARGET_DIR/"
chmod +x "$TARGET_DIR/iot-agent_linux_arm64"

# 複製配置檔案
echo "複製配置檔案..."
[ -f "./devices.json" ] && cp "./devices.json" "$TARGET_DIR/"
[ -f "./modbus_slave.json" ] && cp "./modbus_slave.json" "$TARGET_DIR/"
[ -f "./points.json" ] && cp "./points.json" "$TARGET_DIR/"
[ -f "./pttasks.json" ] && cp "./pttasks.json" "$TARGET_DIR/"

# 檢查 /opt/mxa200/plc 是否存在
if [ ! -f "$TARGET_DIR/plc" ]; then
    echo "警告: $TARGET_DIR/plc 檔案不存在"
    echo "請確保您的 PLC 程式已正確安裝在 $TARGET_DIR/plc"
fi

# 複製並安裝 systemd service
echo "安裝 systemd service..."
cp "./plc.service" "/etc/systemd/system/"
systemctl daemon-reload

echo "========================================"
echo "部署完成!"
echo "========================================"
echo "檔案位置:"
echo "- 執行檔案: $TARGET_DIR/iot-agent_linux_arm64"
echo "- 配置檔案: $TARGET_DIR/"
echo "- Service 檔案: /etc/systemd/system/plc.service"
echo ""
echo "管理 service 的指令:"
echo "- 啟用服務: systemctl enable plc.service"
echo "- 啟動服務: systemctl start plc.service"
echo "- 檢查狀態: systemctl status plc.service"
echo "- 查看日誌: journalctl -u plc.service -f"
echo "- 停止服務: systemctl stop plc.service"
echo "- 重啟服務: systemctl restart plc.service"
echo ""
echo "注意: 請確保 /opt/mxa200/plc 程式存在且可執行"
