@echo off
chcp 65001 >nul
title dsh 插件控制台悬浮窗
cd /d "%~dp0"
set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%PATH%"
set "ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/"
if not exist "node_modules\electron\dist\electron.exe" (
  echo [dsh-overlay] Electron 未安装，正在安装（首次约需 1-2 分钟）...
  call npm install
)
echo [dsh-overlay] 启动悬浮窗（dsh 需已在运行，端口 3080）...
start "" "node_modules\electron\dist\electron.exe" .
