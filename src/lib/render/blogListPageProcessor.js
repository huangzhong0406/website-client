/**
 * 博客列表页处理模块
 * 负责处理完整的博客列表页组件（包含分类、博客列表、分页）
 */

import {logWarn} from "../logger.js";
import {generateCategoryTree} from "../../utils/bloglist/generateCategoryTree.js";
import {generateBlogGrid, generateBlogList} from "../../utils/bloglist/generateBlogGrid.js";
import {generatePagination} from "../../utils/bloglist/generatePagination.js";

/**
 * 处理博客列表页组件 (Blog List Page Component)
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} $elem - Component element
 * @param {Object} blogListData - Blog list page data containing categories, blogs, pagination
 * @param {string} currentSlug - 当前页面路径（用于生成"全部"分类链接）
 * @param {Object} currentParams - 当前 URL 参数（用于生成分页链接）
 * @param {string|number} currentCategoryId - 当前分类ID（用于高亮当前分类）
 */
export function processBlogListPageComponent($, $elem, blogListData, currentSlug = '', currentParams = {}, currentCategoryId = null) {
  try {
    // 解析组件配置
    const configStr = $elem.attr('data-config');
    let config = {};
    try {
      config = configStr ? JSON.parse(configStr) : {};
    } catch (e) {
      logWarn('[BlogListPage] Failed to parse config:', e);
    }

    console.log("--------blogListData----------", blogListData);

    // 获取数据
    const categories = blogListData.categories || [];
    const pagination = {
      page: blogListData.blogs?.page,
      size: blogListData.blogs?.size,
      total: blogListData.blogs?.total
    };
    const blogs = blogListData.blogs?.list || [];

    // 获取布局变体
    const variant = $elem.attr('data-variant') || config.displayMode || 'grid';

    console.log("博客列表页配置", config);

    // 获取配置选项
    const defaultExpandCategories = config.defaultExpandCategories !== false; // 默认展开
    const showDescription = config.showDescription !== false; // 默认显示描述
    const showPublishDate = config.showPublishDate !== false; // 默认显示发布日期

    // 1. 注入分类树 (如果显示分类，传递 currentCategoryId 用于高亮)
    if (config.showCategories !== false) {
      const $categoriesContainer = $elem.find('.blp-categories');
      if ($categoriesContainer.length > 0 && categories.length > 0) {
        // 使用 currentCategoryId 判断高亮，currentSlug 作为"全部"分类的路径
        const categoriesHtml = generateCategoryTree(categories, 0, currentCategoryId, currentSlug, defaultExpandCategories);
        $categoriesContainer.html(categoriesHtml);
        logWarn('[BlogListPage] Categories injected:', categories.length);
      }
    }

    // 2. 注入博客列表
    const $blogsContainer = $elem.find('.blp-blogs-content');
    if ($blogsContainer.length > 0) {
      let blogsHtml;
      if (variant === 'list') {
        blogsHtml = generateBlogList(blogs, showDescription, showPublishDate);
      } else {
        blogsHtml = generateBlogGrid(blogs, config, showDescription, showPublishDate);
      }
      $blogsContainer.html(blogsHtml);
      logWarn('[BlogListPage] Blogs injected:', blogs.length);
    }

    // 3. 注入分页器（传递 currentParams 用于保留 sort 等参数）
    const $paginationContainer = $elem.find('.blp-pagination-wrapper');
    if ($paginationContainer.length > 0) {
      const paginationHtml = generatePagination(pagination, currentParams);
      // 注入分页器和博客数量
      const resultsCountHtml = pagination.total > 0 ? `
          <span class="blp-results-count">共 <strong>${pagination.total || 0}</strong> 篇博客</span>
      ` : '';
      $paginationContainer.html(paginationHtml + resultsCountHtml);
      logWarn('[BlogListPage] Pagination injected');
    }

    // 4. 设置排序下拉框当前值（在服务端设置 selected 属性）
    const $sortSelect = $elem.find('.blp-sort-select');
    if ($sortSelect.length > 0) {
      const currentSort = currentParams.sort || config.defaultSort || 'published_at-desc';

      // 设置 data 属性供客户端 JS 使用
      $sortSelect.attr('data-current-sort', currentSort);

      // 在服务端设置 option 的 selected 属性
      $sortSelect.find('option').each((i, option) => {
        const $option = $(option);
        if ($option.attr('value') === currentSort) {
          $option.attr('selected', 'selected');
        } else {
          $option.removeAttr('selected');
        }
      });
    }

    logWarn('[BlogListPage] Component processed successfully');
  } catch (error) {
    logWarn('[BlogListPage] Processing failed:', error);
  }
}
