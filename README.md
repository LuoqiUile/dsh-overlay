# DSH 插件控制台（dsh-overlay）

> DeepSeek Harness 插件控制台悬浮窗 —— 随 dsh 启动，全部插件一目了然、随手开关。

![version](https://img.shields.io/badge/version-0.1.33-blue) ![platform](https://img.shields.io/badge/platform-Windows%2010%2F11%20x64-lightgrey) ![license](https://img.shields.io/badge/license-MIT-green)

**DSH 插件控制台**是一个基于 Electron 的 Windows 桌面悬浮窗应用，专为 [DeepSeek Harness（dsh）](https://www.npmjs.com/package/@deepseek-ai/dsh) 用户打造。它以无边框透明悬浮窗的形式常驻桌面，**两列实时罗列 dsh 已安装的全部插件**，每张卡片包含中文名、版本、状态与独立开关，并提供设置、状态诊断、回收站、强制重启等管理能力。

配合本仓库内置的 `launcher/` 启动钩子，`dsh web` 一启动，悬浮窗自动出现。

> **📦 最新安装包（v0.1.33）**：GitHub Releases → [https://github.com/LuoqiUile/dsh-overlay/releases](https://github.com/LuoqiUile/dsh-overlay/releases)（setup 安装包 + portable 便携版）

## 📁 项目结构（统一仓库）

```
dsh-overlay/                  ← 本项目 = 悬浮窗完整生态
├── main.js / preload.js      ← 悬浮窗主进程与桥接
├── renderer/index.html       ← 悬浮窗界面
├── package.json              ← 工程与打包配置
├── launcher/                 ← 自动拉起钩子插件（dsh-overlay-launcher 源码）
├── docs/                     ← 全部教程文档
│   ├── 插件安装教程.md           ← 插件安装全指南
│   ├── dsh-插件一键安装指令清单.md ← 「给dsh安装skill：…」格式一键清单
│   ├── DSH插件控制台安装教程.md   ← 本插件专项安装教程
│   └── 其他设备部署说明.md        ← 跨设备三步部署
├── README.md / LICENSE
└── dist/（不入库，Release 分发）
```

---

## ✨ 功能特性

| 能力 | 说明 |
| --- | --- |
| 插件总览 | 两列卡片实时罗列 dsh 已装全部插件（中文名 + 版本 + 状态） |
| 独立开关 | 每个插件独立启停，真实调用 dshmarket 接口 |
| 官方判定弹窗 | 开关后按 dsh 官方判定提示「重启 / 刷新 / 即时生效」，并提供一键执行 |
| 悬停提示 | 鼠标悬停插件卡 → 并排显示使用说明（不遮挡） |
| 展开详情 | 展开小三角：功能项可再展开直接操作（应用主题 / 启停 / 检查更新 / 更新此插件 / 打开市场 / 刷新状态 / 删除插件） |
| 回收站 | 删除插件移入回收站，可一键恢复或彻底删除 |
| 折叠小条 | 窗口收成顶部 42px 小条（不缩回任务栏），点展开恢复 |
| 托盘常驻 | 点关闭（X）隐藏到状态栏，进程保留；托盘图标点击唤回 |
| 托盘快捷操作 | 右键托盘：显示 / 折叠 / **强制重启 dsh web** / 退出 |
| 自由缩放 | 拖窗口边缘任意调整大小 |
| 设置面板 | 整体颜色、背景透明度、字体大小（80%–150%）、文字加粗，全部全局生效并自动记忆 |
| 状态诊断 | 顶部扳手：dsh 命令、token、连接状态、回收站目录一键体检 |
| 强制重启 dsh | 设置底部 / 托盘菜单：清理占用 3080 的旧进程并强制重启，**就绪后自动打开浏览器** |
| 开屏提示 | 首次弹出使用提示，点「知道了」自动折叠成小条，由用户手动打开 |
| 置顶 | 一键置顶悬浮窗 |
| 自检模式 | 内置 1–5 级自检（界面 / 折叠 / 设置 / 弹窗 / 诊断截图） |

---

## 📦 安装

### 方式 A：安装包（推荐正式使用）

从发布页下载 `DSH插件控制台-0.1.33-x64-setup.exe`，双击运行，向导安装，自动创建桌面快捷方式与开始菜单项。

### 方式 B：便携版

下载 `DSH插件控制台-0.1.33-x64-portable.exe`，放到任意目录双击直接运行（首次会自解压，稍慢几秒），免安装绿色使用。

### 方式 C：源码运行（开发）

```bash
# 需要 Node.js 20+（建议 24.x LTS）
git clone https://github.com/LuoqiUile/dsh-overlay.git
cd dsh-overlay
npm install
npm start          # 或双击 启动悬浮窗.cmd
```

### 运行前提（任意方式安装后）

1. **确保 dsh 已安装并运行**：终端执行 `dsh web`（保持运行，端口 3080）
2. **启动悬浮窗**：双击桌面「DSH 插件控制台」或运行便携版
3. 悬浮窗自动连接 dsh，两列显示全部插件

---

## 🚀 快速开始

### 方式 0：智能体一键安装（推荐，无需手动步骤）

把这段话发给任意具备 Shell 能力的 AI 智能体（豆包 / Claude 等），自动完成全部安装配置：

```
请在我的电脑上自动安装「DSH 插件控制台」。
先读取安装指南（任选可达的链接）：
- https://raw.githubusercontent.com/LuoqiUile/dsh-overlay/master/INSTALL-AGENT.md
- 或镜像：https://gh-proxy.com/https://raw.githubusercontent.com/LuoqiUile/dsh-overlay/master/INSTALL-AGENT.md
严格按该文件步骤执行，每步验证结果；需要安装授权时向用户确认；完成后汇报结果。
```

> 智能体会自动：检测/安装 Node → dsh → GitHub 加速 → 下载悬浮窗便携版 → 装 launcher 钩子 → 整体验证。
> 也可直接运行自动脚本：`powershell -ExecutionPolicy Bypass -File install/install-dsh-overlay.ps1`

**卸载**（发这段话给智能体即可自动移除）：

```
请卸载我电脑上的「DSH 插件控制台」。
先读取 https://raw.githubusercontent.com/LuoqiUile/dsh-overlay/master/INSTALL-AGENT.md
按其中「卸载」章节的步骤执行，需要删除授权时向用户确认，完成后汇报结果。
```

> 也可直接运行：`powershell -ExecutionPolicy Bypass -File install/install-dsh-overlay.ps1 -Uninstall`

### 方式 1：安装包（推荐正式使用）

> 悬浮窗依赖 dsh 的本地接口（`127.0.0.1:3080`）与登录 token 日志；**dsh 未运行时显示「未连接」、插件列表为空**。

### 自动拉起（推荐）

安装本仓库 `launcher/` 目录内的启动钩子后，每次 `dsh web` 都会自动拉起悬浮窗：

```powershell
# 方式一：从统一仓库本地安装（下载本仓库后执行）
dsh plugin --profile web add "file:路径\dsh-overlay\launcher"
```

---

## 🖥️ 使用说明

### 顶部按钮排

| 按钮 | 作用 |
| --- | --- |
| 状态诊断（扳手） | 打开诊断面板：dsh 命令、token、连接、回收站目录 |
| 设置 | 打开设置面板（颜色 / 透明度 / 字体 / 加粗 / 强制重启） |
| 回收站 | 打开回收站（已删除插件，可恢复 / 彻底删除） |
| 置顶 | 悬浮窗置顶开关 |
| 折叠 | 收成顶部小条 |
| 关闭（X） | 隐藏到状态栏托盘（进程常驻；真正退出在托盘菜单） |

### 插件卡片

- **开关**：点击开关启停插件，弹窗按官方判定提示后续动作（重启 / 刷新 / 即时生效）
- **悬停**：并排显示该插件使用说明
- **展开**：查看功能项并直接操作；底部有「删除插件」（移入回收站）

### 状态栏与底部

- 状态栏：实时连接状态 + 插件计数
- 底部：插件总数 + 「重启 dsh」按钮（调用 dshmarket `/restart`）

### 设置面板

| 项 | 说明 |
| --- | --- |
| 整体颜色 | 作用于开关、状态灯与强调色 |
| 背景透明度 | 全局背景透明度（文字始终清晰） |
| 字体大小 | 80% – 150% 无极调节 |
| 文字加粗 | 全局加粗开关 |
| 强制重启 dsh web | 清理占用 3080 的旧 dsh 进程并强制重启，就绪后自动打开浏览器 |

### 托盘（状态栏图标）

- **左键单击**：唤回 / 折叠悬浮窗
- **右键菜单**：显示悬浮窗 / 折叠小条 / 强制重启 dsh web / 退出
- 强制重启结果以系统气泡提示

---

## ⚙️ 配置

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `DSH_OVERLAY_EXE` | 悬浮窗程序路径（launcher 插件拉起时使用，可选） |

### token 机制

dsh 每次启动 token 会变化，悬浮窗自动从 `%APPDATA%\npm\dsh-web.log`（或 PATH 中 dsh.cmd 旁日志）尾部读取新 token，无需手动配置。

### 数据与日志

| 项目 | 位置 |
| --- | --- |
| 界面设置 | localStorage（自动记忆） |
| 运行日志 | `%APPDATA%\DSH插件控制台\error.log`（异常兜底） |
| 回收站 | `%USERPROFILE%\.dsh\recycle`（或本机 `C:\deepseek harness\dsh-回收站`） |

---

## 🛠️ 开发

### 工程结构

```
dsh-overlay/
├── main.js              # Electron 主进程（窗口 / 托盘 / token 轮询 / IPC / 自检）
├── preload.js           # contextBridge 安全桥接（12+ 方法）
├── renderer/index.html  # 界面（两列卡片 / 设置 / 诊断 / 回收站 / 开屏）
├── package.json         # 工程与打包配置
├── launcher/            # 自动拉起钩子插件（源码副本）
├── docs/                # 教程文档（安装 / 一键清单 / 部署）
├── 启动悬浮窗.cmd        # 一键启动脚本
├── start-overlay.cmd    # ASCII 启动脚本（跨设备）
├── tray-icon.png        # 托盘图标
└── build/icon.ico       # 打包图标（256px）
```

### 自检模式

```bash
# 启动并自动截图（0-5 级）
set DSH_OVERLAY_SELFCHECK=1 && node_modules\electron\dist\electron.exe .
```

- 1：主界面；2：折叠小条；3：设置面板；4：弹窗；5：诊断面板

### 打包

```bash
# Windows 下需设置 Electron 镜像加速
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
npx electron-builder --win nsis portable
```

产物输出到 `dist/`（NSIS 安装包 + 便携版）。

---

## 🔧 排错（FAQ）

| 现象 | 原因与解决 |
| --- | --- |
| 显示「未连接」/ 插件列表为空 | dsh 未运行：先 `dsh web`；或 token 日志路径异常（换 npm 全局目录需设环境变量） |
| `dsh web` 报 EADDRINUSE（端口 3080 被占） | 旧 dsh 实例还在：托盘菜单 / 设置里「强制重启 dsh web」 |
| 强制重启后浏览器没打开 | 旧版本行为；v0.1.33 起就绪后自动打开浏览器 |
| 打包 EBUSY | 悬浮窗运行中覆盖产物：先退出再打包 |
| Electron 二进制下载卡死 | 设置 `ELECTRON_MIRROR` 加速 |
| 悬浮窗没自动拉起 | 未装 launcher 插件；或悬浮窗不在默认位置（设 `DSH_OVERLAY_EXE`） |

---

## 📜 更新日志

| 版本 | 说明 |
| --- | --- |
| 0.1.33 | 强制重启增强：托盘菜单入口 + 重启后自动打开浏览器；逻辑重构共用 |
| 0.1.32 | 开屏文案更新（右下角重启提示 + 强制重启指引） |
| 0.1.31 | 开屏提示追加状态栏说明 |
| 0.1.30 | 设置底部新增「强制重启 dsh web」 |
| 0.1.29 | 关闭按钮改为隐藏到托盘常驻 |
| 0.1.28 | 开屏提示点「知道了」后自动折叠 |
| 0.1.26 | 跨设备打包（setup + portable），液态玻璃移除（最终态） |
| 0.1.x | 悬浮窗初版迭代（两列罗列 / 独立开关 / 折叠 / 设置 / 诊断 / 回收站） |

---

## 🤝 反馈与贡献

- 插件正在持续测试更新中，如有好点子或发现 bug，欢迎联系邮箱：**1707349822@qq.com**
- 欢迎提交 Issue / Pull Request

## 📄 许可证

[MIT](LICENSE) © LuoqiUile
