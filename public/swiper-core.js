/**
 * Swiper 核心运行时脚本
 *
 * 用途：
 * - 提供统一的 Swiper 初始化逻辑
 * - 支持编辑器和渲染端共享
 * - 自动检测和初始化页面中的所有 Swiper
 *
 * 使用方式：
 * 1. 确保页面已加载 Swiper 库
 * 2. 在 HTML 中包含此脚本
 * 3. 脚本会自动查找并初始化所有 .gjs-swiper-root 元素
 */

(function() {
  'use strict';

  // 配置常量
  const CONFIG = {
    ROOT_CLASS: 'gjs-swiper-root',
    CONTAINER_CLASS: 'swiper',
    WRAPPER_CLASS: 'swiper-wrapper',
    SLIDE_CLASS: 'swiper-slide',
    PAGINATION_CLASS: 'swiper-pagination',
    BUTTON_NEXT_CLASS: 'swiper-button-next',
    BUTTON_PREV_CLASS: 'swiper-button-prev',

    // 默认配置
    DEFAULTS: {
      loop: true,
      autoplay: true,
      delay: 2500,
      effect: 'slide',
      speed: 300,
      slidesPerView: 1,
      spaceBetween: 0,
      centeredSlides: false
    }
  };

  /**
   * 从根元素读取配置
   * @param {HTMLElement} rootEl - Swiper 根元素
   * @returns {Object} 配置对象
   */
  function readConfig(rootEl) {
    return {
      loop: rootEl.getAttribute('data-loop') === 'true',
      autoplay: rootEl.getAttribute('data-autoplay') === 'true',
      delay: parseInt(rootEl.getAttribute('data-delay')) || CONFIG.DEFAULTS.delay,
      effect: rootEl.getAttribute('data-effect') || CONFIG.DEFAULTS.effect,
      speed: parseInt(rootEl.getAttribute('data-speed')) || CONFIG.DEFAULTS.speed,
      slidesPerView: parseFloat(rootEl.getAttribute('data-slides-per-view')) || CONFIG.DEFAULTS.slidesPerView,
      spaceBetween: parseInt(rootEl.getAttribute('data-space-between')) || CONFIG.DEFAULTS.spaceBetween,
      centeredSlides: rootEl.getAttribute('data-centered-slides') === 'true'
    };
  }

  /**
   * 初始化单个 Swiper 实例
   * @param {HTMLElement} rootEl - Swiper 根元素
   * @param {number} index - 索引
   */
  function initSingleSwiper(rootEl, index) {
    const swiperContainer = rootEl.querySelector('.' + CONFIG.CONTAINER_CLASS);

    if (!swiperContainer) {
      console.warn('Swiper container not found in root element', index);
      return;
    }

    // 防止重复初始化
    if (swiperContainer.__swiper_initialized || swiperContainer.__gjs_swiper_inited) {
      return;
    }

    // 检查 Swiper 库是否加载
    if (typeof Swiper === 'undefined') {
      console.error('Swiper library is not loaded');
      return;
    }

    try {
      // 读取配置
      const config = readConfig(rootEl);

      // 查找分页器和导航按钮（仅在当前 swiper 容器内查找）
      const pagination = swiperContainer.querySelector('.' + CONFIG.PAGINATION_CLASS);
      const nextBtn = swiperContainer.querySelector('.' + CONFIG.BUTTON_NEXT_CLASS);
      const prevBtn = swiperContainer.querySelector('.' + CONFIG.BUTTON_PREV_CLASS);

      // 构建 Swiper 配置对象
      const swiperOptions = {
        loop: config.loop,
        effect: config.effect,
        speed: config.speed,
        slidesPerView: config.slidesPerView,
        spaceBetween: config.spaceBetween,
        centeredSlides: config.centeredSlides
      };

      // 添加自动播放
      if (config.autoplay) {
        swiperOptions.autoplay = {
          delay: config.delay,
          disableOnInteraction: false
        };
      }

      // 添加分页器
      if (pagination) {
        swiperOptions.pagination = {
          el: pagination,
          clickable: true,
          dynamicBullets: false
        };
      }

      // 添加导航按钮
      if (nextBtn && prevBtn) {
        swiperOptions.navigation = {
          nextEl: nextBtn,
          prevEl: prevBtn
        };
      }

      // 检测是否嵌套 Swiper
      const parentSwiper = swiperContainer.parentElement.closest('.' + CONFIG.CONTAINER_CLASS);
      if (parentSwiper) {
        swiperOptions.nested = true;
      }

      // 初始化 Swiper
      const swiperInstance = new Swiper(swiperContainer, swiperOptions);

      // 标记已初始化
      swiperContainer.__swiper_initialized = true;
      swiperContainer.__swiper_instance = swiperInstance;
      swiperContainer.__gjs_swiper_inited = true; // 兼容编辑器端
      swiperContainer.__gjs_swiper_instance = swiperInstance; // 兼容编辑器端

      console.log('✅ Swiper initialized:', index, config);

    } catch (error) {
      console.error('❌ Failed to initialize Swiper:', index, error);
    }
  }

  /**
   * 初始化所有 Swiper
   */
  function initAllSwipers() {
    // 查找所有 Swiper 根元素
    const swiperRoots = document.querySelectorAll('.' + CONFIG.ROOT_CLASS);

    if (swiperRoots.length === 0) {
      return;
    }

    console.log(`🎠 Found ${swiperRoots.length} Swiper(s), initializing...`);

    // 初始化每个 Swiper
    swiperRoots.forEach((root, index) => {
      initSingleSwiper(root, index);
    });
  }

  /**
   * 销毁所有 Swiper 实例（用于清理）
   */
  function destroyAllSwipers() {
    const swiperContainers = document.querySelectorAll('.' + CONFIG.CONTAINER_CLASS);

    swiperContainers.forEach(container => {
      if (container.__swiper_instance) {
        container.__swiper_instance.destroy(true, true);
        delete container.__swiper_instance;
        delete container.__swiper_initialized;
      }
      if (container.__gjs_swiper_instance) {
        delete container.__gjs_swiper_instance;
        delete container.__gjs_swiper_inited;
      }
    });
  }

  /**
   * 重新初始化所有 Swiper（用于动态内容更新）
   */
  function reinitAllSwipers() {
    destroyAllSwipers();
    initAllSwipers();
  }

  // 等待 DOM 和 Swiper 库都加载完成
  function waitForSwiperAndInit() {
    if (typeof Swiper !== 'undefined') {
      // Swiper 已加载，立即初始化
      initAllSwipers();
    } else {
      // Swiper 未加载，等待
      console.log('⏳ Waiting for Swiper library...');

      // 使用 MutationObserver 监听 script 标签加载
      const checkInterval = setInterval(() => {
        if (typeof Swiper !== 'undefined') {
          clearInterval(checkInterval);
          console.log('✅ Swiper library loaded');
          initAllSwipers();
        }
      }, 100);

      // 超时保护（10 秒）
      setTimeout(() => {
        clearInterval(checkInterval);
        if (typeof Swiper === 'undefined') {
          console.error('❌ Swiper library failed to load within timeout');
        }
      }, 10000);
    }
  }

  // 根据 DOM 状态决定初始化时机
  if (document.readyState === 'loading') {
    // DOM 还在加载，等待 DOMContentLoaded
    document.addEventListener('DOMContentLoaded', waitForSwiperAndInit);
  } else {
    // DOM 已加载，立即初始化
    waitForSwiperAndInit();
  }

  // 暴露全局 API（用于调试和手动控制）
  window.SwiperCore = {
    init: initAllSwipers,
    reinit: reinitAllSwipers,
    destroy: destroyAllSwipers,
    initSingle: initSingleSwiper
  };

})();
