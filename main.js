const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const { existsSync, statSync } = require('fs');
const fsFull = require('fs');
const { exec } = require('child_process');
const path = require('path');
const http = require('http');

const DSH_ORIGIN = 'http://127.0.0.1:3080';
const POLL_MS = 3000;
/* 背景自适应（桌面采样）已按用户要求关闭 */

// ---------- 跨设备路径探测：不依赖固定用户名 / 固定安装位置 ----------
// 回收站目录：本机旧路径存在则沿用（保留既有回收站数据），否则用 dsh 用户数据目录下的 recycle
function resolveRecycleDir() {
  const legacy = 'C:\\deepseek harness\\dsh-回收站';
  try { if (existsSync(legacy)) return legacy; } catch (e) {}
  return path.join(process.env.USERPROFILE || '', '.dsh', 'recycle');
}
const RECYCLE_DIR = resolveRecycleDir();

// dsh 命令：优先环境变量 DSH_CMD，其次 %APPDATA%\npm，再次 PATH 探测（异步）
function resolveDshCmd() {
  const cands = [
    path.join(process.env.APPDATA || '', 'npm', 'dsh.cmd'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm', 'dsh.cmd'),
  ];
  for (const c of cands) { try { if (existsSync(c)) return c; } catch (e) {} }
  return cands[0];
}
let DSH_CMD = process.env.DSH_CMD && existsSync(process.env.DSH_CMD) ? process.env.DSH_CMD : resolveDshCmd();
(function () {
  exec('where dsh.cmd', { timeout: 5000, windowsHide: true }, (e, so) => {
    const line = ((so || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)[0] || '');
    if (line && /dsh\.cmd$/i.test(line)) { try { if (existsSync(line)) DSH_CMD = line; } catch (_) {} }
  });
})();

// dsh 日志（token 来源）：多路径探测，dsh 安装位置/版本变化也能找到
function resolveWebLog() {
  const cands = [
    path.join(process.env.APPDATA || '', 'npm', 'dsh-web.log'),
    path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'npm', 'dsh-web.log'),
    path.join(process.env.LOCALAPPDATA || '', 'npm', 'dsh-web.log'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'npm', 'dsh-web.log'),
    path.join(path.dirname(DSH_CMD), 'dsh-web.log'),
    path.join(path.dirname(DSH_CMD), '..', 'dsh-web.log'),
  ];
  for (const c of cands) { try { if (existsSync(c)) return c; } catch (e) {} }
  // 兜底：扫描 ~/.dsh/logs 最新含 token= 的日志（版本差异时日志可能落这里）
  try {
    const logsDir = path.join(process.env.USERPROFILE || '', '.dsh', 'logs');
    if (existsSync(logsDir)) {
      const files = require('fs').readdirSync(logsDir).filter((f) => f.endsWith('.log')).map((f) => path.join(logsDir, f));
      files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
      for (const f of files.slice(0, 5)) {
        try {
          const st = statSync(f);
          const size = Math.min(st.size, 65536);
          const fd = require('fs').openSync(f, 'r');
          const buf = Buffer.alloc(size);
          require('fs').readSync(fd, buf, 0, size, Math.max(0, st.size - size));
          require('fs').closeSync(fd);
          if (/token=/.test(buf.toString('utf8'))) return f;
        } catch (e) {}
      }
    }
  } catch (e) {}
  return cands[0];
}
const PROFILE_DIR = path.join(process.env.USERPROFILE || '', '.dsh', 'profiles', 'web');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win && !win.isDestroyed()) { win.show(); setCollapsed(false); } });
}

let win = null;
let tray = null;
let token = '';
let pollTimer = null;
let bgTimer = null;
let lastPresent = null;
let collapsed = false;
let normalSize = null;        // 折叠前窗口尺寸 [w,h]
let wasConnected = false;     // dsh 上线检测（false→true 时自动弹出悬浮窗）
let overlayVersion = '';
try { overlayVersion = require('./package.json').version || ''; } catch (e) {}
process.on('uncaughtException', (e) => {
  try { fsFull.appendFileSync(path.join(app.getPath('userData'), 'error.log'), new Date().toISOString() + ' ' + ((e && e.stack) || String(e)) + '\n'); } catch (_) {}
});
process.on('unhandledRejection', (e) => {
  try { fsFull.appendFileSync(path.join(app.getPath('userData'), 'error.log'), new Date().toISOString() + ' [rejection] ' + ((e && e.stack) || String(e)) + '\n'); } catch (_) {}
});


