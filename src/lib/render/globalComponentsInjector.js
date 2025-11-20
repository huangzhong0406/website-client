/**
 * 全局组件注入模块
 * 负责自动注入全局头部和页脚组件
 */

import {logWarn} from "../logger.js";
import {processGlobalHeaderComponent} from "./headerProcessor.js";

/**
 * 注入全局组件到页面
 * 如果页面中不存在全局组件,则自动注入
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Array} globalComponents - 全局组件数组
 * @param {string} currentSlug - 当前页面路径，用于菜单高亮
 */
export function injectGlobalComponents($, globalComponents, currentSlug = '') {
  console.log("准备注入全局组件:", globalComponents);
  if (!globalComponents?.length) {
    return;
  }

  const body = $("body");
  const root = body.length > 0 ? body : $.root();

  // 检查是否已存在全局组件
  const hasFooter = $('[data-component-type="global-footer"]').length > 0;
  const hasGlobalFooter = $('[data-component-type="global-footer"]').length > 0;  // ✅ 检查 Global-Footer 组件
  const hasHeader = $('[data-component-type="global-header"]').length > 0;  // ✅ 检查 Global-Header 组件

  // 注入全局组件
  globalComponents.forEach((com) => {
    // ✅ 注入 Global-Header 组件（新的头部系统）
    if (com.type === "header" && com.json_data?.html) {
      console.log("[Render] 检测到全局 Global-Header 组件");

      // 从 HTML 中生成导航数据（如果需要）
      const $headerHtml = $(com.json_data.html);

      if (hasHeader) {
        // 如果页面已有 Header 占位符，替换它
        $('[data-component-type="global-header"]').first().replaceWith($headerHtml);
        console.log("[Render] 已替换页面中的 Global-Header 占位符");
      } else {
        // 如果没有 Header，插入到页面顶部
        root.prepend($headerHtml);
        console.log("[Render] 已将 Global-Header 插入到页面顶部");
      }

      // 注入 Header 样式
      if (com.json_data.css) {
        root.prepend(`<style data-critical="true" data-global-header-styles="true">${com.json_data.css}</style>`);
      }

      // ✅ 新增：处理菜单数据（动态注入菜单项）
      let menuData = com.json_data.components?.menuData || com.json_data.menuData;
      if (menuData) {
        const $nav = $('[data-component-type="global-header"]');
        if ($nav.length > 0) {
          console.log("[Render] 开始处理 Global-Header 菜单数据");
          processGlobalHeaderComponent($, $nav.first(), menuData, currentSlug);
        }
      }

      // ✅ 新增：注入运行时脚本
      root.append(`<script src="/scripts/global-header-core.js" defer></script>`);

      // ✅ 新增：注入变体样式
      const variant = com.json_data.variant || "classic";
      root.prepend(`<link rel="stylesheet" href="/styles/global-header-${variant}.css">`);

      logWarn("已自动注入全局 Global-Header 组件");
    }

    // 注入全局页脚 - 没有的话就插入，有的话就替换第一个
    if (com.type == "footer" && com.json_data?.html) {
      // 旧版 tailwind-footer（向后兼容）
      if (hasFooter) {
        $('[data-component-type="global-footer"]').first().replaceWith(com.json_data.html);
      } else if (!hasGlobalFooter) {
        // 如果没有新版 global-footer，才插入旧版
        root.append(com.json_data.html);
      }
      logWarn("已自动注入全局页脚组件");
    }

    // ✅ 注入 Global-Footer 组件（新的页脚系统）
    if (com.type === "global-footer" && com.json_data?.html) {
      console.log("[Render] 检测到全局 Global-Footer 组件");

      const $footerHtml = $(com.json_data.html);

      if (hasGlobalFooter) {
        // 如果页面已有 Footer 占位符，替换它
        $('[data-component-type="global-footer"]').first().replaceWith($footerHtml);
        console.log("[Render] 已替换页面中的 Global-Footer 占位符");
      } else {
        // 如果没有 Footer，插入到页面底部
        root.append($footerHtml);
        console.log("[Render] 已将 Global-Footer 插入到页面底部");
      }

      // 注入 Footer 样式
      if (com.json_data.css) {
        root.prepend(`<style data-critical="true" data-global-footer-styles="true">${com.json_data.css}</style>`);
      }

      logWarn("已自动注入全局 Global-Footer 组件");
    }
  });
}
