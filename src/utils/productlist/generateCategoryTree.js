/**
 * Generate Category Tree HTML (Server-side)
 * @description SSR-safe category tree generation for website-client
 */

/**
 * Escape HTML to prevent XSS
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
 * Recursively generate category tree HTML
 * @param {Array} categories - Category array
 * @param {number} level - Current level (0 for top level)
 * @param {string|null} currentCategoryId - Currently selected category ID
 * @returns {string} Category tree HTML
 */
export function generateCategoryTree(categories, level = 0, currentCategoryId = null) {
  if (!categories || categories.length === 0) {
    return '<p class="plp-categories-empty">暂无分类</p>';
  }

  const listClass = level === 0 ? 'plp-category-list' : 'plp-category-sublist';

  return `
    <ul class="${listClass}" ${level > 0 ? `data-level="${level}"` : ''}>
      ${categories.map(category => {
        const isActive = category.id === currentCategoryId;
        const hasChildren = category.children && category.children.length > 0;

        return `
          <li class="plp-category-item" data-category-id="${escapeHtml(category.id)}">
            <a
              href="#"
              class="plp-category-link ${isActive ? 'active' : ''}"
              data-category-id="${escapeHtml(category.id)}"
              ${isActive ? 'aria-current="page"' : ''}
            >
              ${escapeHtml(category.name)}
              ${hasChildren ? `
                <svg class="plp-category-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              ` : ''}
            </a>
            ${hasChildren ? generateCategoryTree(category.children, level + 1, currentCategoryId) : ''}
          </li>
        `;
      }).join('')}
    </ul>
  `;
}
