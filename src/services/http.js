import {logWarn} from "../lib/logger";

// API 基础地址：指向后端渲染接口
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? process.env.API_BASE ?? "";

if (!API_BASE) {
  logWarn("NEXT_PUBLIC_API_BASE 未设置，渲染端无法请求页面数据。");
}

// API Token：若后端需要鉴权，可在环境变量中配置
const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? process.env.API_TOKEN ?? process.env.RENDERER_API_TOKEN ?? "API_TOKEN";

/**
 * 构造 API 请求地址，自动拼接查询参数，同时忽略空值。
 */
export function buildApiUrl(pathname, searchParams) {
  if (!API_BASE) {
    throw new Error("缺少 API 基础地址配置。");
  }

  const url = new URL(pathname, API_BASE);

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

/**
 * 组装租户相关请求头，向后端表明当前请求属于哪个租户。
 */
function buildTenantHeaders(tenant) {
  if (!tenant) return {};

  const headers = {};
  if (tenant.id) {
    headers["X-Tenant-Id"] = tenant.id;
  }
  if (tenant.host) {
    headers["X-Tenant-Host"] = tenant.host;
  }
  return headers;
}

/**
 * 为 Cloudflare cache 构造租户隔离的 cache key，避免跨租户污染。
 */
function buildCacheKey(slug, tenant) {
  const segments = ["tenant-meta"];

  if (tenant?.id) {
    segments.push(`tenant:${tenant.id}`);
  } else if (tenant?.host) {
    segments.push(`host:${tenant.host}`);
  }

  if (slug) {
    segments.push(`slug:${slug}`);
  }

  return segments.join(":");
}

/**
 * fetch 封装：添加通用请求头、租户标识、Cloudflare 缓存策略以及超时控制。
 */
export async function apiFetch(input, slug, init = {}) {
  const {timeout: initTimeout, tenant, headers: initHeaders = {}, cf: initCf = {}, cache: initCache, ...restInit} = init;

  const timeout = initTimeout ?? 8000; // 默认 8 秒超时时间
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const shouldForceNoStore = initCache === undefined && !(restInit.next && restInit.next.revalidate !== undefined);

  const cacheOption = initCache ?? (shouldForceNoStore ? "no-store" : undefined);

  // 整合默认设置与调用方自定义配置，准备给 fetch 使用的参数
  const finalInit = {
    ...(cacheOption ? {cache: cacheOption} : {}),
    ...restInit,
    cf: {
      cacheEverything: true,
      cacheTtl: 600,
      cacheKey: buildCacheKey(slug, tenant),
      ...initCf
    },
    headers: {
      Accept: "application/json",
      API_TOKEN: "API_TOKEN",
      // ...(API_TOKEN ? {API_TOKEN: `${API_TOKEN}`} : {}),
      ...buildTenantHeaders(tenant),
      ...initHeaders
    },
    signal: controller.signal
  };

  console.log("API 请求头信息:", finalInit);

  try {
    const response = await fetch(input, finalInit);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
