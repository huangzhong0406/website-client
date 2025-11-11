import {load} from "cheerio";
import {logWarn} from "../logger";
import {generateMenuHtml, setCurrentPageByPath, validateMenuData} from "../../utils/xnav/generateMenuHtml";
import {generateCategoryTree} from "../../utils/productlist/generateCategoryTree";
import {generateProductGrid, generateProductList} from "../../utils/productlist/generateProductGrid";
import {generatePagination} from "../../utils/productlist/generatePagination";

// 关键 CSS 截断长度,超出部分将延迟注入
const DEFAULT_CRITICAL_CSS_LIMIT = Number(process.env.CRITICAL_CSS_LIMIT ?? 4000);

export function prepareGrapesContent({
  html = "",
  css = "",
  assets = [],
  productData = null,
  currentSlug = "",
  globalComponents = null,
  productListPageData = null, // 新增：产品列表页数据
  skipSanitization = false // 是否跳过HTML清理(仅用于可信来源)
} = {}) {
  // 早期返回空内容
  if (!html) {
    return {
      html: "",
      criticalCss: "",
      deferredCss: "",
      preloadResources: [],
      swiperScripts: [],
      hasSwipers: false
    };
  }

  // 检查是否需要处理动态内容
  const needsProcessing = productData || globalComponents || productListPageData || assets.length > 0;

  if (!needsProcessing) {
    // 无需处理,直接返回
    const {criticalCss, deferredCss} = splitCss(css);
    return {
      html,
      criticalCss,
      deferredCss,
      preloadResources: [],
      swiperScripts: [],
      hasSwipers: false
    };
  }

  // 只加载一次Cheerio
  const $ = load(html, {
    decodeEntities: false,
    normalizeWhitespace: false,
    xmlMode: false
  });

  // 构建资源映射表(如果有资源)
  const assetMap = assets.length > 0 ? buildAssetMap(assets) : null;

  // 收集需要预加载的资源
  const preloadResources = [];

  // 分离页面CSS
  const {criticalCss: pageCriticalCss, deferredCss} = splitCss(css);

  // 单次遍历处理所有动态内容
  processDynamicContent($, {
    globalComponents,
    productData,
    productListPageData,
    currentSlug,
    assetMap,
    preloadResources
  });

  // 处理Swiper组件优化
  const hasSwipers = processSwiperOptimization($, preloadResources);

  // 提取Swiper脚本
  const swiperScripts = hasSwipers ? extractSwiperScripts($) : [];

  const body = $("body");
  const normalizedHtml = body.length > 0 ? body.html() || "" : $.root().html() || "";

  // console.log("normalizedHtml:", normalizedHtml);

  // 合并Swiper关键CSS（如果页面包含Swiper）
  const swiperCriticalCss = hasSwipers ? getSwiperCriticalCss() : "";
  const criticalCss = swiperCriticalCss ? pageCriticalCss + "\n" + swiperCriticalCss : pageCriticalCss;

  return {
    html: normalizedHtml,
    criticalCss,
    deferredCss,
    preloadResources,
    swiperScripts,
    hasSwipers
  };
}

function buildAssetMap(assets) {
  return new Map(
    (assets ?? [])
      .filter(Boolean)
      .map((asset) => [asset?.src ?? asset?.url ?? asset?.path ?? "", asset ?? {}])
      .filter(([key]) => Boolean(key))
  );
}

/**
 * 单次遍历处理所有动态内容
 * 优化策略:先注入全局组件,然后单次遍历处理所有需要的元素
 */
