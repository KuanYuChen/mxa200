@echo off
if exist .\dist (
    echo "remove dist folder"
    rmdir /s /q .\dist
)

call npm run build

if exist .\dist (
    xcopy .\dist\ ..\bg\webapi\dist /E /I /H /Y
    echo "move dist to ../bg/"

) else (
    echo ❌ build 失敗，dist 資料夾不存在
)