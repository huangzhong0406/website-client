(function () {
  "use strict";

  if (typeof document === "undefined") return;

  const SELECTORS = {
    container: '[data-component-type="blog-detail"]',
    gallerySwiper: ".bd-gallery-swiper",
    relatedList: ".bd-related-list"
  };

  class BlogDetail {
    constructor(container) {
      this.container = container;
      this.config = this.parseConfig();
      this.blogId = this.container.dataset.blogId;

      this.init();
    }

    parseConfig() {
      const configStr = this.container.getAttribute("data-config");
      return configStr ? JSON.parse(configStr) : {};
    }

    init() {
      this.initGallerySwiper();

      // 仅在有 blogId 时加载相关博客
      if (this.blogId) {
        this.loadRelatedBlogs();
      }
    }

    initGallerySwiper() {
      // 轮播初始化完全由 swiperProcessor.js 负责
      // 这里只获取已初始化的实例引用（用于后续可能的操作）
      const swiperEl = this.container.querySelector(SELECTORS.gallerySwiper);

      if (!swiperEl) return;

      // 获取 swiperProcessor.js 初始化的实例
      if (swiperEl.__swiper_instance) {
        this.swiper = swiperEl.__swiper_instance;
      }

      // 如果实例不存在，可能是异步加载，稍后再获取
      if (!this.swiper) {
        // 等待 swiperProcessor.js 初始化完成
        const checkInterval = setInterval(() => {
          if (swiperEl.__swiper_instance) {
            this.swiper = swiperEl.__swiper_instance;
            console.log('✅ 博客详情轮播实例已获取（由 swiperProcessor.js 初始化）');
            clearInterval(checkInterval);
          }
        }, 100);

        // 5秒后停止检测
        setTimeout(() => clearInterval(checkInterval), 5000);
      }
    }

    async loadRelatedBlogs() {
      const container = this.container.querySelector(SELECTORS.relatedList);
      if (!container) return;

      try {
        const response = await fetch(`/api/module/blogs/related?blog_id=${this.blogId}`);

        if (!response.ok) {
          throw new Error('Failed to load related blogs');
        }

        const result = await response.json();

        if (result.code === 200 && result.data && result.data.length > 0) {
          this.renderRelatedBlogs(result.data, container);
        } else {
          // 如果没有相关博客，隐藏整个相关博客区域
          const relatedSection = this.container.querySelector('.bd-related');
          if (relatedSection) {
            relatedSection.style.display = 'none';
          }
        }
      } catch (error) {
        console.error('Error loading related blogs:', error);
        // 错误时也隐藏相关博客区域
        const relatedSection = this.container.querySelector('.bd-related');
        if (relatedSection) {
          relatedSection.style.display = 'none';
        }
      }
    }

    renderRelatedBlogs(blogs, container) {
      const html = blogs.map(blog => this.generateBlogCard(blog)).join('');
      container.innerHTML = html;

      // 添加点击事件
      const cards = container.querySelectorAll('.bd-related-item');
      cards.forEach((card, index) => {
        card.addEventListener('click', () => {
          const blog = blogs[index];
          if (blog.path) {
            window.location.href = blog.path;
          }
        });
      });
    }

    generateBlogCard(blog) {
      const date = this.formatDate(blog.published_at || blog.created_at);

      return `
        <div class="bd-related-item" style="cursor: pointer;">
          <div class="bd-related-image">
            <img src="${blog.primary_image || '/images/placeholder.jpg'}" alt="${blog.name || 'Blog'}" loading="lazy" />
          </div>
          <div class="bd-related-date">${date}</div>
          <h3 class="bd-related-title">${blog.name || 'Untitled'}</h3>
        </div>
      `;
    }

    formatDate(dateString) {
      if (!dateString) return '';

      const date = new Date(dateString);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();

      return `${day} ${month}`;
    }
  }

  // 初始化所有博客详情组件
  function initBlogDetails() {
    const containers = document.querySelectorAll(SELECTORS.container);

    containers.forEach((container) => {
      // 防止重复初始化
      if (container.dataset.bdInitialized === "true") return;

      container.dataset.bdInitialized = "true";
      new BlogDetail(container);
    });
  }

  // DOM 加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBlogDetails);
  } else {
    initBlogDetails();
  }

  // 支持动态内容
  if (typeof MutationObserver !== "undefined") {
    const observer = new MutationObserver((mutations) => {
      let shouldInit = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1) {
              if (
                node.matches &&
                (node.matches(SELECTORS.container) ||
                  node.querySelector(SELECTORS.container))
              ) {
                shouldInit = true;
                break;
              }
            }
          }
        }
        if (shouldInit) break;
      }

      if (shouldInit) {
        initBlogDetails();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
