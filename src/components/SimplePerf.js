'use client';

import { useEffect } from 'react';

export default function SimplePerf() {
  useEffect(() => {
    // 仅在开发环境下记录性能指标
    if (process.env.NODE_ENV !== 'development') return;

    const start = performance.now();

    const checkLoad = () => {
      const end = performance.now();
      console.log(`页面渲染时间: ${Math.round(end - start)}ms`);

      // 检查 LCP
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          console.log(`LCP: ${Math.round(lastEntry.startTime)}ms`);
          observer.disconnect();
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      }
    };

    if (document.readyState === 'complete') {
      checkLoad();
    } else {
      window.addEventListener('load', checkLoad);
      return () => window.removeEventListener('load', checkLoad);
    }
  }, []);

  return null;
}