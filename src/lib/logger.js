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

