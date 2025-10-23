import {cache} from "react";
import {notFound} from "next/navigation";
import DeferredStyle from "../../components/DeferredStyle";
import SwiperRenderer from "../../components/SwiperRenderer";
import ImageProcessor from "../../components/ImageProcessor";
import {fetchPage, PageNotFoundError, PageServiceError} from "../../services/pages";
import {prepareGrapesContent} from "../../lib/grapesjs/render";
import {logError} from "../../lib/logger";
import {pageData} from "@/lib/pageData";

// 缓存页面数据，避免同一请求周期内重复访问接口
const getPageData = cache(async (slugSegments) => fetchPage(slugSegments));

export const dynamicParams = true;

export const revalidate = 120;

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
  let page;
  const resolvedParams = await params;
  const slug = resolvedParams.slug ?? [];

  // 过滤系统路径
  if (slug.length > 0 && slug[0] === ".well-known") {
    notFound();
  }

  try {
    // 暂时用假数据
    // page = pageData;
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

  const {html, criticalCss, deferredCss, hasImages} = prepareGrapesContent(page);

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
      
      {/* 图片处理器 */}
      {hasImages && <ImageProcessor />}
    </>
  );
}
