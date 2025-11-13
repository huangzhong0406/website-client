/** @type {import('next').NextConfig} */
const imageDomains = process.env.NEXT_PUBLIC_IMAGE_DOMAINS
  ? process.env.NEXT_PUBLIC_IMAGE_DOMAINS.split(",").map((domain) => domain.trim())
  : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,

  // 服务端外部包配置 (Next.js 15+)
  serverExternalPackages: ["cheerio"],

  // 禁用开发错误覆盖层
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: "bottom-right"
  },

  // 在开发环境中也不显示错误覆盖层（谨慎使用）
  experimental: {
    // 注意：这会让你在开发时看不到错误详情，不推荐
    // disableOptimizedLoading: true,
  },

  images: {
    domains: imageDomains,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24
  }
};

export default nextConfig;