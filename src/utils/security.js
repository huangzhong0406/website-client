/**
 * 安全工具函数集合
 * 用于防止 XSS 攻击和数据验证
 */

/**
 * HTML 转义函数（防止 XSS）
 * @param {*} text - 需要转义的文本
 * @returns {string} 转义后的安全文本
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  if (typeof text !== "string") return String(text);

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * 安全的 JSON 解析
 * @param {string} str - JSON 字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
export function safeJsonParse(str, defaultValue = {}) {
  if (!str || typeof str !== "string") return defaultValue;

  try {
    return JSON.parse(str);
  } catch (error) {
    console.warn("JSON 解析失败:", error.message);
    return defaultValue;
  }
}

/**
 * 验证并规范化 URL
 * 防止 javascript: 和 data: 等危险协议
 * @param {string} url - 需要验证的 URL
 * @param {string} fallback - 无效时的降级 URL
 * @returns {string} 安全的 URL
 */
export function sanitizeUrl(url, fallback = "#") {
  if (!url || typeof url !== "string") return fallback;

  const trimmed = url.trim().toLowerCase();

  // 阻止危险协议
  const dangerousProtocols = ["javascript:", "data:", "vbscript:"];
  if (dangerousProtocols.some((protocol) => trimmed.startsWith(protocol))) {
    console.warn(`检测到危险 URL 协议: ${url}`);
    return fallback;
  }

  return url;
}

/**
 * 确保值是数组
 * @param {*} value - 需要验证的值
 * @param {Array} fallback - 降级数组
 * @returns {Array} 数组
 */
export function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

/**
 * 安全获取嵌套对象属性
 * @param {object} obj - 对象
 * @param {string} path - 属性路径（如 'a.b.c'）
 * @param {*} defaultValue - 默认值
 * @returns {*} 属性值或默认值
 */
export function safeGet(obj, path, defaultValue = undefined) {
  if (!obj || typeof obj !== "object") return defaultValue;

  const keys = path.split(".");
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined || typeof result !== "object") {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
}
