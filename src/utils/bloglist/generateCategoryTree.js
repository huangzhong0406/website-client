/**
 * Generate Category Tree HTML (Server-side) for Blog
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
 * Recursively generate category tree HTML for blogs
 * @param {Array} categories - Category array
 * @param {number} level - Current level (0 for top level)
 * @param {string|null} currentCategoryId - Currently selected category ID (用于高亮当前分类)
 * @param {string|null} rootPath - Root path for "All" category (博客列表页根路径)
 * @param {boolean} defaultExpanded - Whether categories are expanded by default (默认是否展开子分类)
 * @returns {string} Category tree HTML
 */
export function generateCategoryTree(categories, level = 0, currentCategoryId = null, rootPath = null, defaultExpanded = true) {
  if (!categories || categories.length === 0) {
    return '<p class="blp-categories-empty">暂无分类</p>';
  }

  const listClass = level === 0 ? 'blp-category-list' : 'blp-category-sublist';

  // 计算"全部"分类的路径：从第一个分类的路径中提取基础路径
  // 例如：/blogs/jia-shi-ji-qiao -> /blogs
  let allCategoryPath = rootPath || '#';
  if (level === 0 && categories.length > 0 && categories[0].path) {
    const firstCategoryPath = categories[0].path;
    const pathSegments = firstCategoryPath.split('/').filter(Boolean);
    // 提取基础路径（第一段）
    if (pathSegments.length > 0) {
      allCategoryPath = '/' + pathSegments[0];
    }
  }

  // 在顶层添加"全部"分类
  const allCategory = level === 0 && categories.length > 0 ? {
    id: '__all__',
    name: '全部',
    path: allCategoryPath,
    parent_id: null,
    children: []
  } : null;

  // 合并"全部"分类和实际分类
  const allCategories = allCategory ? [allCategory, ...categories] : categories;

  return `
    <ul class="${listClass}" ${level > 0 ? `data-level="${level}"` : ''}>
      ${allCategories.map(category => {
        // 确保分类路径是绝对路径（以 / 开头）
        let categoryPath = category.path || '#';
        if (categoryPath !== '#' && !categoryPath.startsWith('/')) {
          categoryPath = '/' + categoryPath;
        }
        // 使用分类ID进行高亮判断
        const isActive = currentCategoryId && category.id == currentCategoryId;
        const hasChildren = category.children && category.children.length > 0;
        const expandedClass = hasChildren && defaultExpanded ? ' expanded' : '';

        return `
          <li class="blp-category-item${expandedClass}" data-category-id="${escapeHtml(category.id)}">
            ${hasChildren ? `
              <div class="blp-category-header">
                <button class="blp-category-toggle" aria-label="展开/收起" aria-expanded="${defaultExpanded}">
                  <svg class="blp-category-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
                <a
                  href="${escapeHtml(categoryPath)}"
                  class="blp-category-link ${isActive ? 'active' : ''}"
                  data-category-id="${escapeHtml(category.id)}"
                  ${isActive ? 'aria-current="page"' : ''}
                >
                  ${escapeHtml(category.name)}
                </a>
              </div>
            ` : `
              <a
                href="${escapeHtml(categoryPath)}"
                class="blp-category-link ${isActive ? 'active' : ''}"
                data-category-id="${escapeHtml(category.id)}"
                ${isActive ? 'aria-current="page"' : ''}
              >
                ${escapeHtml(category.name)}
              </a>
            `}
            ${hasChildren ? generateCategoryTree(category.children, level + 1, currentCategoryId, rootPath, defaultExpanded) : ''}
          </li>
        `;
      }).join('')}
    </ul>
  `;
}
