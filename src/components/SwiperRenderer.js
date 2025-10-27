'use client';

import { useEffect } from 'react';

export default function SwiperRenderer() {
  useEffect(() => {
    // 动态导入 Swiper 模块(代码分割)
    let swiperInstance = null;

    const loadAndInitSwiper = async () => {
      try {
        // 动态导入 Swiper 和样式
        const [Swiper, Navigation, Pagination, Autoplay] = await Promise.all([
          import('swiper').then(mod => mod.Swiper),
          import('swiper/modules').then(mod => mod.Navigation),
          import('swiper/modules').then(mod => mod.Pagination),
          import('swiper/modules').then(mod => mod.Autoplay),
        ]);

        // 导入样式
        await Promise.all([
          import('swiper/css'),
          import('swiper/css/navigation'),
          import('swiper/css/pagination'),
        ]);

        // 初始化所有 Swiper 实例
        const swiperContainers = document.querySelectorAll('.swiper:not(.swiper-initialized)');

        swiperContainers.forEach((container) => {
          swiperInstance = new Swiper(container, {
            modules: [Navigation, Pagination, Autoplay],
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
              disableOnInteraction: false,
            },
          });
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Swiper 加载失败:', error);
        }
      }
    };

    // 使用 requestIdleCallback 延迟加载 Swiper
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        loadAndInitSwiper();
      });
    } else {
      // 降级方案: 使用 setTimeout
      setTimeout(() => {
        loadAndInitSwiper();
      }, 100);
    }

    // 清理函数
    return () => {
      if (swiperInstance && swiperInstance.destroy) {
        swiperInstance.destroy(true, true);
      }
    };
  }, []);

  return null;
}
