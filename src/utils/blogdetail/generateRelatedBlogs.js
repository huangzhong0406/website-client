/**
 * 生成相关博客占位符 HTML（骨架屏）
 * @param {number} count - 相关博客数量
 * @returns {string} HTML 字符串
 */
export function generateRelatedBlogsPlaceholder(count = 3) {
  const skeletonCount = Math.min(count || 3, 6);

  return `
    <div class="bd-related">
      <h2 class="bd-related-title">Related News</h2>
      <div class="bd-related-list">
        ${Array(skeletonCount)
          .fill(0)
          .map(
            () => `
          <div class="bd-related-item skeleton">
            <div class="skeleton-image"></div>
            <div class="skeleton-date"></div>
            <div class="skeleton-title"></div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}
