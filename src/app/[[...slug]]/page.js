import {cache} from "react";
import {notFound} from "next/navigation";
import DeferredStyle from "../../components/DeferredStyle";
import SwiperLoader from "../../components/SwiperLoader";
import {fetchPage, fetchProductListPageData, fetchBlogListPageData, PageNotFoundError, PageServiceError} from "../../services/pages";
import {prepareGrapesContent} from "../../lib/render";
import {logError} from "../../lib/logger";
import {getTenantContext, TenantNotFoundError, TenantResolutionError} from "../../lib/tenant";
import {parseSortValue} from "../../config/sortOptions";

// 缓存页面数据，避免同一请求周期内重复访问接口
const getPageData = cache(async (slugSegments, tenant) => fetchPage(slugSegments, tenant));

export const dynamicParams = true;

export const revalidate = 3600;

export default async function RenderedPage({params, searchParams}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const slug = resolvedParams.slug ?? [];

  // 过滤系统路径
  if (slug.length > 0 && slug[0] === ".well-known") {
    notFound();
  }

  let tenant;
  try {
    tenant = await getTenantContext();
    if (!tenant?.id) {
      throw new Response("Forbidden", {status: 403});
    }
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      throw new Response("Forbidden", {status: 403});
    }
    if (error instanceof TenantResolutionError) {
      logError("租户上下文解析失败。", {error});
      throw new Response("Forbidden", {status: 403});
    }
    throw error;
  }

  let page;
  try {
    page = await getPageData(slug, tenant);
    console.log(`页面接口请求 - 2.响应数据：`, page);
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      notFound();
    }
    if (error instanceof PageServiceError) {
      logError("页面服务发生错误。", {error, slug, tenant});
    }
    throw error;
  }

  let contentPage = {
    html: page.page_json?.json_data.html || "",
    css: page.page_json?.json_data.css || "",
    assets: page.page_json?.json_data.assets || []
  };

  let globalComponentsResult = page?.global_sections || [];

  // 获取当前页面 slug 字符串
  const currentSlug = slug.length > 0 ? `/${slug.join("/")}` : "/";

  // 获取资源类型（用于判断是产品还是博客）
  const resourceType = page.page?.type;

  // 获取当前分类ID（用于分类高亮）
  const currentCategoryId = page.context?.resource?.id || '';

  // 初始化数据变量
  let productListPageData = null;
  let productDetailData = null;
  let blogListPageData = null;
  let blogDetailData = null;

  // 根据 resource_type 判断获取哪种数据
  if (["products", "product_category"].includes(resourceType)) {
    // 获取产品列表数据
    try {
      // 解析 URL 参数
      const pageNum = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page) : 1;
      const size = resolvedSearchParams.size ? parseInt(resolvedSearchParams.size) : 12;
      // 使用公共配置解析排序参数
      const {sortBy: sort_by, sortOrder: sort_order} = parseSortValue(resolvedSearchParams.sort || "");

      productListPageData = await fetchProductListPageData({
        path: currentSlug,
        category_id: currentCategoryId,
        page: pageNum,
        sort_by,
        sort_order,
        size,
        tenant
      });
    } catch (error) {
      logError("获取产品列表数据失败。", {error, slug, tenant});
      // 如果获取失败，继续渲染页面但不传递产品数据
    }
  } else if (["blogs", "blog_category"].includes(resourceType)) {
    // 获取博客列表数据
    try {
      // 解析 URL 参数
      const pageNum = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page) : 1;
      const size = resolvedSearchParams.size ? parseInt(resolvedSearchParams.size) : 12;
      // 使用公共配置解析排序参数
      const {sortBy: sort_by, sortOrder: sort_order} = parseSortValue(resolvedSearchParams.sort || "");

      blogListPageData = await fetchBlogListPageData({
        path: currentSlug,
        category_id: currentCategoryId,
        page: pageNum,
        sort_by,
        sort_order,
        size,
        tenant
      });
    } catch (error) {
      logError("获取博客列表数据失败。", {error, slug, tenant});
      // 如果获取失败，继续渲染页面但不传递博客数据
    }
  } else if (resourceType === "product") {
    // 获取产品详情数据（从 page.context.resource）
    productDetailData = page.context?.resource;
  } else if (resourceType === "blog") {
    // 获取博客详情数据（从 page.context.resource）
    blogDetailData = page.context?.resource;
  }

  const {html, criticalCss, deferredCss, preloadResources, swiperScripts, hasSwipers, hasAboveFoldSwiper} = await prepareGrapesContent({
    ...contentPage,
    productData: {}, // 产品数据（保留用于其他用途）
    productListPageData, // 产品列表页数据
    productDetailData, // 产品详情数据
    blogListPageData, // 博客列表页数据
    blogDetailData, // 博客详情数据
    currentSlug: currentSlug, // 当前页面路径
    currentParams: resolvedSearchParams, // URL 参数
    currentCategoryId: currentCategoryId, // 当前分类ID（用于分类高亮）
    globalComponents: globalComponentsResult, // 全局组件
    tenant
  });

  return (
    <>
      {/* Swiper CDN 预连接（性能优化） */}
      {hasSwipers && (
        <>
          <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
          <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        </>
      )}

      {/* 预加载关键资源（包含 Swiper CSS/JS + 首屏图片） */}
      {preloadResources && preloadResources.map((resource, index) => (
        <link key={index} rel="preload" href={resource.href} as={resource.as} type={resource.type} fetchPriority={resource.fetchPriority} />
      ))}

      {/* 首屏关键 CSS 内联（包含 Swiper 关键样式），避免额外请求影响 LCP */}
      {criticalCss && <style data-critical="true" dangerouslySetInnerHTML={{__html: criticalCss}} />}

      {/* GrapesJS 导出的 HTML 片段直接插入，保持编辑端排版 */}
      <article className="rendered-page" dangerouslySetInnerHTML={{__html: html}} />

      {/* 非关键 CSS 在浏览器空闲时插入，降低首屏阻塞 */}
      {deferredCss && <DeferredStyle css={deferredCss} id="page-deferred-css" />}

      {/* Swiper 初始化 - 动态加载和执行脚本 */}
      {hasSwipers && <SwiperLoader scripts={swiperScripts} preloadSwiper={hasAboveFoldSwiper} />}
    </>
  );
}
