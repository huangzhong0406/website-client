/**
 * 生成博客图片轮播 HTML
 * @param {Array<Object>} images - 图片对象数组 {id, name, url}
 * @returns {string} HTML 字符串
 */
export function generateBlogGalleryHtml(images) {
  if (!images || images.length === 0) {
    return '<div class="bd-no-images">No images available</div>';
  }

  // 如果只有一张图片，直接显示
  if (images.length === 1) {
    return `
      <div class="bd-gallery-single">
        <img
          src="${images[0].url}"
          alt="${images[0].name || 'Blog image'}"
          loading="eager"
          fetchpriority="high"
        >
      </div>
    `;
  }

  // 多张图片使用 Swiper 轮播
  return `
    <div class="bd-gallery">
      <div class="swiper bd-gallery-swiper" data-swiper-priority="high">
        <div class="swiper-wrapper">
          ${images
            .map(
              (img, index) => `
            <div class="swiper-slide">
              <img
                src="${img.url}"
                alt="${img.name || `Blog image ${index + 1}`}"
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
    </div>
  `;
}
