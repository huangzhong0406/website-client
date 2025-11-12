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
    /@media\s*\([^)]*\)\s*{[^}]*}/
  ];

  return criticalPatterns.some((pattern) => pattern.test(rule));
}

/**
 * 获取 Swiper 的关键 CSS
 * 这些 CSS 确保即使 JS 未加载，轮播图的第一张也能正常显示
 * @returns {string}
 */
export function getSwiperCriticalCss() {
  return `
/* Swiper 关键CSS - 确保首屏轮播图可见 */
.swiper {
  position: relative;
  overflow: hidden;
}

.swiper-wrapper {
  display: flex;
  transition-property: transform;
}

.swiper-slide {
  flex-shrink: 0;
  width: 100%;
  height: 100%;
  position: relative;
}

/* 确保第一张图片始终可见（JS加载前的回退） */
.swiper-wrapper > .swiper-slide:first-child {
  display: block;
}

.swiper-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 防止未初始化时的布局抖动 */
.gjs-swiper-root {
  min-height: 300px;
}
`.trim();
}
