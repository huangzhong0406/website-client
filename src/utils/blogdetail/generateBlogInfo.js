/**
 * 生成博客信息区 HTML（标题和内容）
 * @param {Object} data - 博客数据
 * @returns {string} HTML 字符串
 */
export function generateBlogInfoHtml(data) {
  const { name, description } = data;

  return `
    <header class="bd-header">
      <h1 class="bd-title">${name || "Blog Title"}</h1>
    </header>
    <div class="bd-content">
      ${description || "<p>Blog content will appear here.</p>"}
    </div>
  `;
}
