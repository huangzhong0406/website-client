import {cache} from "react";
import {notFound} from "next/navigation";
import DeferredStyle from "../../components/DeferredStyle";
import SwiperLoader from "../../components/SwiperLoader";
import {fetchPage, PageNotFoundError, PageServiceError} from "../../services/pages";
import {fetchProducts} from "../../services/products";
import {fetchNavigationPages} from "../../services/navigation";
import {fetchAllGlobalComponents} from "../../services/globalComponents";
import {prepareGrapesContent} from "../../lib/grapesjs/render";
import {logError} from "../../lib/logger";
import {getTenantContext, TenantNotFoundError, TenantResolutionError} from "../../lib/tenant";

// 缓存页面数据，避免同一请求周期内重复访问接口
const getPageData = cache(async (slugSegments, tenant) => fetchPage(slugSegments, tenant));

// 缓存产品数据
const getProductData = cache(async (tenant) => fetchProducts(tenant));

// 缓存导航数据
const getNavigationData = cache(async (tenant) => fetchNavigationPages(tenant));

// 缓存全局组件数据
const getGlobalComponents = cache(async (tenant) => fetchAllGlobalComponents(tenant));

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
        images: meta.ogImage ? [].concat(meta.ogImage) : undefined,
      },
      alternates: meta.canonical ? {canonical: meta.canonical} : undefined,
    };
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return {
        title: "访问被拒绝",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    if (error instanceof PageNotFoundError) {
      return {
        title: "页面未找到",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    logError("生成页面元数据失败。", {error});
    return {};
  }
}

export default async function RenderedPage({params}) {
  const resolvedParams = await params;
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

  // 检查需要哪些额外数据
  const hasProductList = page.html?.includes('data-component-type="product-list"');
  const hasGlobalNav = page.html?.includes('data-component-type="tailwind-navbar"');

  // 并行获取所有需要的数据
  const [globalComponentsResult, productsResult, navigationResult] = await Promise.allSettled([
    getGlobalComponents(tenant),
    hasProductList ? getProductData(tenant) : Promise.resolve(null),
    hasGlobalNav ? getNavigationData(tenant) : Promise.resolve(null),
  ]);

  // 处理结果，失败不影响页面渲染
  const globalComponents = globalComponentsResult.status === "fulfilled" ? globalComponentsResult.value : null;
  const products = productsResult.status === "fulfilled" ? productsResult.value : null;
  const navigation = navigationResult.status === "fulfilled" ? navigationResult.value : null;

  // 记录错误但不中断渲染
  if (globalComponentsResult.status === "rejected") {
    logError("全局组件服务发生错误。", {error: globalComponentsResult.reason, tenant});
  }
  if (productsResult.status === "rejected") {
    logError("产品服务发生错误。", {error: productsResult.reason, tenant});
  }
  if (navigationResult.status === "rejected") {
    logError("导航服务发生错误。", {error: navigationResult.reason, tenant});
  }

  const {html, criticalCss, deferredCss, preloadResources, swiperScripts, hasSwipers} = prepareGrapesContent({
    ...page,
    productData: products, // 产品数据
    navigationData: navigation, // 导航数据
    currentSlug: page.slug,
    globalComponents: globalComponents, // 全局组件
    tenant,
  });

  console.log("RenderedPage swiperScripts count:", swiperScripts?.length || 0);

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