function processDynamicContent($, {globalComponents, productData,  productListPageData, currentSlug, assetMap, preloadResources}) {
  // 1. 首先注入全局组件(如果需要)
  if (globalComponents) {
    injectGlobalComponents($, globalComponents, currentSlug);
  }

  // 2. 单次遍历处理所有需要处理的元素
  let lcpAssigned = false;

  // 使用单次遍历处理所有元素
  $("*").each((_index, element) => {
    const $elem = $(element);
    const componentType = $elem.attr("data-component-type");

    // 处理产品列表组件
    if (componentType === "product-list" && productData) {
      processProductListComponent($, $elem, productData);
    }

    // 处理产品列表页组件（新组件）
    else if (componentType === "product-list-page" && productListPageData) {
      processProductListPageComponent($, $elem, productListPageData);
    }

    // 处理 Global-Header 导航组件（备用逻辑，主要逻辑已在 injectGlobalComponents 中处理）
    // 这里保留以防某些特殊情况下页面中有多个 header 组件
    else if (componentType === "global-header" && globalComponents) {
      const navigationData = globalComponents.find((com) => com.type === "global-header")?.json_data?.menu_data;
      if (navigationData) {
        // 检查该元素是否已处理过（避免重复处理）
        if (!$elem.attr('data-menu-processed')) {
          processGlobalHeaderComponent($, $elem, navigationData, currentSlug);
          $elem.attr('data-menu-processed', 'true');
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

        // 如果没有assetMap,手动设置属性
        if (!assetMap) {
          $elem.attr("loading", "eager");
          $elem.attr("fetchpriority", "high");
        }
      }
    }
  });
}

/**
 * 注入全局组件到页面
 * 如果页面中不存在全局组件,则自动注入
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Array} globalComponents - 全局组件数组
 * @param {string} currentSlug - 当前页面路径，用于菜单高亮
 */
function injectGlobalComponents($, globalComponents, currentSlug = '') {
  console.log("准备注入全局组件:", globalComponents);
  if (!globalComponents?.length) {
    return;
  }

  const body = $("body");
  const root = body.length > 0 ? body : $.root();

  // 检查是否已存在全局组件
  const hasFooter = $('[data-component-type="global-footer"]').length > 0;
  const hasGlobalFooter = $('[data-component-type="global-footer"]').length > 0;  // ✅ 检查 Global-Footer 组件
  const hasHeader = $('[data-component-type="global-header"]').length > 0;  // ✅ 检查 Global-Header 组件

  // 注入全局组件
  globalComponents.forEach((com) => {
    // ✅ 注入 Global-Header 组件（新的头部系统）
    if (com.type === "header" && com.json_data?.html) {
      console.log("[Render] 检测到全局 Global-Header 组件");

      // 从 HTML 中生成导航数据（如果需要）
      const $headerHtml = $(com.json_data.html);

      if (hasHeader) {
        // 如果页面已有 Header 占位符，替换它
        $('[data-component-type="global-header"]').first().replaceWith($headerHtml);
        console.log("[Render] 已替换页面中的 Global-Header 占位符");
      } else {
        // 如果没有 Header，插入到页面顶部
        root.prepend($headerHtml);
        console.log("[Render] 已将 Global-Header 插入到页面顶部");
      }

      // 注入 Header 样式
      if (com.json_data.css) {
        root.prepend(`<style data-critical="true" data-global-header-styles="true">${com.json_data.css}</style>`);
      }

      // ✅ 新增：处理菜单数据（动态注入菜单项）
      if (com.json_data.menu_data) {
        const $nav = $('[data-component-type="global-header"]');
        if ($nav.length > 0) {
          console.log("[Render] 开始处理 Global-Header 菜单数据");
          processGlobalHeaderComponent($, $nav.first(), com.json_data.menu_data, currentSlug);
        }
      }

      // ✅ 新增：注入运行时脚本
      root.append(`<script src="/scripts/global-header-core.js" defer></script>`);

      // ✅ 新增：注入变体样式
      const variant = com.json_data.variant || "classic";
      root.prepend(`<link rel="stylesheet" href="/styles/global-header-${variant}.css">`);

      logWarn("已自动注入全局 Global-Header 组件");
    }

    // 注入全局页脚 - 没有的话就插入，有的话就替换第一个
    if (com.type == "footer" && com.json_data?.html) {
      // 旧版 tailwind-footer（向后兼容）
      if (hasFooter) {
        $('[data-component-type="global-footer"]').first().replaceWith(com.json_data.html);
      } else if (!hasGlobalFooter) {
        // 如果没有新版 global-footer，才插入旧版
        root.append(com.json_data.html);
      }
      logWarn("已自动注入全局页脚组件");
    }

    // ✅ 注入 Global-Footer 组件（新的页脚系统）
    if (com.type === "global-footer" && com.json_data?.html) {
      console.log("[Render] 检测到全局 Global-Footer 组件");

      const $footerHtml = $(com.json_data.html);

      if (hasGlobalFooter) {
        // 如果页面已有 Footer 占位符，替换它
        $('[data-component-type="global-footer"]').first().replaceWith($footerHtml);
        console.log("[Render] 已替换页面中的 Global-Footer 占位符");
      } else {
        // 如果没有 Footer，插入到页面底部
        root.append($footerHtml);
        console.log("[Render] 已将 Global-Footer 插入到页面底部");
      }

      // 注入 Footer 样式
      if (com.json_data.css) {
        root.prepend(`<style data-critical="true" data-global-footer-styles="true">${com.json_data.css}</style>`);
      }

      logWarn("已自动注入全局 Global-Footer 组件");
    }
  });
}

/**
 * 处理单个产品列表组件
 * 复用编辑器保存的HTML结构,只替换动态数据
 */
function processProductListComponent($, $elem, products) {
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }

  // 获取组件配置
  const maxProducts = parseInt($elem.attr("data-max-products")) || 12;
  const displayProducts = products.slice(0, maxProducts);

  // 移除编辑器标识(如果存在)
  $elem.find(".editor-badge").remove();

  // 查找产品列表容器
  const $productList = $elem.find(".product-list");

  if ($productList.length === 0) {
    logWarn("产品列表容器 .product-list 未找到");
    return;
  }

  // 查找第一个产品项作为模板
  const $templateItem = $productList.find(".product-item").first();

  if ($templateItem.length === 0) {
    logWarn("产品项模板 .product-item 未找到");
    return;
  }

  // 克隆模板结构
  const templateHTML = $.html($templateItem);

  // 清空产品列表
  $productList.empty();

  // 根据真实产品数据生成产品项
  displayProducts.forEach((product) => {
    const $productItem = $(templateHTML);

    // 替换产品图片
    const $img = $productItem.find(".product-image img, img");
    if ($img.length > 0) {
      $img.attr("src", product.image || "https://via.placeholder.com/300");
      $img.attr("alt", product.name || "");
    }

    // 替换产品名称
    const $name = $productItem.find(".product-name, h3");
    if ($name.length > 0) {
      $name.text(product.name || "");
    }

    // 替换产品价格
    const $price = $productItem.find(".product-price");
    if ($price.length > 0) {
      $price.text(product.price || "");
    }

    // 替换产品描述
    const $description = $productItem.find(".product-description");
    if ($description.length > 0) {
      $description.text(product.description || "");
    }

    // 添加到产品列表
    $productList.append($productItem);
  });
}

