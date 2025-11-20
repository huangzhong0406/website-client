/**
 * Generate Blog Grid HTML (Server-side)
 * @description SSR-safe blog grid generation
 */

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Format date for display
 * @param {string} dateString - Date string
 * @param {string} format - Format type ('short' | 'long')
 * @returns {string} Formatted date string
 */
function formatDate(dateString, format = 'short') {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);

    if (format === 'short') {
      // Format: 3/2, 2022
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const year = date.getFullYear();
      return `${month}/${day}, ${year}`;
    } else if (format === 'long') {
      // Format: March 2, 2022
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // Default short format
    return date.toLocaleDateString();
  } catch (error) {
    return dateString;
  }
}

/**
 * Generate blog grid HTML
 * @param {Array} blogs - Blog array
 * @param {Object} config - Configuration object
 * @param {boolean} showDescription - Whether to show blog description
 * @param {boolean} showPublishDate - Whether to show publish date
 */
export function generateBlogGrid(blogs, config = {}, showDescription = true, showPublishDate = true) {
  console.log("博客列表", blogs);
  if (!blogs || blogs.length === 0) {
    return `
      <div class="blp-blogs-empty">
        <svg class="blp-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <p class="blp-empty-text">暂无博客</p>
      </div>
    `;
  }

  return `
    <div class="blp-blogs-grid">
      ${blogs
        .map(
          (blog) => `
        <div class="blp-blog-card" data-blog-id="${escapeHtml(blog.id)}">
          <div class="blp-blog-image-wrapper">
            <img
              src="${escapeHtml(blog.primary_image || "/placeholder.jpg")}"
              alt="${escapeHtml(blog.name)}"
              class="blp-blog-image"
              loading="lazy"
            />
          </div>
          <div class="blp-blog-info">
            ${showPublishDate && blog.published_at ? `<time class="blp-blog-date" datetime="${escapeHtml(blog.published_at)}">${formatDate(blog.published_at)}</time>` : ''}
            <h3 class="blp-blog-name">${escapeHtml(blog.name)}</h3>
            ${showDescription && blog.description ? `<p class="blp-blog-description">${escapeHtml(blog.description)}</p>` : ""}
            <a href="${escapeHtml(blog.path || "#")}" class="blp-blog-learn-more">LEARN MORE</a>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * Generate blog list HTML
 * @param {Array} blogs - Blog array
 * @param {boolean} showDescription - Whether to show blog description
 * @param {boolean} showPublishDate - Whether to show publish date
 */
export function generateBlogList(blogs, showDescription = true, showPublishDate = true) {
  if (!blogs || blogs.length === 0) {
    return `
      <div class="blp-blogs-empty">
        <svg class="blp-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
        <p class="blp-empty-text">暂无博客</p>
      </div>
    `;
  }

  return `
    <div class="blp-blogs-list-view">
      ${blogs
        .map(
          (blog) => `
        <div class="blp-blog-list-item" data-blog-id="${escapeHtml(blog.id)}">
          <div class="blp-blog-list-image">
            <img
              src="${escapeHtml(blog.primary_image || "/placeholder.jpg")}"
              alt="${escapeHtml(blog.name)}"
              loading="lazy"
            />
          </div>
          <div class="blp-blog-list-content">
            ${showPublishDate && blog.published_at ? `<time class="blp-blog-list-date" datetime="${escapeHtml(blog.published_at)}">${formatDate(blog.published_at)}</time>` : ''}
            <h3 class="blp-blog-list-name">${escapeHtml(blog.name)}</h3>
            ${showDescription && blog.description ? `<p class="blp-blog-list-description">${escapeHtml(blog.description)}</p>` : ""}
            <a href="${escapeHtml(blog.path || "#")}" class="blp-blog-learn-more">LEARN MORE</a>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}