// ---------- token: 从 dsh-web.log 尾部读取（每次 dsh 启动变化） ----------
function readToken() {
  try {
    const log = resolveWebLog();
    if (!existsSync(log)) return token;
    const st = statSync(log);
    const size = Math.min(st.size, 65536);
    const fd = require('fs').openSync(log, 'r');
    const buf = Buffer.alloc(size);
    require('fs').readSync(fd, buf, 0, size, Math.max(0, st.size - size));
    require('fs').closeSync(fd);
    const tail = buf.toString('utf8');
    const m = tail.match(/[?&]token=([A-Za-z0-9_-]+)/);
    if (m && m[1] !== token) token = m[1];
  } catch (e) { /* ignore */ }
  return token;
}

// ---------- dsh HTTP 请求 ----------
function dshRequest(path, method, bodyObj) {
  return new Promise((resolve) => {
    readToken();
    const url = new URL(DSH_ORIGIN + path);
    url.searchParams.set('token', token);
    const payload = bodyObj ? JSON.stringify(bodyObj) : null;
    const req = http.request(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Origin: DSH_ORIGIN,                 // 本地接口同源校验
        'Content-Length': payload ? Buffer.byteLength(payload) : 0,
      },
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; if (data.length > 2e6) res.destroy(); });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { /* 非 JSON */ }
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json, raw: data });
      });
    });
    req.on('error', () => resolve({ ok: false, status: 0, json: null, raw: '' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, json: null, raw: '' }); });
    if (payload) req.write(payload);
    req.end();
  });
}

// ---------- 采集状态（列表/激活/启停） ----------
async function fetchState() {
  const res = await dshRequest('/dsh-market/installed', 'GET');
  if (!res.ok || !res.json) return { connected: false, reason: res.status === 0 ? 'dsh 未运行' : 'HTTP ' + res.status };
  const j = res.json;
  const present = j.present || [];
  const activation = j.activation || {};
  const patchDisabled = j.patchDisabled || [];
  const disabled = j.disabled || [];
  const plugins = present.map((pkg) => {
    const a = activation[pkg] || {};
    const enabled = a.state === 'live' || (a.state && a.state !== 'disabled' && a.state !== 'missing' && !patchDisabled.includes(pkg) && !disabled.includes(pkg));
    return {
      pkg,
      spec: (j.installed && j.installed[pkg]) || '',
      state: a.state || 'unknown',
      bundle: !!a.bundle,
      hot: !!a.hot,
      reasons: a.reasons || [],
      enabled,
      togglable: a.state === 'live' || a.state === 'disabled' || a.state === 'restart' || a.state === 'inert',
    };
  });
  return { connected: true, plugins, profile: j.profile, liveCount: (j.live || []).length, ts: Date.now() };
}

async function poll() {
  const s = await fetchState();
  if (win && !win.isDestroyed()) {
    if (s.connected) {
      // dsh 上线：自动弹出悬浮窗（配合开机自启实现"dsh 启动时同步拉起控制台"）
      if (!wasConnected) {
        try { if (!win.isVisible() || collapsed) { win.show(); setCollapsed(false); } } catch (e) {}
      }
      const present = s.plugins.map((p) => p.pkg);
      if (lastPresent) {
        const added = present.filter((x) => !lastPresent.includes(x));
        const removed = lastPresent.filter((x) => !present.includes(x));
        if (added.length || removed.length) {
          win.webContents.send('plugin-changes', { added, removed });
        }
      }
      lastPresent = present;
    } else {
      lastPresent = null;
    }
    wasConnected = s.connected;
    win.webContents.send('state', s);
  }
}

