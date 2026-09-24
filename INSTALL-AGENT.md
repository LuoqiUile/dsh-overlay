# INSTALL-AGENT.md — DSH 插件控制台智能体一键安装指南

> 本文件是给「安装智能体」执行的指令，不是给人阅读的教程。
> 使用方式：用户把下面这段话发给任意具备 Shell 能力的 AI 智能体（豆包 / Claude / 等），
> 智能体读取本文件并按步骤在本机执行，即可完成全部安装与自动配置。

```
请在我的电脑上自动安装「DSH 插件控制台」。
先读取安装指南（任选可达的链接）：
- https://raw.githubusercontent.com/LuoqiUile/dsh-overlay/master/INSTALL-AGENT.md
- 或镜像：https://gh-proxy.com/https://raw.githubusercontent.com/LuoqiUile/dsh-overlay/master/INSTALL-AGENT.md
严格按该文件步骤执行，每步验证结果；需要安装授权时向用户确认；完成后汇报结果。
```

---

## 执行环境

- 目标系统：Windows 10 / 11（x64），PowerShell
- 你拥有 Shell 执行能力。全部命令在 PowerShell 中执行。
- **安全原则**：安装类/覆盖类操作先向用户说明；GitHub 登录、支付、删除类操作一律不做。

## 步骤 0：环境检测

依次执行并记录结果：

```powershell
node --version
npm --version
git --version
dsh --version
```

判定：
- `node` 缺失 → 步骤 1
- `dsh` 缺失 → 步骤 3
- 均存在 → 跳到步骤 4

## 步骤 1：安装 Node.js（仅缺失时）

优先用 winget：

```powershell
winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
```

winget 失败时改用官网：下载 https://nodejs.org/dist/latest-v24.x/ 下的 `node-v24.x.x-x64.msi` 安装（默认路径）。安装后重开终端验证 `node --version`。

## 步骤 2：放开 PowerShell 脚本执行策略

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

## 步骤 3：安装 dsh（仅缺失时）

```powershell
npm install -g @deepseek-ai/dsh
```

> 已知坑：npm 11+ 默认禁用依赖脚本，若 dsh 安装报脚本被拒，属正常，不影响 git 源插件；dsh 本体可正常使用。

## 步骤 4：GitHub 加速（国内网络必配）

```powershell
git config --global url."https://gh-proxy.com/https://github.com/".insteadOf "https://github.com/"
```

验证：`git config --global --get-regexp '^url\.'` 能看到 gh-proxy 条目。

## 步骤 5：下载并放置悬浮窗（便携版）

下载便携版到用户目录：

```powershell
$dest = Join-Path $env:LOCALAPPDATA 'DSH插件控制台'
New-Item -ItemType Directory -Force $dest | Out-Null
Invoke-WebRequest -Uri 'https://github.com/LuoqiUile/dsh-overlay/releases/download/v0.1.33/DSH插件控制台-0.1.33-x64-portable.exe' -OutFile (Join-Path $dest 'DSH插件控制台.exe')
```

> 若网络无法直连 GitHub Release（国内常见），改用镜像前缀：
> `https://gh-proxy.com/https://github.com/LuoqiUile/dsh-overlay/releases/download/v0.1.33/DSH插件控制台-0.1.33-x64-portable.exe`

## 步骤 6：安装自动拉起钩子（launcher）

```powershell
$tmp = Join-Path $env:TEMP 'dsh-overlay-repo'
if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
git clone --depth 1 https://github.com/LuoqiUile/dsh-overlay.git $tmp
dsh plugin --profile web add "file:$tmp\launcher"
```

验证：`dsh plugin list` 中出现 `dsh-overlay-launcher`。

> launcher 会自动找到悬浮窗：默认 `%LOCALAPPDATA%\DSH插件控制台\DSH插件控制台.exe`；
> 若放在其他位置，设环境变量：`[Environment]::SetEnvironmentVariable('DSH_OVERLAY_EXE','<悬浮窗exe路径>','User')`

## 步骤 7：整体验证

```powershell
dsh web
```

验证清单：
- [ ] `dsh web` 启动无 EADDRINUSE 报错（端口 3080 空闲）
- [ ] 浏览器可打开 http://127.0.0.1:3080
- [ ] 悬浮窗自动弹出（launcher 拉起），两列插件卡片正常
- [ ] `dsh plugin list` 含 dsh-overlay-launcher

全部通过 → 安装成功。任一失败 → 按「排错」处理。

## 排错（智能体按此处理）

| 现象 | 处理 |
| --- | --- |
| `dsh : 禁止运行脚本` | 执行步骤 2 后重试 |
| git clone 超时/重置 | 确认步骤 4 已生效，或 clone 用 `https://gh-proxy.com/https://github.com/LuoqiUile/dsh-overlay.git` |
| 下载便携版失败 | 用 gh-proxy 镜像前缀重试 |
| `dsh plugin add file:...` 报错 | 确认克隆目录完整（含 launcher/package.json）；重试一次 |
| `dsh web` EADDRINUSE | 说明旧 dsh 在跑：`Get-NetTCPConnection -LocalPort 3080 -State Listen` 找到 PID → `taskkill /PID <PID> /T /F` → 重启 |
| 悬浮窗未自动拉起 | 确认步骤 6 成功；检查 `DSH_OVERLAY_EXE` 环境变量指向真实 exe |
| 版本不满足报错 | 按错误提示升级 dsh：`npm install -g @deepseek-ai/dsh@latest` |

## 可选：插件与 API Key

用户要求装插件时，执行 `dsh plugin --profile web add "git+https://github.com/<作者>/<仓库>"`（清单见仓库 docs/ 目录）；涉及 API Key 时**先向用户索要**，用 `setx` 写入用户级环境变量，不要写进任何文档。

## 完成汇报

按此格式汇报：安装结果（成功/失败）、每步验证输出、遗留问题（如有）、下一步（用户可做的动作）。
