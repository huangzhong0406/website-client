/**
 * 产品列表详情页处理模块
 * 负责处理产品列表详情组件（不含分类，包含产品列表、分页）
 */

import {logWarn} from "../logger.js";
import {generateProductDetailGrid, generateProductDetailList} from "../../utils/productlist/generateProductDetail.js";
import {generatePagination} from "../../utils/productlist/generatePagination.js";

/**
 * 处理产品列表详情组件 (Product List Detail Component)
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Cheerio} $elem - Component element
 * @param {Object} productListData - Product list data containing products and pagination
 * @param {Object} currentParams - 当前 URL 参数（用于生成分页链接）
 */
export function processProductListDetailComponent($, $elem, productListData, currentParams = {}) {
  try {
    // 解析组件配置
    const configStr = $elem.attr('data-config');
    let config = {};
    try {
      config = configStr ? JSON.parse(configStr) : {};
    } catch (e) {
      logWarn('[ProductListDetail] Failed to parse config:', e);
    }

    // 获取数据
    const { products = [], pagination = {} } = productListData;

    // 获取布局变体
    const variant = $elem.attr('data-variant') || config.displayMode || 'grid';

    console.log("产品列表详情页配置", config);

    // 获取配置选项
    const showProductDescription = config.showProductDescription !== false; // 默认显示描述

    // 1. 注入产品列表
    const $productsContainer = $elem.find('.pld-products-content');
    if ($productsContainer.length > 0) {
      let productsHtml;
      if (variant === 'list') {
        productsHtml = generateProductDetailList(products, showProductDescription);
      } else {
        productsHtml = generateProductDetailGrid(products, config, showProductDescription);
      }
      $productsContainer.html(productsHtml);
      logWarn('[ProductListDetail] Products injected:', products.length);
    }

    // 2. 注入分页器（传递 currentParams 用于保留 sort 等参数）
    const $paginationContainer = $elem.find('.pld-pagination-wrapper');
    if ($paginationContainer.length > 0) {
      const paginationHtml = generatePagination(pagination, currentParams);
      // 注入分页器和产品数量
      const resultsCountHtml = `
        <span class="pld-results-count">共 <strong>${pagination.total_items || 0}</strong> 件产品</span>
      `;
      $paginationContainer.html(paginationHtml + resultsCountHtml);
      logWarn('[ProductListDetail] Pagination injected');
    }

    // 3. 设置排序下拉框当前值
    if (currentParams.sort) {
      const $sortSelect = $elem.find('.pld-sort-select');
      if ($sortSelect.length > 0) {
        $sortSelect.attr('data-current-sort', currentParams.sort);
        // 注意：select 的 value 需要在客户端 JS 中设置
      }
    }

    logWarn('[ProductListDetail] Component processed successfully');
  } catch (error) {
    logWarn('[ProductListDetail] Processing failed:', error);
  }
}
