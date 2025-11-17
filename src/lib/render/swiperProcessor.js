/**
 * Swiper 轮播图处理器
 *
 * 功能：
 * 1. 检测页面中的 Swiper 组件
 * 2. 读取配置属性 (data-*)
 * 3. 判断是否首屏轮播 (影响 LCP)
 * 4. 生成优化的初始化脚本
 * 5. 返回处理结果供渲染流程使用
 */

import * as cheerio from 'cheerio';

// Swiper 配置常量
const SWIPER_CONFIG = {
  VERSION: '11.0.5',
  CDN_SOURCES: [
    'https://cdn.jsdelivr.net/npm/swiper@11.0.5/swiper-bundle.min.js',
    'https://unpkg.com/swiper@11.0.5/swiper-bundle.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Swiper/11.0.5/swiper-bundle.min.js'
  ],
  CSS_CDN: 'https://cdn.jsdelivr.net/npm/swiper@11.0.5/swiper-bundle.min.css',

  // 类名
  CLASS_NAMES: {
    root: 'gjs-swiper-root',
    container: 'swiper',
    wrapper: 'swiper-wrapper',
    slide: 'swiper-slide',
    pagination: 'swiper-pagination',
    buttonPrev: 'swiper-button-prev',
    buttonNext: 'swiper-button-next'
  },

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
  },

  // 首屏判定阈值 (像素)
  ABOVE_FOLD_THRESHOLD: 800
};

/**
 * 处理页面中的 Swiper 组件
 * @param {string} html - HTML 内容
 * @returns {Object} 处理结果
 */
export function processSwipers(html) {
  const $ = cheerio.load(html);
  const swiperRoots = $(`.${SWIPER_CONFIG.CLASS_NAMES.root}`);

  if (swiperRoots.length === 0) {
    return {
      html: $.html(),
      hasSwipers: false,
      swiperScripts: [],
      firstSwiperConfig: null,
      swiperCount: 0
    };
  }

  const swiperConfigs = [];
  let firstSwiperIsAboveFold = false;

  // 遍历所有 Swiper 根元素
  swiperRoots.each((index, rootEl) => {
    const $root = $(rootEl);
    const $swiperContainer = $root.find(`.${SWIPER_CONFIG.CLASS_NAMES.container}`).first();

    if ($swiperContainer.length === 0) {
      console.warn(`Swiper root ${index} 缺少 .swiper 容器`);
      return;
    }

    // 读取配置属性
    const config = readSwiperConfig($root);

    // 判断是否首屏 (简单判断：第一个 Swiper 视为首屏)
    const isAboveFold = index === 0;
    if (index === 0) {
      firstSwiperIsAboveFold = true;
    }

    // 优化首屏图片
    if (isAboveFold) {
      optimizeFirstSlide($, $swiperContainer);
    } else {
      // 非首屏图片懒加载
      lazyLoadSlides($, $swiperContainer);
    }

    // 设置容器固定高度 (防止 CLS)
    ensureFixedHeight($root, $swiperContainer, config);

    // 添加数据标识
    $swiperContainer.attr('data-swiper-index', index);
    $swiperContainer.attr('data-swiper-priority', isAboveFold ? 'high' : 'low');

    swiperConfigs.push({
      index,
      config,
      isAboveFold,
      selector: `.swiper[data-swiper-index="${index}"]`
    });
  });

  // 生成初始化脚本
  const swiperScripts = generateInitScripts(swiperConfigs);

  return {
    html: $.html(),
    hasSwipers: true,
    swiperScripts,
    firstSwiperConfig: swiperConfigs[0] || null,
    swiperCount: swiperConfigs.length,
    hasAboveFoldSwiper: firstSwiperIsAboveFold
  };
}

/**
 * 从元素读取 Swiper 配置
 * @param {CheerioElement} $root - Swiper 根元素
 * @returns {Object} 配置对象
 */
