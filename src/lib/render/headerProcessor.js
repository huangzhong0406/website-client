/**
 * 全局导航处理模块
 * 负责处理 Global-Header 导航组件
 */

import {logWarn} from "../logger.js";
import {generateMenuHtml, setCurrentPageByPath, validateMenuData} from "../../utils/header/generateMenuHtml.js";

/**
 * 处理 Global-Header 导航组件
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $nav - Global-Header 组件元素
 * @param {Object|string} navigationData - 导航菜单数据（对象或 JSON 字符串）
 * @param {string} currentSlug - 当前页面路径，用于高亮当前页
 */
export function processGlobalHeaderComponent($, $nav, navigationData, currentSlug) {
  try {
    // 验证输入参数
    if (!navigationData) {
      logWarn('[X-Nav] 未提供菜单数据');
      return;
    }

    // 查找菜单容器
    const $menuContainer = $nav.find('.header-menu');
    if ($menuContainer.length === 0) {
      logWarn('[X-Nav] 未找到菜单容器 .header-menu');
      return;
    }

    // 解析菜单数据（如果是 JSON 字符串）
    let menuData = navigationData;
    if (typeof navigationData === 'string') {
      try {
        menuData = JSON.parse(navigationData);
      } catch (e) {
        logWarn('[X-Nav] 菜单数据解析失败:', e);
        return;
      }
    }

    // 验证菜单数据结构
    const validation = validateMenuData(menuData);
    if (!validation.valid) {
      logWarn('[X-Nav] 菜单数据结构无效:', validation.error);
      return;
    }

    // 根据当前路径设置高亮
    if (currentSlug) {
      const currentPath = currentSlug.startsWith('/') ? currentSlug : `/${currentSlug}`;
      menuData = setCurrentPageByPath(menuData, currentPath);
    }

    // 生成菜单 HTML
    const menuHtml = generateMenuHtml(menuData.items || [], 0, currentSlug);

    if (!menuHtml || menuHtml.trim() === '') {
      logWarn('[X-Nav] 生成的菜单 HTML 为空');
      return;
    }

    // 注入菜单
    $menuContainer.html(menuHtml);

  } catch (error) {
    logWarn('[X-Nav] 处理失败:', error);
  }
}
