(function () {
  "use strict";

  if (typeof document === "undefined") return;

  const SELECTORS = {
    container: '[data-component-type="product-detail"]',
    galleryMain: ".pd-gallery-main",
    galleryThumbs: ".pd-gallery-thumbs",
    tab: ".pd-tab",
    tabContent: ".pd-tab-content",
    relatedContent: ".pd-related-content"
  };

  class ProductDetail {
    constructor(container) {
      this.container = container;
      this.config = this.parseConfig();
      this.productId = this.container.dataset.productId;

      this.init();
    }

    parseConfig() {
      const configStr = this.container.getAttribute("data-config");
      return configStr ? JSON.parse(configStr) : {};
    }

    init() {
      this.initGallerySwiper();
      this.initDescriptionTabs();

      // 仅在有 productId 时加载相关产品
      if (this.productId) {
        this.loadRelatedProducts();
      }
    }

    initGallerySwiper() {
      const mainEl = this.container.querySelector(SELECTORS.galleryMain);
      const thumbEl = this.container.querySelector(SELECTORS.galleryThumbs);

      if (!mainEl || !thumbEl || !window.Swiper) return;

      // 缩略图轮播
      const thumbSwiper = new Swiper(thumbEl, {
        spaceBetween: 10,
        slidesPerView: 4,
        freeMode: true,
        watchSlidesProgress: true
      });

      // 主图轮播
      const mainSwiper = new Swiper(mainEl, {
        spaceBetween: 10,
        navigation: false,
        pagination: false,
        thumbs: {
          swiper: thumbSwiper
        }
      });

      this.mainSwiper = mainSwiper;
      this.thumbSwiper = thumbSwiper;
    }

    initDescriptionTabs() {
      const tabs = this.container.querySelectorAll(SELECTORS.tab);

      tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
          this.switchTab(index);
        });
      });
    }

    switchTab(index) {
      // 切换标签
      const tabs = this.container.querySelectorAll(SELECTORS.tab);
      tabs.forEach((t) => t.classList.remove("active"));
      tabs[index]?.classList.add("active");

      // 切换内容
      const contents = this.container.querySelectorAll(SELECTORS.tabContent);
      contents.forEach((c) => c.classList.remove("active"));
      contents[index]?.classList.add("active");
    }

    async loadRelatedProducts() {
      const container = this.container.querySelector(SELECTORS.relatedContent);
      if (!container) return;

      try {
        const response = await fetch(`/api/products/${this.productId}/related?limit=${this.config.relatedProductsCount || 6}`);
        console.log("response", response);
        if (response.ok) {
          const data = await response.json();

          if (!data.products || !data.products.length) {
            container.innerHTML = "<p>No related products</p>";
            return;
          }

          // 生成相关产品 HTML
          const html = this.generateRelatedProductsHtml(data.products);
          container.innerHTML = html;

          // 初始化轮播
          this.initRelatedSwiper();
        } else {
          console.error("Failed to load related products:", response.statusText);
          container.innerHTML = "<p>Failed to load related products</p>";
        }
      } catch (error) {
        console.error("Failed to load related products:", error);
        container.innerHTML = "<p>Failed to load related products</p>";
      }
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
                  <img src="${product.image}" alt="${product.title}" loading="lazy">
                  <h3>${product.title}</h3>
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
      const swiperEl = this.container.querySelector(".pd-related-swiper");
      if (!swiperEl || !window.Swiper) return;

      new Swiper(swiperEl, {
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
    }
  }

  function initProductDetails() {
    const containers = document.querySelectorAll(SELECTORS.container);
    containers.forEach((container) => {
      if (container.dataset.pdInitialized === "true") return;
      container.dataset.pdInitialized = "true";

      new ProductDetail(container);
    });
  }

  // 初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProductDetails);
  } else {
    initProductDetails();
  }

  // 支持动态添加
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver(() => {
      initProductDetails();
    });
    observer.observe(document.body, {childList: true, subtree: true});
  }
})();
