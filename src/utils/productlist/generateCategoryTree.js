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
 * @param {string|null} currentPath - Currently selected category path (用于高亮当前分类)
 * @param {string|null} rootPath - Root path for "All" category (产品列表页根路径)
 * @param {boolean} defaultExpanded - Whether categories are expanded by default (默认是否展开子分类)
 * @returns {string} Category tree HTML
 */
export function generateCategoryTree(categories, level = 0, currentPath = null, rootPath = null, defaultExpanded = true) {
  console.log("产品分类", categories);
  if (!categories || categories.length === 0) {
    return '<p class="plp-categories-empty">暂无分类</p>';
  }

  const listClass = level === 0 ? 'plp-category-list' : 'plp-category-sublist';

  // 在顶层添加"全部"分类
  const allCategory = level === 0 && rootPath ? {
    id: '__all__',
    name: '全部',
    path: rootPath,
    parent_id: null,
    children: []
  } : null;

  // 合并"全部"分类和实际分类
  const allCategories = allCategory ? [allCategory, ...categories] : categories;

  return `
    <ul class="${listClass}" ${level > 0 ? `data-level="${level}"` : ''}>
      ${allCategories.map(category => {
        const categoryPath = category.path || '#';
        const isActive = categoryPath === currentPath;
        const hasChildren = category.children && category.children.length > 0;
        const expandedClass = hasChildren && defaultExpanded ? ' expanded' : '';

        return `
          <li class="plp-category-item${expandedClass}" data-category-id="${escapeHtml(category.id)}">
            ${hasChildren ? `
              <div class="plp-category-header">
                <button class="plp-category-toggle" aria-label="展开/收起" aria-expanded="${defaultExpanded}">
                  <svg class="plp-category-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <a
                  href="${escapeHtml(categoryPath)}"
                  class="plp-category-link ${isActive ? 'active' : ''}"
                  data-category-id="${escapeHtml(category.id)}"
                  ${isActive ? 'aria-current="page"' : ''}
                >
                  ${escapeHtml(category.name)}
                </a>
              </div>
            ` : `
              <a
                href="${escapeHtml(categoryPath)}"
                class="plp-category-link ${isActive ? 'active' : ''}"
                data-category-id="${escapeHtml(category.id)}"
                ${isActive ? 'aria-current="page"' : ''}
              >
                ${escapeHtml(category.name)}
              </a>
            `}
            ${hasChildren ? generateCategoryTree(category.children, level + 1, currentPath, rootPath, defaultExpanded) : ''}
          </li>
        `;
      }).join('')}
    </ul>
  `;
}
