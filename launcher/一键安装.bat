@echo off
chcp 65001 >nul
title 一键安装 dsh-overlay-launcher
setlocal enabledelayedexpansion

echo ============================================
echo   dsh-overlay-launcher 一键安装脚本
echo   安装目标：dsh web profile
echo ============================================
echo.

where dsh >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 dsh 命令。请先安装 DeepSeek Harness：
  echo   npm install -g @deepseek-ai/dsh
  pause
  exit /b 1
)

echo [1/3] 检查 dsh 是否正在运行（运行中安装会因文件锁失败）...
netstat -ano -p tcp 2>nul | findstr :3080 | findstr LISTENING >nul
if not errorlevel 1 (
  echo [提示] 检测到 dsh 正在运行（端口 3080）。
  echo        建议先关闭 dsh（Ctrl+C），安装完成后再运行 dsh web。
  choice /c YN /m "仍要继续安装吗"
  if errorlevel 2 exit /b 0
)

echo [2/3] 安装插件到 web profile...
dsh plugin --profile web add "%~dp0"
if errorlevel 1 (
  echo [错误] 安装失败。常见原因：
  echo   - dsh 正在运行导致 package.json.lock 被占用（关闭 dsh 后重试）
  echo   - profile 不存在（先运行一次 dsh web 生成默认 profile）
  pause
  exit /b 1
)

echo [3/3] 安装成功！
echo.
echo 下一步：重启 dsh（终端运行 dsh web），
echo 之后每次启动 dsh 都会自动拉起 DSH 插件控制台悬浮窗。
echo.
echo 若悬浮窗不在默认位置，请设置环境变量 DSH_OVERLAY_EXE 指向悬浮窗 exe。
echo 本插件安装位置：%~dp0
echo.
pause
