/**
 * 全局组件服务
 * 用于获取和管理全局组件（如导航菜单、页脚等）
 */

import { apiFetch, buildApiUrl } from './http.js';

/**
 * 获取全局导航组件
 * @returns {Promise<Object|null>} 全局导航组件数据
 */
export async function fetchGlobalNavigation() {
  try {
    const url = buildApiUrl('/v2/aisite/global-components/navigation');

    const response = await apiFetch(url, {
      next: {
        revalidate: 300, // 5分钟缓存
        tags: ['global-components', 'navigation']
      }
    });

    return response;
  } catch (error) {
    console.error('Failed to fetch global navigation:', error);
    return null;
  }
}

/**
 * 获取全局页脚组件
 * @returns {Promise<Object|null>} 全局页脚组件数据
 */
export async function fetchGlobalFooter() {
  try {
    const url = buildApiUrl('/v2/aisite/global-components/footer');

    const response = await apiFetch(url, {
      next: {
        revalidate: 300,
        tags: ['global-components', 'footer']
      }
    });

    return response;
  } catch (error) {
    console.error('Failed to fetch global footer:', error);
    return null;
  }
}

/**
 * 获取所有全局组件
 * @returns {Promise<Object>} 包含所有全局组件的对象
 */
export async function fetchAllGlobalComponents() {
  try {
    const url = buildApiUrl('/v2/aisite/global-components');

    const response = await apiFetch(url, {
      next: {
        revalidate: 300,
        tags: ['global-components']
      }
    });

    return response || {};
  } catch (error) {
    console.error('Failed to fetch global components:', error);
    return {};
  }
}

/**
 * 保存全局导航组件
 * @param {Object} componentData - 组件数据
 * @returns {Promise<Object>} 保存结果
 */
export async function saveGlobalNavigation(componentData) {
  try {
    const url = buildApiUrl('/v2/aisite/global-components/navigation');

    const response = await apiFetch(url, {
      method: 'POST',
      body: JSON.stringify(componentData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response;
  } catch (error) {
    console.error('Failed to save global navigation:', error);
    throw error;
  }
}

/**
 * 从 HTML 中提取全局组件
 * @param {string} html - 页面 HTML
 * @returns {Object} 提取的全局组件
 */
export function extractGlobalComponents(html) {
  const components = {};

  // 提取导航组件
  const navMatch = html.match(/<nav[^>]*data-component-type="global-navigation"[^>]*>[\s\S]*?<\/nav>/);
  if (navMatch) {
    components.navigation = navMatch[0];
  }

  // 提取页脚组件
  const footerMatch = html.match(/<footer[^>]*data-component-type="global-footer"[^>]*>[\s\S]*?<\/footer>/);
  if (footerMatch) {
    components.footer = footerMatch[0];
  }

  return components;
}

export default {
  fetchGlobalNavigation,
  fetchGlobalFooter,
  fetchAllGlobalComponents,
  saveGlobalNavigation,
  extractGlobalComponents,
};
