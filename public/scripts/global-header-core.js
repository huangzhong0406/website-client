/**
 * X-Nav Core - 导航组件核心交互逻辑
 * @version 2.0.0
 * @description 符合 HTML5 语义化规范的纯导航菜单组件核心脚本
 *
 * 特性:
 * - 零依赖原生 JavaScript
 * - 事件委托模式
 * - SSR 安全
 * - 支持多级下拉菜单
 * - 响应式交互 (PC/移动端)
 * - 基本 ARIA 可访问性支持
 */

(function() {
  'use strict';

  // ==================== 配置项 ====================
  const CONFIG = {
    // Data 属性选择器
    selectors: {
      nav: '[data-header]',
      menu: '[data-header-menu]',
      item: '[data-header-item]',
      trigger: '[data-header-trigger]',
      submenu: '[data-header-sub]',
      hamburger: '[data-header-hamburger]'
    },

    // CSS 类名
    classes: {
      active: 'header-active',
      open: 'header-open',
      mobileOpen: 'header-mobile-open'
    },

    // 响应式断点
    breakpoint: 768,

    // 动画时长 (ms)
    transitionDuration: 200,

    // 防抖延迟 (ms)
    hoverDelay: 100
  };

  // ==================== 工具函数 ====================

  /**
   * 防抖函数
   */
  function debounce(func, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * 检查是否为移动端
   */
  function isMobile() {
    return window.innerWidth < CONFIG.breakpoint;
  }

  /**
   * 检查是否为触摸设备
   */
  function isTouchDevice() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  }

  // ==================== 核心类 ====================

  class GlobalHeader {
    constructor(navElement) {
      this.nav = navElement;
      this.activeSubmenu = null;
      this.hoverTimer = null;
      this.isMobileMenuOpen = false;

      this.init();
    }

    /**
     * 初始化
     */
    init() {
      this.bindEvents();
      this.setupAriaAttributes();
    }

    /**
     * 设置 ARIA 属性
     */
    setupAriaAttributes() {
      const triggers = this.nav.querySelectorAll(CONFIG.selectors.trigger);
      triggers.forEach(trigger => {
        if (!trigger.hasAttribute('aria-expanded')) {
          trigger.setAttribute('aria-expanded', 'false');
        }
        if (!trigger.hasAttribute('aria-haspopup')) {
          trigger.setAttribute('aria-haspopup', 'true');
        }
      });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
      // 事件委托：所有点击事件
      this.nav.addEventListener('click', this.handleClick.bind(this));

      // PC 端悬浮事件（仅在非触摸设备上）
      if (!isTouchDevice()) {
        this.nav.addEventListener('mouseenter', this.handleMouseEnter.bind(this), true);
        this.nav.addEventListener('mouseleave', this.handleMouseLeave.bind(this), true);
      }

      // 点击外部关闭菜单
      document.addEventListener('click', this.handleOutsideClick.bind(this));

      // 窗口调整大小
      window.addEventListener('resize', debounce(this.handleResize.bind(this), 200));

      // ESC 键关闭菜单
      document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    /**
     * 处理点击事件
     */
    handleClick(e) {
      // 汉堡菜单按钮
      const hamburger = e.target.closest(CONFIG.selectors.hamburger);
      if (hamburger) {
        e.preventDefault();
        this.toggleMobileMenu();
        return;
      }

      // 菜单触发按钮
      const trigger = e.target.closest(CONFIG.selectors.trigger);
      if (trigger) {
        e.preventDefault();
        this.toggleSubmenu(trigger);
        return;
      }

      // 菜单链接（直接跳转，不做处理）
    }

    /**
     * 处理鼠标进入事件 (PC端)
     */
    handleMouseEnter(e) {
      if (isMobile()) return;

      const item = e.target.closest(CONFIG.selectors.item);
      if (!item) return;

      const trigger = item.querySelector(CONFIG.selectors.trigger);
      if (!trigger) return;

      // 清除之前的定时器
      clearTimeout(this.hoverTimer);

      // 延迟展开（避免误触发）
      this.hoverTimer = setTimeout(() => {
        this.openSubmenu(trigger);
      }, CONFIG.hoverDelay);
    }

    /**
     * 处理鼠标离开事件 (PC端)
     */
    handleMouseLeave(e) {
      if (isMobile()) return;

      const item = e.target.closest(CONFIG.selectors.item);
      if (!item) return;

      // 清除定时器
      clearTimeout(this.hoverTimer);

      const trigger = item.querySelector(CONFIG.selectors.trigger);
      if (!trigger) return;

      // 延迟关闭（允许鼠标移动到子菜单）
      this.hoverTimer = setTimeout(() => {
        this.closeSubmenu(trigger);
      }, CONFIG.hoverDelay);
    }

    /**
     * 处理外部点击
     */
    handleOutsideClick(e) {
      if (!this.nav.contains(e.target)) {
        this.closeAllSubmenus();
        if (isMobile() && this.isMobileMenuOpen) {
          this.closeMobileMenu();
        }
      }
    }

    /**
     * 处理键盘事件
     */
    handleKeyDown(e) {
      if (e.key === 'Escape') {
        this.closeAllSubmenus();
        if (this.isMobileMenuOpen) {
          this.closeMobileMenu();
        }
      }
    }

    /**
     * 处理窗口调整大小
     */
    handleResize() {
      // 从移动端切换到桌面端时，关闭移动菜单
      if (!isMobile() && this.isMobileMenuOpen) {
        this.closeMobileMenu();
      }

      // 关闭所有子菜单
      this.closeAllSubmenus();
    }

    /**
     * 切换子菜单
     */
    toggleSubmenu(trigger) {
      const submenu = this.getSubmenu(trigger);
      if (!submenu) return;

      const isOpen = submenu.hasAttribute('hidden') === false;

      if (isOpen) {
        this.closeSubmenu(trigger);
      } else {
        // 先关闭其他同级菜单
        this.closeSiblingsSubmenus(trigger);
        this.openSubmenu(trigger);
      }
    }

    /**
     * 打开子菜单
     */
    openSubmenu(trigger) {
      const submenu = this.getSubmenu(trigger);
      if (!submenu) return;

      submenu.removeAttribute('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      trigger.classList.add(CONFIG.classes.active);

      this.activeSubmenu = submenu;
    }

    /**
     * 关闭子菜单
     */
    closeSubmenu(trigger) {
      const submenu = this.getSubmenu(trigger);
      if (!submenu) return;

      submenu.setAttribute('hidden', '');
      trigger.setAttribute('aria-expanded', 'false');
      trigger.classList.remove(CONFIG.classes.active);

      // 递归关闭所有子级子菜单
      const childTriggers = submenu.querySelectorAll(CONFIG.selectors.trigger);
      childTriggers.forEach(childTrigger => {
        this.closeSubmenu(childTrigger);
      });

      if (this.activeSubmenu === submenu) {
        this.activeSubmenu = null;
      }
    }

    /**
     * 关闭同级子菜单
     */
    closeSiblingsSubmenus(trigger) {
      const item = trigger.closest(CONFIG.selectors.item);
      if (!item || !item.parentElement) return;

      const siblings = Array.from(item.parentElement.children);
      siblings.forEach(sibling => {
        if (sibling === item) return;
        const siblingTrigger = sibling.querySelector(CONFIG.selectors.trigger);
        if (siblingTrigger) {
          this.closeSubmenu(siblingTrigger);
        }
      });
    }

    /**
     * 关闭所有子菜单
     */
    closeAllSubmenus() {
      const triggers = this.nav.querySelectorAll(CONFIG.selectors.trigger);
      triggers.forEach(trigger => {
        this.closeSubmenu(trigger);
      });
    }

    /**
     * 切换移动端菜单
     */
    toggleMobileMenu() {
      if (this.isMobileMenuOpen) {
        this.closeMobileMenu();
      } else {
        this.openMobileMenu();
      }
    }

    /**
     * 打开移动端菜单
     */
    openMobileMenu() {
      this.nav.classList.add(CONFIG.classes.mobileOpen);
      this.isMobileMenuOpen = true;

      // 防止背景滚动
      document.body.style.overflow = 'hidden';

      const hamburger = this.nav.querySelector(CONFIG.selectors.hamburger);
      if (hamburger) {
        hamburger.setAttribute('aria-expanded', 'true');
      }
    }

    /**
     * 关闭移动端菜单
     */
    closeMobileMenu() {
      this.nav.classList.remove(CONFIG.classes.mobileOpen);
      this.isMobileMenuOpen = false;

      // 恢复背景滚动
      document.body.style.overflow = '';

      const hamburger = this.nav.querySelector(CONFIG.selectors.hamburger);
      if (hamburger) {
        hamburger.setAttribute('aria-expanded', 'false');
      }

      // 关闭所有子菜单
      this.closeAllSubmenus();
    }

    /**
     * 获取子菜单
     */
    getSubmenu(trigger) {
      const item = trigger.closest(CONFIG.selectors.item);
      if (!item) return null;
      return item.querySelector(CONFIG.selectors.submenu);
    }
  }

  // ==================== 自动初始化 ====================

  /**
   * DOM 加载完成后初始化所有 X-Nav
   */
  function initAllNavs() {
    // SSR 安全检查
    if (typeof window === 'undefined') return;

    const navElements = document.querySelectorAll(CONFIG.selectors.nav);

    if (navElements.length === 0) {
      console.log('[X-Nav] 未找到导航元素');
      return;
    }

    navElements.forEach(navElement => {
      // 避免重复初始化
      if (navElement.headerInstance) {
        return;
      }

      navElement.headerInstance = new GlobalHeader(navElement);
    });

  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllNavs);
  } else {
    // DOM 已加载（用于动态加载脚本的情况）
    initAllNavs();
  }

  // 暴露给全局（用于手动初始化）
  window.GlobalHeader = GlobalHeader;
  window.GlobalHeaderInit = initAllNavs;

})();
