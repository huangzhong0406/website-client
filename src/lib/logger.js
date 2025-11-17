// 轻量日志封装，后续可替换为完善的监控/上报方案
const prefix = "[renderer]";

export function logInfo(message, extra) {
  if (extra) {
    console.info(`${prefix} ${message}`, extra);
  } else {
    console.info(`${prefix} ${message}`);
  }
}

export function logWarn(message, extra) {
  if (extra) {
    console.warn(`${prefix} ${message}`, extra);
  } else {
    console.warn(`${prefix} ${message}`);
  }
}

export function logError(message, extra) {
  if (extra) {
    console.error(`${prefix} ${message}`, extra);
  } else {
    console.error(`${prefix} ${message}`);
  }
}


// 客户端日志工具（仅在开发环境或 localhost 显示）
export const clientLogger = {
  log: (...args) => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.info(...args);
    }
  },
  warn: (...args) => {
    if (typeof window !== 'undefined') {
      console.warn(...args);
    }
  },
  error: (...args) => {
    if (typeof window !== 'undefined') {
      console.error(...args);
    }
  },
  success: (...args) => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('✅', ...args);
    }
  }
};