import {Suspense} from "react";
import {fetchRelatedProducts} from "@/services/relatedContent";
import RelatedProductsSwiper from "@/components/client/RelatedProductsSwiper";

/**
 * 相关产品骨架屏
 */
function RelatedProductsSkeleton({count = 6}) {
  return (
    <div className="swiper pd-related-swiper">
      <div className="swiper-wrapper">
        {Array.from({length: count}, (_, i) => (
          <div key={i} className="swiper-slide">
            <div className="related-product-card skeleton">
              <div className="skeleton-image"></div>
              <div className="skeleton-title"></div>
              <div className="skeleton-title"></div>
              <div className="skeleton-button"></div>
            </div>
          </div>
        ))}
      </div>
      <div className="swiper-button-next"></div>
      <div className="swiper-button-prev"></div>
    </div>
  );
}

/**
 * 相关产品内容组件（异步获取数据）
 */
async function RelatedProductsContent({productId, count}) {
  // 服务端异步获取数据
  const products = await fetchRelatedProducts(productId, {timeout: 3000});

  if (!products || products.length === 0) {
    return <p className="no-related">No related products</p>;
  }

  // 限制显示数量
  const displayProducts = products.slice(0, count);

  return <RelatedProductsSwiper products={displayProducts} />;
}

/**
 * 相关产品主组件（Server Component）
 * 支持流式渲染：骨架屏立即显示，数据异步流式传输
 *
 * @param {string} productId - 产品ID
 * @param {number} count - 显示数量（默认6个）
 */
export default function RelatedProducts({productId, count = 6}) {
  if (!productId) {
    return null;
  }

  return (
    <div className="pd-related-content" data-rsc-rendered="true">
      <Suspense fallback={<RelatedProductsSkeleton count={count} />}>
        <RelatedProductsContent productId={productId} count={count} />
      </Suspense>
    </div>
  );
}
