/**
 * 渲染引擎主文件
 * 负责协调各个模块处理 GrapesJS 内容
 */

import {load} from "cheerio";
import {splitCss} from "./render/cssProcessor.js";
import {buildAssetMap, enhanceImage, isHeroCandidate, getImageType} from "./render/imageOptimizer.js";
import {injectGlobalComponents} from "./render/globalComponentsInjector.js";
import {processProductListPageComponent} from "./render/productListPageProcessor.js";
import {processProductListDetailComponent} from "./render/productListDetailProcessor.js";
import {processGlobalHeaderComponent} from "./render/headerProcessor.js";
import {processProductDetailComponent} from "./render/productDetailProcessor.js";
import {processBlogListPageComponent} from "./render/blogListPageProcessor.js";
import {processBlogDetailComponent} from "./render/blogDetailProcessor.js";
import {processSwipers} from "./render/swiperProcessor.js";

/**
 * 准备 GrapesJS 内容用于渲染
 * @param {Object} options - 配置选项
 * @param {string} options.html - HTML 内容
 * @param {string} options.css - CSS 样式
 * @param {Array} options.assets - 资源数组
 * @param {string} options.currentSlug - 当前页面路径
 * @param {Array} options.globalComponents - 全局组件数据
 * @param {Object} options.productListPageData - 产品列表页数据
 * @param {Object} options.blogListPageData - 博客列表页数据
 * @param {Object} options.productDetailData - 产品详情数据
 * @param {Object} options.blogDetailData - 博客详情数据
 * @param {Object} options.currentParams - 当前 URL 参数
 * @param {string|number} options.currentCategoryId - 当前分类ID（用于高亮分类）
 * @param {boolean} options.skipSanitization - 是否跳过 HTML 清理
 * @returns {Object} 处理后的内容
 */
export async function prepareGrapesContent({
  html = "",
  css = "",
  assets = [],
  currentSlug = "",
  globalComponents = null,
  productListPageData = null,
  blogListPageData = null,
  productDetailData = null,
  blogDetailData = null,
  currentParams = {},
  currentCategoryId = null,
  skipSanitization = false
} = {}) {
  // 检查是否需要处理动态内容
  const needsProcessing = globalComponents || productListPageData || blogListPageData || productDetailData || blogDetailData || assets.length > 0;

  if (!needsProcessing) {
    // 无需处理,但仍需检查 Swiper
    let {criticalCss, deferredCss} = splitCss(css);

    // 处理 Swiper 组件
    const swiperResult = processSwipers(html);

    return {
      html: swiperResult.html,
      criticalCss,
      deferredCss,
      preloadResources: [],
      swiperScripts: swiperResult.swiperScripts,
      hasSwipers: swiperResult.hasSwipers,
      swiperCount: swiperResult.swiperCount,
      hasAboveFoldSwiper: swiperResult.hasAboveFoldSwiper
    };
  }

  // 只加载一次 Cheerio
  const $ = load(html, {
    decodeEntities: false,
    normalizeWhitespace: false,
    xmlMode: false
  });

  // 构建资源映射表(如果有资源)
  const assetMap = assets.length > 0 ? buildAssetMap(assets) : null;

  // 收集需要预加载的资源
  const preloadResources = [];

  // 组合css
  if (globalComponents && Array.isArray(globalComponents)) {
    globalComponents.forEach((com) => {
      let comCss = com.json_data?.css || "";
      if (com.type != "header") {
        css += comCss;
      }
    });
  }

  // 分离页面 CSS
  let {criticalCss: pageCriticalCss, deferredCss} = splitCss(css);

  // 单次遍历处理所有动态内容（现在支持异步）
  await processDynamicContent($, {
    globalComponents,
    productListPageData,
    blogListPageData,
    productDetailData,
    blogDetailData,
    currentSlug,
    currentParams,
    currentCategoryId,
    assetMap,
    preloadResources
  });

  const body = $("body");
  let normalizedHtml = body.length > 0 ? body.html() || "" : $.root().html() || "";


  let criticalCss = pageCriticalCss;
  let headerCss = "";
  if (globalComponents && Array.isArray(globalComponents)) {
    headerCss = globalComponents.find((com) => com.type == "header")?.json_data?.css || "";
  }
  criticalCss = headerCss + criticalCss;

  // 处理 Swiper 组件
  const swiperResult = processSwipers(normalizedHtml);
  normalizedHtml = swiperResult.html;

  const result = {
    html: normalizedHtml,
    criticalCss,
    deferredCss,
    preloadResources,
    swiperScripts: swiperResult.swiperScripts,
    hasSwipers: swiperResult.hasSwipers,
    swiperCount: swiperResult.swiperCount,
    hasAboveFoldSwiper: swiperResult.hasAboveFoldSwiper
  };

  return result;
}

