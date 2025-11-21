import {Suspense} from "react";
import {fetchRelatedBlogs} from "@/services/relatedContent";
import RelatedBlogsList from "@/components/client/RelatedBlogsList";

/**
 * 相关博客骨架屏
 */
function RelatedBlogsSkeleton({count = 3}) {
  return (
    <div className="bd-related">
      <h2 className="bd-related-title">Related News</h2>
      <div className="bd-related-list">
        {Array.from({length: count}, (_, i) => (
          <div key={i} className="bd-related-item skeleton">
            <div className="skeleton-image"></div>
            <div className="skeleton-date"></div>
            <div className="skeleton-title"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 相关博客内容组件（异步获取数据）
 */
async function RelatedBlogsContent({blogId, limit}) {
  // 服务端异步获取数据
  const blogs = await fetchRelatedBlogs(blogId, limit, {timeout: 3000});

  if (!blogs || blogs.length === 0) {
    return null; // 没有相关博客时不显示整个区域
  }

  return <RelatedBlogsList blogs={blogs} />;
}

/**
 * 相关博客主组件（Server Component）
 * 支持流式渲染：骨架屏立即显示，数据异步流式传输
 *
 * @param {string} blogId - 博客ID
 * @param {number} limit - 显示数量（默认3个）
 */
export default function RelatedBlogs({blogId, limit = 3}) {
  if (!blogId) {
    return null;
  }

  return (
    <div data-rsc-rendered="true">
      <Suspense fallback={<RelatedBlogsSkeleton count={limit} />}>
        <RelatedBlogsContent blogId={blogId} limit={limit} />
      </Suspense>
    </div>
  );
}