/**
 * 处理全局导航组件
 * 复用编辑器保存的HTML结构,动态替换菜单项
 */
function processGlobalNavigationComponent($, $nav, navigationPages, currentSlug = "") {
  if (!Array.isArray(navigationPages) || navigationPages.length === 0) {
    return;
  }

  // 获取配置
  const showLogo = $nav.attr("data-show-logo") !== "false";
  const theme = $nav.attr("data-theme") || "light";
  const navStyle = $nav.attr("data-nav-style") || "horizontal";

  // 查找菜单容器
  const $menu = $nav.find(".nav-menu");
  if ($menu.length === 0) {
    logWarn("导航菜单容器 .nav-menu 未找到");
    return;
  }

  // 获取第一个菜单项作为模板(如果存在)
  const $templateItem = $menu.find(".nav-item, li").first();
  let templateHTML = "";

  if ($templateItem.length > 0) {
    templateHTML = $.html($templateItem);
  } else {
    // 如果没有模板,使用默认模板
    templateHTML = '<li class="nav-item"><a href="#">链接</a></li>';
  }

  // 清空现有菜单
  $menu.empty();

  // 根据导航数据生成菜单项
  navigationPages.forEach((page) => {
    const $menuItem = $(templateHTML);

    // 查找链接元素
    const $link = $menuItem.find("a").length > 0 ? $menuItem.find("a") : $menuItem.is("a") ? $menuItem : null;

    if ($link) {
      // 设置链接属性
      $link.attr("href", page.path);
      $link.text(page.title);

      // 标记当前激活的页面
      const isActive = currentSlug === page.slug || (currentSlug === "" && page.slug === "home") || (currentSlug === "home" && page.slug === "home");

      if (isActive) {
        $link.addClass("active");
        $menuItem.addClass("active");
      }
    }

    $menu.append($menuItem);
  });

  // 处理 Logo 显示
  if (!showLogo) {
    $nav.find(".nav-brand").css("display", "none");
  }

  // 应用主题
  if (theme === "dark") {
    $nav.attr("data-theme", "dark");
  }

  // 应用导航样式
  if (navStyle === "vertical") {
    $nav.attr("data-nav-style", "vertical");
  }
}

