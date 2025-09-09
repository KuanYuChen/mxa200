# build-all.ps1

$ErrorActionPreference = "Stop"

$env:CGO_ENABLED = "0"

# 取得版本資訊
$VERSION = (git describe --tags --dirty --always 2>$null) -replace "`n",""
if (-not $VERSION) { $VERSION = "v0.0.0" }
$COMMIT = (git rev-parse --short HEAD 2>$null) -replace "`n",""
if (-not $COMMIT) { $COMMIT = "nogit" }
$BUILD_TIME = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")

$LDFLAGS = "-s -w -X 'main.Version=$VERSION' -X 'main.Commit=$COMMIT' -X 'main.BuildTime=$BUILD_TIME'"

$DIST = "deploy"
if (-not (Test-Path $DIST)) { New-Item -ItemType Directory -Path $DIST | Out-Null }

Write-Host "Building for multiple platforms..."

# Windows amd64
Write-Host "Building Windows amd64..."
$env:GOOS = "windows"
$env:GOARCH = "amd64"
go build -trimpath -ldflags "$LDFLAGS" -o "$DIST/iot-agent.exe" .

# Linux amd64
Write-Host "Building Linux amd64..."
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -trimpath -ldflags "$LDFLAGS" -o "$DIST/iot-agent_linux_amd64" .

# Linux arm64
Write-Host "Building Linux ARM64 (i.MX8/8M Plus)..."
$env:GOOS = "linux"
$env:GOARCH = "arm64"
go build -trimpath -ldflags "$LDFLAGS" -o "$DIST/iot-agent_linux_arm64" .

Write-Host "Build completed successfully!"
Write-Host "Files created in $DIST directory:"
Get-ChildItem -Path $DIST

Write-Host ""
Write-Host "For i.MX8 Debian Linux, use: $DIST/iot-agent_linux_arm64"
