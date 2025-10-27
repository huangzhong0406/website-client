/**
 * 导航菜单服务
 * 用于获取和管理网站导航数据
 */

import { apiFetch, buildApiUrl } from './http.js';

/**
 * 获取所有页面列表用于导航菜单
 * @returns {Promise<Array>} 页面列表数组
 */
export async function fetchNavigationPages() {
      return [
      { slug: 'home', title: '首页', path: '/', order: 0, showInNav: true },
      { slug: 'aboutus', title: '关于我们', path: '/aboutus', order: 1, showInNav: true },
    ];
  try {
    const url = buildApiUrl('/v2/aisite/pages');

    const response = await apiFetch(url, {
      next: {
        revalidate: 300, // 5分钟缓存
        tags: ['navigation', 'pages']
      }
    });

    // 如果返回的不是数组，尝试提取数组
    const pages = Array.isArray(response) ? response : (response.data || response.pages || []);

    // 过滤出需要显示在导航中的页面
    const visiblePages = pages.filter(page => {
      // 只显示已发布的页面
      if (page.publishStatus && page.publishStatus !== 'published') {
        return false;
      }

      // 支持 showInNav 字段控制是否显示
      if (page.showInNav === false) {
        return false;
      }

      return true;
    });

    // 按 order 字段排序，如果没有 order 字段则保持原顺序
    const sortedPages = visiblePages.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    // 标准化数据格式
    return sortedPages.map(page => ({
      slug: page.slug,
      title: page.title || page.meta?.title || page.slug,
      path: page.path || (page.slug === 'home' ? '/' : `/${page.slug}`),
      order: page.order ?? 0,
      showInNav: page.showInNav !== false,
    }));
  } catch (error) {
    console.error('Failed to fetch navigation pages:', error);

    // 返回默认导航结构作为降级方案
    return [
      { slug: 'home', title: '首页', path: '/', order: 0, showInNav: true },
    ];
  }
}

/**
 * 获取当前页面在导航中的位置信息
 * @param {string} currentSlug - 当前页面的 slug
 * @param {Array} pages - 所有页面列表
 * @returns {Object} 包含前一页和后一页的信息
 */
export function getAdjacentPages(currentSlug, pages) {
  const currentIndex = pages.findIndex(page => page.slug === currentSlug);

  return {
    previous: currentIndex > 0 ? pages[currentIndex - 1] : null,
    next: currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null,
    current: pages[currentIndex] || null,
  };
}

/**
 * 构建面包屑导航
 * @param {string} slug - 当前页面的 slug
 * @param {Array} pages - 所有页面列表
 * @returns {Array} 面包屑路径数组
 */
export function buildBreadcrumb(slug, pages) {
  const breadcrumb = [
    { title: '首页', path: '/', slug: 'home' }
  ];

  if (slug && slug !== 'home') {
    const currentPage = pages.find(page => page.slug === slug);
    if (currentPage) {
      breadcrumb.push({
        title: currentPage.title,
        path: currentPage.path,
        slug: currentPage.slug,
      });
    }
  }

  return breadcrumb;
}

/**
 * 检查某个路径是否是当前激活的页面
 * @param {string} path - 要检查的路径
 * @param {string} currentPath - 当前页面路径
 * @returns {boolean} 是否激活
 */
export function isActivePath(path, currentPath) {
  if (path === currentPath) return true;

  // 处理首页特殊情况
  if ((path === '/' || path === '/home') && (currentPath === '/' || currentPath === '/home')) {
    return true;
  }

  return false;
}

export default {
  fetchNavigationPages,
  getAdjacentPages,
  buildBreadcrumb,
  isActivePath,
};