/**
 * 优化单个图片元素
 * 返回是否设置了优先加载
 */
function enhanceImage(_$, node, assetMap, lcpAssigned) {
  const src = node.attr("src");

  if (!src) {
    return false;
  }

  const meta = assetMap.get(src);
  let isPriority = false;

  if (!node.attr("loading")) {
    const shouldPrioritize = Boolean(meta?.priority) || (!lcpAssigned && isHeroCandidate(node));

    if (shouldPrioritize) {
      node.attr("loading", "eager");
      node.attr("fetchpriority", "high");
      isPriority = true;
    } else {
      node.attr("loading", "lazy");
    }
  }

  if (!node.attr("decoding")) {
    node.attr("decoding", "async");
  }

  if (!node.attr("alt")) {
    node.attr("alt", meta?.alt ?? "");
  }

  if (meta?.width && !node.attr("width")) {
    node.attr("width", String(meta.width));
  }

  if (meta?.height && !node.attr("height")) {
    node.attr("height", String(meta.height));
  }

  if (meta?.placeholder && !node.attr("data-placeholder")) {
    node.attr("data-placeholder", meta.placeholder);
  }

  if (meta?.sources?.length) {
    applyPictureSources(node, meta.sources);
  } else if (meta?.srcSet && !node.attr("srcset")) {
    node.attr("srcset", meta.srcSet);
  }

  if (meta?.sizes && !node.attr("sizes")) {
    node.attr("sizes", meta.sizes);
  }

  return isPriority;
}

function isHeroCandidate(node) {
  const classes = (node.attr("class") ?? "").split(/\s+/);
  return classes.some((className) => ["hero", "banner", "cover", "main-image"].includes(className));
}

function applyPictureSources(node, sources) {
  try {
    const parent = node.parent();
    if (parent && parent.is("picture")) {
      parent.children("source").remove();
    }

    const picture = parent && parent.is("picture") ? parent : node.wrap("<picture></picture>").parent();

    sources.forEach((source) => {
      if (!source?.srcset && !source?.srcSet) return;

      picture.prepend("<source>");
      const created = picture
        .children("source")
        .first()
        .attr("srcset", source.srcset ?? source.srcSet ?? source.src ?? source.url ?? "");

      if (source.type) {
        created.attr("type", source.type);
      }

      if (source.media) {
        created.attr("media", source.media);
      }
    });
  } catch (error) {
    logWarn("包装 picture 标签失败。", {error});
  }
}

