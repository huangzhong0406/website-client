/**
 * 产品列表页处理模块
 * 负责处理完整的产品列表页组件（包含分类、产品列表、分页）
 */

import {logWarn} from "../logger.js";
import {generateCategoryTree} from "../../utils/productlist/generateCategoryTree.js";
import {generateProductGrid, generateProductList} from "../../utils/productlist/generateProductGrid.js";
import {generatePagination} from "../../utils/productlist/generatePagination.js";

/**
 * 处理产品列表页组件 (Product List Page Component)
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} $elem - Component element
 * @param {Object} productListData - Product list page data containing categories, products, pagination
 * @param {string} currentSlug - 当前页面路径（用于生成"全部"分类链接）
 * @param {Object} currentParams - 当前 URL 参数（用于生成分页链接）
 * @param {string|number} currentCategoryId - 当前分类ID（用于高亮当前分类）
 */
export function processProductListPageComponent($, $elem, productListData, currentSlug = '', currentParams = {}, currentCategoryId = null) {
  try {
    // 解析组件配置
    const configStr = $elem.attr('data-config');
    let config = {};
    try {
      config = configStr ? JSON.parse(configStr) : {};
    } catch (e) {
      logWarn('[ProductListPage] Failed to parse config:', e);
    }

    console.log("--------productListData----------", productListData);

    // 获取数据
    const categories = productListData.categories || [];
    const pagination = {
      page: productListData.products?.page,
      size: productListData.products?.size,
      total: productListData.products?.total
    };
    const products = productListData.products?.list || [];

    // 获取布局变体
    const variant = $elem.attr('data-variant') || config.displayMode || 'grid';

    console.log("产品列表页配置",config);

    // 获取配置选项
    const defaultExpandCategories = config.defaultExpandCategories !== false; // 默认展开
    const showProductDescription = config.showProductDescription !== false; // 默认显示描述

    // 1. 注入分类树 (如果显示分类，传递 currentCategoryId 用于高亮)
    if (config.showCategories !== false) {
      const $categoriesContainer = $elem.find('.plp-categories');
      if ($categoriesContainer.length > 0 && categories.length > 0) {
        // 使用 currentCategoryId 判断高亮，currentSlug 作为"全部"分类的路径
        const categoriesHtml = generateCategoryTree(categories, 0, currentCategoryId, currentSlug, defaultExpandCategories);
        $categoriesContainer.html(categoriesHtml);
        logWarn('[ProductListPage] Categories injected:', categories.length);
      }
    }

    // 2. 注入产品列表
    const $productsContainer = $elem.find('.plp-products-content');
    if ($productsContainer.length > 0) {
      let productsHtml;
      if (variant === 'list') {
        productsHtml = generateProductList(products, showProductDescription);
      } else {
        productsHtml = generateProductGrid(products, config, showProductDescription);
      }
      $productsContainer.html(productsHtml);
      logWarn('[ProductListPage] Products injected:', products.length);
    }

    // 3. 注入分页器（传递 currentParams 用于保留 sort 等参数）
    const $paginationContainer = $elem.find('.plp-pagination-wrapper');
    if ($paginationContainer.length > 0) {
      const paginationHtml = generatePagination(pagination, currentParams);
      // 注入分页器和产品数量
      const resultsCountHtml = `
          <span class="plp-results-count">共 <strong>${pagination.total || 0}</strong> 件产品</span>
      `;
      $paginationContainer.html(paginationHtml + resultsCountHtml);
      logWarn('[ProductListPage] Pagination injected');
    }

    // 5. 设置排序下拉框当前值（在服务端设置 selected 属性）
    const $sortSelect = $elem.find('.plp-sort-select');
    if ($sortSelect.length > 0) {
      const currentSort = currentParams.sort || config.defaultSort || 'name-asc';

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

    logWarn('[ProductListPage] Component processed successfully');
  } catch (error) {
    logWarn('[ProductListPage] Processing failed:', error);
  }
}
