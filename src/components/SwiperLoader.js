"use client";

import {useEffect, useRef} from "react";

/**
 * SwiperLoader 客户端组件
 *
 * 功能：
 * 1. 动态加载 Swiper 库（仅在需要时加载）
 * 2. 执行从服务端提取的 Swiper 初始化脚本
 * 3. 支持多个 Swiper 实例，每个可以有不同的配置
 *
 * Props:
 * @param {Array} scripts - 从服务端提取的 Swiper 初始化脚本数组
 * @param {boolean} preloadSwiper - 是否预加载 Swiper 资源（用于首屏优化）
 */
export default function SwiperLoader({scripts = [], preloadSwiper = false}) {
  const executedRef = useRef(false);
  const swiperLoadedRef = useRef(false);

  useEffect(() => {
    // 防止重复执行
    if (executedRef.current || scripts.length === 0) {
      return;
    }

    executedRef.current = true;

    /**
     * 动态加载 Swiper CSS
     */
    const loadSwiperCss = () => {
      if (document.querySelector('link[href*="swiper-bundle.min.css"]')) {
        return Promise.resolve();
      }

      return new Promise((resolve, reject) => {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css";
        link.onload = () => resolve();
        link.onerror = () => reject(new Error("Failed to load Swiper CSS"));
        document.head.appendChild(link);
      });
    };

    /**
     * 动态加载 Swiper JS
     */
    const loadSwiperJs = () => {
      // 如果已经加载过，直接返回
      if (window.Swiper || swiperLoadedRef.current) {
        return Promise.resolve();
      }

      if (document.querySelector('script[src*="swiper-bundle.min.js"]')) {
        return new Promise((resolve) => {
          const checkSwiper = setInterval(() => {
            if (window.Swiper) {
              clearInterval(checkSwiper);
              swiperLoadedRef.current = true;
              resolve();
            }
          }, 50);

          // 10秒超时
          setTimeout(() => {
            clearInterval(checkSwiper);
            if (!window.Swiper) {
              console.error("Swiper loading timeout");
            }
            resolve();
          }, 10000);
        });
      }

      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js";
        script.async = !preloadSwiper; // 首屏 Swiper 不使用 async
        script.onload = () => {
          swiperLoadedRef.current = true;
          resolve();
        };
        script.onerror = () => reject(new Error("Failed to load Swiper JS"));
        document.head.appendChild(script);
      });
    };

    /**
     * 执行所有 Swiper 初始化脚本
     */
    const executeScripts = async () => {
      try {
        // 先加载 CSS（并行）
        await loadSwiperCss();

        // 再加载 JS
        await loadSwiperJs();

        // 等待 DOM 完全准备好
        await new Promise((resolve) => {
          if (document.readyState === "complete") {
            resolve();
          } else {
            window.addEventListener("load", resolve, {once: true});
          }
        });

        // 执行所有脚本（支持多个 Swiper 实例）
        scripts.forEach((scriptObj, index) => {
          try {
            // 创建一个函数作用域来执行脚本
            // 使用 new Function 而不是 eval，更安全
            const scriptFunction = new Function(scriptObj.content);
            scriptFunction.call(document);

            console.log(`✅ Swiper script ${index + 1}/${scripts.length} executed successfully`);
          } catch (error) {
            console.error(`❌ Error executing Swiper script ${index + 1}:`, error);
          }
        });

        console.log(`🎉 Total ${scripts.length} Swiper instance(s) initialized`);
      } catch (error) {
        console.error("❌ Error loading Swiper:", error);
      }
    };

    // 根据是否是首屏 Swiper 决定执行时机
    if (preloadSwiper) {
      // 首屏 Swiper - 立即执行
      console.log("🚀 Loading Swiper (high priority)...");
      executeScripts();
    } else {
      // 非首屏 Swiper - 在浏览器空闲时执行
      console.log("⏳ Scheduling Swiper loading (low priority)...");
      if ("requestIdleCallback" in window) {
        requestIdleCallback(() => executeScripts(), {timeout: 2000});
      } else {
        setTimeout(executeScripts, 100);
      }
    }
  }, [scripts, preloadSwiper]);

  // 这个组件不渲染任何内容
  return null;
}
