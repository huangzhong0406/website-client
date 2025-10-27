'use client';

import { useEffect } from 'react';

export default function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.performance) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('页面加载时间:', {
            DNS: entry.domainLookupEnd - entry.domainLookupStart,
            TCP: entry.connectEnd - entry.connectStart,
            请求: entry.responseStart - entry.requestStart,
            响应: entry.responseEnd - entry.responseStart,
            DOM解析: entry.domContentLoadedEventEnd - entry.responseEnd,
            总时间: entry.loadEventEnd - entry.navigationStart
          });
        }
        
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime + 'ms');
        }
        
        if (entry.entryType === 'first-input') {
          console.log('FID:', entry.processingStart - entry.startTime + 'ms');
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'largest-contentful-paint', 'first-input'] });

    return () => observer.disconnect();
  }, []);

  return null;
}