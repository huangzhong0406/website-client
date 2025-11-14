/**
 * Generate Product Grid HTML (Server-side)
 * @description SSR-safe product grid generation
 */

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate product grid HTML
 * @param {Array} products - Product array
 * @param {Object} config - Configuration object
 * @param {boolean} showDescription - Whether to show product description
 */
export function generateProductGrid(products, config = {}, showDescription = true) {
  console.log("产品列表", products);
  if (!products || products.length === 0) {
    return `
      <div class="plp-products-empty">
        <svg class="plp-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <p class="plp-empty-text">暂无产品</p>
      </div>
    `;
  }

  const columns = config.columns || { desktop: 4, tablet: 3, mobile: 2 };
  const colClasses = `plp-grid-cols-${columns.desktop} plp-grid-md-${columns.tablet} plp-grid-sm-${columns.mobile}`;

  return `
    <div class="plp-products-grid ${colClasses}">
      ${products
        .map(
          (product) => `
        <a href="${escapeHtml(product.path || "#")}" class="plp-product-card" data-product-id="${escapeHtml(product.id)}">
          <div class="plp-product-image-wrapper">
            <img
              src="${escapeHtml(product.primary_image || "/placeholder.jpg")}"
              alt="${escapeHtml(product.name)}"
              class="plp-product-image"
              loading="lazy"
            />
          </div>
          <div class="plp-product-info">
            <h3 class="plp-product-name">${escapeHtml(product.name)}</h3>
            ${showDescription && product.summary ? `<p class="plp-product-description">${escapeHtml(product.summary)}</p>` : ""}
          </div>
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * Generate product list HTML
 * @param {Array} products - Product array
 * @param {boolean} showDescription - Whether to show product description
 */
export function generateProductList(products, showDescription = true) {
  if (!products || products.length === 0) {
    return `
      <div class="plp-products-empty">
        <svg class="plp-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <p class="plp-empty-text">暂无产品</p>
      </div>
    `;
  }

  return `
    <div class="plp-products-list-view">
      ${products
        .map(
          (product) => `
        <a href="${escapeHtml(product.path || "#")}" class="plp-product-list-item" data-product-id="${escapeHtml(product.id)}">
          <div class="plp-product-list-image">
            <img
              src="${escapeHtml(product.primary_image || "/placeholder.jpg")}"
              alt="${escapeHtml(product.name)}"
              loading="lazy"
            />
          </div>
          <div class="plp-product-list-content">
            <h3 class="plp-product-list-name">${escapeHtml(product.name)}</h3>
            ${showDescription && product.summary ? `<p class="plp-product-list-description">${escapeHtml(product.summary)}</p>` : ""}
          </div>
        </a>
      `
        )
        .join("")}
    </div>
  `;
}
