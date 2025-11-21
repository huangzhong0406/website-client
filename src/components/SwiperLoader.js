'use client';

/**
 * Swiper 动态加载器组件
 *
 * 功能：
 * 1. 按需加载 Swiper CDN 脚本
 * 2. 首屏 Swiper 预加载，非首屏懒加载
 * 3. CDN 失败降级方案
 * 4. 执行初始化脚本
 *
 * 性能优化：
 * - 使用 requestIdleCallback 延迟非关键操作
 * - 支持多 CDN 降级
 * - 避免重复加载
 */

import { useEffect, useRef } from 'react';

const SWIPER_CDN_SOURCES = [
  'https://cdn.jsdelivr.net/npm/swiper@11.0.5/swiper-bundle.min.js',
  'https://unpkg.com/swiper@11.0.5/swiper-bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Swiper/11.0.5/swiper-bundle.min.js'
];

const SWIPER_CSS_CDN = 'https://cdn.jsdelivr.net/npm/swiper@11.0.5/swiper-bundle.min.css';

/**
 * SwiperLoader 组件
 * @param {Object} props - 组件属性
 * @param {Array} props.scripts - 初始化脚本数组
 * @param {boolean} props.preloadSwiper - 是否预加载 Swiper (首屏)
 * @param {Function} props.onLoad - 加载完成回调
 */
export default function SwiperLoader({ scripts = [], preloadSwiper = false, onLoad }) {
  const loadedRef = useRef(false);
  const scriptsExecutedRef = useRef(false);

  useEffect(() => {
    // 防止重复加载
    if (loadedRef.current) return;

    // 检查是否已经加载过 Swiper
    if (typeof window !== 'undefined' && window.Swiper) {
      // console.log('✅ Swiper already loaded');
      executeScripts();
      return;
    }

    // 根据优先级决定加载时机
    if (preloadSwiper) {
      // 首屏：立即加载
      loadSwiperLibrary();
    } else {
      // 非首屏：延迟加载
      scheduleIdleLoad();
    }

    loadedRef.current = true;
  }, [preloadSwiper]);

  /**
   * 使用 requestIdleCallback 延迟加载
   */
  const scheduleIdleLoad = () => {
    if (typeof window === 'undefined') return;

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(
        () => {
          loadSwiperLibrary();
        },
        { timeout: 2000 } // 最多延迟 2 秒
      );
    } else {
      // 降级方案：使用 setTimeout
      setTimeout(() => {
        loadSwiperLibrary();
      }, 100);
    }
  };

  /**
   * 加载 Swiper 库 (JS + CSS)
   */
  const loadSwiperLibrary = async () => {
    try {
      // 并行加载 CSS 和 JS
      await Promise.all([loadSwiperCSS(), loadSwiperJS()]);

      // console.log('✅ Swiper library loaded successfully');

      // 执行初始化脚本
      executeScripts();

      // 触发回调
      if (onLoad) {
        onLoad();
      }
    } catch (error) {
      console.error('❌ Failed to load Swiper library:', error);
    }
  };

  /**
   * 加载 Swiper CSS
   */
  const loadSwiperCSS = () => {
    return new Promise((resolve, reject) => {
      // 检查是否已加载
      if (document.querySelector(`link[href*="swiper"]`)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = SWIPER_CSS_CDN;
      link.onload = () => resolve();
      link.onerror = () => {
        console.warn('Failed to load Swiper CSS from CDN');
        // CSS 加载失败不阻塞，使用降级样式
        resolve();
      };

      document.head.appendChild(link);
    });
  };

  /**
   * 加载 Swiper JS (支持多 CDN 降级)
   */
  const loadSwiperJS = async () => {
    // 检查是否已加载
    if (typeof window !== 'undefined' && window.Swiper) {
      return Promise.resolve();
    }

    // 尝试从多个 CDN 加载
    for (const cdnUrl of SWIPER_CDN_SOURCES) {
      try {
        await loadScript(cdnUrl);
        // console.log(`✅ Swiper JS loaded from: ${cdnUrl}`);
        return;
      } catch (error) {
        // console.warn(`⚠️ Failed to load Swiper from ${cdnUrl}, trying next...`);
      }
    }

    throw new Error('All Swiper CDN sources failed');
  };

  /**
   * 动态加载单个脚本
   * @param {string} src - 脚本 URL
   */
  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      // 检查是否已存在
      if (document.querySelector(`script[src="${src}"]`)) {
        // 如果脚本已存在但 Swiper 未定义，等待一下
        if (typeof window.Swiper === 'undefined') {
          setTimeout(() => {
            if (typeof window.Swiper !== 'undefined') {
              resolve();
            } else {
              reject(new Error('Script loaded but Swiper not defined'));
            }
          }, 100);
        } else {
          resolve();
        }
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // 验证 Swiper 是否成功加载
        if (typeof window.Swiper !== 'undefined') {
          resolve();
        } else {
          reject(new Error('Swiper not defined after script load'));
        }
      };

      script.onerror = () => {
        // 清理失败的脚本标签
        script.remove();
        reject(new Error(`Failed to load script: ${src}`));
      };

      document.head.appendChild(script);
    });
  };

  /**
   * 执行初始化脚本
   */
  const executeScripts = () => {
    if (scriptsExecutedRef.current) return;
    if (!scripts || scripts.length === 0) return;

    // 确保 Swiper 已加载
    if (typeof window === 'undefined' || typeof window.Swiper === 'undefined') {
      console.warn('Cannot execute scripts: Swiper not loaded');
      return;
    }

    // console.log(`🚀 Executing ${scripts.length} Swiper init script(s)...`);

    // 按优先级排序：首屏优先
    const sortedScripts = [...scripts].sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return a.index - b.index;
    });

    // 执行脚本
    sortedScripts.forEach((script, idx) => {
      try {
        // 使用 Function 构造函数执行脚本 (比 eval 更安全)
        const fn = new Function(script.content);
        fn();
        // console.log(`✅ Script ${idx + 1}/${scripts.length} executed`);
      } catch (error) {
        console.error(`❌ Failed to execute script ${idx + 1}:`, error);
      }
    });

    scriptsExecutedRef.current = true;
  };

  // 此组件不渲染任何内容
  return null;
}

/**
 * 预加载 Swiper CDN (用于 <head> 标签)
 * @returns {JSX.Element} 预连接标签
 */
export function SwiperPreconnect() {
  return (
    <>
      <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
    </>
  );
}

/**
 * 预加载 Swiper CSS (用于首屏优化)
 * @returns {JSX.Element} 预加载标签
 */
export function SwiperCSSPreload() {
  return (
    <link
      rel="preload"
      href={SWIPER_CSS_CDN}
      as="style"
      onLoad={(e) => {
        e.target.rel = 'stylesheet';
      }}
    />
  );
}
