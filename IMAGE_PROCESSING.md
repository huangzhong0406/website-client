# 图片处理系统

本项目已集成 Next.js Image 组件进行图片优化处理。

## 功能特性

- 自动将 HTML 中的 `<img>` 标签转换为 Next.js Image 组件
- 支持图片懒加载和优先加载
- 自动优化图片格式（WebP、AVIF）
- 错误处理和降级显示
- 支持响应式图片

## 配置

### 环境变量

在 `.env.local` 中配置允许的图片域名：

```env
NEXT_PUBLIC_IMAGE_DOMAINS=cdn.your-domain.com,images.your-domain.com
```

### Next.js 配置

`next.config.mjs` 已配置图片优化：

```javascript
images: {
  domains: imageDomains,
  formats: ["image/avif", "image/webp"],
  minimumCacheTTL: 60 * 60 * 24,
}
```

## 使用方式

### 在 GrapesJS 内容中

直接使用标准的 HTML img 标签：

```html
<img src="/logo.png" alt="Logo" width="200" height="100" loading="eager" />
```

系统会自动转换为优化的 Next.js Image 组件。

### 图片属性支持

- `src`: 图片路径（支持相对路径和绝对路径）
- `alt`: 替代文本
- `width`, `height`: 图片尺寸
- `loading`: 加载方式（`lazy` 或 `eager`）
- `class`: CSS 类名
- `style`: 内联样式

### 资源元数据

在页面数据中可以提供图片元数据：

```javascript
assets: [
  {
    src: "/hero-image.jpg",
    alt: "Hero Image",
    width: 1200,
    height: 600,
    priority: true,
    srcSet: "...",
    sizes: "..."
  }
]
```

## 错误处理

- 图片加载失败时显示占位符
- 无效路径自动处理
- 渲染错误降级显示

## 性能优化

- 首屏图片自动设置为高优先级
- 支持 WebP 和 AVIF 格式
- 图片缓存 24 小时
- 懒加载非关键图片