/**
 * Generate Product List Detail HTML (Server-side)
 * @description SSR-safe product detail generation for website-client (without categories)
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
export function generateProductDetailGrid(products, config = {}, showDescription = true) {
  if (!products || products.length === 0) {
    return `
      <div class="pld-products-empty">
        <svg class="pld-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <p class="pld-empty-text">暂无产品</p>
      </div>
    `;
  }

  const columns = config.columns || { desktop: 4, tablet: 3, mobile: 2 };
  const colClasses = `pld-grid-cols-${columns.desktop} pld-grid-md-${columns.tablet} pld-grid-sm-${columns.mobile}`;

  return `
    <div class="pld-products-grid ${colClasses}">
      ${products.map(product => `
        <a href="${escapeHtml(product.path || '#')}" class="pld-product-card" data-product-id="${escapeHtml(product.id)}">
          <div class="pld-product-image-wrapper">
            <img
              src="${escapeHtml(product.image || '/placeholder.jpg')}"
              alt="${escapeHtml(product.name)}"
              class="pld-product-image"
              loading="lazy"
            />
          </div>
          <div class="pld-product-info">
            <h3 class="pld-product-name">${escapeHtml(product.name)}</h3>
            ${showDescription && product.description ? `<p class="pld-product-description">${escapeHtml(product.description)}</p>` : ''}
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

/**
 * Generate product list HTML
 * @param {Array} products - Product array
 * @param {boolean} showDescription - Whether to show product description
 */
export function generateProductDetailList(products, showDescription = true) {
  if (!products || products.length === 0) {
    return `
      <div class="pld-products-empty">
        <svg class="pld-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <p class="pld-empty-text">暂无产品</p>
      </div>
    `;
  }

  return `
    <div class="pld-products-list-view">
      ${products.map(product => `
        <a href="${escapeHtml(product.path || '#')}" class="pld-product-list-item" data-product-id="${escapeHtml(product.id)}">
          <div class="pld-product-list-image">
            <img
              src="${escapeHtml(product.image || '/placeholder.jpg')}"
              alt="${escapeHtml(product.name)}"
              loading="lazy"
            />
          </div>
          <div class="pld-product-list-content">
            <h3 class="pld-product-list-name">${escapeHtml(product.name)}</h3>
            ${showDescription && product.description ? `<p class="pld-product-list-description">${escapeHtml(product.description)}</p>` : ''}
          </div>
        </a>
      `).join('')}
    </div>
  `;
}