function readSwiperConfig($root) {
  return {
    loop: $root.attr('data-loop') === 'true',
    autoplay: $root.attr('data-autoplay') === 'true',
    delay: parseInt($root.attr('data-delay')) || SWIPER_CONFIG.DEFAULTS.delay,
    effect: $root.attr('data-effect') || SWIPER_CONFIG.DEFAULTS.effect,
    speed: parseInt($root.attr('data-speed')) || SWIPER_CONFIG.DEFAULTS.speed,
    slidesPerView: parseFloat($root.attr('data-slides-per-view')) || SWIPER_CONFIG.DEFAULTS.slidesPerView,
    spaceBetween: parseInt($root.attr('data-space-between')) || SWIPER_CONFIG.DEFAULTS.spaceBetween,
    centeredSlides: $root.attr('data-centered-slides') === 'true',
    priority: $root.attr('data-priority') || 'normal'
  };
}

/**
 * 优化首屏首张幻灯片的图片加载
 * @param {Cheerio} $ - Cheerio 实例
 * @param {CheerioElement} $container - Swiper 容器
 */
function optimizeFirstSlide($, $container) {
  const $firstSlide = $container.find(`.${SWIPER_CONFIG.CLASS_NAMES.slide}`).first();

  if ($firstSlide.length === 0) return;

  // 找到第一张图片
  const $firstImage = $firstSlide.find('img').first();

  if ($firstImage.length > 0) {
    // 设置高优先级加载
    $firstImage.attr('loading', 'eager');
    $firstImage.attr('fetchpriority', 'high');

    // 移除懒加载类
    $firstImage.removeClass('swiper-lazy');

    // 如果是背景图，也要优化
    const bgImage = $firstSlide.css('background-image');
    if (bgImage && bgImage !== 'none') {
      // 添加预加载提示标记
      $firstSlide.attr('data-preload-bg', 'true');
    }
  }
}

/**
 * 为非首屏幻灯片启用懒加载
 * @param {Cheerio} $ - Cheerio 实例
 * @param {CheerioElement} $container - Swiper 容器
 */
function lazyLoadSlides($, $container) {
  const $slides = $container.find(`.${SWIPER_CONFIG.CLASS_NAMES.slide}`);

  $slides.each((index, slide) => {
    const $slide = $(slide);
    const $images = $slide.find('img');

    $images.each((_, img) => {
      const $img = $(img);

      // 跳过已经优化的图片
      if ($img.attr('loading') === 'eager') return;

      // 设置懒加载
      $img.attr('loading', 'lazy');

      // 如果没有设置 fetchpriority，设置为 low
      if (!$img.attr('fetchpriority')) {
        $img.attr('fetchpriority', 'low');
      }
    });
  });
}

/**
 * 确保容器有固定高度 (防止 CLS)
 * @param {CheerioElement} $root - Swiper 根元素
 * @param {CheerioElement} $container - Swiper 容器
 * @param {Object} config - 配置对象
 */
function ensureFixedHeight($root, $container, config) {
  // 检查是否已有高度设置
  const rootStyle = $root.attr('style') || '';
  const containerStyle = $container.attr('style') || '';

  const hasHeight = rootStyle.includes('height') || containerStyle.includes('height');

  if (!hasHeight) {
    // 使用默认高度 70vh
    const defaultHeight = '70vh';

    // 设置容器高度
    if (containerStyle) {
      $container.attr('style', `${containerStyle}; height: ${defaultHeight};`);
    } else {
      $container.attr('style', `height: ${defaultHeight};`);
    }

    // 也设置根元素高度
    if (rootStyle) {
      $root.attr('style', `${rootStyle}; height: ${defaultHeight};`);
    } else {
      $root.attr('style', `height: ${defaultHeight};`);
    }
  }
}

/**
 * 生成 Swiper 初始化脚本
 * @param {Array} swiperConfigs - Swiper 配置数组
 * @returns {Array} 脚本数组
 */
function generateInitScripts(swiperConfigs) {
  const scripts = [];

  // 为每个 Swiper 生成初始化代码
  swiperConfigs.forEach(({ index, config, isAboveFold, selector }) => {
    const scriptContent = generateSingleSwiperScript(selector, config, isAboveFold);

    scripts.push({
      index,
      content: scriptContent,
      isAboveFold,
      priority: isAboveFold ? 'high' : 'low'
    });
  });

  return scripts;
}

