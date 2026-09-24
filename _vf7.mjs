import { spawn, execSync } from 'node:child_process';

const run = (cmd) => { try { return execSync(cmd, { encoding: 'utf8', timeout: 20000 }).trim(); } catch (e) { return ''; } };

// 1) 杀当前 dsh
const pid = (run('netstat -ano -p tcp | findstr :3080 | findstr LISTENING').match(/(\d+)\s*$/) || [])[1];
console.log('当前 3080 PID =', pid || '无');
if (pid) { run(`taskkill /PID ${pid} /T /F >nul 2>&1`); console.log('已杀，等待 3s…'); await new Promise(r => setTimeout(r, 3000)); }

// 2) spawn dsh web，捕获输出（看 launcher 日志）
console.log('启动 dsh web（捕获输出 45s）…');
const child = spawn('cmd.exe', ['/c', 'dsh web'], { detached: true, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
child.unref();
let out = '';
child.stdout.on('data', (c) => { out += c.toString('utf8'); if (out.length > 200000) out = out.slice(-150000); });
child.stderr.on('data', (c) => { out += c.toString('utf8'); if (out.length > 200000) out = out.slice(-150000); });

// 3) 轮询 3080 + 找 launcher 日志行
let listenedAt = null, launcherLine = null;
const t0 = Date.now();
while (Date.now() - t0 < 45000) {
  await new Promise(r => setTimeout(r, 1500));
  const now = run('netstat -ano -p tcp | findstr :3080 | findstr LISTENING');
  if (now && !listenedAt) { listenedAt = ((Date.now() - t0) / 1000).toFixed(1) + 's'; }
  const m = out.match(/\[dsh-overlay-launcher\][^\r\n]*/g);
  if (m && m.length) { launcherLine = m[m.length - 1]; }
  if (listenedAt && launcherLine) break;
}
console.log('3080 就绪时间 =', listenedAt);
console.log('launcher 日志 =', launcherLine || '（输出中未见 launcher 行）');
console.log('--- 输出尾部 ---');
console.log(out.slice(-400));
