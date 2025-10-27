import { load } from "cheerio";
import { logWarn } from "../logger";

// 关键 CSS 截断长度,超出部分将延迟注入
const DEFAULT_CRITICAL_CSS_LIMIT = Number(
  process.env.CRITICAL_CSS_LIMIT ?? 4000
);

export function prepareGrapesContent({
  html = "",
  css = "",
  assets = [],
  productData = null,
  navigationData = null,
  currentSlug = "",
  globalComponents = null,
} = {}) {
  // 早期返回空内容
  if (!html) {
    return {
      html: "",
      criticalCss: "",
      deferredCss: "",
    };
  }

  // 检查是否需要处理动态内容
  const needsProcessing = productData || navigationData || globalComponents || assets.length > 0;

  if (!needsProcessing) {
    // 无需处理,直接返回
    const { criticalCss, deferredCss } = splitCss(css);
    return {
      html,
      criticalCss,
      deferredCss,
    };
  }

  // 只加载一次Cheerio
  const $ = load(html, {
    decodeEntities: false,
    normalizeWhitespace: false,
    xmlMode: false,
  });

  // 构建资源映射表(如果有资源)
  const assetMap = assets.length > 0 ? buildAssetMap(assets) : null;

  // 单次遍历处理所有动态内容
  processDynamicContent($, {
    globalComponents,
    productData,
    navigationData,
    currentSlug,
    assetMap,
  });

  const normalizedHtml = $.root().html() || "";
  const { criticalCss, deferredCss } = splitCss(css);

  return {
    html: normalizedHtml,
    criticalCss,
    deferredCss,
  };
}

function buildAssetMap(assets) {
  return new Map(
    (assets ?? [])
      .filter(Boolean)
      .map((asset) => [
        asset?.src ?? asset?.url ?? asset?.path ?? "",
        asset ?? {},
      ])
      .filter(([key]) => Boolean(key))
  );
}

/**
 * 单次遍历处理所有动态内容
 * 优化策略:先注入全局组件,然后单次遍历处理所有需要的元素
 */
function processDynamicContent($, { globalComponents, productData, navigationData, currentSlug, assetMap }) {
  // 1. 首先注入全局组件(如果需要)
  if (globalComponents) {
    injectGlobalComponents($, globalComponents);
  }

  // 2. 单次遍历处理所有需要处理的元素
  let lcpAssigned = false;

  // 使用单次遍历处理所有元素
  $('*').each((_index, element) => {
    const $elem = $(element);
    const componentType = $elem.attr('data-component-type');

    // 处理产品列表组件
    if (componentType === 'product-list' && productData) {
      processProductListComponent($, $elem, productData);
    }

    // 处理全局导航组件
    else if (componentType === 'global-navigation' && navigationData) {
      processGlobalNavigationComponent($, $elem, navigationData, currentSlug);
    }

    // 处理图片优化
    else if (assetMap && element.tagName === 'img') {
      const shouldPrioritize = enhanceImage($, $elem, assetMap, lcpAssigned);
      if (shouldPrioritize) {
        lcpAssigned = true;
      }
    }
  });
}

/**
 * 注入全局组件到页面
 * 如果页面中不存在全局组件,则自动注入
 */
function injectGlobalComponents($, globalComponents) {
  if (!globalComponents || typeof globalComponents !== 'object') {
    return;
  }

  const body = $('body');
  const root = body.length > 0 ? body : $.root();

  // 检查是否已存在全局组件
  const hasNavigation = $('[data-component-type="global-navigation"]').length > 0;
  const hasFooter = $('[data-component-type="global-footer"]').length > 0;

  // 注入全局导航(如果存在且页面中不存在)
  if (globalComponents.navigation && !hasNavigation) {
    if (body.length > 0) {
      body.prepend(globalComponents.navigation);
    } else {
      root.prepend(globalComponents.navigation);
    }
    logWarn('已自动注入全局导航组件');
  }

  // 注入全局页脚(如果存在且页面中不存在)
  if (globalComponents.footer && !hasFooter) {
    if (body.length > 0) {
      body.append(globalComponents.footer);
    } else {
      root.append(globalComponents.footer);
    }
    logWarn('已自动注入全局页脚组件');
  }
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
  const maxProducts = parseInt($elem.attr('data-max-products')) || 12;
  const displayProducts = products.slice(0, maxProducts);

  // 移除编辑器标识(如果存在)
  $elem.find('.editor-badge').remove();

  // 查找产品列表容器
  const $productList = $elem.find('.product-list');

  if ($productList.length === 0) {
    logWarn('产品列表容器 .product-list 未找到');
    return;
  }

  // 查找第一个产品项作为模板
  const $templateItem = $productList.find('.product-item').first();

  if ($templateItem.length === 0) {
    logWarn('产品项模板 .product-item 未找到');
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
    const $img = $productItem.find('.product-image img, img');
    if ($img.length > 0) {
      $img.attr('src', product.image || 'https://via.placeholder.com/300');
      $img.attr('alt', product.name || '');
    }

    // 替换产品名称
    const $name = $productItem.find('.product-name, h3');
    if ($name.length > 0) {
      $name.text(product.name || '');
    }

    // 替换产品价格
    const $price = $productItem.find('.product-price');
    if ($price.length > 0) {
      $price.text(product.price || '');
    }

    // 替换产品描述
    const $description = $productItem.find('.product-description');
    if ($description.length > 0) {
      $description.text(product.description || '');
    }

    // 添加到产品列表
    $productList.append($productItem);
  });
}

