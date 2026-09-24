// 独立复刻 ensureDsh 的 spawn 捕获逻辑（不动悬浮窗）
import { spawn } from 'node:child_process';
const child = spawn('cmd.exe', ['/c', 'dsh web'], { detached: true, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
let buf = '';
let got = false;
const tryGrab = () => {
  if (got) return;
  const m = buf.match(/[?&]token=([A-Za-z0-9_-]+)/);
  if (m && m[1]) { got = true; console.log('捕获到 token =', m[1].slice(0, 12) + '…'); }
};
child.stdout.on('data', (c) => { buf += c.toString('utf8'); if (buf.length > 100000) buf = buf.slice(-50000); tryGrab(); });
child.stderr.on('data', (c) => { buf += c.toString('utf8'); if (buf.length > 100000) buf = buf.slice(-50000); tryGrab(); });
child.on('error', (e) => console.log('spawn error:', e.message));
setTimeout(() => {
  console.log('20s 结果: token', got ? '已捕获' : '未捕获');
  console.log('--- 输出尾部 ---');
  console.log(buf.slice(-600));
  process.exit(0);
}, 20000);
