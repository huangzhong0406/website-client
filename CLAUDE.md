# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 15 的高性能网站渲染端，负责将 GrapesJS 编辑器生成的页面数据渲染成优化的静态页面。核心特点：

- **ISR 架构**: 使用增量静态再生（默认 3600 秒缓存）实现接近静态站点的性能
- **多租户系统**: 基于 Cloudflare KV 的域名到租户 ID 映射
- **边缘部署**: 优先部署到 Cloudflare Workers，备选 Vercel
- **性能优化**: 关键 CSS 内联、图片预加载、Swiper 懒加载等多项优化

## 技术栈

- **核心框架**: React 18, Next.js 15 (App Router)
- **HTML 处理**: Cheerio 1.0.0 (服务端 DOM 操作)
- **部署平台**: Cloudflare Workers (@opennextjs/cloudflare)
- **服务端包**: cheerio (配置为 serverExternalPackages)

## 常用命令

### 开发与构建

```bash
# 启动开发服务器（端口 3000）
npm run dev

# 生产构建
npm run build

# 检查构建是否成功
npm run check

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

### Cloudflare Workers 部署

```bash
# 生成 Cloudflare 类型定义
npm run cf-typegen

# 构建并部署到 Cloudflare Workers
npm run deploy

# 本地预览 Cloudflare 构建
npm run preview
```

## 核心架构

### 1. 请求流程

```
用户请求 → Cloudflare Workers/Edge
    ↓
域名解析（通过 KV 获取租户 ID）
    ↓
catch-all 路由 [[...slug]]/page.js
    ↓
获取页面数据（从 Laravel API）
    ↓
服务端渲染（Cheerio 处理 HTML）
    ↓
返回优化后的 HTML（ISR 缓存）
```

### 2. 多租户解析

文件: [src/lib/tenant.js](src/lib/tenant.js)

- **生产环境**: 使用 Cloudflare KV（命名空间 `TENANTS`）
- **开发环境**: 使用硬编码的测试租户 ID 或环境变量
- **KV Key 格式**: `host:example.com` → 租户 ID

关键函数:
- `getTenantContext()`: 缓存的租户解析（从请求头获取 Host）
- `resolveTenantForHost(hostname)`: 核心解析逻辑

### 3. 页面渲染引擎

文件: [src/lib/grapesjs/render.js](src/lib/grapesjs/render.js)

核心函数 `prepareGrapesContent()` 执行以下操作：

1. **HTML 解析**: 使用 Cheerio 加载和操作 HTML
2. **CSS 分离**:
   - 关键 CSS（前 4000-8000 字符）→ 内联
   - 其余 CSS → 延迟加载
3. **动态内容注入**:
   - 全局组件（导航、页脚）
   - 产品列表数据
   - 导航菜单数据
4. **性能优化**:
   - 首屏图片预加载（LCP 优化）
   - Swiper 脚本延迟加载
   - 图片属性优化（loading、fetchpriority、decoding）

### 4. 动态路由系统

文件: [src/app/[[...slug]]/page.js](src/app/[[...slug]]/page.js)

- **Catch-all 路由**: 处理所有页面路径
- **ISR 配置**: `export const revalidate = 3600`（1 小时）
- **缓存策略**: 使用 React `cache()` 避免同一请求周期内重复获取数据

关键导出:
- `generateMetadata()`: 动态生成 SEO 元数据
- `default RenderedPage()`: 主渲染函数

### 5. 全局组件注入

文件: [src/services/globalComponents.js](src/services/globalComponents.js)

自动检测并注入全局组件：
- **Global-Header**: 新的导航系统（支持菜单编辑器）
- **Tailwind-Footer**: 页脚组件

注入逻辑在 `render.js` 的 `injectGlobalComponents()` 函数中。

### 6. 共享运行时文件

位置: [public/](public/)

这些文件与编辑器端（singoo-site-studio）共享：

- `scripts/global-header-core.js`: 导航交互逻辑
- `styles/global-header-*.css`: 导航样式（core, classic, minimal）
- `product-list-page-core.js/css`: 产品列表页运行时

这些文件在 [src/app/layout.js](src/app/layout.js) 中全局引入。

### 7. API 通信

文件: [src/services/http.js](src/services/http.js)

核心函数:
- `apiFetch(url, slug, options)`: 封装的 fetch 函数
  - 自动添加租户标识头（X-Tenant-Id, X-Tenant-Host）
  - Cloudflare Cache API 集成
  - 默认 8 秒超时
  - 多租户隔离的缓存键

环境变量:
- `NEXT_PUBLIC_API_BASE`: API 基础 URL（必需）
- `API_TOKEN`: API 鉴权令牌

## 关键优化策略

### CSS 分离逻辑

文件: [src/lib/grapesjs/render.js:485](src/lib/grapesjs/render.js#L485-L521)

```javascript
// 关键 CSS 优先级规则
const criticalPatterns = [
  /^\s*body\b/,           // body 样式
  /^\s*html\b/,           // html 样式
  /\b(font|color)\s*:/,   // 字体和颜色
  /\.(hero|banner)\b/,    // 首屏元素
];
```

控制变量: `CRITICAL_CSS_LIMIT` 环境变量（默认 4000）

### Swiper 优化

文件: [src/lib/grapesjs/render.js:654](src/lib/grapesjs/render.js#L654-L724)

判断首屏 Swiper 的策略（按优先级）：
1. 手动标记: `data-priority="high"`
2. 类名检测: hero, banner, main, top
3. 位置检测: body 中的前 3 个元素
4. 高度估算: 垂直位置 < 800px

首屏 Swiper 的第一张图片会被标记为 `fetchpriority="high"` 并添加到预加载资源。

### 图片优化

文件: [src/lib/grapesjs/render.js:394](src/lib/grapesjs/render.js#L394-L447)

自动增强:
- 首屏图片: `loading="eager"`, `fetchpriority="high"`
- 非首屏图片: `loading="lazy"`
- 所有图片: `decoding="async"`
- 支持 responsive images（srcset, sizes）

## 环境变量

### 必需
- `NEXT_PUBLIC_API_BASE`: Laravel API 地址（例如: https://api.singoo.ai）

### 可选
- `API_TOKEN`: API 鉴权令牌（默认: "API_TOKEN"）
- `NEXT_PUBLIC_PAGE_REVALIDATE`: ISR 缓存时间（默认: 3600 秒）
- `CRITICAL_CSS_LIMIT`: 关键 CSS 字符限制（默认: 4000）
- `NEXT_PUBLIC_CDN_ORIGIN`: CDN 域名（用于预连接）
- `NEXT_PUBLIC_IMAGE_DOMAINS`: 允许的图片域名（逗号分隔）

### Cloudflare 特定
- 通过 `wrangler.jsonc` 配置
- KV 命名空间: `TENANTS`
- R2 存储桶: `__OPEN_NEXT_CACHE_BUCKET`

## 错误处理

### 自定义错误类

- `TenantNotFoundError`: 租户未找到（返回 403）
- `TenantResolutionError`: 租户解析失败（返回 403）
- `PageNotFoundError`: 页面未找到（返回 404）
- `PageServiceError`: 页面服务错误（返回 5xx）

### 错误页面

- [src/app/not-found.js](src/app/not-found.js): 404 页面
- [src/app/error.js](src/app/error.js): 通用错误页面

## 调试技巧

### 查看渲染日志

开发环境会在控制台输出详细日志：
- 租户解析信息
- API 请求详情
- 组件注入状态
- 性能监控（`<SimplePerf />` 组件）

### 检查 Cloudflare KV

```bash
# 查看所有 KV 键
wrangler kv:key list --binding=TENANTS

