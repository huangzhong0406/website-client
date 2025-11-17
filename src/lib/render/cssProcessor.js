/**
 * CSS 处理模块
 * 负责分离关键 CSS 和延迟 CSS
 */

// 关键 CSS 截断长度,超出部分将延迟注入
const DEFAULT_CRITICAL_CSS_LIMIT = Number(process.env.CRITICAL_CSS_LIMIT ?? 4000);

/**
 * 分离 CSS 为关键部分和延迟部分
 * @param {string} css - 原始 CSS 字符串
 * @returns {{criticalCss: string, deferredCss: string}}
 */
export function splitCss(css) {
  if (!css) {
    return {criticalCss: "", deferredCss: ""};
  }

  const limit = Number.isFinite(DEFAULT_CRITICAL_CSS_LIMIT) && DEFAULT_CRITICAL_CSS_LIMIT > 0 ? DEFAULT_CRITICAL_CSS_LIMIT : css.length;

  if (css.length <= limit) {
    return {criticalCss: css, deferredCss: ""};
  }

  // 智能分离：优先保留关键CSS规则
  const criticalRules = [];
  const deferredRules = [];
  let currentSize = 0;

  // 按规则分割CSS
  const rules = css.split(/(?<=})\s*(?=[.#@])/g).filter(Boolean);

  for (const rule of rules) {
    const ruleSize = rule.length;
    const isCritical = isCriticalRule(rule);

    // 关键规则优先，或者还有空间时添加
    if (isCritical || currentSize + ruleSize <= limit) {
      criticalRules.push(rule);
      currentSize += ruleSize;
    } else {
      deferredRules.push(rule);
    }
  }

  return {
    criticalCss: criticalRules.join(""),
    deferredCss: deferredRules.join("")
  };
}

/**
 * 判断CSS规则是否为关键规则
 * @param {string} rule - CSS 规则
 * @returns {boolean}
 */
function isCriticalRule(rule) {
  const criticalPatterns = [
    /^\s*body\b/,
    /^\s*html\b/,
    /^\s*\*\b/,
    /\b(font|color|background)\s*:/,
    /\b(display|position|width|height)\s*:/,
    /\.(hero|banner|header|nav)\b/,
    /@media\s*\([^)]*\)\s*{[^}]*}/,

    // Swiper 关键样式 (防止 CLS)
    /\.(gjs-)?swiper(-root|-wrapper|-slide)?\b/,
    /\.swiper-container\b/,
    /\.swiper-pagination\b/,
    /\.swiper-button-(prev|next)\b/,
  ];

  return criticalPatterns.some((pattern) => pattern.test(rule));
}

/**
 * 提取 Swiper 相关的关键 CSS
 * @param {string} css - 原始 CSS 字符串
 * @returns {string} Swiper 关键 CSS
 */
export function extractSwiperCriticalCss(css) {
  if (!css) return '';

  const swiperRules = [];
  const rules = css.split(/(?<=})\s*(?=[.#@])/g).filter(Boolean);

  for (const rule of rules) {
    // 检查是否是 Swiper 相关规则
    if (
      rule.includes('.swiper') ||
      rule.includes('gjs-swiper') ||
      rule.includes('.swiper-pagination') ||
      rule.includes('.swiper-button')
    ) {
      swiperRules.push(rule);
    }
  }

  return swiperRules.join('');
}
