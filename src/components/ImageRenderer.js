'use client';

import Image from 'next/image';
import { useState } from 'react';

export default function ImageRenderer({ src, alt = '', width, height, className, style, loading = 'lazy', ...props }) {
  const [imgError, setImgError] = useState(false);
  
  const processedSrc = src?.startsWith('/') ? src : src?.startsWith('http') ? src : `/${src}`;
  
  if (imgError || !processedSrc) {
    return (
      <div 
        className={className}
        style={{ 
          ...style, 
          backgroundColor: '#f3f4f6', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: height || 200,
          width: width || 'auto'
        }}
      >
        <span style={{ color: '#9ca3af', fontSize: '14px' }}>图片加载失败</span>
      </div>
    );
  }

  return (
    <Image
      src={processedSrc}
      alt={alt}
      width={Number(width) || 800}
      height={Number(height) || 600}
      className={className}
      style={style}
      priority={loading === 'eager'}
      onError={() => setImgError(true)}
      {...props}
    />
  );
}