# 获取特定键的值
wrangler kv:key get "host:example.com" --binding=TENANTS
```

### 清除特定页面缓存

使用 Next.js 的 revalidate API：

```javascript
// 在页面或 API 路由中
import { revalidatePath, revalidateTag } from 'next/cache'

// 按路径清除
revalidatePath('/products')

// 按标签清除
revalidateTag('page:home')
```

## 部署配置

### Cloudflare Workers（推荐）

配置文件: [wrangler.jsonc](wrangler.jsonc)

关键配置:
- `compatibility_flags`: `["nodejs_compat", "global_fetch_strictly_public"]`
- Assets 绑定: `.open-next/assets`
- R2 缓存: `sc-static` 存储桶

部署命令: `npm run deploy`

### Vercel（备选）

配置文件: [vercel.json](vercel.json)

使用标准 Next.js 部署流程。

## 常见任务

### 添加新的全局组件

1. 在编辑器端定义组件
2. 修改 [src/services/globalComponents.js](src/services/globalComponents.js) 添加 API 调用
3. 在 [src/lib/grapesjs/render.js](src/lib/grapesjs/render.js) 的 `injectGlobalComponents()` 中添加注入逻辑
4. 如需运行时脚本，添加到 [public/scripts/](public/scripts/) 并在 [layout.js](src/app/layout.js) 中引入

### 优化新的组件类型

1. 在 `processDynamicContent()` 中添加组件检测逻辑
2. 创建对应的处理函数（例如 `processNewComponentType()`）
3. 添加必要的 CSS/JS 预加载资源
4. 更新 [src/utils/](src/utils/) 中的辅助函数

### 调整缓存策略

- **页面级**: 修改 `[[...slug]]/page.js` 中的 `export const revalidate`
- **数据级**: 修改 `services/*.js` 中的 `next.revalidate`
- **Cloudflare 级**: 修改 `http.js` 中的 `cf.cacheTtl`

## 工作规范

### 编辑文件优先
- 优先编辑现有文件，避免创建新文件
- 保持与现有代码风格一致

### 注释规范
- 使用第二人称（"你"）
- 每个函数添加简洁的单行注释
- 复杂逻辑添加块注释说明

### 性能意识
- 任何渲染逻辑修改都要考虑对 LCP、CLS、FID 的影响
- 避免在服务端引入大型依赖
- 优先使用 Cheerio 而非完整的 DOM 解析器

### 测试方法
- 本地开发: `npm run dev`
- 生产构建测试: `npm run build && npm start`
- Cloudflare 本地测试: `npm run preview`
