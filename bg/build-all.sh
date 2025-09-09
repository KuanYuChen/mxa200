#!/bin/bash

set -e  # Exit on error

export CGO_ENABLED=0

# Get version info
VERSION=$(git describe --tags --dirty --always 2>/dev/null || echo "v0.0.0")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "nogit")
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

LDFLAGS="-s -w -X 'main.Version=$VERSION' -X 'main.Commit=$COMMIT' -X 'main.BuildTime=$BUILD_TIME'"

DIST="deploy"
mkdir -p "$DIST"

echo "Building for multiple platforms..."

# Windows amd64
echo "Building Windows amd64..."
GOOS=windows GOARCH=amd64 go build -trimpath -ldflags "$LDFLAGS" -o "$DIST/iot-agent.exe" .

# Linux amd64
echo "Building Linux amd64..."
GOOS=linux GOARCH=amd64 go build -trimpath -ldflags "$LDFLAGS" -o "$DIST/iot-agent_linux_amd64" .

# Linux arm64 (i.MX8/8M Plus) - This is for your i.MX8 Debian Linux
echo "Building Linux ARM64 (i.MX8/8M Plus)..."
GOOS=linux GOARCH=arm64 go build -trimpath -ldflags "$LDFLAGS" -o "$DIST/iot-agent_linux_arm64" .

echo "Build completed successfully!"
echo "Files created in rundist/ directory:"
ls -la "$DIST/"

echo ""
echo "For i.MX8 Debian Linux, use: $DIST/iot-agent_linux_arm64"
