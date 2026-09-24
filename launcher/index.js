// dsh-overlay-launcher v1.1.0
// dsh 启动钩子：dsh web 服务就绪后自动拉起 DSH 插件控制台悬浮窗。
// v1.1.0 变更：cordis 4 已移除 'ready' 生命周期事件（仅 internal/dispatch|plugin|status），
// 原 ctx.on('ready') 是死代码（只靠 8s 兜底）。现改为轮询 127.0.0.1:3080 端口就绪后拉起，
// 以「web 服务可连」为客观标准，兼容 cordis 3/4/5 及任何 dsh 版本。
// 另：DSH_OVERLAY_EXE 支持环境变量与注册表(HKCU\Environment)双重回退，旧终端也能生效。
// 悬浮窗路径优先级：config.exe > 环境变量 DSH_OVERLAY_EXE > 注册表 DSH_OVERLAY_EXE > 安装包默认目录 > 便携版默认目录 > 本机开发脚本。
// 悬浮窗自身有单实例锁：已在运行则新实例自动退出并聚焦原窗口，重复拉起无副作用。
import { spawn, exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import http from 'node:http';

export default function (ctx, config) {
  const cfg = config || {};

  const safeLog = (fn, msg) => {
    try {
      if (ctx && ctx.logger && ctx.logger[fn]) ctx.logger[fn]('[dsh-overlay-launcher] ' + msg);
      else console[fn === 'warn' ? 'warn' : 'log']('[dsh-overlay-launcher] ' + msg);
    } catch (_) { /* ignore */ }
  };

  let fired = false;
  const exists = (p) => { try { return !!p && existsSync(p); } catch (_) { return false; } };

  // 注册表回退：用户级环境变量在旧终端不生效，从 HKCU\Environment 直接读
  const readRegistryExe = (cb) => {
    try {
      exec('reg query "HKCU\\Environment" /v DSH_OVERLAY_EXE', { timeout: 4000, windowsHide: true }, (e, so) => {
        let v = null;
        if (!e && so) {
          const m = so.match(/DSH_OVERLAY_EXE\s+REG_[A-Z_]+\s+(\S.*\S)/);
          if (m) v = m[1].trim();
        }
        cb(v);
      });
    } catch (_) { cb(null); }
  };

  const launch = (exe) => {
    try {
      const isScript = /\.(cmd|bat)$/i.test(exe);
      const command = isScript ? 'cmd.exe' : exe;
      const args = isScript ? ['/c', exe] : [];
      const child = spawn(command, args, {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
        cwd: dirname(exe),
      });
      child.unref();
      safeLog('info', '已拉起 DSH 插件控制台：' + exe);
    } catch (e) {
      safeLog('warn', '拉起悬浮窗失败：' + String(e));
    }
  };

  const fire = () => {
    if (fired) return;
    const candidates = [
      cfg.exe || null,
      process.env.DSH_OVERLAY_EXE || null,
      process.env.ProgramFiles ? 'C:\\Program Files\\DSH插件控制台\\DSH插件控制台.exe' : null,
      process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA + '\\DSH插件控制台\\DSH插件控制台.exe' : null,
      'C:\\deepseek harness\\dsh-overlay\\start-overlay.cmd',
      'C:\\deepseek harness\\dsh-overlay\\启动悬浮窗.cmd',
    ].filter(Boolean);

    const exe = candidates.find(exists);
    if (exe) { fired = true; launch(exe); return; }

    // 静态候选均未命中 → 注册表回退（异步）
    readRegistryExe((rv) => {
      if (fired) return;
      if (exists(rv)) { fired = true; launch(rv); }
      else {
        fired = true; // 已尽力，避免重复告警刷屏
        safeLog('warn', '未找到悬浮窗程序，请设置环境变量 DSH_OVERLAY_EXE 或安装到默认目录');
      }
    });
  };

  // 事件加速：若宿主未来恢复 ready 语义则立即触发（fire 内部有去重，无副作用）
  try {
    if (ctx && typeof ctx.on === 'function') ctx.on('ready', fire);
  } catch (e) { safeLog('warn', '注册 ready 加速失败：' + String(e)); }

  // 核心机制：轮询 dsh web 端口就绪（web 服务可连 = 该拉起悬浮窗）
  const probe = () => {
    const req = http.get({ host: '127.0.0.1', port: 3080, path: '/', timeout: 2000 }, (res) => {
      res.resume();
      fire();
    });
    req.on('error', () => { /* 未就绪，继续轮询 */ });
    req.on('timeout', () => { try { req.destroy(); } catch (_) {} });
  };

  let tries = 0;
  const timer = setInterval(() => {
    tries++;
    probe();
    if (tries >= 40) { clearInterval(timer); safeLog('info', '60s 内 web 服务未就绪，停止轮询'); }
  }, 1500);
  probe(); // 立即探测一次
  if (typeof timer.unref === 'function') timer.unref();
}
