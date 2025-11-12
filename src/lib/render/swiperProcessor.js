/**
 * Swiper 轮播图处理模块
 * 负责 Swiper 组件的优化、脚本提取和预加载
 */

import {getImageType} from "./imageOptimizer.js";

/**
 * 处理 Swiper 组件优化
 * 1. 识别首屏 Swiper
 * 2. 为首屏 Swiper 的第一张图片添加高优先级
 * 3. 为非首屏 Swiper 图片添加懒加载
 * 4. 添加 Swiper CSS/JS 到预加载资源
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Array} preloadResources - 预加载资源数组
 * @returns {boolean} 是否包含 Swiper
 */
export function processSwiperOptimization($, preloadResources) {
  const $swiperRoots = $(".gjs-swiper-root, .swiper-container");

  if ($swiperRoots.length === 0) {
    return false;
  }

  // 添加 Swiper CSS/JS 到预加载资源
  preloadResources.push(
    {
      href: "https://cdn.jsdelivr.net/npm/swiper@11.0.5/swiper-bundle.min.css",
      as: "style",
      type: "text/css"
    },
    {
      href: "https://cdn.jsdelivr.net/npm/swiper@11.0.5/swiper-bundle.min.js",
      as: "script",
      type: "text/javascript"
    }
  );

  $swiperRoots.each((_index, root) => {
    const $root = $(root);

    // 使用混合策略判断是否首屏
    const isAboveFold = isSwiperAboveFold($, $root);

    // 查找该 Swiper 中的所有图片
    const $images = $root.find(".swiper-slide img");

    if ($images.length === 0) {
      return;
    }

    $images.each((imgIndex, img) => {
      const $img = $(img);
      const src = $img.attr("src");

      if (!src) return;

      // 首屏 Swiper 的第一张图片 - 最高优先级
      if (isAboveFold && imgIndex === 0) {
        $img.attr("loading", "eager");
        $img.attr("fetchpriority", "high");

        // 添加到预加载资源列表
        preloadResources.push({
          href: src,
          as: "image",
          type: getImageType(src),
          fetchPriority: "high"
        });
      }
      // 首屏 Swiper 的其他图片（前3张）- 预加载但不是最高优先级
      else if (isAboveFold && imgIndex < 3) {
        $img.attr("loading", "eager");
      }
      // 其他 Swiper 的图片 - 懒加载
      else {
        $img.attr("loading", "lazy");
      }

      // 确保所有图片都有 decoding 属性
      if (!$img.attr("decoding")) {
        $img.attr("decoding", "async");
      }
    });
  });

  return true;
}

/**
 * 判断 Swiper 是否在首屏（混合策略）
 * 优先级：手动标记 > 类名检测 > 位置检测 > 高度估算
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $swiper - Swiper 元素
 * @returns {boolean}
 */
function isSwiperAboveFold($, $swiper) {
  // 1. 优先检查手动标记
  const priority = $swiper.attr("data-priority");
  if (priority === "high") return true;
  if (priority === "low") return false;

  // 2. 检查类名关键词
  const classes = ($swiper.attr("class") || "").toLowerCase();
  const heroKeywords = ["hero", "banner", "main", "top", "header"];
  if (heroKeywords.some((keyword) => classes.includes(keyword))) {
    return true;
  }

  // 3. 检查位置（在 body 的前3个主要元素内）
  const bodyChildren = $("body").children().not("script, style, link");
  const allSwipers = bodyChildren.find(".gjs-swiper-root, .swiper-container").addBack(".gjs-swiper-root, .swiper-container");
  const swiperIndex = allSwipers.index($swiper);

  // 第一个 Swiper 通常是首屏
  if (swiperIndex === 0) {
    return true;
  }

  // 4. 粗略估算垂直位置
  let estimatedY = 0;
  const VIEWPORT_HEIGHT = 800; // 假设视口高度

  bodyChildren.each((_i, elem) => {
    const $elem = $(elem);

    if ($elem.is($swiper) || $elem.has($swiper).length > 0) {
      return false; // 找到目标，停止遍历
    }

    const estimatedHeight = estimateElementHeight($, $elem);
    estimatedY += estimatedHeight;
  });

  return estimatedY < VIEWPORT_HEIGHT;
}

/**
 * 估算元素高度（用于判断是否在首屏）
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $elem - 元素
 * @returns {number}
 */
function estimateElementHeight($, $elem) {
  const tagName = $elem.get(0)?.tagName?.toLowerCase();

  if (!tagName) return 100;

  // 根据标签类型粗略估计高度
  if ($elem.find("img").length > 0) return 400;
  if (tagName === "section" || tagName === "div") return 200;

  return 100; // 默认高度
}

/**
 * 提取所有 Swiper 初始化脚本
 * 从 HTML 中提取 <script> 标签内的 Swiper 初始化代码
 * @param {CheerioAPI} $ - Cheerio 实例
 * @returns {Array}
 */
export function extractSwiperScripts($) {
  const scripts = [];

  $("script").each((_i, elem) => {
    const $script = $(elem);
    const scriptContent = $script.html();

    // 检查是否是 Swiper 相关的脚本
    if (scriptContent && (scriptContent.includes("Swiper") || scriptContent.includes("swiper"))) {
      scripts.push({
        content: scriptContent,
        type: $script.attr("type") || "text/javascript"
      });

      // 从 HTML 中移除脚本标签（稍后在客户端执行）
      $script.remove();
    }
  });

  return scripts;
}
