import {generateGalleryHtml} from "../../utils/productdetail/generateGallery.js";
import {generateProductInfoHtml} from "../../utils/productdetail/generateProductInfo.js";
import {generateDescriptionTabsHtml} from "../../utils/productdetail/generateDescriptionTabs.js";
import {fetchRelatedProducts} from "../../services/relatedContent.js";

/**
 * 处理产品详情组件的 SSR 渲染
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $elem - 组件元素
 * @param {object} productDetailData - 产品详情数据（来自 page_data.product_detail）
 */
export async function processProductDetailComponent($, $elem, productDetailData) {
  if (!productDetailData) {
    console.warn("No product detail data provided");
    return;
  }

  // 解析配置
  const configStr = $elem.attr("data-config");
  const config = configStr ? JSON.parse(configStr) : {};

  const {id, name, summary, files = {}, contact = {}, contents = []} = productDetailData;

  // 从 files.images 提取图片数据
  const images = files.images || [];

  // 1. 注入产品图片轮播
  const $gallery = $elem.find(".pd-gallery");
  if ($gallery.length > 0 && images.length > 0) {
    const galleryHtml = generateGalleryHtml(images);
    $gallery.html(galleryHtml);
  }

  // 2. 注入产品信息
  const $info = $elem.find(".pd-info");
  if ($info.length > 0) {
    const infoHtml = generateProductInfoHtml(productDetailData, config);
    $info.html(infoHtml);
  }

  // 3. 注入产品描述标签页
  const $description = $elem.find(".pd-description");
  if ($description.length > 0 && contents.length > 0) {
    const descriptionHtml = generateDescriptionTabsHtml(contents);
    $description.html(descriptionHtml);
  }

  // 4. 设置 data-product-id 供客户端使用
  $elem.attr("data-product-id", id);

  // 5. 服务端渲染相关产品（优先）或生成骨架屏（降级）
  const $relatedContent = $elem.find(".pd-related-content");
  if ($relatedContent.length > 0) {
    // relatedProductsCount 控制展示的总数量
    const relatedCount = config.relatedProductsCount || 6;

    try {
      // 尝试在服务端获取相关产品数据（3秒超时）
      const relatedProducts = await fetchRelatedProducts(id, {timeout: 200});

      if (relatedProducts && relatedProducts.length > 0) {
        // 成功获取数据，渲染完整的相关产品HTML
        const displayProducts = relatedProducts.slice(0, relatedCount);
        const relatedHtml = generateRelatedProductsHtml(displayProducts);
        $relatedContent.html(relatedHtml);
        $relatedContent.attr("data-server-rendered", "true"); // 标记为服务端渲染
        console.log(`✅ 服务端成功渲染 ${displayProducts.length} 个相关产品`);
      } else {
        // 没有相关产品，显示提示
        $relatedContent.html('<p class="no-related">No related products</p>');
        $relatedContent.attr("data-server-rendered", "true");
      }
    } catch (error) {
      // 服务端获取失败（超时或错误），降级为骨架屏，由客户端加载
      console.warn(`⚠️ 服务端获取相关产品失败，降级为客户端加载: ${error.message}`);
      const skeletonHtml = generateRelatedProductsSkeleton(relatedCount);
      $relatedContent.html(skeletonHtml);
      $relatedContent.attr("data-client-fallback", "true"); // 标记需要客户端加载
    }
  }
}

/**
 * 生成相关产品完整HTML（服务端渲染）
 * @param {Array} products - 产品数组
 * @returns {string} 相关产品HTML
 */
function generateRelatedProductsHtml(products) {
  const productCards = products
    .map(
      (product) => `
    <div class="swiper-slide">
      <div class="related-product-card">
        <img src="${product.primary_image || "/images/placeholder.jpg"}" alt="${product.name || "Product"}" loading="lazy">
        <h3>${product.name || "Untitled"}</h3>
        <a href="${product.path}" class="view-more-btn">Learn More</a>
      </div>
    </div>
  `
    )
    .join("");

  return `
    <div class="swiper pd-related-swiper">
      <div class="swiper-wrapper">
        ${productCards}
      </div>
      <div class="swiper-button-next"></div>
      <div class="swiper-button-prev"></div>
    </div>
  `;
}

/**
 * 生成相关产品骨架屏HTML（降级方案）
 * @param {number} count - 骨架屏数量
 * @returns {string} 骨架屏HTML
 */
function generateRelatedProductsSkeleton(count) {
  const skeletonCount = Math.min(count || 3, 12);
  const skeletonCards = Array(skeletonCount)
    .fill(0)
    .map(
      () => `
    <div class="swiper-slide">
      <div class="related-product-card skeleton">
        <div class="skeleton-image"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-button"></div>
      </div>
    </div>
  `
    )
    .join("");

  return `
    <div class="swiper pd-related-swiper">
      <div class="swiper-wrapper">
        ${skeletonCards}
      </div>
      <div class="swiper-button-next"></div>
      <div class="swiper-button-prev"></div>
    </div>
  `;
}
