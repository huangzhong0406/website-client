import {apiFetch, buildApiUrl} from "./http";
import {logError} from "../lib/logger";

// 产品缓存时间（秒），可根据产品更新频率调整
const DEFAULT_REVALIDATE_SECONDS = Number(
  process.env.NEXT_PUBLIC_PRODUCT_REVALIDATE ?? process.env.PRODUCT_REVALIDATE ?? 60 * 60 // 默认1小时
);

export class ProductServiceError extends Error {
  constructor(message, options) {
    super(message);
    this.name = "ProductServiceError";
    Object.assign(this, options);
  }
}

/**
 * 获取产品列表数据
 */
export async function fetchProducts() {
  // 直接返回假数据，避免无效API调用
  return [
    {
      id: 1,
      name: "示例产品 1",
      price: "$99.00",
      image: "https://shopsource.singoo.cc/sections/images/800_600.jpg",
      description: "这是一个示例产品描述",
    },
    {
      id: 2,
      name: "示例产品 2",
      price: "$149.00",
      image: "https://shopsource.singoo.cc/sections/images/800_600.jpg",
      description: "这是一个示例产品描述",
    },
    {
      id: 3,
      name: "示例产品 3",
      price: "$199.00",
      image: "https://shopsource.singoo.cc/sections/images/800_600.jpg",
      description: "这是一个示例产品描述",
    },
    {
      id: 4,
      name: "示例产品 4",
      price: "$249.00",
      image: "https://shopsource.singoo.cc/sections/images/800_600.jpg",
      description: "这是一个示例产品描述",
    },
    {
      id: 5,
      name: "示例产品 5",
      price: "$299.00",
      image: "https://shopsource.singoo.cc/sections/images/800_600.jpg",
      description: "这是一个示例产品描述",
    },
    {
      id: 6,
      name: "示例产品 6",
      price: "$349.00",
      image: "https://shopsource.singoo.cc/sections/images/800_600.jpg",
      description: "这是一个示例产品描述",
    },
  ];

  
  // 注释掉的真实API调用代码
  /*
  const url = buildApiUrl("/v2/aisite/products");
  let response;

  try {
    response = await apiFetch(url, {
      timeout: 3000,
      next: {
        revalidate: Number.isFinite(DEFAULT_REVALIDATE_SECONDS) && DEFAULT_REVALIDATE_SECONDS > 0 ? DEFAULT_REVALIDATE_SECONDS : 0,
        tags: ["products"],
      },
    });
  } catch (error) {
    logError("产品接口请求失败。", {error});
    throw new ProductServiceError("Failed to reach product API.", {cause: error});
  }

  if (!response.ok) {
    const payload = await safeReadJson(response);
    logError("产品接口返回异常响应。", {
      status: response.status,
      payload,
    });
    throw new ProductServiceError("Product API responded with an error.", {
      status: response.status,
      payload,
    });
  }

  const data = await safeReadJson(response);
  if (!data) {
    throw new ProductServiceError("Invalid response from product API.");
  }

  const products = data.products || data;
  if (!Array.isArray(products)) {
    throw new ProductServiceError("Product API did not return an array.");
  }
  return products;
  */
}

async function safeReadJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}