/**
 * 单次遍历处理所有动态内容
 * 优化策略:先注入全局组件,然后单次遍历处理所有需要的元素
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Object} options - 处理选项
 */
async function processDynamicContent(
  $,
  {
    globalComponents,
    productListPageData,
    blogListPageData,
    productDetailData,
    blogDetailData,
    currentSlug,
    currentParams,
    currentCategoryId,
    assetMap,
    preloadResources
  }
) {
  // 1. 首先注入全局组件(如果需要)
  if (globalComponents) {
    injectGlobalComponents($, globalComponents, currentSlug);
  }

  // 2. 单次遍历处理所有需要处理的元素
  let lcpAssigned = false;
  const asyncTasks = []; // 收集异步任务

  // 使用单次遍历处理所有元素
  $("*").each((_index, element) => {
    const $elem = $(element);
    const componentType = $elem.attr("data-component-type");

    // 处理产品列表页组件（同步）
    if (componentType === "product-list-page" && productListPageData) {
      processProductListPageComponent($, $elem, productListPageData, currentSlug, currentParams, currentCategoryId);
    }

    // 处理产品列表详情组件（同步）
    else if (componentType === "product-list-detail" && productListPageData) {
      processProductListDetailComponent($, $elem, productListPageData, currentParams);
    }

    // 处理博客列表页组件（同步）
    else if (componentType === "blog-list-page" && blogListPageData) {
      processBlogListPageComponent($, $elem, blogListPageData, currentSlug, currentParams, currentCategoryId);
    }

    // 处理产品详情组件（异步 - 收集任务）
    else if (componentType === "product-detail" && productDetailData) {
      asyncTasks.push(processProductDetailComponent($, $elem, productDetailData));
    }

    // 处理博客详情组件（异步 - 收集任务）
    else if (componentType === "blog-detail" && blogDetailData) {
      asyncTasks.push(processBlogDetailComponent($, $elem, blogDetailData));
    }

    // 处理 Global-Header 导航组件（备用逻辑，主要逻辑已在 injectGlobalComponents 中处理）
    // 这里保留以防某些特殊情况下页面中有多个 header 组件
    else if (componentType === "global-header" && globalComponents) {
      const headerCom = globalComponents.find((com) => com.type === "global-header");
      const navigationData = headerCom?.json_data?.components?.menuData || headerCom?.json_data?.menuData;
      if (navigationData) {
        // 检查该元素是否已处理过（避免重复处理）
        if (!$elem.attr("data-menu-processed")) {
          processGlobalHeaderComponent($, $elem, navigationData, currentSlug);
          $elem.attr("data-menu-processed", "true");
        }
      }
    }

    // 处理图片优化并收集预加载资源
    else if (element.tagName === "img") {
      const src = $elem.attr("src");
      const shouldPrioritize = assetMap ? enhanceImage($, $elem, assetMap, lcpAssigned) : !lcpAssigned && isHeroCandidate($elem);

      if (shouldPrioritize && src) {
        // 添加到预加载资源列表
        preloadResources.push({
          href: src,
          as: "image",
          type: getImageType(src),
          fetchPriority: "high"
        });
        lcpAssigned = true;

        // 如果没有 assetMap,手动设置属性
        if (!assetMap) {
          $elem.attr("loading", "eager");
          $elem.attr("fetchpriority", "high");
        }
      }
    }
  });

  // 3. 等待所有异步任务完成
  if (asyncTasks.length > 0) {
    await Promise.all(asyncTasks);
  }
}
