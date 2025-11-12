/**
 * Product List Detail Core Runtime Script (SSR Mode)
 * @description Client-side logic for URL-based navigation (no data fetching, no categories)
 * @version 1.0.0 - Pure SSR mode with URL parameters
 */

(function() {
  'use strict';

  // SSR safety check
  if (typeof document === 'undefined') return;

  const SELECTORS = {
    container: '[data-component-type="product-list-detail"]',
    sortSelect: '.pld-sort-select',
    paginationButton: '.pld-pagination-button'
  };

  /**
   * Initialize all product list detail containers
   */
  function initProductListDetails() {
    const containers = document.querySelectorAll(SELECTORS.container);

    containers.forEach(container => {
      // Prevent duplicate initialization
      if (container.dataset.pldInitialized === 'true') return;
      container.dataset.pldInitialized = 'true';

      new ProductListDetail(container);
    });
  }

  /**
   * ProductListDetail Class (Simplified for SSR)
   */
  class ProductListDetail {
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

      // Pagination buttons (using event delegation)
      this.container.addEventListener('click', (e) => {
        const paginationButton = e.target.closest(SELECTORS.paginationButton);
        if (paginationButton && !paginationButton.disabled) {
          e.preventDefault();
          const page = paginationButton.getAttribute('data-page');
          if (page) {
            this.handlePageChange(parseInt(page, 10));
          }
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
     * Handle page change - rebuild URL with new page parameter
     */
    handlePageChange(page) {
      const url = new URL(window.location.href);
      url.searchParams.set('page', page.toString());
      window.location.href = url.toString();
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
    document.addEventListener('DOMContentLoaded', initProductListDetails);
  } else {
    initProductListDetails();
  }

  // Re-initialize on dynamic content changes (SPA support)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.matches && node.matches(SELECTORS.container)) {
            new ProductListDetail(node);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
