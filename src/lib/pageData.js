// 测试数据，包含图片的页面内容
export const pageData = {
  html: `
    <div class="container">
      <h1>测试页面</h1>
      <img src="/next.svg" alt="Next.js Logo" width="180" height="37" class="logo" />
      <p>这是一个包含图片的测试页面。</p>
      <img src="/vercel.svg" alt="Vercel Logo" width="100" height="24" loading="eager" />
    </div>
  `,
  css: `
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .logo { margin: 20px 0; }
    h1 { color: #333; }
    p { color: #666; line-height: 1.6; }
  `,
  assets: [
    {
      src: "/next.svg",
      alt: "Next.js Logo",
      width: 180,
      height: 37,
      priority: true
    },
    {
      src: "/vercel.svg", 
      alt: "Vercel Logo",
      width: 100,
      height: 24
    }
  ],
  meta: {
    title: "图片处理测试页面",
    description: "测试 Next.js Image 组件的页面"
  },
  publishStatus: "published"
};