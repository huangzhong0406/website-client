import { logWarn } from "../lib/logger";

// API 基础地址：指向 Laravel 渲染端接口
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.API_BASE ??
  "";

if (!API_BASE) {
  logWarn(
    "NEXT_PUBLIC_API_BASE 未设置，渲染端无法请求页面数据。"
  );
}

// API Token：若后端需要鉴权，可在环境变量中配置
const API_TOKEN =
  process.env.NEXT_PUBLIC_API_TOKEN ??
  process.env.API_TOKEN ??
  process.env.RENDERER_API_TOKEN;

// 组合接口地址，附带可选查询参数
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

// 封装 fetch，默认携带 JSON Accept 与鉴权信息
export async function apiFetch(input, init = {}) {
  const timeout = init.timeout || 8000; // 默认8秒超时
  const controller = new AbortController();
  
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const finalInit = {
    headers: {
      Accept: "application/json",
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
      ...init.headers,
    },
    signal: controller.signal,
    ...init,
  };

  try {
    const response = await fetch(input, finalInit);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

