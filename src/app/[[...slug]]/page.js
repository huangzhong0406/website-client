import {cache} from "react";
import {notFound} from "next/navigation";
import DeferredStyle from "../../components/DeferredStyle";
import SwiperLoader from "../../components/SwiperLoader";
import {fetchPage, fetchProductListPageData, PageNotFoundError, PageServiceError} from "../../services/pages";
import {prepareGrapesContent} from "../../lib/render";
import {logError} from "../../lib/logger";
import {getTenantContext, TenantNotFoundError, TenantResolutionError} from "../../lib/tenant";

// 缓存页面数据，避免同一请求周期内重复访问接口
const getPageData = cache(async (slugSegments, tenant) => fetchPage(slugSegments, tenant));

export const dynamicParams = true;

export const revalidate = 3600;

// 获取 Meta 数据
export async function generateMetadata({params}) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug ?? [];

    // 过滤系统路径
    if (slug.length > 0 && slug[0] === ".well-known") {
      return {title: "页面未找到"};
    }

    const tenant = await getTenantContext();
    console.log("租户信息:", JSON.stringify(tenant));

    // 预先获取接口数据，将 meta 字段映射给 Next.js Metadata
    const page = await getPageData(slug, tenant);
    console.log("获取接口数据:", page);
    const meta = page.meta ?? {};

    const robots = page.publishStatus === "published" ? meta.robots : {index: false, follow: false};

    return {
      title: meta.title ?? "未命名页面",
      description: meta.description ?? "",
      robots,
      openGraph: {
        title: meta.ogTitle ?? meta.title ?? "未命名页面",
        description: meta.ogDescription ?? meta.description ?? "",
        type: "website",
        url: meta.url ?? undefined,
        images: meta.ogImage ? [].concat(meta.ogImage) : undefined
      },
      alternates: meta.canonical ? {canonical: meta.canonical} : undefined
    };
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return {
        title: "访问被拒绝",
        robots: {
          index: false,
          follow: false
        }
      };
    }

    if (error instanceof PageNotFoundError) {
      return {
        title: "页面未找到",
        robots: {
          index: false,
          follow: false
        }
      };
    }

    logError("生成页面元数据失败。", {error});
    return {};
  }
}

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
  const currentSlug = slug.length > 0 ? `/${slug.join('/')}` : '/';

  // 判断是否是产品列表页，获取产品数据
  let productListPageData = null;
  // TODO：测试
  page.page_type = "products";
  if (page.page_type === 'products') {
    try {
      // 解析 URL 参数
      const pageNum = resolvedSearchParams.page ? parseInt(resolvedSearchParams.page) : 1;
      const sort = resolvedSearchParams.sort || 'name-asc';
      const limit = resolvedSearchParams.limit ? parseInt(resolvedSearchParams.limit) : 12;

      // 获取产品列表数据
      productListPageData = await fetchProductListPageData({
        path: currentSlug,
        page: pageNum,
        sort,
        limit,
        tenant
      });
    } catch (error) {
      logError("获取产品列表数据失败。", {error, slug, tenant});
      // 如果获取失败，继续渲染页面但不传递产品数据
    }
  }

  const {html, criticalCss, deferredCss, preloadResources, swiperScripts, hasSwipers} = prepareGrapesContent({
    ...contentPage,
    productData: {}, // 产品数据（保留用于其他用途）
    productListPageData, // 产品列表页数据
    currentSlug: currentSlug, // 当前页面路径
    currentParams: resolvedSearchParams, // URL 参数
    globalComponents: globalComponentsResult, // 全局组件
    tenant
  });

  return (
    <>
      {/* 预加载关键资源（包含 Swiper CSS/JS + 首屏图片） */}
      {preloadResources.map((resource, index) => (
        <link key={index} rel="preload" href={resource.href} as={resource.as} type={resource.type} fetchPriority={resource.fetchPriority} />
      ))}

      {/* 首屏关键 CSS 内联（包含 Swiper 关键样式），避免额外请求影响 LCP */}
      {criticalCss && <style data-critical="true" dangerouslySetInnerHTML={{__html: criticalCss}} />}

      {/* GrapesJS 导出的 HTML 片段直接插入，保持编辑端排版 */}
      <article className="rendered-page" dangerouslySetInnerHTML={{__html: html}} />

      {/* 非关键 CSS 在浏览器空闲时插入，降低首屏阻塞 */}
      {deferredCss && <DeferredStyle css={deferredCss} id="page-deferred-css" />}

      {/* Swiper 初始化 - 动态加载和执行脚本 */}
      {hasSwipers && <SwiperLoader scripts={swiperScripts} preloadSwiper={true} />}
    </>
  );
}