// ---------- 诊断数据：dsh 版本 / 端口 PID / 启动日志尾部 / 目录 ----------
function readLatestLogTail() {
  return new Promise((resolve) => {
    try {
      const dir = path.join(process.env.USERPROFILE || '', '.dsh', 'logs');
      const fs = require('fs');
      if (!fs.existsSync(dir)) return resolve('（无日志目录）');
      let latest = null, latestMtime = 0;
      for (const f of fs.readdirSync(dir)) {
        if (!/\.log$/i.test(f)) continue;
        const p = dir + '\\' + f;
        const st = fs.statSync(p);
        if (st.mtimeMs > latestMtime) { latestMtime = st.mtimeMs; latest = p; }
      }
      if (!latest) return resolve('（无日志文件）');
      const st = fs.statSync(latest);
      const size = Math.min(st.size, 8192);
      const fd = fs.openSync(latest, 'r');
      const buf = Buffer.alloc(size);
      fs.readSync(fd, buf, 0, size, Math.max(0, st.size - size));
      fs.closeSync(fd);
      const tail = buf.toString('utf8').split(/\r?\n/).slice(-18).join('\n');
      resolve('文件：' + latest.split('\\').pop() + '\n' + tail);
    } catch (e) { resolve('读取失败：' + e.message); }
  });
}
ipcMain.handle('get-diag', async () => {
  const out = { ts: Date.now(), overlayVersion, token: token ? token.slice(0, 12) + '…' : '（未读取）' };
  out.dshVersion = await new Promise((resolve) => {
    exec('dsh --version', { timeout: 8000, windowsHide: true }, (e, so, se) => {
      const v = (so || '').trim().split(/\r?\n/)[0];
      if (v) return resolve(v);
      if (e) return resolve('读取失败：' + (e.message || e).toString().split('\n')[0]);
      const se2 = (se || '').trim().split(/\r?\n/)[0];
      resolve(se2 || '（dsh 未在 PATH）');
    });
  });
  out.portInfo = await new Promise((resolve) => {
    exec('netstat -ano -p tcp | findstr :3080 | findstr LISTENING', { timeout: 5000, windowsHide: true }, (e, so) => {
      const lines = (so || '').split(/\r?\n/).filter(Boolean);
      if (lines.length) { const parts = lines[0].trim().split(/\s+/); resolve({ listening: true, pid: parts[parts.length - 1] || '' }); }
      else resolve({ listening: false, pid: '' });
    });
  });
  out.logTail = await readLatestLogTail();
  out.dshDir = path.join(process.env.USERPROFILE || '', '.dsh');
  out.logDir = path.join(process.env.USERPROFILE || '', '.dsh', 'logs');
  out.dshCmd = DSH_CMD;
  out.webLog = resolveWebLog();
  out.recycleDir = RECYCLE_DIR;
  out.connected = wasConnected;
  out.autostart = await new Promise((resolve) => {
    exec('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v DSHOverlay', { timeout: 5000, windowsHide: true }, (e, so) => {
      resolve(!e && /DSHOverlay/.test(so || ''));
    });
  });
  return out;
});

// ---------- 开机自启（注册表 HKCU Run）：悬浮窗随登录常驻，检测到 dsh 上线即弹出 ----------
ipcMain.handle('set-autostart', (e, on) => {
  try {
    const exe = app.isPackaged ? process.execPath : path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron.exe');
    const extra = app.isPackaged ? '' : ` \"${__dirname}\"`;
    const cmd = on
      ? `powershell -NoProfile -Command "Set-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name DSHOverlay -Value '\"${exe}\"${extra}' -Force"`
      : `powershell -NoProfile -Command "Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name DSHOverlay -ErrorAction SilentlyContinue"`;
    exec(cmd, { windowsHide: true }, () => {});
    return true;
  } catch (err) { return false; }
});

