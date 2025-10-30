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

function toSlugPath(slugSegments) {
  if (!slugSegments || slugSegments.length === 0) {
    return ROOT_SLUG;
  }

  return slugSegments.filter(Boolean).join("/");
}

export async function fetchPage(slugSegments) {
  const slugPath = toSlugPath(slugSegments);
  const url = buildApiUrl(`/v2/aisite/pages/${encodeURIComponent(slugPath || "home")}`);
  // console.log("打印 url:", url);

  let response;

  try {
    response = await apiFetch(url, slugPath, {
      next: {
        revalidate: Number.isFinite(DEFAULT_REVALIDATE_SECONDS) && DEFAULT_REVALIDATE_SECONDS > 0 ? DEFAULT_REVALIDATE_SECONDS : 0,
        tags: [`page:${slugPath}`],
      },
    });
  } catch (error) {
    logError("页面接口请求失败。", {error, slug: slugPath});
    throw new PageServiceError("Failed to reach page API.", {cause: error});
  }

  if (response.status === 404) {
    throw new PageNotFoundError(slugPath);
  }

  // console.log("打印 response:", response);

  const data = await safeReadJson(response);
  // console.log("打印 data:", data);

  if (data && data.code === 404) {
    throw new PageNotFoundError(slugPath);
  }

  if (!response.ok) {
    logError("页面接口返回异常响应。", {
      status: response.status,
      payload: data,
      slug: slugPath,
    });

    throw new PageServiceError("Page API responded with an error.", {
      status: response.status,
      payload: data,
    });
  }

  if (!data || typeof data !== "object") {
    throw new PageServiceError("Invalid response from page API.");
  }

  // 处理建议响应，重新请求建议的页面
  if (data.sug && !data.html) {
    console.log(`收到页面建议: ${data.sug}，重新请求...`);
    return await fetchPage(data.sug);
  }

  return {
    slug: slugPath,
    html: (data.html ?? "").replace(/<body([^>]*)>/gi, "<div$1>").replace(/<\/body>/gi, "</div>"),
    css: data.css ?? "",
    meta: data.meta ?? {},
    publishStatus: data.publishStatus ?? data.status ?? "draft",
    updatedAt: data.updatedAt ?? data.updated_at ?? null,
    cacheKey: data.cacheKey ?? data.cache_key ?? null,
    assets: data.assets ?? [],
  };
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}
