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

  // 对 <img> 进行补齐，降低 LCP/CLS 风险
  enhanceImages($, assetMap);
  
  // 转换图片标签为 Next.js Image 组件
  const hasImages = $('img').length > 0;
  convertImagesToNextImage($);

  const normalizedHtml = $.root().html() || "";
  const { criticalCss, deferredCss } = splitCss(css);

  return {
    html: normalizedHtml,
    criticalCss,
    deferredCss,
    hasImages,
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

function convertImagesToNextImage($) {
  $('img').each((index, element) => {
    const node = $(element);
    const src = node.attr('src');
    const alt = node.attr('alt') || '';
    const width = node.attr('width');
    const height = node.attr('height');
    const className = node.attr('class') || '';
    const style = node.attr('style') || '';
    const loading = node.attr('loading') || 'lazy';
    
    if (!src) return;
    
    // 创建 Next.js Image 组件的占位符
    const imageComponent = `<div data-next-image="true" data-src="${src}" data-alt="${alt}" data-width="${width || 800}" data-height="${height || 600}" data-class="${className}" data-style="${style}" data-loading="${loading}"></div>`;
    
    node.replaceWith(imageComponent);
  });
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

  // 超出关键长度的 CSS 放入 deferred，客户端空闲时再写入
  const criticalCss = css.slice(0, limit);
  const deferredCss = css.slice(limit);

  return { criticalCss, deferredCss };
}

