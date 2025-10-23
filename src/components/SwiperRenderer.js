'use client';

import { useEffect } from 'react';

export default function SwiperRenderer() {
  useEffect(() => {
    // 动态加载 Swiper CSS
    if (!document.querySelector('link[href*="swiper-bundle"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
      document.head.appendChild(link);
    }

    // 动态加载 Swiper JS
    if (!window.Swiper) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
      script.onload = () => initializeSwiper();
      document.head.appendChild(script);
    } else {
      initializeSwiper();
    }

    function initializeSwiper() {
      // 初始化所有 Swiper 实例
      const swiperContainers = document.querySelectorAll('.swiper:not(.swiper-initialized)');
      
      swiperContainers.forEach((container) => {
        new window.Swiper(container, {
          loop: true,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
          navigation: {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          },
          autoplay: {
            delay: 3000,
          },
        });
      });
    }
  }, []);

  return null;
}