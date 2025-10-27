import {cache} from "react";
import {notFound} from "next/navigation";
import DeferredStyle from "../../components/DeferredStyle";
import SwiperRenderer from "../../components/SwiperRenderer";
import {fetchPage, PageNotFoundError, PageServiceError} from "../../services/pages";
import {fetchProducts} from "../../services/products";
import {fetchNavigationPages} from "../../services/navigation";
import {fetchAllGlobalComponents} from "../../services/globalComponents";
import {prepareGrapesContent} from "../../lib/grapesjs/render";
import {logError} from "../../lib/logger";

// 缓存页面数据，避免同一请求周期内重复访问接口
const getPageData = cache(async (slugSegments) => fetchPage(slugSegments));

// 缓存产品数据
const getProductData = cache(async () => fetchProducts());

// 缓存导航数据
const getNavigationData = cache(async () => fetchNavigationPages());

// 缓存全局组件数据
const getGlobalComponents = cache(async () => fetchAllGlobalComponents());

export const dynamicParams = true;

export const revalidate = 3600;

// 获取Meta数据
export async function generateMetadata({params}) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug ?? [];

    // 过滤系统路径
    if (slug.length > 0 && slug[0] === ".well-known") {
      return {title: "页面未找到"};
    }

    // console.log("generateMetadata params:", resolvedParams);
    // 预先获取接口数据，将 meta 字段映射到 Next.js Metadata
    // const page = pageData;
    const page = await getPageData(slug);
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

  let page;
  try {
    page = await getPageData(slug);
  } catch (error) {
    if (error instanceof PageNotFoundError) {
      notFound();
    }
    if (error instanceof PageServiceError) {
      logError("页面服务发生错误。", {error});
    }
    throw error;
  }

  // 检查需要哪些额外数据
  const hasProductList = page.html?.includes('data-component-type="product-list"');
  const hasGlobalNav = page.html?.includes('data-component-type="global-navigation"');

  // 并行获取所有需要的数据
  const [globalComponentsResult, productsResult, navigationResult] = await Promise.allSettled([
    getGlobalComponents(),
    hasProductList ? getProductData() : Promise.resolve(null),
    hasGlobalNav ? getNavigationData() : Promise.resolve(null)
  ]);

  // 处理结果，失败不影响页面渲染
  const globalComponents = globalComponentsResult.status === 'fulfilled' ? globalComponentsResult.value : null;
  const products = productsResult.status === 'fulfilled' ? productsResult.value : null;
  const navigation = navigationResult.status === 'fulfilled' ? navigationResult.value : null;

  // 记录错误但不中断渲染
  if (globalComponentsResult.status === 'rejected') {
    logError("全局组件服务发生错误。", {error: globalComponentsResult.reason});
  }
  if (productsResult.status === 'rejected') {
    logError("产品服务发生错误。", {error: productsResult.reason});
  }
  if (navigationResult.status === 'rejected') {
    logError("导航服务发生错误。", {error: navigationResult.reason});
  }

  // 检查全局组件中是否也需要导航数据
  let finalNavigation = navigation;
  if (!finalNavigation && globalComponents?.navigation) {
    try {
      finalNavigation = await getNavigationData();
    } catch (error) {
      logError("导航服务发生错误。", {error});
    }
  }

  const {html, criticalCss, deferredCss} = prepareGrapesContent({
    ...page,
    productData: products,
    navigationData: finalNavigation,
    currentSlug: page.slug,
    globalComponents: globalComponents,
  });

  return (
    <>
      {/* 首屏关键 CSS 内联，避免额外请求影响 LCP */}
      {criticalCss && <style data-critical="true" dangerouslySetInnerHTML={{__html: criticalCss}} />}

      {/* GrapesJS 导出的 HTML 片段直接插入，保持编辑端排版 */}
      <article className="rendered-page" dangerouslySetInnerHTML={{__html: html}} />

      {/* 非关键 CSS 在浏览器空闲时插入，降低首屏阻塞 */}
      {deferredCss && <DeferredStyle css={deferredCss} id="page-deferred-css" />}

      {/* Swiper 初始化 */}
      <SwiperRenderer />
    </>
  );
}
