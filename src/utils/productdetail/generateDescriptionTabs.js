/**
 * 生成产品描述标签页 HTML
 * @param {Array} contents - 描述数组
 * @returns {string} HTML 字符串
 */
export function generateDescriptionTabsHtml(contents) {
  if (!contents || contents.length === 0) {
    return '<div class="pd-no-contents">No contents available</div>';
  }

  return `
    <div class="pd-description-wrapper">
      <div class="pd-tabs" role="tablist">
        ${contents
          .map(
            (desc, index) => `
          <button
            class="pd-tab ${index === 0 ? "active" : ""}"
            role="tab"
            aria-selected="${index === 0}"
            data-tab-index="${index}">
            ${desc.title || `Description ${index + 1}`}
          </button>
        `
          )
          .join("")}
      </div>

      <div class="pd-tab-contents">
        ${contents
          .map(
            (desc, index) => `
          <div
            class="pd-tab-content ${index === 0 ? "active" : ""}"
            role="tabpanel"
            data-content-index="${index}">
            ${desc.description || ""}
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}
