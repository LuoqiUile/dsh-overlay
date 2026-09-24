# DSH 插件控制台 一键自动安装/卸载脚本
# 安装：powershell -ExecutionPolicy Bypass -File install-dsh-overlay.ps1
# 卸载：powershell -ExecutionPolicy Bypass -File install-dsh-overlay.ps1 -Uninstall
# 幂等：已安装的步骤自动跳过；输出每步结果；失败不中断（汇总报告）
param([switch]$Uninstall)
$ErrorActionPreference = 'Continue'
$REPO = 'LuoqiUile/dsh-overlay'
$VER = 'v0.1.33'
$PORTABLE_URL = "https://github.com/$REPO/releases/download/$VER/DSH.-0.1.33-x64-portable.exe"
$PORTABLE_URL_PROXY = "https://gh-proxy.com/https://github.com/$REPO/releases/download/$VER/DSH.-0.1.33-x64-portable.exe"
$DEST = Join-Path $env:LOCALAPPDATA 'DSH插件控制台'
$EXE = Join-Path $DEST 'DSH插件控制台.exe'

$report = @()
function Step($name, [scriptblock]$body) {
  Write-Host "==> [$name]" -ForegroundColor Cyan
  try { & $body; $script:report += "[OK] $name" } catch { $script:report += "[FAIL] $name :: $($_.Exception.Message)" }
}

Write-Host '=== DSH 插件控制台 自动安装 ===' -ForegroundColor Green

# 0. 卸载模式
if ($Uninstall) {
  Write-Host '=== 卸载模式 ===' -ForegroundColor Yellow
  Step '移除 launcher 钩子' {
    dsh plugin uninstall dsh-overlay-launcher --profile web
    Write-Host '  launcher 已移除（若未安装会提示，属正常）'
  }
  Step '删除悬浮窗目录' {
    if (Test-Path $DEST) { Remove-Item -Recurse -Force $DEST; Write-Host "  已删除: $DEST" }
    else { Write-Host '  目录不存在，跳过' }
  }
  Step '清理 DSH_OVERLAY_EXE 环境变量' {
    [Environment]::SetEnvironmentVariable('DSH_OVERLAY_EXE', $null, 'User')
    Write-Host '  已清理'
  }
  Write-Host ''
  Write-Host '=== 卸载完成 ===' -ForegroundColor Green
  Write-Host '提示：若用安装包安装过，还需在 设置→应用 中卸载「DSH插件控制台」；'
  Write-Host '      dsh 本体与 Node.js 未删除（如需一并卸载请手动执行 npm uninstall -g @deepseek-ai/dsh）。'
  $report | ForEach-Object { Write-Host "  $_" }
  return
}

# 1. Node.js
Step 'Node.js 检测' {
  $node = & node --version 2>$null
  if ($LASTEXITCODE -eq 0 -and $node) { Write-Host "  已安装: $node"; return }
  Write-Host '  未安装，尝试 winget...'
  winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
  # winget 安装后 PATH 需刷新
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  $node = & node --version 2>$null
  if ($LASTEXITCODE -eq 0 -and $node) { Write-Host "  安装成功: $node" } else { throw 'Node.js 安装失败，请手动安装后重跑' }
}

# 2. 执行策略
Step 'PowerShell 执行策略' {
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
  Write-Host '  已设为 RemoteSigned'
}

# 3. dsh
Step 'dsh 安装' {
  $dsh = Get-Command dsh.cmd -ErrorAction SilentlyContinue
  if ($dsh) { Write-Host "  已安装: $($dsh.Source)"; return }
  npm install -g @deepseek-ai/dsh
  if ($LASTEXITCODE -ne 0) { throw 'dsh 安装失败' }
  Write-Host '  dsh 安装完成'
}

# 4. GitHub 加速
Step 'GitHub 加速' {
  $has = git config --global --get-regexp '^url\.' 2>$null
  if ($has -match 'gh-proxy') { Write-Host '  加速已配置'; return }
  git config --global url."https://gh-proxy.com/https://github.com/".insteadOf "https://github.com/"
  Write-Host '  已配置 gh-proxy 加速'
}

# 5. 悬浮窗便携版
Step '悬浮窗下载' {
  New-Item -ItemType Directory -Force $DEST | Out-Null
  if (Test-Path $EXE) { Write-Host "  已存在: $EXE"; return }
  $ok = $false
  try { Invoke-WebRequest -Uri $PORTABLE_URL -OutFile $EXE -UseBasicParsing; $ok = $true } catch { Write-Host '  直连失败，尝试 gh-proxy 镜像...' }
  if (-not $ok) {
    try { Invoke-WebRequest -Uri $PORTABLE_URL_PROXY -OutFile $EXE -UseBasicParsing; $ok = $true } catch { throw '悬浮窗下载失败（直连与镜像均失败）' }
  }
  Write-Host "  下载完成: $EXE ($([math]::Round((Get-Item $EXE).Length/1MB))MB)"
}

# 6. launcher
Step 'launcher 自动拉起钩子' {
  $src = Join-Path $env:LOCALAPPDATA 'dsh-overlay-src'   # 勿用 TEMP：file: 路径会写进 lockfile
  if (Test-Path $src) { Remove-Item -Recurse -Force $src }
  git clone --depth 1 "https://github.com/$REPO.git" $src
  if ($LASTEXITCODE -ne 0) { git clone --depth 1 "https://gh-proxy.com/https://github.com/$REPO.git" $src }
  dsh plugin --profile web add "file:$src\launcher"
  if ($LASTEXITCODE -ne 0) { throw 'launcher 安装失败' }
  Write-Host '  launcher 已安装'
}

# 7. 验证
Step '最终验证' {
  $list = dsh plugin list --profile web 2>$null | Out-String
  $hasLauncher = $list -match 'dsh-overlay-launcher'
  Write-Host "  dsh plugin list --profile web 含 launcher: $hasLauncher"
  if (-not $hasLauncher) { throw 'launcher 未出现在插件列表' }
}

Write-Host ''
Write-Host '=== 安装报告 ===' -ForegroundColor Green
$report | ForEach-Object { Write-Host "  $_" }
Write-Host ''
Write-Host "下一步：执行 dsh web 启动（悬浮窗会自动拉起）。安装包位于: $EXE"
