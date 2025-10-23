'use client';

import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import ImageRenderer from './ImageRenderer';

function parseInlineStyle(styleStr) {
  if (!styleStr) return {};
  
  const styles = {};
  try {
    styleStr.split(';').forEach(rule => {
      const colonIndex = rule.indexOf(':');
      if (colonIndex > 0) {
        const property = rule.slice(0, colonIndex).trim();
        const value = rule.slice(colonIndex + 1).trim();
        if (property && value) {
          const camelCaseProperty = property.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
          styles[camelCaseProperty] = value;
        }
      }
    });
  } catch (error) {
    console.warn('解析内联样式失败:', error);
  }
  
  return styles;
}

export default function ImageProcessor() {
  useEffect(() => {
    const processImages = () => {
      const imagePlaceholders = document.querySelectorAll('[data-next-image="true"]');
      
      imagePlaceholders.forEach((placeholder) => {
        const src = placeholder.getAttribute('data-src');
        const alt = placeholder.getAttribute('data-alt') || '';
        const width = parseInt(placeholder.getAttribute('data-width')) || 800;
        const height = parseInt(placeholder.getAttribute('data-height')) || 600;
        const className = placeholder.getAttribute('data-class') || '';
        const style = placeholder.getAttribute('data-style') || '';
        const loading = placeholder.getAttribute('data-loading') || 'lazy';
        
        if (src && !placeholder.hasAttribute('data-processed')) {
          placeholder.setAttribute('data-processed', 'true');
          
          try {
            const root = createRoot(placeholder);
            root.render(
              <ImageRenderer
                src={src}
                alt={alt}
                width={width}
                height={height}
                className={className}
                style={parseInlineStyle(style)}
                loading={loading}
              />
            );
          } catch (error) {
            console.error('渲染图片组件失败:', error);
            placeholder.innerHTML = '<div style="background: #f3f4f6; padding: 20px; text-align: center; color: #9ca3af;">图片渲染失败</div>';
          }
        }
      });
    };

    // 初始处理
    processImages();
    
    // 监听DOM变化，处理动态添加的图片
    const observer = new MutationObserver(processImages);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return null;
}