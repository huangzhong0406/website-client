/**
 * 生成产品图片轮播 HTML（固定垂直布局）
 * @param {Array<string>} images - 图片 URL 数组
 * @returns {string} HTML 字符串
 */
export function generateGalleryHtml(images) {
  if (!images || images.length === 0) {
    return '<div class="pd-no-images">No images available</div>';
  }

  // 主图轮播
  const mainSwiperHtml = `
    <div class="swiper pd-gallery-main" data-priority="high">
      <div class="swiper-wrapper">
        ${images.map((img, index) => `
          <div class="swiper-slide">
            <img
              src="${img}"
              alt="Product image ${index + 1}"
              loading="${index === 0 ? 'eager' : 'lazy'}"
              fetchpriority="${index === 0 ? 'high' : 'auto'}"
            >
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // 缩略图轮播（最多显示前8张）
  const thumbImages = images.slice(0, 8);
  const thumbSwiperHtml = `
    <div class="swiper pd-gallery-thumbs">
      <div class="swiper-wrapper">
        ${thumbImages.map((img, index) => `
          <div class="swiper-slide">
            <img
              src="${img}"
              alt="Thumbnail ${index + 1}"
              loading="lazy"
            >
          </div>
        `).join('')}
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
