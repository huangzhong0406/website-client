(function() {
  'use strict';

  if (typeof document === 'undefined') return;

  const SELECTORS = {
    container: '[data-component-type="product-detail"]',
    galleryMain: '.pd-gallery-main',
    galleryThumbs: '.pd-gallery-thumbs',
    tab: '.pd-tab',
    tabContent: '.pd-tab-content',
    relatedContent: '.pd-related-content'
  };

  class ProductDetail {
    constructor(container) {
      this.container = container;
      this.config = this.parseConfig();
      this.productId = this.container.dataset.productId;

      this.init();
    }

    parseConfig() {
      const configStr = this.container.getAttribute('data-config');
      return configStr ? JSON.parse(configStr) : {};
    }

    init() {
      this.initGallerySwiper();
      this.initDescriptionTabs();

      // 检查相关产品是否已在服务端渲染
      const relatedContainer = this.container.querySelector(SELECTORS.relatedContent);
      const isServerRendered = relatedContainer?.dataset.serverRendered === "true";
      const needsClientFallback = relatedContainer?.dataset.clientFallback === "true";

      if (isServerRendered) {
        // 服务端已渲染，只需初始化Swiper
        console.log("✅ 相关产品已由服务端渲染");
        this.initRelatedSwiper();
      } else if (needsClientFallback && this.productId) {
        // 服务端渲染失败，降级为客户端加载
        console.log("⚠️ 相关产品降级为客户端加载");
        this.loadRelatedProducts();
      }
    }

    initGallerySwiper() {
      // 轮播初始化完全由 swiperProcessor.js 负责
      // 这里只获取已初始化的实例引用（用于后续可能的操作）
      const mainEl = this.container.querySelector(SELECTORS.galleryMain);
      const thumbEl = this.container.querySelector(SELECTORS.galleryThumbs);

      if (!mainEl || !thumbEl) return;

      // 获取 swiperProcessor.js 初始化的实例
      if (mainEl.__swiper_instance) {
        this.mainSwiper = mainEl.__swiper_instance;
      }
      if (thumbEl.__swiper_instance) {
        this.thumbSwiper = thumbEl.__swiper_instance;
      }

      // 如果实例不存在，可能是异步加载，稍后再获取
      if (!this.mainSwiper || !this.thumbSwiper) {
        // 等待 swiperProcessor.js 初始化完成
        const checkInterval = setInterval(() => {
          if (mainEl.__swiper_instance && thumbEl.__swiper_instance) {
            this.mainSwiper = mainEl.__swiper_instance;
            this.thumbSwiper = thumbEl.__swiper_instance;
            console.log('✅ 产品详情轮播实例已获取（由 swiperProcessor.js 初始化）');
            clearInterval(checkInterval);
          }
        }, 100);

        // 5秒后停止检测
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    }

    initDescriptionTabs() {
      const tabs = this.container.querySelectorAll(SELECTORS.tab);

      tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
          this.switchTab(index);
        });
      });
    }

    switchTab(index) {
      // 切换标签
      const tabs = this.container.querySelectorAll(SELECTORS.tab);
      tabs.forEach(t => t.classList.remove('active'));
      tabs[index]?.classList.add('active');

      // 切换内容
      const contents = this.container.querySelectorAll(SELECTORS.tabContent);
      contents.forEach(c => c.classList.remove('active'));
      contents[index]?.classList.add('active');
    }

    async loadRelatedProducts() {
      const container = this.container.querySelector(SELECTORS.relatedContent);
      if (!container) return;

      // 显示骨架屏
      const skeletonCount = this.config.relatedProductsCount || 6;
      container.innerHTML = this.generateSkeletonHtml(skeletonCount);

      try {
        const response = await fetch(`/api/module/products/related?product_id=${this.productId}`);
        const data = await response.json();

        if (data.code != 200 || !data.data?.length) {
          console.log(1);
          container.innerHTML = '<p>No related products</p>';
          return;
        }

        // 生成相关产品 HTML
        const html = this.generateRelatedProductsHtml(data.data);
        container.innerHTML = html;

        // 初始化轮播
        this.initRelatedSwiper();
      } catch (error) {
        console.error('Failed to load related products:', error);
        container.innerHTML = '<p>Failed to load related products</p>';
      }
    }

    generateSkeletonHtml(count) {
      const skeletonCards = Array.from({ length: count }, () => `
        <div class="swiper-slide">
          <div class="related-product-card skeleton">
            <div class="skeleton-image"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-title"></div>
            <div class="skeleton-button"></div>
          </div>
        </div>
      `).join('');

      return `
        <div class="swiper pd-related-swiper">
          <div class="swiper-wrapper">
            ${skeletonCards}
          </div>
          <div class="swiper-button-next"></div>
          <div class="swiper-button-prev"></div>
        </div>
      `;
    }

    generateRelatedProductsHtml(products) {
      return `
        <div class="swiper pd-related-swiper">
          <div class="swiper-wrapper">
            ${products
              .map(
                (product) => `
              <div class="swiper-slide">
                <div class="related-product-card">
                  <img src="${product.primary_image}" alt="${product.name}" loading="lazy">
                  <h3>${product.name}</h3>
                  <a href="${product.path}" class="view-more-btn">Learn More</a>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
          <div class="swiper-button-next"></div>
          <div class="swiper-button-prev"></div>
        </div>
      `;
    }

    initRelatedSwiper() {
      const swiperEl = this.container.querySelector('.pd-related-swiper');
      if (!swiperEl || !window.Swiper) return;

      new Swiper(swiperEl, {
        slidesPerView: 1,
        spaceBetween: 20,
        navigation: {
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev'
        },
        breakpoints: {
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 }
        }
      });
    }
  }

  function initProductDetails() {
    const containers = document.querySelectorAll(SELECTORS.container);
    containers.forEach(container => {
      if (container.dataset.pdInitialized === 'true') return;
      container.dataset.pdInitialized = 'true';

      new ProductDetail(container);
    });
  }

  // 初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductDetails);
  } else {
    initProductDetails();
  }

  // 支持动态添加
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      initProductDetails();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