function splitCss(css) {
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
 * 根据图片URL获取MIME类型
 */
function getImageType(src) {
  if (!src) return "image/jpeg";

  const ext = src.split(".").pop()?.toLowerCase().split("?")[0];
  const typeMap = {
    avif: "image/avif",
    webp: "image/webp",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    svg: "image/svg+xml"
  };

  return typeMap[ext] || "image/jpeg";
}

/**
 * 提取所有Swiper初始化脚本
 * 从HTML中提取<script>标签内的Swiper初始化代码
 */
function extractSwiperScripts($) {
  const scripts = [];

  $("script").each((_i, elem) => {
    const $script = $(elem);
    const scriptContent = $script.html();

    // 检查是否是Swiper相关的脚本
    if (scriptContent && (scriptContent.includes("Swiper") || scriptContent.includes("swiper"))) {
      scripts.push({
        content: scriptContent,
        type: $script.attr("type") || "text/javascript"
      });

      // 从HTML中移除脚本标签（稍后在客户端执行）
      $script.remove();
    }
  });

  return scripts;
}

/**
 * 估算元素高度（用于判断是否在首屏）
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
 * 判断Swiper是否在首屏（混合策略）
 * 优先级：手动标记 > 类名检测 > 位置检测 > 高度估算
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

  // 3. 检查位置（在body的前3个主要元素内）
  const bodyChildren = $("body").children().not("script, style, link");
  const allSwipers = bodyChildren.find(".gjs-swiper-root, .swiper-container").addBack(".gjs-swiper-root, .swiper-container");
  const swiperIndex = allSwipers.index($swiper);

  // 第一个Swiper通常是首屏
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
 * 处理Swiper组件优化
 * 1. 识别首屏Swiper
 * 2. 为首屏Swiper的第一张图片添加高优先级
 * 3. 为非首屏Swiper图片添加懒加载
 * 4. 添加Swiper CSS/JS到预加载资源
 */
function processSwiperOptimization($, preloadResources) {
  const $swiperRoots = $(".gjs-swiper-root, .swiper-container");

  if ($swiperRoots.length === 0) {
    return false;
  }

  // 添加Swiper CSS/JS到预加载资源
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

    // 查找该Swiper中的所有图片
    const $images = $root.find(".swiper-slide img");

    if ($images.length === 0) {
      return;
    }

    $images.each((imgIndex, img) => {
      const $img = $(img);
      const src = $img.attr("src");

      if (!src) return;

      // 首屏Swiper的第一张图片 - 最高优先级
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
      // 首屏Swiper的其他图片（前3张）- 预加载但不是最高优先级
      else if (isAboveFold && imgIndex < 3) {
        $img.attr("loading", "eager");
      }
      // 其他Swiper的图片 - 懒加载
      else {
        $img.attr("loading", "lazy");
      }

      // 确保所有图片都有decoding属性
      if (!$img.attr("decoding")) {
        $img.attr("decoding", "async");
      }
    });
  });

  return true;
}

/**
 * 获取Swiper的关键CSS
 * 这些CSS确保即使JS未加载，轮播图的第一张也能正常显示
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

/**
 * 处理 X-Nav 导航组件
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $nav - X-Nav 组件元素
 * @param {Object|string} navigationData - 导航菜单数据（对象或 JSON 字符串）
 * @param {string} currentSlug - 当前页面路径，用于高亮当前页
 */