// ---------- 窗口 ----------
function createWindow() {
  win = new BrowserWindow({
    width: 440,
    height: 640,
    minWidth: 220,
    minHeight: 44,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    hasShadow: false,
    webPreferences: {
      preload: require('path').join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      additionalArguments: [process.env.DSH_OVERLAY_SELFCHECK ? '--dsh-overlay-selfcheck' : ''],
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.loadFile(require('path').join(__dirname, 'renderer', 'index.html'));

  // 折叠小条模式下记录/恢复窗口尺寸
  win.on('resize', () => {
    if (!collapsed) normalSize = win.getSize();
  });
  // 关闭窗口 = 折叠成顶部小条（不缩回任务栏/托盘）
  win.on('close', (e) => {
    if (!app.isQuiting) { e.preventDefault(); setCollapsed(true); }
  });
  win.on('closed', () => { win = null; });
}

function setCollapsed(on) {
  if (!win || win.isDestroyed()) return;
  collapsed = !!on;
  if (collapsed) {
    normalSize = win.getSize();
    const [w] = normalSize;
    const b = win.getBounds();
    win.setBounds({ x: b.x, y: b.y, width: w, height: 42 });
    win.setResizable(true);
  } else {
    const [w, h] = normalSize || [440, 640];
    const b = win.getBounds();
    win.setBounds({ x: b.x, y: b.y, width: w, height: h });
  }
  win.webContents.send('collapsed', collapsed);
}

// ---------- 系统托盘 ----------
function createTray() {
  const iconPath = require('path').join(__dirname, 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip('dsh 插件控制台（点击唤回）');
  tray.on('click', () => {
    if (!win) return;
    if (win.isVisible() && !win.isMinimized()) {
      setCollapsed(true);
    } else {
      win.show(); setCollapsed(false);
    }
  });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示悬浮窗', click: () => { if (win) { win.show(); setCollapsed(false); } } },
    { label: '折叠小条', click: () => { if (win) { win.show(); setCollapsed(true); } } },
    { label: '强制重启 dsh web', click: async () => {
        const r = await forceRestartDsh();
        const msg = r.ok ? ('已强制重启 dsh web' + (r.killed.length ? '（清理 ' + r.killed.length + ' 个进程）' : '')) : ('强制重启失败：' + (r.error || '未知错误'));
        try { if (tray) tray.displayBalloon({ title: 'DSH 插件控制台', content: msg }); } catch (_) {}
      } },
    { type: 'separator' },
    { label: '退出', click: () => { app.isQuiting = true; app.quit(); } },
  ]));
}

// ---------- 强制重启 dsh web（清理 3080 占用并重新启动）----------
async function forceRestartDsh() {
  const { execFile, spawn } = require('node:child_process');
  const ps = (expr) => new Promise((res) => { execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', expr], { encoding: 'utf8', windowsHide: true }, (e, so, se) => res({ out: so || '', err: (e && e.message) || '' })); });
  const tk = (pid) => new Promise((res) => { execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, (e, so, se) => res({ ok: !e, out: so || '', err: (e && e.message) || '' })); });
  const result = { ok: false, killed: [], portFreed: false, started: false, error: null };
  try {
    const r1 = await ps("(Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty OwningProcess)");
    const pid = (r1.out.match(/\d+/) || [])[0];
    if (pid) {
      const k = await tk(pid);
      if (k.ok || /not found/i.test(k.err || '')) result.killed.push(Number(pid));
    }
    for (let i = 0; i < 20; i++) {
      const chk = await ps("(Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count");
      if ((chk.out.match(/\d+/) || [])[0] === '0') { result.portFreed = true; break; }
      await new Promise((r) => setTimeout(r, 500));
    }
    const child = spawn('cmd.exe', ['/c', 'dsh web'], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
    result.started = true;
    result.ok = true;
    // 后台等待 dsh 就绪后自动打开浏览器（重新拉起 web）
    (async () => {
      try {
        for (let i = 0; i < 45; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          const chk = await ps("(Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue | Measure-Object).Count");
          if ((chk.out.match(/\d+/) || [])[0] === '1') {
            try { await shell.openExternal('http://127.0.0.1:3080/'); } catch (_) {}
            break;
          }
        }
      } catch (_) {}
    })();
  } catch (e) {
    result.error = String(e);
  }
  return result;
}

// ---------- IPC ----------
ipcMain.handle('get-state', async () => (await fetchState()));
ipcMain.handle('toggle-plugin', async (e, pkg, enabled) => {
  const res = await dshRequest('/dsh-market/toggle', 'POST', { name: pkg, enabled: !!enabled });
  if (!res.ok || !res.json) return { ok: false, status: res.status, error: res.json && res.json.error ? res.json.error : 'dsh 未响应' };
  // 从 toggle 返回的 activation 判定：restart 状态需重启；非热加载(bundle&&!hot)需刷新
  let needRestart = false;
  let needRefresh = false;
  let newState = '';
  const j = res.json;
  if (j.activation && j.activation[pkg]) {
    newState = j.activation[pkg].state || '';
    const a = j.activation[pkg];
    needRestart = newState === 'restart';
    if (newState === 'restart' || (a.bundle && !a.hot)) needRefresh = true;
  }
  if (j.reason && /restart/i.test(j.reason)) { needRestart = true; needRefresh = true; }
  // dshmarket toggle 接口权威返回 restart/refresh 布尔（官方判定：carrier/staleModule/热挂载失败=restart；有客户端 UI 部分=refresh），优先采用
  const officialRestart = typeof j.restart === 'boolean' ? j.restart : needRestart;
  const officialRefresh = typeof j.refresh === 'boolean' ? j.refresh : needRefresh;
  return { ok: j.ok !== false, status: res.status, error: j.error, reason: j.reason, needRestart: officialRestart, needRefresh: officialRefresh, state: newState,
    reasons: (j.activation && j.activation[pkg] && Array.isArray(j.activation[pkg].reasons)) ? j.activation[pkg].reasons : null };
});
ipcMain.handle('restart-dsh', async () => {
  const res = await dshRequest('/dsh-market/restart', 'POST');
  if (!res.ok || !res.json) return { ok: false, status: res.status, error: res.json && res.json.error ? res.json.error : 'dsh 未响应' };
  return { ok: true, status: res.status, error: res.json.error };
});
ipcMain.handle('set-pin', (e, on) => { if (win) win.setAlwaysOnTop(!!on, 'floating'); return true; });
ipcMain.handle('set-collapsed', (e, on) => { setCollapsed(!!on); return collapsed; });
ipcMain.handle('hide-to-tray', () => { if (win && !win.isDestroyed()) win.hide(); return true; });
ipcMain.handle('force-restart-dsh', () => forceRestartDsh());
ipcMain.handle('quit-app', () => { app.isQuiting = true; app.quit(); return true; });
ipcMain.handle('open-web', async () => { try { await shell.openExternal('http://127.0.0.1:3080/'); return true; } catch (e) { return false; } });
ipcMain.handle('check-updates', async () => {
  const res = await dshRequest('/dsh-market/updates?force=1', 'GET');
  if (!res.ok || !res.json) return { ok: false, error: res.json && res.json.error ? res.json.error : 'dsh 未响应' };
  return { ok: true, updates: res.json.updates || {} };
});
ipcMain.handle('update-plugin', async (e, name) => {
  const res = await dshRequest('/dsh-market/update', 'POST', { name });
  if (!res.ok || !res.json) return { ok: false, error: res.json && res.json.error ? res.json.error : 'dsh 未响应' };
  const j = res.json;
  return { ok: j.ok !== false, error: j.error };
});
ipcMain.handle('uninstall-plugin', async (e, pkg) => {
  // 1) 先复制到回收站（dsh-回收站/<pkg>），卸载后可从回收站一键恢复
  let moved = false;
  try {
    const srcDir = path.join(PROFILE_DIR, 'node_modules', ...pkg.split('/'));
    const safe = pkg.replace(/[^\w@.\-]/g, '_');
    const destDir = path.join(RECYCLE_DIR, safe);
    if (fsFull.existsSync(srcDir)) {
      fsFull.mkdirSync(RECYCLE_DIR, { recursive: true });
      fsFull.rmSync(destDir, { recursive: true, force: true });
      fsFull.cpSync(srcDir, destDir, { recursive: true });
      fsFull.writeFileSync(path.join(destDir, 'meta.json'), JSON.stringify({ pkg, deletedAt: new Date().toISOString() }, null, 2), 'utf-8');
      moved = true;
    }
  } catch (er) { /* 复制失败不阻断卸载 */ }
  const res = await dshRequest('/dsh-market/uninstall', 'POST', { name: pkg });
  if (!res.ok || !res.json) return { ok: false, status: res.status, error: res.json && res.json.error ? res.json.error : 'dsh 未响应' };
  const j = res.json;
  return { ok: j.ok !== false, status: res.status, error: j.error, reason: j.reason, hot: !!j.hot, needRestart: !j.hot, moved };
});

// 回收站列表
ipcMain.handle('recycle-list', () => {
  try {
    if (!fsFull.existsSync(RECYCLE_DIR)) return { ok: true, items: [] };
    const items = [];
    fsFull.readdirSync(RECYCLE_DIR, { withFileTypes: true }).forEach((d) => {
      if (!d.isDirectory()) return;
      const dir = path.join(RECYCLE_DIR, d.name);
      let meta = null;
      try { meta = JSON.parse(fsFull.readFileSync(path.join(dir, 'meta.json'), 'utf-8')); } catch (_) {}
      items.push({ dir: d.name, pkg: meta ? meta.pkg : d.name, deletedAt: meta ? meta.deletedAt : null });
    });
    return { ok: true, items };
  } catch (e) { return { ok: false, error: String(e) }; }
});

// 回收站恢复（dsh plugin add 本地目录）
ipcMain.handle('recycle-restore', async (e, dir) => {
  try {
    const target = path.join(RECYCLE_DIR, String(dir).replace(/[^\w@.\-]/g, '_'));
    if (!fsFull.existsSync(target)) return { ok: false, error: '回收站中不存在该项' };
    let pkg = null;
    try { pkg = JSON.parse(fsFull.readFileSync(path.join(target, 'meta.json'), 'utf-8')).pkg; } catch (_) {}
    const result = await new Promise((res) => {
      exec(`"${DSH_CMD}" plugin --profile web add "${target}"`, { timeout: 150000, windowsHide: true, cwd: PROFILE_DIR }, (e, so, se) => res({ code: e ? (e.code || -1) : 0, err: se || '' }));
    });
    if (result.code !== 0) return { ok: false, error: (result.err || '').split(/\r?\n/)[0] || '恢复失败' };
    fsFull.rmSync(target, { recursive: true, force: true });
    return { ok: true, pkg };
  } catch (e) { return { ok: false, error: String(e) }; }
});

// 回收站彻底删除
ipcMain.handle('recycle-delete', (e, dir) => {
  try {
    const target = path.join(RECYCLE_DIR, String(dir).replace(/[^\w@.\-]/g, '_'));
    if (!fsFull.existsSync(target)) return { ok: false, error: '回收站中不存在该项' };
    fsFull.rmSync(target, { recursive: true, force: true });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e) }; }
});



app.whenReady().then(() => {
  createWindow();
  createTray();
  readToken();
  poll();
  pollTimer = setInterval(poll, POLL_MS);

  // 自检模式：截图验证渲染与数据后退出（DSH_OVERLAY_SELFCHECK=1；=2 额外验证折叠小条；=3 额外验证设置面板）
  if (process.env.DSH_OVERLAY_SELFCHECK === '1' || process.env.DSH_OVERLAY_SELFCHECK === '2' || process.env.DSH_OVERLAY_SELFCHECK === '3' || process.env.DSH_OVERLAY_SELFCHECK === '4' || process.env.DSH_OVERLAY_SELFCHECK === '5') {
    setTimeout(async () => {
      const s = await fetchState();
      console.log('[selfcheck] state:', JSON.stringify({ connected: s.connected, count: s.connected ? s.plugins.length : 0, profile: s.profile }));
      if (win && !win.isDestroyed()) {
        try {
          const diag = await win.webContents.executeJavaScript(`({
            panelClass: document.getElementById('settingsPanel').className,
            panelVisible: document.getElementById('settingsPanel').offsetParent !== null,
            bgStyle: getComputedStyle(document.getElementById('settingsPanel')).display,
            settingsOpen: window.settingsOpen
          })`);
          console.log('[selfcheck] panel:', JSON.stringify(diag));
          const img = await win.webContents.capturePage();
          require('fs').writeFileSync(require('path').join(__dirname, '_selfcheck.png'), img.toPNG());
          console.log('[selfcheck] screenshot saved');
          if (process.env.DSH_OVERLAY_SELFCHECK === '2') {
            setCollapsed(true);
            await new Promise((r) => setTimeout(r, 800));
            const img2 = await win.webContents.capturePage();
            require('fs').writeFileSync(require('path').join(__dirname, '_selfcheck-collapsed.png'), img2.toPNG());
            console.log('[selfcheck] collapsed screenshot saved');
            setCollapsed(false);
          }
          if (process.env.DSH_OVERLAY_SELFCHECK === '3' || process.env.DSH_OVERLAY_SELFCHECK === '4' || process.env.DSH_OVERLAY_SELFCHECK === '5') {
            console.log('[selfcheck] step1 open settings');
            await win.webContents.executeJavaScript(`onSettings(); true`);
            console.log('[selfcheck] step2 opened, wait');
            await new Promise((r) => setTimeout(r, 600));
            console.log('[selfcheck] step3 capture');
            const img3 = await win.webContents.capturePage();
            require('fs').writeFileSync(require('path').join(__dirname, '_selfcheck-settings.png'), img3.toPNG());
            console.log('[selfcheck] settings screenshot saved');
            await win.webContents.executeJavaScript(`closeSettings(); true`);
            console.log('[selfcheck] step4 closed');
            // 弹窗演示截图
            await win.webContents.executeJavaScript(`showModal('<span>已启用</span> <span class="md-cn">演示插件</span>', 'demo-pkg', '此插件切换后<b>需要重启或刷新</b>才能完全生效。', [{label:'刷新',fn:function(){}},{label:'重启',primary:true,fn:function(){}}]); true`);
            await new Promise((r) => setTimeout(r, 400));
            const img4 = await win.webContents.capturePage();
            require('fs').writeFileSync(require('path').join(__dirname, '_selfcheck-modal.png'), img4.toPNG());
            console.log('[selfcheck] modal screenshot saved');
            await win.webContents.executeJavaScript(`closeModal(); true`);
            // 透明度链路实测：设置 0.4 后读各层计算样式
            const dia = await win.webContents.executeJavaScript(`(() => {
              document.documentElement.style.setProperty('--bg-opacity', '0.40');
              const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el)[prop] : 'MISSING'; };
              return { varVal: document.documentElement.style.getPropertyValue('--bg-opacity'), bgGridOpacity: cs('.bg-grid','opacity'), winBefore: cs('.win','opacity'), titlebarBg: cs('.titlebar','background-color'), pcBg: cs('.pc','background-color'), panelBg: getComputedStyle(document.getElementById('settingsPanel')).backgroundColor };
            })()`);
            console.log('[selfcheck] opacity-diag:', JSON.stringify(dia));
            await new Promise((r) => setTimeout(r, 400));
            const img5 = await win.webContents.capturePage();
            require('fs').writeFileSync(require('path').join(__dirname, '_selfcheck-opacity.png'), img5.toPNG());
            console.log('[selfcheck] opacity screenshot saved');
            if (process.env.DSH_OVERLAY_SELFCHECK === '5') {
              const diagData = await win.webContents.executeJavaScript(`(async () => {
                const d = await window.api.getDiag();
                onDiag();
                await new Promise(res => setTimeout(res, 500));
                const rows = {};
                document.querySelectorAll('#diagPanel .dg-row').forEach(function(r){
                  rows[r.querySelector('span').textContent] = r.querySelector('b').textContent;
                });
                const logTxt = document.getElementById('dgLog').textContent.slice(0, 120);
                return { api: d, rows, logTxt };
              })()`);
              const imgDiag = await win.webContents.capturePage();
              require('fs').writeFileSync(require('path').join(__dirname, '_selfcheck-diag.png'), imgDiag.toPNG());
              await win.webContents.executeJavaScript(`closeDiag(); true`);
              console.log('[selfcheck] diag-probe:', JSON.stringify({ api: { overlayVersion: diagData.api.overlayVersion, dshVersion: diagData.api.dshVersion, portInfo: diagData.api.portInfo, autostart: diagData.api.autostart, token: diagData.api.token, connected: diagData.api.connected }, rows: diagData.rows, logHead: (diagData.logTxt || '').slice(0, 100) }, null, 1));
            }
            if (process.env.DSH_OVERLAY_SELFCHECK === '4') {
              const toggleProbe = await win.webContents.executeJavaScript(`(async () => {
                const out = [];
                async function probe(pkg){
                  // 走完整 toggleSwitch（UI 开关真实路径），第一次关、第二次开
                  await toggleSwitch({ stopPropagation: function(){}, currentTarget: null }, pkg);
                  await new Promise(res => setTimeout(res, 700));
                  out.push({
                    pkg,
                    modal: {
                      title: document.getElementById('mdTitle') ? document.getElementById('mdTitle').innerText : '',
                      body: document.getElementById('mdBody') ? document.getElementById('mdBody').innerText : '',
                      acts: Array.from(document.querySelectorAll('#mdActions .md-btn')).map(b => b.textContent)
                    }
                  });
                  closeModal();
                }
                await probe('dsh-context');
                await probe('dsh-context');
                return out;
              })()`);
              console.log('[selfcheck] toggle-probe:', JSON.stringify(toggleProbe, null, 1));
            }
          }
        } catch (e) { console.log('[selfcheck] shot fail', e.message); }
      }
      app.isQuiting = true;   // 绕过窗口 close 拦截
      app.quit();
    }, 9000);
  }
});
app.on('window-all-closed', () => { app.quit(); });
