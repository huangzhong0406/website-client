import {apiFetch, buildApiUrl} from "./http";
import {logError} from "../lib/logger";

// 页面缓存时间（秒），已发布页面可通过 ISR 减少首屏时间
const DEFAULT_REVALIDATE_SECONDS = Number(process.env.NEXT_PUBLIC_PAGE_REVALIDATE ?? process.env.PAGE_REVALIDATE ?? 12 * 60 * 60);

// 根路径对应的默认 slug，可根据项目调整
const ROOT_SLUG = process.env.NEXT_PUBLIC_ROOT_SLUG ?? process.env.ROOT_SLUG ?? "home";

export class PageNotFoundError extends Error {
  constructor(slug) {
    super(`Page not found for slug "${slug}"`);
    this.name = "PageNotFoundError";
    this.slug = slug;
  }
}

export class PageServiceError extends Error {
  constructor(message, options) {
    super(message);
    this.name = "PageServiceError";
    Object.assign(this, options);
  }
}

/**
 * 将 slug 数组转换成 API 需要的路径，空数组时返回根页面 slug。
 */
function toSlugPath(slugSegments) {
  if (!slugSegments || slugSegments.length === 0) {
    return "";
    return ROOT_SLUG;
  }

  return slugSegments.filter(Boolean).join("/");
}

/**
 * 拉取页面数据：根据 slug 调用后端并处理各种异常与兜底逻辑。
 */
export async function fetchPage(slugSegments, tenant) {
  const slugPath = toSlugPath(slugSegments);
  // 对路径的每个段单独编码，避免将 / 编码为 %2F
  const encodedPath = slugPath
    ? slugPath
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")
    : "";
  const url = buildApiUrl(`/api/render/${encodedPath}`);
  console.log(`页面接口请求 - 1.路由： url:${url}, slug: ${slugPath}`,);

  let response;

  try {
    response = await apiFetch(url, slugPath, {
      tenant,
      next: {
        revalidate: Number.isFinite(DEFAULT_REVALIDATE_SECONDS) && DEFAULT_REVALIDATE_SECONDS > 0 ? DEFAULT_REVALIDATE_SECONDS : 0,
        tags: [`page:${slugPath}`]
      }
    });
  } catch (error) {
    logError("页面接口请求 - 2. 请求失败", {error, slug: slugPath, tenant});
    throw new PageServiceError("Failed to reach page API.", {cause: error, tenant, slug: slugPath});
  }

  if (response.status === 404) {
    throw new PageNotFoundError(slugPath);
  }

  const data = await safeReadJson(response);

  if (data && data.code === 404) {
    throw new PageNotFoundError(slugPath);
  }

  // console.log("页面接口响应数据:", {status: response.status, payload: data, slug: slugPath, tenant});

  // if (!response.ok) {
  //   logError("页面接口返回异常响应。", {
  //     status: response.status,
  //     payload: data,
  //     slug: slugPath,
  //     tenant
  //   });

  //   throw new PageServiceError("Page API responded with an error.", {
  //     status: response.status,
  //     payload: data,
  //     slug: slugPath,
  //     tenant
  //   });
  // }

  const pageData = data?.data;

  if (!data || typeof data !== "object") {
    throw new PageServiceError("Invalid response from page API.", {slug: slugPath, tenant});
  }

  // 后端可能返回 slug 表示建议跳转到其他 slug，此时递归请求新 slug
  if (data.slug && !data.html) {
    // console.log(`收到页面建议: ${data.sug}，重新请求...`);
    return await fetchPage(data.sug, tenant);
  }

  return pageData;
  // {
  //   slug: slugPath || "",
  //   html: (pageData?.page_json?.json_data?.html ?? "").replace(/<body([^>]*)>/gi, "<div$1>").replace(/<\/body>/gi, "</div>"),
  //   css: pageData?.page_json?.json_data?.css ?? "",
  //   meta: pageData.meta ?? {},
  //   // publishStatus: data.publishStatus ?? data.status ?? "draft",
  //   // updatedAt: data.updatedAt ?? data.updated_at ?? null,
  //   // cacheKey: data.cacheKey ?? data.cache_key ?? null,
  //   assets: pageData.assets ?? []
  // };
}

/**
 * 安全 JSON 解析，失败时返回 null。
 */
async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

// 获取产品列表页数据（包括分类、产品、分页）
export async function fetchProductListPageData({path, category_id, page, sort_by, sort_order, size, tenant}) {
  // 构建查询参数
  const params = new URLSearchParams({
    category_id,
    sort_by,
    sort_order,
    page,
    size: size
  });

  const url = buildApiUrl(`/api/module/product-categories?${params}`);
  console.log("获取产品列表数据，path:", path, "url:", url);

  let response;
  try {
    response = await apiFetch(url, path, {
      tenant,
      next: {
        revalidate: Number.isFinite(DEFAULT_REVALIDATE_SECONDS) && DEFAULT_REVALIDATE_SECONDS > 0 ? DEFAULT_REVALIDATE_SECONDS : 0,
        tags: [`products:${path}`]
      }
    });
  } catch (error) {
    logError("产品列表接口请求失败", {error, path, tenant});
    throw new PageServiceError("Failed to fetch product list data.", {cause: error, tenant, path});
  }

  if (!response.ok) {
    const errorData = await safeReadJson(response);
    logError("产品列表接口返回异常响应。", {
      status: response.status,
      payload: errorData,
      path,
      tenant
    });
    throw new PageServiceError("Product list API responded with an error.", {
      status: response.status,
      payload: errorData,
      path,
      tenant
    });
  }

  const data = await safeReadJson(response);

  if (!data || typeof data !== "object") {
    throw new PageServiceError("Invalid response from product list API.", {path, tenant});
  }

  // 返回产品列表数据
  return data.data || data;
}

// 获取博客列表页数据（包括分类、博客、分页）
export async function fetchBlogListPageData({path, category_id, page, sort_by, sort_order, size, tenant}) {
  // 构建查询参数
  const params = new URLSearchParams({
    category_id,
    sort_by,
    sort_order,
    page,
    size: size
  });

  const url = buildApiUrl(`/api/module/blog-categories?${params}`);
  console.log("获取博客列表数据，path:", path, "url:", url);

  let response;
  try {
    response = await apiFetch(url, path, {
      tenant,
      next: {
        revalidate: Number.isFinite(DEFAULT_REVALIDATE_SECONDS) && DEFAULT_REVALIDATE_SECONDS > 0 ? DEFAULT_REVALIDATE_SECONDS : 0,
        tags: [`blogs:${path}`]
      }
    });
  } catch (error) {
    logError("博客列表接口请求失败", {error, path, tenant});
    throw new PageServiceError("Failed to fetch blog list data.", {cause: error, tenant, path});
  }

  if (!response.ok) {
    const errorData = await safeReadJson(response);
    logError("博客列表接口返回异常响应。", {
      status: response.status,
      payload: errorData,
      path,
      tenant
    });
    throw new PageServiceError("Blog list API responded with an error.", {
      status: response.status,
      payload: errorData,
      path,
      tenant
    });
  }

  const data = await safeReadJson(response);

  if (!data || typeof data !== "object") {
    throw new PageServiceError("Invalid response from blog list API.", {path, tenant});
  }

  // 返回博客列表数据
  return data.data || data;
}
