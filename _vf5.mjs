import { spawn } from 'node:child_process';
import { execSync } from 'node:child_process';

const run = (cmd) => { try { return execSync(cmd, { encoding: 'utf8', timeout: 20000 }).trim(); } catch (e) { return ''; } };

// 1) 记录当前 3080 PID
const pid = (run('netstat -ano -p tcp | findstr :3080 | findstr LISTENING').match(/(\d+)\s*$/) || [])[1];
console.log('当前 3080 PID =', pid);
if (pid) { run(`taskkill /PID ${pid} /T /F >nul 2>&1`); console.log('已杀掉 dsh，等待悬浮窗自动重启...'); }

// 2) 等待 ensureDsh 拉起（poll 3s + dsh 启动 ~15s）
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const now = run('netstat -ano -p tcp | findstr :3080 | findstr LISTENING');
  if (now) { console.log(`第 ${(i+1)*2}s：3080 已重新监听 PID=${(now.match(/(\d+)\s*$/)||[])[1]}`); break; }
  if (i === 29) console.log('30s 内未重新监听（可能 dsh 启动慢或 ensureDsh 未触发）');
}
// 3) 再等 token 生效，CDP 查悬浮窗连接状态
await new Promise(r => setTimeout(r, 8000));
let pages = null;
for (let i = 0; i < 20; i++) {
  try { pages = await (await fetch('http://127.0.0.1:9333/json')).json(); if (pages.length) break; } catch (_) {}
  await new Promise(r => setTimeout(r, 1000));
}
console.log('CDP pages =', pages ? pages.length : '不可达（悬浮窗未带调试端口，属正常）');
if (pages && pages.length) {
  const wsUrl = pages.find(p => p.type === 'page').webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  let id = 0; const pending = new Map();
  function send(method, params) { return new Promise((res, rej) => { const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params })); }); }
  ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } };
  for (let i = 0; i < 50 && ws.readyState !== WebSocket.OPEN; i++) await new Promise(r => setTimeout(r, 200));
  await send('Runtime.enable', {});
  await new Promise(r => setTimeout(r, 1500));
  const r = await send('Runtime.evaluate', { expression: 'window.api.getState()', awaitPromise: true, returnByValue: true });
  const s = r.result && r.result.value;
  console.log('悬浮窗状态 =', s ? JSON.stringify({ connected: s.connected, liveCount: s.liveCount, pluginCount: (s.plugins||[]).length, reason: s.reason }) : '读取失败');
  ws.close();
}
