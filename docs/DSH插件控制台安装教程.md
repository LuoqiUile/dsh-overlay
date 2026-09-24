# DSH 插件控制台（dsh-overlay）安装教程

> 自研插件：悬浮窗 + 自动拉起钩子。本教程只讲这一个插件怎么装、怎么用。

---

## 一、一键安装（推荐，复制即用）

### 第一步：装自动拉起钩子（launcher）

直接发给豆包 / 任意 AI：

```
安装自动拉起钩子：从统一仓库 https://github.com/LuoqiUile/dsh-overlay 下载后执行 dsh plugin --profile web add "file:路径\\dsh-overlay\\launcher"
```

或手动执行：

```powershell
dsh plugin --profile web add "git+https://github.com/LuoqiUile/dsh-overlay#master"
```

> 装好后，以后每次 `dsh web` 都会**自动拉起悬浮窗**。

### 第二步：装悬浮窗本体（桌面应用）

launcher 是 dsh 插件，悬浮窗是 Electron 桌面应用，两者配合：

| 方式 | 操作 |
| --- | --- |
| 安装包 | 下载 `DSH插件控制台-0.1.33-x64-setup.exe`，双击安装 |
| 便携版 | 下载 `DSH插件控制台-0.1.33-x64-portable.exe`，双击直接运行 |
| 源码运行 | `git clone https://github.com/LuoqiUile/dsh-overlay.git && cd dsh-overlay && npm install && npm start` |

安装包获取位置：
- 本机：`C:\deepseek harness\dsh-overlay\dist\`
- GitHub：`https://github.com/LuoqiUile/dsh-overlay`（Releases 页）

---

## 二、前提条件

| 条件 | 说明 |
| --- | --- |
| Node.js LTS | 24.x，默认路径安装 |
| dsh 已安装 | `npm install -g @deepseek-ai/dsh` |
| 脚本策略放开 | `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| GitHub 加速（国内） | `git config --global url."https://gh-proxy.com/https://github.com/".insteadOf "https://github.com/"` |

---

## 三、使用速览

1. **启动 dsh**：终端 `dsh web` → 浏览器打开 `http://127.0.0.1:3080`
2. **悬浮窗自动出现**（launcher 拉起）→ 两列罗列全部插件，每卡独立开关
3. **常用操作**：
   - 悬停插件卡 → 并排显示使用说明
   - 点开关 → 官方判定弹窗（重启 / 刷新 / 即时生效）
   - 顶部按钮 → 状态诊断 / 设置 / 回收站 / 置顶 / 折叠
   - 点关闭（X）→ 隐藏到状态栏托盘（进程常驻，右键托盘可退出）
   - 托盘右键 → **强制重启 dsh web**（关闭浏览器后 web 拉不起来时用，就绪后自动打开浏览器）

---

## 四、验证安装成功

```powershell
dsh plugin list        # 看到 dsh-overlay-launcher
```
再 `dsh web`：悬浮窗自动弹出，插件卡片两列显示、状态灯正常 = 安装成功。

---

## 五、排错

| 现象 | 解决 |
| --- | --- |
| `dsh : 禁止运行脚本` | 执行策略未放开，见前提 |
| git 安装超时 | 配置 gh-proxy 加速后重试 |
| 装 launcher 报版本 | `dsh plugin allow-version --accept-risk dsh-overlay-launcher` |
| 悬浮窗没自动拉起 | launcher 未装 / 悬浮窗不在默认位置（设环境变量 `DSH_OVERLAY_EXE` 指向程序路径） |
| 显示未连接 | dsh 未运行，先 `dsh web` |
| web 拉不起来（端口占用） | 托盘右键「强制重启 dsh web」 |

---

## 六、卸载

```powershell
dsh plugin uninstall dsh-overlay-launcher   # 移除自动拉起
```
悬浮窗：控制面板卸载（安装包装）或直接删目录（便携版）。

---

*更新记录：2026-09-24 v1.0*
