/** @type {import('next').NextConfig} */
const imageDomains = process.env.NEXT_PUBLIC_IMAGE_DOMAINS
  ? process.env.NEXT_PUBLIC_IMAGE_DOMAINS.split(",").map((domain) => domain.trim())
  : [];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  compress: true,

  // 服务端外部包配置 (Next.js 15+)
  serverExternalPackages: ['cheerio'],

  images: {
    domains: imageDomains,
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
  },
};

export default nextConfig;