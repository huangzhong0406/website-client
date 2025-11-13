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
  const url = buildApiUrl(`/api/render/${encodeURIComponent(slugPath || "")}`);
  console.log("拉取页面数据，slug:", slugPath, "url:", url);

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
    logError("页面接口请求失败", {error, slug: slugPath, tenant});
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

  console.log("打印JSON数据:", pageData);

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

/**
 * 获取产品列表页数据（包括分类、产品、分页）
 * @param {Object} options - 查询选项
 * @param {string} options.path - 当前页面路径（如 '/electronics' 或 '/shop'）
 * @param {number} options.page - 页码（默认 1）
 * @param {string} options.sort - 排序方式（默认 'name-asc'）
 * @param {number} options.limit - 每页数量（默认 12）
 * @param {Object} options.tenant - 租户信息
 * @returns {Promise<Object>} 产品列表数据 {categories, products, pagination}
 */
export async function fetchProductListPageData({ path, page = 1, sort = "name-asc", limit = 12, tenant }) {
  // ============ 测试假数据 ============
  // TODO: 替换为真实 API 调用

  // 生成测试产品数据
  const generateMockProducts = (page, limit) => {
    const products = [];
    const start = (page - 1) * limit;
    for (let i = 0; i < limit; i++) {
      const id = start + i + 1;
      products.push({
        id: `prod-${id}`,
        name: `测试产品 ${id}`,
        description: `这是产品 ${id} 的描述信息，展示产品的主要特点和功能。`,
        price: 99 + id * 10,
        image: `https://shopsource.singoo.cc/sections/images/800_800.jpg`,
        category_id: "cat-1",
        path: `/products/prod-${id}` // 产品详情页路径
      });
    }
    return products;
  };

  // 模拟分类树数据
  const mockCategories = [
    {
      id: 'cat-1',
      name: '电子产品',
      path: '/electronics',
      parent_id: null,
      children: [
        {
          id: 'cat-1-1',
          name: '手机',
          path: '/electronics/phones',
          parent_id: 'cat-1',
          children: []
        },
        {
          id: 'cat-1-2',
          name: '电脑',
          path: '/electronics/computers',
          parent_id: 'cat-1',
          children: []
        }
      ]
    },
    {
      id: 'cat-2',
      name: '服装',
      path: '/clothing',
      parent_id: null,
      children: [
        {
          id: 'cat-2-1',
          name: '男装',
          path: '/clothing/men',
          parent_id: 'cat-2',
          children: []
        },
        {
          id: 'cat-2-2',
          name: '女装',
          path: '/clothing/women',
          parent_id: 'cat-2',
          children: []
        }
      ]
    },
    {
      id: 'cat-3',
      name: '家居',
      path: '/home',
      parent_id: null,
      children: []
    }
  ];

  // 模拟总产品数（用于分页）
  const mockTotalProducts = 48;
  const totalPages = Math.ceil(mockTotalProducts / limit);

  // 返回测试数据
  return {
    categories: mockCategories,
    products: generateMockProducts(page, limit),
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_items: mockTotalProducts,
      per_page: limit,
      has_next: page < totalPages,
      has_prev: page > 1
    }
  };

  // ============ 真实 API 调用代码（当前被注释） ============


  // 构建查询参数
  const params = new URLSearchParams({
    path: path || "/",
    page: page.toString(),
    sort,
    limit: limit.toString()
  });

  const url = buildApiUrl(`/api/renderer/products?${params}`);
  console.log("获取产品列表数据，path:", path, "url:", url);

  let response;
  try {
    response = await apiFetch(url, path, {
      tenant,
      next: {
        revalidate: Number.isFinite(DEFAULT_REVALIDATE_SECONDS) && DEFAULT_REVALIDATE_SECONDS > 0 ? DEFAULT_REVALIDATE_SECONDS : 0,
        tags: [`products:${path}:${page}:${sort}`]
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

/**
 * 获取产品详情数据
 * @param {string} productId - 产品 ID
 * @param {Object} tenant - 租户信息
 * @returns {Promise<Object>} 产品详情数据
 */
export async function fetchProductDetail(productId, tenant) {
  // ============ 测试假数据 ============
  // TODO: 替换为真实 API 调用

  // 模拟产品详情数据
  const mockProductDetail = {
    id: productId || 'prod-1',
    title: `测试产品 ${productId || '1'} - 完整标题`,
    description: '这是一款优质的产品，具有出色的性能和可靠的质量。适用于各种应用场景，满足您的多样化需求。',
    images: [
      'https://shopsource.singoo.cc/sections/images/800_800.jpg',
      'https://shopsource.singoo.cc/sections/images/800_800.jpg',
      'https://shopsource.singoo.cc/sections/images/800_800.jpg',
      'https://shopsource.singoo.cc/sections/images/800_800.jpg',
      'https://shopsource.singoo.cc/sections/images/800_800.jpg'
    ],
    contact: {
      email: 'sales@example.com',
      phone: '+86 400-123-4567',
      whatsapp: '+86 138-1234-5678'
    },
    files: [
      {
        name: '产品目录.pdf',
        url: '#catalog.pdf'
      },
      {
        name: '技术规格书.pdf',
        url: '#specification.pdf'
      },
      {
        name: '用户手册.pdf',
        url: '#manual.pdf'
      }
    ],
    descriptions: [
      {
        title: '产品特性',
        content: `
          <div style="padding: 20px;">
            <h3 style="margin-bottom: 15px;">主要特性</h3>
            <ul style="line-height: 1.8; padding-left: 20px;">
              <li>高性能处理器，运行流畅</li>
              <li>大容量存储，满足日常需求</li>
              <li>长续航电池，持久使用</li>
              <li>精致外观设计，时尚美观</li>
              <li>多种颜色可选，个性定制</li>
            </ul>
          </div>
        `
      },
      {
        title: '技术参数',
        content: `
          <div style="padding: 20px;">
            <h3 style="margin-bottom: 15px;">详细参数</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold; width: 30%;">尺寸</td>
                <td style="padding: 10px;">150mm × 75mm × 8mm</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">重量</td>
                <td style="padding: 10px;">180g</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">材质</td>
                <td style="padding: 10px;">铝合金机身</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">颜色</td>
                <td style="padding: 10px;">黑色、白色、蓝色、金色</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 10px; font-weight: bold;">保修</td>
                <td style="padding: 10px;">1年全国联保</td>
              </tr>
            </table>
          </div>
        `
      },
      {
        title: '包装清单',
        content: `
          <div style="padding: 20px;">
            <h3 style="margin-bottom: 15px;">包装内容</h3>
            <ul style="line-height: 1.8; padding-left: 20px;">
              <li>产品主机 × 1</li>
              <li>充电器 × 1</li>
              <li>数据线 × 1</li>
              <li>用户手册 × 1</li>
              <li>保修卡 × 1</li>
              <li>合格证 × 1</li>
            </ul>
          </div>
        `
      },
      {
        title: '售后服务',
        content: `
          <div style="padding: 20px;">
            <h3 style="margin-bottom: 15px;">服务承诺</h3>
            <p style="line-height: 1.8; margin-bottom: 15px;">
              我们提供全面的售后服务，确保您的购买无忧：
            </p>
            <ul style="line-height: 1.8; padding-left: 20px;">
              <li><strong>7天无理由退换：</strong>购买后7天内，如对产品不满意，可无理由退换</li>
              <li><strong>1年质保：</strong>产品享受1年全国联保服务</li>
              <li><strong>终身维护：</strong>超过保修期后，提供有偿维修服务</li>
              <li><strong>24小时客服：</strong>全天候在线客服，随时解答您的问题</li>
              <li><strong>上门服务：</strong>部分地区提供上门安装和维修服务</li>
            </ul>
            <p style="line-height: 1.8; margin-top: 15px;">
              如有任何问题，请随时联系我们的客服团队。
            </p>
          </div>
        `
      }
    ]
  };

  return mockProductDetail;

  // ============ 真实 API 调用代码（当前被注释） ============

  const url = buildApiUrl(`/api/renderer/products/${encodeURIComponent(productId)}`);
  console.log("获取产品详情数据，productId:", productId, "url:", url);

  let response;
  try {
    response = await apiFetch(url, productId, {
      tenant,
      next: {
        revalidate: Number.isFinite(DEFAULT_REVALIDATE_SECONDS) && DEFAULT_REVALIDATE_SECONDS > 0 ? DEFAULT_REVALIDATE_SECONDS : 0,
        tags: [`product:${productId}`]
      }
    });
  } catch (error) {
    logError("产品详情接口请求失败", {error, productId, tenant});
    throw new PageServiceError("Failed to fetch product detail data.", {cause: error, tenant, productId});
  }

  if (response.status === 404) {
    throw new PageNotFoundError(productId);
  }

  if (!response.ok) {
    const errorData = await safeReadJson(response);
    logError("产品详情接口返回异常响应。", {
      status: response.status,
      payload: errorData,
      productId,
      tenant
    });
    throw new PageServiceError("Product detail API responded with an error.", {
      status: response.status,
      payload: errorData,
      productId,
      tenant
    });
  }

  const data = await safeReadJson(response);

  if (!data || typeof data !== "object") {
    throw new PageServiceError("Invalid response from product detail API.", {productId, tenant});
  }

  // 返回产品详情数据
  return data.data || data;
}
