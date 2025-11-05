/**
 * 导航菜单服务
 * 用于获取和管理网站导航数据
 */

import {apiFetch, buildApiUrl} from "./http.js";

/**
 * 获取所有页面列表用于导航菜单
 * @returns {Promise<Array>} 页面列表数组
 */
export async function fetchNavigationPages(tenant) {
  // 直接返回假数据，避免无效 API 调用
  void tenant;
  return {
    items: [
      {
        id: "1",
        label: "Home",
        url: "/",
        isCurrentPage: true
      },
      {
        id: "2",
        label: "Products",
        url: "/products",
        children: [
          {id: "2-1", label: "Product 1", url: "/products/1"},
          {id: "2-2", label: "Product 2", url: "/products/2"}
        ]
      },
      {
        id: "3",
        label: "About",
        url: "/about"
      },
      {
        id: "4",
        label: "Contact",
        url: "/contact"
      }
    ]
  };

  // 注释掉的真实 API 调用代码
  /*
  try {
    const url = buildApiUrl("/v2/aisite/pages");

    const response = await apiFetch(url, undefined, {
      timeout: 3000,
      tenant,
      next: {
        revalidate: 300, // 5 分钟缓存
        tags: ["navigation", "pages"],
      },
    });

    const pages = Array.isArray(response) ? response : response?.data || response?.pages || [];

    const visiblePages = pages.filter((page) => {
      if (page.publishStatus && page.publishStatus !== "published") {
        return false;
      }

      if (page.showInNav === false) {
        return false;
      }

      return true;
    });

    const sortedPages = visiblePages.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    });

    return sortedPages.map((page) => ({
      slug: page.slug,
      title: page.title || page.meta?.title || page.slug,
      path: page.path || (page.slug === "home" ? "/" : `/${page.slug}`),
      order: page.order ?? 0,
      showInNav: page.showInNav !== false,
    }));
  } catch (error) {
    console.error("Failed to fetch navigation pages:", error);
    return [{slug: "home", title: "首页", path: "/", order: 0, showInNav: true}];
  }
  */
}

/**
 * 获取当前页面在导航中的位置信息
 * @param {string} currentSlug - 当前页面的 slug
 * @param {Array} pages - 所有页面列表
 * @returns {Object} 包含前一页和后一页的信息
 */
export function getAdjacentPages(currentSlug, pages) {
  const currentIndex = pages.findIndex((page) => page.slug === currentSlug);

  return {
    previous: currentIndex > 0 ? pages[currentIndex - 1] : null,
    next: currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null,
    current: pages[currentIndex] || null
  };
}

/**
 * 构建面包屑导航
 * @param {string} slug - 当前页面的 slug
 * @param {Array} pages - 所有页面列表
 * @returns {Array} 面包屑路径数据
 */
export function buildBreadcrumb(slug, pages) {
  const breadcrumb = [{title: "首页", path: "/", slug: "home"}];

  if (slug && slug !== "home") {
    const currentPage = pages.find((page) => page.slug === slug);
    if (currentPage) {
      breadcrumb.push({
        title: currentPage.title,
        path: currentPage.path,
        slug: currentPage.slug
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

  if ((path === "/" || path === "/home") && (currentPath === "/" || currentPath === "/home")) {
    return true;
  }

  return false;
}

export default {
  fetchNavigationPages,
  getAdjacentPages,
  buildBreadcrumb,
  isActivePath
};
