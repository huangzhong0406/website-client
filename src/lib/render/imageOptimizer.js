/**
 * 图片优化模块
 * 负责图片的懒加载、预加载和性能优化
 */

/**
 * 优化单个图片元素
 * 返回是否设置了优先加载
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} node - 图片元素节点
 * @param {Map} assetMap - 资源映射表
 * @param {boolean} lcpAssigned - 是否已分配 LCP 优先级
 * @returns {boolean} 是否设置为优先加载
 */
export function enhanceImage($, node, assetMap, lcpAssigned) {
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
    applyPictureSources($, node, meta.sources);
  } else if (meta?.srcSet && !node.attr("srcset")) {
    node.attr("srcset", meta.srcSet);
  }

  if (meta?.sizes && !node.attr("sizes")) {
    node.attr("sizes", meta.sizes);
  }

  return isPriority;
}

/**
 * 判断图片是否是首屏候选
 * @param {Cheerio} node - 图片元素节点
 * @returns {boolean}
 */
export function isHeroCandidate(node) {
  const classes = (node.attr("class") ?? "").split(/\s+/);
  return classes.some((className) => ["hero", "banner", "cover", "main-image"].includes(className));
}

/**
 * 应用 picture 标签的多源设置
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} node - 图片元素节点
 * @param {Array} sources - 图片源配置数组
 */
function applyPictureSources($, node, sources) {
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
    console.warn("包装 picture 标签失败。", {error});
  }
}

/**
 * 根据图片 URL 获取 MIME 类型
 * @param {string} src - 图片 URL
 * @returns {string}
 */
export function getImageType(src) {
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
 * 构建资源映射表
 * @param {Array} assets - 资源数组
 * @returns {Map}
 */
export function buildAssetMap(assets) {
  return new Map(
    (assets ?? [])
      .filter(Boolean)
      .map((asset) => [asset?.src ?? asset?.url ?? asset?.path ?? "", asset ?? {}])
      .filter(([key]) => Boolean(key))
  );
}
