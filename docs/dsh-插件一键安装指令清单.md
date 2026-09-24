# dsh 插件一键安装指令清单（可直接复制）

> 按你平时使用的格式整理：**「给dsh安装skill：GitHub.com/作者/仓库」**，发给豆包/任意 AI 即可自动安装。
> 每条附标准 git 命令对照（AI 不认 skill 格式时用）。全部为本机实测安装过的插件。

---

## 一、核心功能插件（推荐全装）

### 1. 上下文医生（dsh-context-doctor）— 上下文审计与修复
```
给dsh安装skill：GitHub.com/Zhenyu98/dsh-context-doctor
```
```powershell
dsh plugin --profile web add "git+https://github.com/Zhenyu98/dsh-context-doctor#main"
```

### 2. Token 保存（dsh-plugin-save-token）— 自动保存/恢复登录 token
```
给dsh安装skill：GitHub.com/vibe-any/dsh-plugin-save-token
```
```powershell
dsh plugin --profile web add "git+https://github.com/vibe-any/dsh-plugin-save-token"
```

### 3. 上下文管理（dsh-context）— 对话上下文工具集
```
给dsh安装skill：GitHub.com/bowenliang123/dsh-context
```
```powershell
dsh plugin --profile web add "git+https://github.com/bowenliang123/dsh-context"
```

### 4. Memos 备忘录（本地版）
```
给dsh安装skill：GitHub.com/MemTensor/Memos，本地版即可
```
```powershell
dsh plugin --profile web add "git+https://github.com/MemTensor/Memos#local"
```

---

## 二、媒体 / 技能 / 设计类

### 5. Distilly（人物画像技能）
```
给dsh安装skill：GitHub.com/titanwings/distilly
```
```powershell
dsh plugin --profile web add "git+https://github.com/titanwings/distilly"
```
> 装到 `~/.dsh/skills/distilly/`（filesystem skill）

### 6. 媒体技能（dsh-media-skills）
```
给dsh安装skill：GitHub.com/MJorgin/dsh-media-skill
```
```powershell
dsh plugin --profile web add "git+https://github.com/MJorgin/dsh-media-skills"
```

### 7. Web 产物设计师（dsh-web-artifact-designer）
```
给dsh安装skill：GitHub.com/xulelenlp/dsh-web-artifact-designer
```
```powershell
dsh plugin --profile web add "git+https://github.com/xulelenlp/dsh-web-artifact-designer#main"
```

### 8. GPT-Image-2 风格库（awesome-gpt-image-2）
```
给dsh安装skill：GitHub.com/freestylefly/awesome-gpt-image-2
```
> 装到 `~/.agents/skills/gpt-image-2-style-library/`（代理技能）

---

## 三、需要 API key 的插件

### 9. AnySearch 搜索（含 key 自动配置）
```
给dsh安装skill：GitHub.com/anysearch-ai/anysearch-skill
并配置 API key：as_sk_你的key
```
```powershell
setx ANYSEARCH_API_KEY "as_sk_你的key"
dsh plugin --profile web add "git+https://github.com/anysearch-ai/anysearch-dsh"   # 装插件本体
dsh plugin allow-version --accept-risk @anysearch/anysearch-dsh                    # 版本豁免
```

### 10. Atlas Cloud 媒体生成（含 key 自动配置）
```
给dsh安装skill：GitHub.com/AtlasClouldAl/atlas-cloud-skills
并申请 API key 自动配置
```
```powershell
setx ATLASCLOUD_API_KEY "apikey-你的key"
dsh plugin --profile web add "git+https://github.com/AtlasCloudAI/dsh-media-gen#v0.2.0"
```
> 注意：key 需有效且账户有余额，否则调用返回 402。

---

## 四、皮肤 / 主题类

### 11. 鲸鱼娘皮肤（maid-atelier）— 从 dshmarket 商城装
```
在dsh里安装图中这个插件（dshmarket 搜索 maid-atelier 鲸鱼娘皮肤）
```
```powershell
dsh plugin --profile web add "git+https://github.com/smalltailqwq/dsh-client-ui-skin-maid-atelier"
```

### 12. 终末地主题（dsh-theme-endfield）
```
安装终末地主题插件：dsh-theme-endfield（dshmarket / dsh.do 皮肤市场搜索）
```
```powershell
# 皮肤市场搜索 endfield 安装，或按市场页给出的 git/npx 源执行
dsh plugin --profile web add "git+<市场页提供的仓库源>"
```

---

## 五、自研组件

### 13. 悬浮窗（DSH 插件控制台）— 桌面应用，非 dsh 插件
- 下载安装包：`DSH插件控制台-0.1.33-x64-setup.exe`（本机 `C:\deepseek harness\dsh-overlay\dist\` 或 GitHub Releases）
- GitHub：`https://github.com/LuoqiUile/dsh-overlay`

### 14. 自动拉起钩子（dsh-overlay-launcher）— 让悬浮窗随 dsh 启动
```
安装自动拉起钩子：从统一仓库 https://github.com/LuoqiUile/dsh-overlay 下载后执行 dsh plugin --profile web add "file:路径\\dsh-overlay\\launcher"
```
```powershell
dsh plugin --profile web add "git+https://github.com/LuoqiUile/dsh-overlay#master"
```

---

## 六、市场本体与可选插件

### 15. dshmarket（插件市场本体）
- `dsh web` 界面左侧进入，或按 dsh 引导开启市场功能

### 可选（曾试装，可跳过）
| 插件 | 说明 |
| --- | --- |
| dsh-better-sidebar | 增强侧边栏 |
| dsh-whale-widget | 鲸鱼挂件 |
| dsh-theme-mineradio | 矿石收音机主题 |
| dsh-dream-skin | 梦境皮肤（UI 皮肤管理器） |
| @smalltailqwq/dsh-client-ui-skin-deep-whale-manager | 深鲸皮肤管理器 |
| @smalltailqwq/dsh-client-ui-skin-orca-link | 逆戟鲸皮肤 |

---

## 使用小贴士

1. **装完必须重启 dsh 生效**：`dsh web`（Ctrl+C 停旧实例，或悬浮窗托盘「强制重启 dsh web」）
2. **版本报错**：补一句 `dsh plugin allow-version --accept-risk <包名>`（如 anysearch-dsh）
3. **GitHub 慢/重置**：先执行 `git config --global url."https://gh-proxy.com/https://github.com/".insteadOf "https://github.com/"`
4. **验证**：`dsh plugin list` 或悬浮窗两列卡片查看

---

*更新记录：2026-09-24 v1.0（整理自本机 16 项实测安装）*
