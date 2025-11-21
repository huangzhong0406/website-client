"use client";

import {useEffect, useRef} from "react";

/**
 * 相关产品轮播组件（客户端）
 * 使用原生 Swiper.js 初始化轮播
 */
export default function RelatedProductsSwiper({products}) {
  const swiperRef = useRef(null);
  const swiperInstance = useRef(null);

  useEffect(() => {
    // 等待 Swiper.js 加载完成（由 swiperProcessor.js 异步加载）
    const initSwiper = () => {
      if (!window.Swiper || !swiperRef.current) return;

      // 如果已经初始化，先销毁
      if (swiperInstance.current) {
        swiperInstance.current.destroy();
      }

      // 初始化 Swiper
      swiperInstance.current = new window.Swiper(swiperRef.current, {
        slidesPerView: 1,
        spaceBetween: 20,
        navigation: {
          nextEl: ".swiper-button-next",
          prevEl: ".swiper-button-prev"
        },
        breakpoints: {
          640: {slidesPerView: 2},
          1024: {slidesPerView: 3}
        }
      });
    };

    // 如果 Swiper 已加载，立即初始化
    if (window.Swiper) {
      initSwiper();
    } else {
      // 否则等待 Swiper 加载
      const checkInterval = setInterval(() => {
        if (window.Swiper) {
          initSwiper();
          clearInterval(checkInterval);
        }
      }, 100);

      // 10秒后停止检测
      setTimeout(() => clearInterval(checkInterval), 10000);

      return () => clearInterval(checkInterval);
    }

    // 组件卸载时销毁 Swiper
    return () => {
      if (swiperInstance.current) {
        swiperInstance.current.destroy();
        swiperInstance.current = null;
      }
    };
  }, [products]);

  if (!products || products.length === 0) {
    return <p className="no-related">No related products</p>;
  }

  return (
    <div ref={swiperRef} className="swiper pd-related-swiper">
      <div className="swiper-wrapper">
        {products.map((product) => (
          <div key={product.id || product.path} className="swiper-slide">
            <div className="related-product-card">
              <img
                src={product.primary_image || "/images/placeholder.jpg"}
                alt={product.name || "Product"}
                loading="lazy"
              />
              <h3>{product.name || "Untitled"}</h3>
              <a href={product.path} className="view-more-btn">
                Learn More
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="swiper-button-next"></div>
      <div className="swiper-button-prev"></div>
    </div>
  );
}
