# run.ps1

$ErrorActionPreference = "Stop"

# 設定環境變數（如有需要）
$env:CGO_ENABLED = "0"

Write-Host "Running: go run ."
go run .
