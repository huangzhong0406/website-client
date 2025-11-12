/**
 * Product List Page Core Runtime Script (SSR Mode)
 * @description Client-side logic for URL-based navigation (no data fetching)
 * @version 2.0.0 - Pure SSR mode with URL parameters
 */

(function() {
  'use strict';

  // SSR safety check
  if (typeof document === 'undefined') return;

  const SELECTORS = {
    container: '[data-component-type="product-list-page"]',
    categoryLink: '.plp-category-link',
    categoryToggle: '.plp-category-toggle',
    sortSelect: '.plp-sort-select',
    sidebarToggle: '.plp-sidebar-toggle',
    sidebar: '.plp-sidebar'
  };

  /**
   * Initialize all product list page containers
   */
  function initProductListPages() {
    const containers = document.querySelectorAll(SELECTORS.container);

    containers.forEach(container => {
      // Prevent duplicate initialization
      if (container.dataset.plpInitialized === 'true') return;
      container.dataset.plpInitialized = 'true';

      new ProductListPage(container);
    });
  }

  /**
   * ProductListPage Class (Simplified for SSR)
   */
  class ProductListPage {
    constructor(container) {
      this.container = container;
      this.config = this.parseConfig();
      this.init();
    }

    parseConfig() {
      try {
        const configStr = this.container.getAttribute('data-config');
        return configStr ? JSON.parse(configStr) : {};
      } catch (e) {
        return {};
      }
    }

    init() {
      this.attachEventListeners();
      this.markActiveCategory();
      this.setSortSelectValue();
    }

    attachEventListeners() {
      // Sort select change
      const sortSelect = this.container.querySelector(SELECTORS.sortSelect);
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          this.handleSortChange(e.target.value);
        });
      }

      // Category expand/collapse toggle
      this.container.addEventListener('click', (e) => {
        const toggleButton = e.target.closest(SELECTORS.categoryToggle);
        if (toggleButton) {
          e.preventDefault();
          e.stopPropagation(); // 阻止事件冒泡
          this.toggleCategory(toggleButton);
          return;
        }

        // Sidebar toggle (mobile)
        const sidebarToggle = e.target.closest(SELECTORS.sidebarToggle);
        if (sidebarToggle) {
          e.stopPropagation(); // 阻止事件冒泡
          this.toggleSidebar();
        }
      });
    }

    /**
     * Handle sort change - rebuild URL with new sort parameter
     */
    handleSortChange(sortValue) {
      const url = new URL(window.location.href);
      url.searchParams.set('sort', sortValue);
      url.searchParams.delete('page');  // Reset page when sorting changes
      window.location.href = url.toString();
    }

    /**
     * Toggle category expand/collapse
     */
    toggleCategory(toggleButton) {
      const categoryItem = toggleButton.closest('.plp-category-item');
      if (!categoryItem) {
        console.warn('[ProductListPage] Category item not found');
        return;
      }

      const isExpanded = categoryItem.classList.toggle('expanded');
      toggleButton.setAttribute('aria-expanded', isExpanded);

      // Debug log
      console.log('[ProductListPage] Category toggled:', {
        categoryId: categoryItem.getAttribute('data-category-id'),
        isExpanded,
        classes: categoryItem.className
      });
    }

    /**
     * Toggle sidebar visibility (mobile only)
     */
    toggleSidebar() {
      const sidebar = this.container.querySelector(SELECTORS.sidebar);
      if (sidebar) {
        sidebar.classList.toggle('plp-sidebar-open');
      }
    }

    /**
     * Mark active category based on current URL path
     */
    markActiveCategory() {
      const currentPath = window.location.pathname;
      const links = this.container.querySelectorAll(SELECTORS.categoryLink);

      links.forEach(link => {
        const linkPath = link.getAttribute('href');
        if (linkPath === currentPath) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        } else {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        }
      });
    }

    /**
     * Set sort select value based on URL parameter or data attribute
     */
    setSortSelectValue() {
      const sortSelect = this.container.querySelector(SELECTORS.sortSelect);
      if (!sortSelect) return;

      // Try to get from URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      const sortParam = urlParams.get('sort');

      // Or from data attribute (set by server)
      const dataSort = sortSelect.getAttribute('data-current-sort');

      const currentSort = sortParam || dataSort || this.config.defaultSort || 'name-asc';
      sortSelect.value = currentSort;
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductListPages);
  } else {
    initProductListPages();
  }

  // Re-initialize on dynamic content changes (SPA support)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.matches && node.matches(SELECTORS.container)) {
            new ProductListPage(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