function processGlobalHeaderComponent($, $nav, navigationData, currentSlug) {
  try {
    // 验证输入参数
    if (!navigationData) {
      logWarn('[X-Nav] 未提供菜单数据');
      return;
    }

    // 查找菜单容器
    const $menuContainer = $nav.find('.header-menu');
    if ($menuContainer.length === 0) {
      logWarn('[X-Nav] 未找到菜单容器 .header-menu');
      return;
    }

    // 解析菜单数据（如果是 JSON 字符串）
    let menuData = navigationData;
    if (typeof navigationData === 'string') {
      try {
        menuData = JSON.parse(navigationData);
      } catch (e) {
        logWarn('[X-Nav] 菜单数据解析失败:', e);
        return;
      }
    }

    // 验证菜单数据结构
    const validation = validateMenuData(menuData);
    if (!validation.valid) {
      logWarn('[X-Nav] 菜单数据结构无效:', validation.error);
      return;
    }

    // 根据当前路径设置高亮
    if (currentSlug) {
      const currentPath = currentSlug.startsWith('/') ? currentSlug : `/${currentSlug}`;
      menuData = setCurrentPageByPath(menuData, currentPath);
    }

    // 生成菜单 HTML
    const menuHtml = generateMenuHtml(menuData.items || [], 0, currentSlug);

    if (!menuHtml || menuHtml.trim() === '') {
      logWarn('[X-Nav] 生成的菜单 HTML 为空');
      return;
    }

    // 注入菜单
    $menuContainer.html(menuHtml);

    console.log(`[X-Nav] 菜单已成功注入，包含 ${menuData.items?.length || 0} 个顶级菜单项`);
    logWarn('[X-Nav] 菜单已成功注入');
  } catch (error) {
    logWarn('[X-Nav] 处理失败:', error);
    console.error('[X-Nav] 详细错误:', error);
  }
}

/**
 * 处理产品列表页组件 (Product List Page Component)
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} $elem - Component element
 * @param {Object} productListPageData - Product list page data containing categories, products, pagination
 */
function processProductListPageComponent($, $elem, productListPageData) {
  try {
    // 解析组件配置
    const configStr = $elem.attr('data-config');
    let config = {};
    try {
      config = configStr ? JSON.parse(configStr) : {};
    } catch (e) {
      logWarn('[ProductListPage] Failed to parse config:', e);
    }

    // 获取数据
    const { categories = [], products = [], pagination = {} } = productListPageData;

    // 获取布局变体
    const variant = $elem.attr('data-variant') || config.displayMode || 'grid';

    // 1. 注入分类树 (如果显示分类)
    if (config.showCategories !== false) {
      const $categoriesContainer = $elem.find('.plp-categories');
      if ($categoriesContainer.length > 0 && categories.length > 0) {
        const categoriesHtml = generateCategoryTree(categories, 0, null);
        $categoriesContainer.html(categoriesHtml);
        logWarn('[ProductListPage] Categories injected:', categories.length);
      }
    }

    // 2. 注入产品列表
    const $productsContainer = $elem.find('.plp-products-content');
    if ($productsContainer.length > 0) {
      let productsHtml;
      if (variant === 'list') {
        productsHtml = generateProductList(products);
      } else {
        productsHtml = generateProductGrid(products, config);
      }
      $productsContainer.html(productsHtml);
      logWarn('[ProductListPage] Products injected:', products.length);
    }

    // 3. 注入分页器
    const $paginationContainer = $elem.find('.plp-pagination-wrapper');
    if ($paginationContainer.length > 0 && pagination.total_pages > 1) {
      const paginationHtml = generatePagination(pagination);
      $paginationContainer.html(paginationHtml);
      logWarn('[ProductListPage] Pagination injected');
    }

    // 4. 更新结果计数
    const $resultsCount = $elem.find('.plp-results-count strong');
    if ($resultsCount.length > 0 && pagination.total_items) {
      $resultsCount.text(pagination.total_items);
    }

    // 5. 添加数据属性用于客户端hydration
    $elem.attr('data-categories', JSON.stringify(categories));
    $elem.attr('data-initial-products', JSON.stringify(products));
    $elem.attr('data-pagination', JSON.stringify(pagination));

    logWarn('[ProductListPage] Component processed successfully');
  } catch (error) {
    logWarn('[ProductListPage] Processing failed:', error);
  }
}
