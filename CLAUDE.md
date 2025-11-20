# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 15 的高性能网站渲染端，负责将 GrapesJS 编辑器生成的页面数据渲染成优化的静态页面。核心特点：

- **ISR 架构**: 使用增量静态再生（默认 12 小时缓存）实现接近静态站点的性能
- **多租户系统**: 基于 Cloudflare KV 的域名到租户 ID 映射
- **边缘部署**: 优先部署到 Cloudflare Workers，备选 Vercel
- **性能优化**: 关键 CSS 内联、图片预加载、Swiper 懒加载等多项优化
- **模块化渲染**: 将渲染逻辑拆分为多个处理器模块，便于维护和扩展

## 技术栈

- **核心框架**: React 18.3.1, Next.js 15.1.0 (App Router)
- **HTML 处理**: Cheerio 1.0.0 (服务端 DOM 操作)
- **部署平台**: Cloudflare Workers (@opennextjs/cloudflare 1.11.0)
- **服务端包**: cheerio (配置为 serverExternalPackages)
- **轮播组件**: Swiper 12.0.3

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

### 缓存清理

```bash
# Unix/Mac:
rm -rf .next

# Windows:
rmdir /s /q .next
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
- **开发环境**: 使用硬编码的测试租户 ID 或环境变量 `DEFAULT_TENANT_ID`
- **KV Key 格式**: `host:example.com` → 租户 ID

关键函数:
- `getTenantContext()`: 缓存的租户解析（从请求头获取 Host）
- `resolveTenantForHost(hostname)`: 核心解析逻辑

### 3. 渲染引擎架构（模块化）

文件: [src/lib/render.js](src/lib/render.js)

核心函数 `prepareGrapesContent()` 协调以下模块处理：

#### CSS 处理模块
文件: [src/lib/render/cssProcessor.js](src/lib/render/cssProcessor.js)
- `splitCss()`: 分离关键 CSS 和延迟 CSS
- `getSwiperCriticalCss()`: 获取 Swiper 关键样式

#### 图片优化模块
文件: [src/lib/render/imageOptimizer.js](src/lib/render/imageOptimizer.js)
- `enhanceImage()`: 增强图片属性（loading, fetchpriority, decoding）
- `isHeroCandidate()`: 判断是否为首屏图片
- `buildAssetMap()`: 构建资源映射表

#### Swiper 处理模块
文件: [src/lib/render/swiperProcessor.js](src/lib/render/swiperProcessor.js)
- `processSwiperOptimization()`: 优化 Swiper 组件
- `extractSwiperScripts()`: 提取 Swiper 脚本用于懒加载

#### 全局组件注入模块
文件: [src/lib/render/globalComponentsInjector.js](src/lib/render/globalComponentsInjector.js)
- `injectGlobalComponents()`: 注入导航、页脚等全局组件

#### 产品列表页处理模块
文件: [src/lib/render/productListPageProcessor.js](src/lib/render/productListPageProcessor.js)
- `processProductListPageComponent()`: 处理产品列表页组件

#### 产品详情页处理模块
文件: [src/lib/render/productDetailProcessor.js](src/lib/render/productDetailProcessor.js)
- `processProductDetailComponent()`: 处理产品详情页组件

#### 导航处理模块
文件: [src/lib/render/headerProcessor.js](src/lib/render/headerProcessor.js)
- `processGlobalHeaderComponent()`: 处理全局导航组件

### 4. 动态路由系统

文件: [src/app/[[...slug]]/page.js](src/app/[[...slug]]/page.js)

- **Catch-all 路由**: 处理所有页面路径
- **ISR 配置**: `export const revalidate = 43200`（12 小时）
- **缓存策略**: 使用 React `cache()` 避免同一请求周期内重复获取数据

关键导出:
- `generateMetadata()`: 动态生成 SEO 元数据
- `default RenderedPage()`: 主渲染函数

### 5. 共享运行时文件

位置: [public/](public/)

这些文件与编辑器端（singoo-site-studio）共享：

- `scripts/global-header-core.js`: 导航交互逻辑
- `styles/global-header-core.css`: 导航核心样式
- `styles/global-header-classic.css`: 导航 classic 变体样式
- `styles/global-header-minimal.css`: 导航 minimal 变体样式
- `product-list-page-core.js`: 产品列表页运行时
- `product-list-page-core.css`: 产品列表页样式

**重要**: 修改这些文件时必须同步更新编辑器端的 `singoo-site-studio/public/` 文件夹。

### 6. API 通信

文件: [src/services/http.js](src/services/http.js)

核心函数:
- `apiFetch(url, slug, options)`: 封装的 fetch 函数
  - 自动添加租户标识头（X-Tenant-Id, X-Tenant-Host）
  - Cloudflare Cache API 集成
  - 默认 8 秒超时
  - 多租户隔离的缓存键

环境变量:
- `NEXT_PUBLIC_API_BASE`: API 基础 URL（必需）
- `API_TOKEN`: API 鉴权令牌（默认值："API_TOKEN"）

### 7. 页面数据服务

文件: [src/services/pages.js](src/services/pages.js)

- `fetchPage(slugSegments, tenant)`: 获取页面数据
- `PageNotFoundError`: 页面未找到异常
- `PageServiceError`: 页面服务异常

默认缓存时间: 12 小时（可通过环境变量 `NEXT_PUBLIC_PAGE_REVALIDATE` 配置）

## 关键优化策略

### CSS 分离逻辑

文件: [src/lib/render/cssProcessor.js](src/lib/render/cssProcessor.js)

关键 CSS 优先级规则:
- body 和 html 样式
- 字体和颜色定义
- 首屏元素（hero, banner）

控制变量: `CRITICAL_CSS_LIMIT` 环境变量（默认 4000 字符）

### Swiper 优化策略

文件: [src/lib/render/swiperProcessor.js](src/lib/render/swiperProcessor.js)

判断首屏 Swiper 的策略（按优先级）：
1. 手动标记: `data-priority="high"`
2. 类名检测: hero, banner, main, top
3. 位置检测: body 中的前 3 个元素
4. 高度估算: 垂直位置 < 800px

首屏 Swiper 的第一张图片会被标记为 `fetchpriority="high"` 并添加到预加载资源。

### 图片优化

文件: [src/lib/render/imageOptimizer.js](src/lib/render/imageOptimizer.js)

自动增强:
- 首屏图片: `loading="eager"`, `fetchpriority="high"`
- 非首屏图片: `loading="lazy"`
- 所有图片: `decoding="async"`
- 支持 responsive images（srcset, sizes）

## 工具函数

### 产品列表页工具
- [src/utils/productlist/generateCategoryTree.js](src/utils/productlist/generateCategoryTree.js) - 生成分类树
- [src/utils/productlist/generateProductGrid.js](src/utils/productlist/generateProductGrid.js) - 生成产品网格
- [src/utils/productlist/generatePagination.js](src/utils/productlist/generatePagination.js) - 生成分页
- [src/utils/productlist/generateProductDetail.js](src/utils/productlist/generateProductDetail.js) - 生成产品详情

### 产品详情页工具
- [src/utils/productdetail/generateProductInfo.js](src/utils/productdetail/generateProductInfo.js) - 生成产品信息
- [src/utils/productdetail/generateGallery.js](src/utils/productdetail/generateGallery.js) - 生成图片画廊
- [src/utils/productdetail/generateDescriptionTabs.js](src/utils/productdetail/generateDescriptionTabs.js) - 生成描述标签页

### 导航工具
- [src/utils/header/generateMenuHtml.js](src/utils/header/generateMenuHtml.js) - 生成菜单 HTML

## 环境变量

### 必需
- `NEXT_PUBLIC_API_BASE`: Laravel API 地址（例如: https://api.singoo.ai）

### 可选
- `API_TOKEN`: API 鉴权令牌（默认: "API_TOKEN"）
- `NEXT_PUBLIC_PAGE_REVALIDATE` 或 `PAGE_REVALIDATE`: ISR 缓存时间（默认: 43200 秒 = 12 小时）
- `CRITICAL_CSS_LIMIT`: 关键 CSS 字符限制（默认: 4000）
- `NEXT_PUBLIC_CDN_ORIGIN`: CDN 域名（用于预连接）
- `NEXT_PUBLIC_IMAGE_DOMAINS`: 允许的图片域名（逗号分隔）
- `DEFAULT_TENANT_ID` 或 `NEXT_PUBLIC_DEFAULT_TENANT_ID`: 开发环境默认租户 ID
- `NEXT_PUBLIC_ROOT_SLUG` 或 `ROOT_SLUG`: 根路径对应的页面 slug（默认: "home"）

### Cloudflare 特定

通过 [wrangler.jsonc](wrangler.jsonc) 配置:
- KV 命名空间: `TENANTS`（ID: 7ea3b67927124be2bb54ee6630235af4）
- R2 存储桶: `__OPEN_NEXT_CACHE_BUCKET` → `sc-static`
- Assets 绑定: `.open-next/assets`

## 错误处理

### 自定义错误类

定义在各自的服务文件中:
- `TenantNotFoundError`: 租户未找到（返回 403）
- `TenantResolutionError`: 租户解析失败（返回 403）
- `PageNotFoundError`: 页面未找到（返回 404）
- `PageServiceError`: 页面服务错误（返回 5xx）

### 错误页面

- [src/app/not-found.js](src/app/not-found.js): 404 页面
- [src/app/error.js](src/app/error.js): 通用错误页面

## 性能监控组件

- [src/components/SimplePerf.js](src/components/SimplePerf.js): 简单性能监控
- [src/components/PerformanceMonitor.js](src/components/PerformanceMonitor.js): 完整性能监控
- [src/components/SwiperLoader.js](src/components/SwiperLoader.js): Swiper 懒加载组件

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

# 添加新的租户映射
wrangler kv:key put "host:newdomain.com" "tenant-id-123" --binding=TENANTS
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
- `compatibility_date`: "2025-10-30"
- Assets 绑定: `.open-next/assets`
- R2 缓存: `sc-static` 存储桶
- 可观测性: 已启用，采样率 100%
- Source Maps: 已上传

部署命令: `npm run deploy`

### Vercel（备选）

配置文件: [vercel.json](vercel.json)

使用标准 Next.js 部署流程。

## 常见任务

### 添加新的全局组件

1. 在编辑器端定义组件（singoo-site-studio）
2. 修改 [src/lib/render/globalComponentsInjector.js](src/lib/render/globalComponentsInjector.js) 添加注入逻辑
3. 在 [src/lib/render.js](src/lib/render.js) 的 `processDynamicContent()` 中调用新的处理器
4. 如需运行时脚本，添加到 [public/scripts/](public/scripts/) 并在 [layout.js](src/app/layout.js) 中引入

### 添加新的组件处理器

1. 在 [src/lib/render/](src/lib/render/) 中创建新的处理器文件（例如 `newComponentProcessor.js`）
2. 实现处理函数，遵循现有处理器的模式
3. 在 [src/lib/render.js](src/lib/render.js) 中导入并在 `processDynamicContent()` 中调用
4. 如需工具函数，添加到 [src/utils/](src/utils/) 对应的子目录

### 调整缓存策略

- **页面级**: 修改 [src/app/[[...slug]]/page.js](src/app/[[...slug]]/page.js) 中的 `export const revalidate`
- **数据级**: 修改 [src/services/pages.js](src/services/pages.js) 中的 `DEFAULT_REVALIDATE_SECONDS`
- **Cloudflare 级**: 修改 [src/services/http.js](src/services/http.js) 中的缓存逻辑

### 同步共享运行时文件

编辑器和渲染端共享相同的运行时文件。修改时需要同步：

```bash
# 需要同步的文件（两个项目的 public/ 文件夹）
global-header-core.js
global-header-core.css
global-header-classic.css
global-header-minimal.css
product-list-page-core.js
product-list-page-core.css
```

建议使用符号链接或构建脚本自动同步。

## 工作规范

### 编辑文件优先
- 优先编辑现有文件，避免创建新文件
- 保持与现有代码风格一致
- 遵循模块化架构，新功能应添加到对应的模块中

### 注释规范
- 使用第二人称（"你"）
- 每个函数添加简洁的单行中文注释
- 复杂逻辑添加块注释说明

### 性能意识
- 任何渲染逻辑修改都要考虑对 LCP、CLS、FID 的影响
- 避免在服务端引入大型依赖
- 优先使用 Cheerio 而非完整的 DOM 解析器
- 单次遍历 DOM，避免重复查询

### 测试方法
- 本地开发: `npm run dev`
- 生产构建测试: `npm run build && npm start`
- Cloudflare 本地测试: `npm run preview`

## 项目结构

```
src/
├── app/
│   ├── [[...slug]]/        # 动态路由（catch-all）
│   ├── layout.js            # 全局布局
│   ├── error.js             # 错误页面
│   └── not-found.js         # 404 页面
├── lib/
│   ├── render.js            # 渲染引擎主文件
│   ├── tenant.js            # 多租户解析
│   ├── logger.js            # 日志工具
│   └── render/              # 渲染模块
│       ├── cssProcessor.js
│       ├── imageOptimizer.js
│       ├── swiperProcessor.js
│       ├── globalComponentsInjector.js
│       ├── headerProcessor.js
│       ├── productListPageProcessor.js
│       ├── productListDetailProcessor.js
│       └── productDetailProcessor.js
├── services/
│   ├── http.js              # API 通信
│   └── pages.js             # 页面数据服务
├── utils/                   # 工具函数
│   ├── header/
│   ├── productlist/
│   └── productdetail/
└── components/              # React 组件
    ├── SimplePerf.js
    ├── PerformanceMonitor.js
    ├── SwiperLoader.js
    ├── DeferredStyle.js
    ├── ImageProcessor.js
    └── ImageRenderer.js
```

## 关键文件索引

- [src/app/[[...slug]]/page.js](src/app/[[...slug]]/page.js) - 主页面渲染器
- [src/lib/render.js](src/lib/render.js) - 核心渲染引擎
- [src/lib/tenant.js](src/lib/tenant.js) - 多租户处理
- [src/services/pages.js](src/services/pages.js) - 页面数据服务
- [src/services/http.js](src/services/http.js) - API 通信
- [next.config.mjs](next.config.mjs) - Next.js 配置
- [wrangler.jsonc](wrangler.jsonc) - Cloudflare Workers 配置

## 与编辑器端的关系

本项目是渲染端，与编辑器端（singoo-site-studio）协同工作：

- **编辑器端**: 提供可视化编辑界面，生成页面数据（HTML, CSS, JSON）
- **渲染端**: 接收页面数据，进行服务端渲染和优化，交付给最终用户
- **共享运行时**: 两端共享 `public/` 目录下的运行时文件，确保编辑器预览和最终渲染一致

数据流向：
```
编辑器端 (8083) → Laravel API (api.singoo.ai) ← 渲染端 (3000)
```

参考根目录的 [CLAUDE.md](../CLAUDE.md) 了解整体项目架构。