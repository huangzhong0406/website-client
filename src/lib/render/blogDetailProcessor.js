import {generateBlogGalleryHtml} from "../../utils/blogdetail/generateBlogGallery.js";
import {generateBlogInfoHtml} from "../../utils/blogdetail/generateBlogInfo.js";
import {generateRelatedBlogsPlaceholder} from "../../utils/blogdetail/generateRelatedBlogs.js";
import {fetchRelatedBlogs} from "../../services/relatedContent.js";

/**
 * 处理博客详情组件的 SSR 渲染
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $elem - 组件元素
 * @param {object} blogDetailData - 博客详情数据（来自 page.context.resource）
 */
export async function processBlogDetailComponent($, $elem, blogDetailData) {
  if (!blogDetailData) {
    console.warn('No blog detail data provided');
    return;
  }

  // 解析配置
  const configStr = $elem.attr('data-config');
  const config = configStr ? JSON.parse(configStr) : {};

  const { id, name, description, files = {} } = blogDetailData;
  const images = files.images || [];

  // 1. 注入博客图片轮播
  const $gallery = $elem.find('.bd-gallery, .bd-gallery-single');
  if ($gallery.length > 0 || images.length > 0) {
    // 先移除现有的图片容器
    $elem.find('.bd-gallery, .bd-gallery-single').remove();

    // 在主内容区开头插入新的图片轮播
    const galleryHtml = generateBlogGalleryHtml(images);
    const $main = $elem.find('.bd-main');
    if ($main.length > 0) {
      // 在标题后插入图片
      const $header = $main.find('.bd-header');
      if ($header.length > 0) {
        $header.after(galleryHtml);
      } else {
        $main.prepend(galleryHtml);
      }
    }
  }

  // 2. 注入博客标题和内容
  const $main = $elem.find('.bd-main');
  if ($main.length > 0) {
    // 移除现有的标题和内容
    $main.find('.bd-header, .bd-content').remove();

    // 在图片后插入新的标题和内容
    const infoHtml = generateBlogInfoHtml(blogDetailData);
    const $gallery = $main.find('.bd-gallery, .bd-gallery-single');
    if ($gallery.length > 0) {
      $gallery.after(infoHtml);
    } else {
      $main.prepend(infoHtml);
    }
  }

  // 3. 设置 data-blog-id 供客户端使用
  $elem.attr("data-blog-id", id);

  // 4. 服务端渲染相关博客（优先）或生成骨架屏（降级）
  const $relatedList = $elem.find(".bd-related-list");
  if ($relatedList.length > 0) {
    const relatedCount = config.relatedBlogsCount || 3;

    try {
      // 尝试在服务端获取相关博客数据（3秒超时）
      const relatedBlogs = await fetchRelatedBlogs(id, relatedCount, {timeout: 200});

      if (relatedBlogs && relatedBlogs.length > 0) {
        // 成功获取数据，渲染完整的相关博客HTML
        const relatedHtml = generateRelatedBlogsHtml(relatedBlogs);
        $relatedList.html(relatedHtml);
        $relatedList.parent().attr("data-server-rendered", "true"); // 标记为服务端渲染
        console.log(`✅ 服务端成功渲染 ${relatedBlogs.length} 个相关博客`);
      } else {
        // 没有相关博客，隐藏整个区域
        $relatedList.parent().remove();
      }
    } catch (error) {
      // 服务端获取失败（超时或错误），降级为骨架屏，由客户端加载
      console.warn(`⚠️ 服务端获取相关博客失败，降级为客户端加载: ${error.message}`);
      const skeletonHtml = generateRelatedBlogsSkeleton(relatedCount);
      $relatedList.html(skeletonHtml);
      $relatedList.parent().attr("data-client-fallback", "true"); // 标记需要客户端加载
    }
  }
}

/**
 * 生成相关博客完整HTML（服务端渲染）
 * @param {Array} blogs - 博客数组
 * @returns {string} 相关博客HTML
 */
function generateRelatedBlogsHtml(blogs) {
  return blogs
    .map((blog) => {
      const date = formatDate(blog.published_at || blog.created_at);
      return `
    <div class="bd-related-item" style="cursor: pointer;" onclick="window.location.href='${blog.path}'">
      <div class="bd-related-image">
        <img src="${blog.primary_image || "/images/placeholder.jpg"}" alt="${blog.name || "Blog"}" loading="lazy" />
      </div>
      <div class="bd-related-date">${date}</div>
      <h3 class="bd-related-title">${blog.name || "Untitled"}</h3>
    </div>
  `;
    })
    .join("");
}

/**
 * 生成相关博客骨架屏HTML（降级方案）
 * @param {number} count - 骨架屏数量
 * @returns {string} 骨架屏HTML
 */
function generateRelatedBlogsSkeleton(count) {
  return Array(count)
    .fill(0)
    .map(
      () => `
    <div class="bd-related-item skeleton">
      <div class="skeleton-image"></div>
      <div class="skeleton-date"></div>
      <div class="skeleton-title"></div>
    </div>
  `
    )
    .join("");
}

/**
 * 格式化日期为 "DD MMM" 格式
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString("en-US", {month: "short"}).toUpperCase();
  return `${day} ${month}`;
}
