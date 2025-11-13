import {Geist, Geist_Mono} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SimplePerf from "../components/SimplePerf";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// CDN 域名用于在 <head> 中注入预连接，加速静态资源获取
const cdnOrigin = process.env.NEXT_PUBLIC_CDN_ORIGIN || null;

export const metadata = {
  title: {
    default: "GrapesJS 渲染端",
    template: "%s | GrapesJS 渲染端",
  },
  description: "基于 Laravel API 的 GrapesJS 页面渲染应用，提供快速首屏与 SEO 体验。",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  openGraph: {
    type: "website",
    title: "GrapesJS 渲染端",
    description: "基于 Laravel API 的 GrapesJS 页面渲染应用，提供快速首屏与 SEO 体验。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({children}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 预连接字体与 CDN，加快静态资源建立 TCP/TLS */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {cdnOrigin && <link rel="preconnect" href={cdnOrigin} />}
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {cdnOrigin && <link rel="dns-prefetch" href={cdnOrigin} />}
        <meta name="viewport" content="width=device-width,initial-scale=1" />

        {/* Global-Header 导航组件样式 */}
        <link rel="stylesheet" href="/styles/global-header-core.css" />
        <link rel="stylesheet" href="/styles/global-header-classic.css" />
        <link rel="stylesheet" href="/styles/global-header-minimal.css" />

        {/* Product List Page 组件样式 */}
        <link rel="stylesheet" href="/product-list-page-core.css" />
        {/* Product List Page 组件样式 */}
        <link rel="stylesheet" href="/product-list-detail-core.css" />
        {/* Product List Page 组件样式 */}
        <link rel="stylesheet" href="/product-detail-core.css" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} renderer-body`}>
        {children}
        {process.env.NODE_ENV === "development" && <SimplePerf />}

        {/* Global-Header 导航组件脚本 */}
        <Script src="/scripts/global-header-core.js" strategy="afterInteractive" />

        {/* Product List Page 组件脚本 */}
        <Script src="/product-list-page-core.js" strategy="afterInteractive" />

        {/* Product List Page 组件脚本 */}
        <Script src="/product-list-detail-core.js" strategy="afterInteractive" />
        
        {/* Product List Page 组件脚本 */}
        <Script src="/product-detail-core.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
