import { generateBlogGalleryHtml } from "../../utils/blogdetail/generateBlogGallery.js";
import { generateBlogInfoHtml } from "../../utils/blogdetail/generateBlogInfo.js";
import { generateRelatedBlogsPlaceholder } from "../../utils/blogdetail/generateRelatedBlogs.js";

/**
 * 处理博客详情组件的 SSR 渲染
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $elem - 组件元素
 * @param {object} blogDetailData - 博客详情数据（来自 page.context.resource）
 */
export function processBlogDetailComponent($, $elem, blogDetailData) {
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

  // 3. 设置 data-blog-id 供 CSR 使用（加载相关博客）
  $elem.attr('data-blog-id', id);

  // 4. 相关博客容器保持骨架图，等待 CSR 加载
  // 骨架图已经在编辑器端生成，这里不需要额外处理
}
