/**
 * X-Nav 菜单 HTML 生成工具 (渲染端)
 * @description 递归生成多级菜单 HTML，符合 HTML5 语义化规范
 * @version 2.1.0 - 支持链接类型系统（page, external, anchor, products）
 */

/**
 * 递归生成多级菜单 HTML
 * @param {Array} items - 菜单项数组
 * @param {number} level - 当前层级（0 为顶层）
 * @param {string} currentPath - 当前页面路径，用于高亮当前页
 * @returns {string} 菜单 HTML
 *
 * 菜单项数据结构 (v2.1):
 * {
 *   id: string,
 *   label: string,
 *   linkType?: 'page' | 'external' | 'anchor' | 'products',  // v2.1 新增
 *   pageId?: string,        // linkType='page' 或 'anchor' 时使用
 *   url: string,            // 最终链接 URL
 *   anchor?: string,        // linkType='anchor' 时使用
 *   target?: '_self' | '_blank',  // v2.1 新增
 *   autoLoadCategories?: boolean, // linkType='products' 时使用
 *   isCurrentPage?: boolean,
 *   children?: Array
 * }
 *
 * 向后兼容 v2.0:
 * {
 *   id: string,
 *   label: string,
 *   url: string,
 *   isCurrentPage?: boolean,
 *   children?: Array
 * }
 */
export function generateMenuHtml(items, level = 0, currentPath = '') {
  console.log("菜单项数据结构", items);
  if (!items || items.length === 0) return '';

  const listClass = level === 0 ? 'header-menu-list' : 'header-submenu';

  return `
    <ul class="${listClass}" ${level > 0 ? 'data-header-sub hidden' : ''}>
      ${items.map(item => {
        // 判断是否为当前页面
        const isCurrent = item.isCurrentPage || (currentPath && item.url === currentPath);

        // v2.1: 确定 target 属性
        const target = item.target || '_self';
        const targetAttr = target === '_blank' ? 'target="_blank" rel="noopener noreferrer"' : '';

        return `
        <li class="header-menu-item" data-header-item>
          ${item.children && item.children.length > 0 ? `
            <button
              class="header-menu-trigger"
              data-header-trigger
              aria-expanded="false"
              aria-haspopup="true"
            >
              ${escapeHtml(item.label)}
              <svg class="header-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            ${generateMenuHtml(item.children, level + 1, currentPath)}
          ` : `
            <a
              href="${escapeHtml(item.url || '#')}"
              class="header-menu-link"
              ${targetAttr}
              ${isCurrent ? 'aria-current="page"' : ''}
            >
              ${escapeHtml(item.label)}
            </a>
          `}
        </li>
      `}).join('')}
    </ul>
  `;
}

/**
 * HTML 转义（服务端版本）
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
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
 * 验证菜单数据
 * @param {Object} menuData - 菜单数据对象
 * @returns {Object} { valid: boolean, error?: string }
 */
export function validateMenuData(menuData) {
  if (!menuData || typeof menuData !== 'object') {
    return { valid: false, error: '菜单数据必须是对象' };
  }

  if (!Array.isArray(menuData.items)) {
    return { valid: false, error: '菜单数据缺少 items 数组' };
  }

  return { valid: true };
}

/**
 * 默认菜单数据
 */
export const defaultMenuData = {
  items: [
    {
      id: '1',
      label: 'Home',
      url: '/',
      isCurrentPage: true
    },
    {
      id: '2',
      label: 'Products',
      url: '/products',
      children: [
        { id: '2-1', label: 'Product 1', url: '/products/1' },
        { id: '2-2', label: 'Product 2', url: '/products/2' }
      ]
    },
    {
      id: '3',
      label: 'About',
      url: '/about'
    },
    {
      id: '4',
      label: 'Contact',
      url: '/contact'
    }
  ]
};

/**
 * 根据当前路径设置菜单高亮状态
 * @param {Object} menuData - 菜单数据
 * @param {string} currentPath - 当前路径
 * @returns {Object} 更新后的菜单数据
 */
export function setCurrentPageByPath(menuData, currentPath) {
  if (!menuData || !menuData.items) return menuData;

  const items = JSON.parse(JSON.stringify(menuData.items)); // 深拷贝

  function markCurrent(items) {
    items.forEach(item => {
      item.isCurrentPage = item.url === currentPath;
      if (item.children) {
        markCurrent(item.children);
      }
    });
  }

  markCurrent(items);

  return { ...menuData, items };
}