/**
 * 生成单个 Swiper 的初始化脚本
 * @param {string} selector - 选择器
 * @param {Object} config - 配置对象
 * @param {boolean} isAboveFold - 是否首屏
 * @returns {string} 脚本内容
 */
function generateSingleSwiperScript(selector, config, isAboveFold) {
  // 构建 Swiper 选项对象
  const options = {
    loop: config.loop,
    effect: config.effect,
    speed: config.speed,
    slidesPerView: config.slidesPerView,
    spaceBetween: config.spaceBetween,
    centeredSlides: config.centeredSlides,
    ...(config.autoplay && {
      autoplay: {
        delay: config.delay,
        disableOnInteraction: false
      }
    })
  };

  // 生成初始化函数
  return `
(function() {
  function initSwiper${isAboveFold ? 'Immediate' : 'Lazy'}() {
    const swiperEl = document.querySelector('${selector}');
    if (!swiperEl || swiperEl.__swiper_initialized) return;

    // 检查 Swiper 是否已加载
    if (typeof Swiper === 'undefined') {
      console.warn('Swiper library not loaded yet');
      return;
    }

    // 查找分页器和导航按钮
    const pagination = swiperEl.querySelector('.${SWIPER_CONFIG.CLASS_NAMES.pagination}');
    const nextBtn = swiperEl.querySelector('.${SWIPER_CONFIG.CLASS_NAMES.buttonNext}');
    const prevBtn = swiperEl.querySelector('.${SWIPER_CONFIG.CLASS_NAMES.buttonPrev}');

    // 构建配置
    const config = ${JSON.stringify(options, null, 2)};

    // 添加分页器
    if (pagination) {
      config.pagination = {
        el: pagination,
        clickable: true
      };
    }

    // 添加导航按钮
    if (nextBtn && prevBtn) {
      config.navigation = {
        nextEl: nextBtn,
        prevEl: prevBtn
      };
    }

    // 检测嵌套 Swiper
    const isNested = !!swiperEl.parentElement.closest('.${SWIPER_CONFIG.CLASS_NAMES.container}');
    if (isNested) {
      config.nested = true;
    }

    try {
      // 初始化 Swiper
      const swiperInstance = new Swiper(swiperEl, config);
      swiperEl.__swiper_initialized = true;
      swiperEl.__swiper_instance = swiperInstance;
      console.log('✅ Swiper initialized:', '${selector}');
    } catch (error) {
      console.error('❌ Swiper initialization failed:', error);
    }
  }

  ${isAboveFold
    ? `// 首屏立即初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSwiperImmediate);
  } else {
    initSwiperImmediate();
  }`
    : `// 非首屏懒加载 (Intersection Observer)
  if ('IntersectionObserver' in window) {
    const swiperEl = document.querySelector('${selector}');
    if (swiperEl) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            initSwiperLazy();
            observer.disconnect();
          }
        });
      }, {
        rootMargin: '200px' // 提前 200px 加载
      });
      observer.observe(swiperEl);
    }
  } else {
    // 降级方案：直接初始化
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initSwiperLazy);
    } else {
      initSwiperLazy();
    }
  }`
  }
})();
`.trim();
}

/**
 * 获取 Swiper CDN 链接
 * @returns {Object} CDN 链接对象
 */
export function getSwiperCDNLinks() {
  return {
    js: SWIPER_CONFIG.CDN_SOURCES[0], // 主 CDN
    jsFallbacks: SWIPER_CONFIG.CDN_SOURCES.slice(1), // 备用 CDN
    css: SWIPER_CONFIG.CSS_CDN,
    version: SWIPER_CONFIG.VERSION
  };
}

/**
 * 生成 Swiper 预连接标签 (性能优化)
 * @returns {string} HTML 标签
 */
export function generateSwiperPreconnect() {
  return `
<link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  `.trim();
}