/**
 * 处理全局导航组件
 * 复用编辑器保存的HTML结构,动态替换菜单项
 */
function processGlobalNavigationComponent($, $nav, navigationPages, currentSlug = '') {
  if (!Array.isArray(navigationPages) || navigationPages.length === 0) {
    return;
  }

  // 获取配置
  const showLogo = $nav.attr('data-show-logo') !== 'false';
  const theme = $nav.attr('data-theme') || 'light';
  const navStyle = $nav.attr('data-nav-style') || 'horizontal';

  // 查找菜单容器
  const $menu = $nav.find('.nav-menu');
  if ($menu.length === 0) {
    logWarn('导航菜单容器 .nav-menu 未找到');
    return;
  }

  // 获取第一个菜单项作为模板(如果存在)
  const $templateItem = $menu.find('.nav-item, li').first();
  let templateHTML = '';

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
    const $link = $menuItem.find('a').length > 0
      ? $menuItem.find('a')
      : $menuItem.is('a')
      ? $menuItem
      : null;

    if ($link) {
      // 设置链接属性
      $link.attr('href', page.path);
      $link.text(page.title);

      // 标记当前激活的页面
      const isActive =
        currentSlug === page.slug ||
        (currentSlug === '' && page.slug === 'home') ||
        (currentSlug === 'home' && page.slug === 'home');

      if (isActive) {
        $link.addClass('active');
        $menuItem.addClass('active');
      }
    }

    $menu.append($menuItem);
  });

  // 处理 Logo 显示
  if (!showLogo) {
    $nav.find('.nav-brand').css('display', 'none');
  }

  // 应用主题
  if (theme === 'dark') {
    $nav.attr('data-theme', 'dark');
  }

  // 应用导航样式
  if (navStyle === 'vertical') {
    $nav.attr('data-nav-style', 'vertical');
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
    const shouldPrioritize =
      Boolean(meta?.priority) || (!lcpAssigned && isHeroCandidate(node));

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
  return classes.some((className) =>
    ["hero", "banner", "cover", "main-image"].includes(className)
  );
}

function applyPictureSources(node, sources) {
  try {
    const parent = node.parent();
    if (parent && parent.is("picture")) {
      parent.children("source").remove();
    }

    const picture =
      parent && parent.is("picture")
        ? parent
        : node.wrap("<picture></picture>").parent();

    sources.forEach((source) => {
      if (!source?.srcset && !source?.srcSet) return;

      picture.prepend("<source>");
      const created = picture
        .children("source")
        .first()
        .attr(
          "srcset",
          source.srcset ?? source.srcSet ?? source.src ?? source.url ?? ""
        );

      if (source.type) {
        created.attr("type", source.type);
      }

      if (source.media) {
        created.attr("media", source.media);
      }
    });
  } catch (error) {
    logWarn("包装 picture 标签失败。", { error });
  }
}

function splitCss(css) {
  if (!css) {
    return { criticalCss: "", deferredCss: "" };
  }

  const limit =
    Number.isFinite(DEFAULT_CRITICAL_CSS_LIMIT) && DEFAULT_CRITICAL_CSS_LIMIT > 0
      ? DEFAULT_CRITICAL_CSS_LIMIT
      : css.length;

  if (css.length <= limit) {
    return { criticalCss: css, deferredCss: "" };
  }

  // 超出关键长度的 CSS 放入 deferred,客户端空闲时再写入
  const criticalCss = css.slice(0, limit);
  const deferredCss = css.slice(limit);

  return { criticalCss, deferredCss };
}
