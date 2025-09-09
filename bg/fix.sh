#!/bin/bash

echo "========================================"
echo "i.MX8 修復腳本"
echo "========================================"

# 檢查是否為 root 用戶
if [ "$EUID" -ne 0 ]; then 
    echo "請以 root 權限執行此腳本"
    echo "使用: sudo ./fix.sh"
    exit 1
fi

# 停止服務
echo "停止 plc 服務..."
systemctl stop plc.service

# 檢查並修復檔案權限
TARGET_DIR="/opt/mxa200"
EXEC_FILE="$TARGET_DIR/iot-agent_linux_arm64"

if [ -f "$EXEC_FILE" ]; then
    echo "設定執行檔案權限..."
    chmod +x "$EXEC_FILE"
    chown root:root "$EXEC_FILE"
    
    echo "檢查檔案資訊..."
    ls -la "$EXEC_FILE"
    file "$EXEC_FILE"
else
    echo "錯誤: 執行檔案不存在 $EXEC_FILE"
    echo "請確認是否已正確部署檔案"
    exit 1
fi

# 更新 systemd 服務檔案
echo "更新 systemd 服務檔案..."
cp "./plc.service" "/etc/systemd/system/"
systemctl daemon-reload

# 測試執行檔案
echo ""
echo "測試執行檔案..."
cd "$TARGET_DIR"

# 創建基本配置檔案（如果不存在）
if [ ! -f "$TARGET_DIR/devices.json" ]; then
    echo "創建預設 devices.json..."
    cat > "$TARGET_DIR/devices.json" << 'EOF'
{
  "devices": []
}
EOF
fi

if [ ! -f "$TARGET_DIR/points.json" ]; then
    echo "創建預設 points.json..."
    cat > "$TARGET_DIR/points.json" << 'EOF'
{
  "points": []
}
EOF
fi

if [ ! -f "$TARGET_DIR/pttasks.json" ]; then
    echo "創建預設 pttasks.json..."
    cat > "$TARGET_DIR/pttasks.json" << 'EOF'
{
  "tasks": []
}
EOF
fi

# 嘗試短時間執行測試
echo "嘗試執行測試（5秒）..."
timeout 5s ./iot-agent_linux_arm64 &
TEST_PID=$!
sleep 2

if kill -0 $TEST_PID 2>/dev/null; then
    echo "✓ 執行檔案可以正常啟動"
    kill $TEST_PID 2>/dev/null || true
    wait $TEST_PID 2>/dev/null || true
else
    echo "✗ 執行檔案無法啟動"
    echo "檢查詳細錯誤:"
    ./iot-agent_linux_arm64 || true
fi

echo ""
echo "重新啟動服務..."
systemctl start plc.service
sleep 2
systemctl status plc.service

echo ""
echo "修復完成！"
