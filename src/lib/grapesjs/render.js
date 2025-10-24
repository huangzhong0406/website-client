import { load } from "cheerio";
import { logWarn } from "../logger";

// 关键 CSS 截断长度，超出部分将延迟注入
const DEFAULT_CRITICAL_CSS_LIMIT = Number(
  process.env.CRITICAL_CSS_LIMIT ?? 4000
);

export function prepareGrapesContent({
  html = "",
  css = "",
  assets = [],
  productData = null, // 新增：产品数据
} = {}) {
  const assetMap = buildAssetMap(assets);

  // 确保 HTML 处理的一致性
  if (!html) {
    return {
      html: "",
      criticalCss: "",
      deferredCss: "",
      hasImages: false,
    };
  }

  const $ = load(html, {
    decodeEntities: false,
    normalizeWhitespace: false,
    xmlMode: false,
  });

  // 处理产品列表组件
  if (productData) {
    processProductListComponents($, productData);
  }

  // 对 <img> 进行补齐，降低 LCP/CLS 风险
  enhanceImages($, assetMap);

  // 注意：暂时禁用 Next.js Image 转换，使用原生 <img> 标签
  // 原因：
  // 1. GrapesJS 用户已经在编辑器中设置好图片
  // 2. 图片可能来自各种 CDN，已经优化过
  // 3. 客户端 React 渲染增加延迟，影响体验
  // 4. 对于动态内容（产品列表），缓存效果差
  // 如果未来需要启用，取消下面的注释：
  // const hasImages = $('img').length > 0;
  // convertImagesToNextImage($);

  const normalizedHtml = $.root().html() || "";
  const { criticalCss, deferredCss } = splitCss(css);

  return {
    html: normalizedHtml,
    criticalCss,
    deferredCss,
    hasImages: false, // 禁用 ImageProcessor 组件
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
 * 处理产品列表组件
 * 复用编辑器保存的HTML结构，只替换动态数据
 */
function processProductListComponents($, products) {
  if (!Array.isArray(products) || products.length === 0) {
    return;
  }

  // 查找所有产品列表组件
  $('[data-component-type="product-list"]').each((index, element) => {
    const $elem = $(element);

    // 获取组件配置
    const maxProducts = parseInt($elem.attr('data-max-products')) || 12;
    const displayProducts = products;

    // 移除编辑器标识（如果存在）
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
  });
}

function enhanceImages($, assetMap) {
  let lcpAssigned = false;

  $("img").each((index, element) => {
    const node = $(element);
    const src = node.attr("src");

    if (!src) {
      return;
    }

    const meta = assetMap.get(src);

    if (!node.attr("loading")) {
      const shouldPrioritize =
        Boolean(meta?.priority) || (!lcpAssigned && isHeroCandidate(node));

      if (shouldPrioritize) {
        node.attr("loading", "eager");
        node.attr("fetchpriority", "high");
        lcpAssigned = true;
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
  });
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

// 注释：此函数已停用，改为使用原生 <img> 标签
// 如果未来需要启用 Next.js Image 优化，可以取消注释
// function convertImagesToNextImage($) {
//   $('img').each((index, element) => {
//     const node = $(element);
//
//     const src = node.attr('src');
//     const alt = node.attr('alt') || '';
//     const width = node.attr('width');
//     const height = node.attr('height');
//     const className = node.attr('class') || '';
//     const style = node.attr('style') || '';
//     const loading = node.attr('loading') || 'lazy';
//
//     if (!src) return;
//
//     // 创建 Next.js Image 组件的占位符
//     const imageComponent = `<div data-next-image="true" data-src="${src}" data-alt="${alt}" data-width="${width || 800}" data-height="${height || 600}" data-class="${className}" data-style="${style}" data-loading="${loading}"></div>`;
//
//     node.replaceWith(imageComponent);
//   });
// }

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

  // 超出关键长度的 CSS 放入 deferred，客户端空闲时再写入
  const criticalCss = css.slice(0, limit);
  const deferredCss = css.slice(limit);

  return { criticalCss, deferredCss };
}

