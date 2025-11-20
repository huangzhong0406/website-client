/**
 * 生成产品图片轮播 HTML（固定垂直布局）
 * @param {Array<Object>} images - 图片对象数组 {id, name, url}
 * @returns {string} HTML 字符串
 */
export function generateGalleryHtml(images) {
  if (!images || images.length === 0) {
    return '<div class="pd-no-images">No images available</div>';
  }

  // 主图轮播（统一使用 data-swiper-priority 属性）
  const mainSwiperHtml = `
    <div class="swiper pd-gallery-main" data-swiper-priority="high">
      <div class="swiper-wrapper">
        ${images
          .map(
            (img, index) => `
          <div class="swiper-slide">
            <img
              width="200"
              height="200"
              src="${img.url}"
              alt="${img.name || `Product image ${index + 1}`}"
              loading="${index === 0 ? "eager" : "lazy"}"
              fetchpriority="${index === 0 ? "high" : "auto"}"
            >
          </div>
        `
          )
          .join("")}
      </div>
      <div class="swiper-button-next"></div>
      <div class="swiper-button-prev"></div>
      <div class="swiper-pagination"></div>
    </div>
  `;

  // 缩略图轮播（最多显示前8张）
  const thumbImages = images.slice(0, 8);
  const thumbSwiperHtml = `
    <div class="swiper pd-gallery-thumbs">
      <div class="swiper-wrapper">
        ${thumbImages
          .map(
            (img, index) => `
          <div class="swiper-slide">
            <img
              width="200"
              height="200"
              src="${img.url}"
              alt="${img.name || `Thumbnail ${index + 1}`}"
              loading="lazy"
            >
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  return `
    <div class="pd-gallery-wrapper">
      ${mainSwiperHtml}
      ${thumbSwiperHtml}
    </div>
  `;
}
