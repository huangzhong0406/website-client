import {apiFetch, buildApiUrl} from "./http";
import {getTenantContext} from "@/lib/tenant";

/**
 * 获取相关产品数据（服务端专用）
 * @param {string} productId - 产品ID
 * @param {object} options - 可选配置
 * @returns {Promise<Array>} 相关产品列表
 * @throws {Error} API请求失败时抛出异常，供调用方降级处理
 */
export async function fetchRelatedProducts(productId, options = {}) {
  if (!productId) {
    return [];
  }

  const tenant = await getTenantContext();
  const timeout = options.timeout || 3000; // 默认3秒超时

  const apiUrl = buildApiUrl("/api/module/products/related", {
    product_id: productId
  });

  const response = await apiFetch(apiUrl, null, {
    tenant,
    cache: "no-store",
    timeout
  });

  if (!response.ok) {
    throw new Error(`API返回错误状态: ${response.status}`);
  }

  const data = await response.json();

  if (data.code === 200 && Array.isArray(data.data)) {
    return data.data;
  }

  // API返回成功但数据格式不对，也返回空数组（说明真的没数据）
  return [];
}

/**
 * 获取相关博客数据（服务端专用）
 * @param {string} blogId - 博客ID
 * @param {number} limit - 前端控制返回数量（截取数组）
 * @param {object} options - 可选配置
 * @returns {Promise<Array>} 相关博客列表（已根据limit截取）
 * @throws {Error} API请求失败时抛出异常，供调用方降级处理
 */
export async function fetchRelatedBlogs(blogId, limit = 3, options = {}) {
  if (!blogId) {
    return [];
  }

  const tenant = await getTenantContext();
  const timeout = options.timeout || 3000; // 默认3秒超时

  // 后端API不接受limit参数，返回所有相关博客
  const apiUrl = buildApiUrl("/api/module/blogs/related", {
    blog_id: blogId
  });

  const response = await apiFetch(apiUrl, null, {
    tenant,
    cache: "no-store",
    timeout
  });

  if (!response.ok) {
    throw new Error(`API返回错误状态: ${response.status}`);
  }

  const data = await response.json();

  if (data.code === 200 && Array.isArray(data.data)) {
    // 在客户端控制返回数量
    return data.data.slice(0, limit);
  }

  // API返回成功但数据格式不对，也返回空数组（说明真的没数据）
  return [];
}
