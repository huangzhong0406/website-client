import { generateGalleryHtml } from "../../utils/productdetail/generateGallery.js";
import { generateProductInfoHtml } from "../../utils/productdetail/generateProductInfo.js";
import { generateDescriptionTabsHtml } from "../../utils/productdetail/generateDescriptionTabs.js";

/**
 * 处理产品详情组件的 SSR 渲染
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $elem - 组件元素
 * @param {object} productDetailData - 产品详情数据（来自 page_data.product_detail）
 */
export function processProductDetailComponent($, $elem, productDetailData) {
  if (!productDetailData) {
    console.warn('No product detail data provided');
    return;
  }

  // 解析配置
  const configStr = $elem.attr('data-config');
  const config = configStr ? JSON.parse(configStr) : {};

  const {id, name, summary, files = {}, contact = {}, contents = []} = productDetailData;

  // 从 files.images 提取图片数据
  const images = files.images || [];

  // 1. 注入产品图片轮播
  const $gallery = $elem.find('.pd-gallery');
  if ($gallery.length > 0 && images.length > 0) {
    const galleryHtml = generateGalleryHtml(images);
    $gallery.html(galleryHtml);
  }

  // 2. 注入产品信息
  const $info = $elem.find('.pd-info');
  if ($info.length > 0) {
    const infoHtml = generateProductInfoHtml(productDetailData, config);
    $info.html(infoHtml);
  }

  // 3. 注入产品描述标签页
  const $description = $elem.find('.pd-description');
  if ($description.length > 0 && contents.length > 0) {
    const descriptionHtml = generateDescriptionTabsHtml(contents);
    $description.html(descriptionHtml);
  }

  // 4. 设置 data-product-id 供 CSR 使用（加载相关产品）
  $elem.attr('data-product-id', id);

  // 5. 生成相关产品骨架屏（替换旧的骨架屏HTML）
  const $relatedContent = $elem.find('.pd-related-content');
  if ($relatedContent.length > 0) {
    const relatedCount = config.relatedProductsCount || 6;
    const skeletonHtml = generateRelatedProductsSkeleton(relatedCount);
    $relatedContent.html(skeletonHtml);
  }
}

/**
 * 生成相关产品骨架屏HTML
 * @param {number} count - 骨架屏数量
 * @returns {string} 骨架屏HTML
 */
function generateRelatedProductsSkeleton(count) {
  const skeletonCount = Math.min(count || 3, 6);
  const skeletonCards = Array(skeletonCount).fill(0).map(() => `
    <div class="swiper-slide">
      <div class="related-product-card skeleton">
        <div class="skeleton-image"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-title"></div>
        <div class="skeleton-button"></div>
      </div>
    </div>
  `).join('');

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
