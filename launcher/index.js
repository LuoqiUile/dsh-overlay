// dsh-overlay-launcher v1.0.7
// dsh 启动钩子：dsh 启动完成后自动拉起 DSH 插件控制台悬浮窗。
// 用 cordis ready 事件（应用启动完成）触发，避免启动早期拉起被清理；8s 延迟兜底保证拉起。
// 配置经插件第二参数 config 传入（cordis 4 约定；ctx.config 需显式注入，不使用）。
// 悬浮窗路径优先级：config.exe > 环境变量 DSH_OVERLAY_EXE > 安装包默认目录 > ASCII 启动脚本 > 本机开发启动脚本。
// 悬浮窗自身有单实例锁：已在运行则新实例自动退出并聚焦原窗口，重复拉起无副作用。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';

export default function (ctx, config) {
  const cfg = config || {};

  const safeLog = (fn, msg) => {
    try {
      if (ctx && ctx.logger && ctx.logger[fn]) ctx.logger[fn]('[dsh-overlay-launcher] ' + msg);
      else console[fn === 'warn' ? 'warn' : 'log']('[dsh-overlay-launcher] ' + msg);
    } catch (_) { /* ignore */ }
  };

  const fire = () => {
    let exe = null;
    try {
      const candidates = [
        cfg.exe || null,
        process.env.DSH_OVERLAY_EXE || null,
        process.env.ProgramFiles ? 'C:\\Program Files\\DSH插件控制台\\DSH插件控制台.exe' : null,
        'C:\\deepseek harness\\dsh-overlay\\start-overlay.cmd',
        'C:\\deepseek harness\\dsh-overlay\\启动悬浮窗.cmd',
      ].filter(Boolean);
      exe = candidates.find((p) => { try { return existsSync(p); } catch (_) { return false; } });
    } catch (e) { safeLog('warn', '构建候选路径失败：' + String(e)); }

    if (!exe) {
      safeLog('warn', '未找到悬浮窗程序，请设置环境变量 DSH_OVERLAY_EXE 或安装到默认目录');
      return;
    }

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

  try {
    if (ctx && typeof ctx.on === 'function') {
      ctx.on('ready', fire);
      setTimeout(fire, 8000); // 兜底：ready 未触发也拉起
    } else {
      fire();
    }
  } catch (e) {
    safeLog('warn', '注册启动钩子失败：' + String(e));
    fire();
  }
}
