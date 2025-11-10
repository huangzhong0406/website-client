/**
 * Product List Page Core Runtime Script
 * @description Client-side logic for product list interactions
 * @version 1.0.0 - SSR-safe, event delegation pattern
 */

(function() {
  'use strict';

  // SSR safety check
  if (typeof document === 'undefined') return;

  const SELECTORS = {
    container: '[data-component-type="product-list-page"]',
    categoryLink: '.plp-category-link',
    sortSelect: '.plp-sort-select',
    paginationButton: '.plp-pagination-button',
    productsContent: '.plp-products-content',
    loading: '.plp-loading',
    error: '.plp-error',
    retryButton: '.plp-retry-button',
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
   * ProductListPage Class
   */
  class ProductListPage {
    constructor(container) {
      this.container = container;
      this.config = this.parseConfig();
      this.state = {
        currentCategory: null,
        currentPage: 1,
        currentSort: this.config.defaultSort || 'name-asc',
        isLoading: false
      };

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
      this.initSortSelect();
    }

    attachEventListeners() {
      // Category links
      this.container.addEventListener('click', (e) => {
        const categoryLink = e.target.closest(SELECTORS.categoryLink);
        if (categoryLink) {
          e.preventDefault();
          const categoryId = categoryLink.getAttribute('data-category-id');
          this.handleCategoryChange(categoryId);
        }

        // Pagination buttons
        const paginationButton = e.target.closest(SELECTORS.paginationButton);
        if (paginationButton && !paginationButton.disabled) {
          e.preventDefault();
          const page = parseInt(paginationButton.getAttribute('data-page'));
          if (!isNaN(page)) {
            this.handlePageChange(page);
          }
        }

        // Retry button
        const retryButton = e.target.closest(SELECTORS.retryButton);
        if (retryButton) {
          this.handleRetry();
        }

        // Sidebar toggle (mobile)
        const sidebarToggle = e.target.closest(SELECTORS.sidebarToggle);
        if (sidebarToggle) {
          this.toggleSidebar();
        }
      });

      // Sort select
      const sortSelect = this.container.querySelector(SELECTORS.sortSelect);
      if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
          this.handleSortChange(e.target.value);
        });
      }
    }

    initSortSelect() {
      const sortSelect = this.container.querySelector(SELECTORS.sortSelect);
      if (sortSelect && this.state.currentSort) {
        sortSelect.value = this.state.currentSort;
      }
    }

    async handleCategoryChange(categoryId) {
      this.state.currentCategory = categoryId;
      this.state.currentPage = 1;
      this.updateActiveCategoryUI(categoryId);
      await this.loadProducts();
    }

    async handleSortChange(sortValue) {
      this.state.currentSort = sortValue;
      this.state.currentPage = 1;
      await this.loadProducts();
    }

    async handlePageChange(page) {
      this.state.currentPage = page;
      await this.loadProducts();
      this.scrollToTop();
    }

    async handleRetry() {
      await this.loadProducts();
    }

    toggleSidebar() {
      const sidebar = this.container.querySelector(SELECTORS.sidebar);
      if (sidebar) {
        sidebar.classList.toggle('plp-sidebar-open');
      }
    }

    async loadProducts() {
      if (this.state.isLoading) return;

      this.showLoading();
      this.hideError();

      try {
        const params = new URLSearchParams({
          category: this.state.currentCategory || '',
          page: this.state.currentPage,
          limit: this.config.itemsPerPage || 12,
          sort: this.state.currentSort
        });

        // Get tenant_id from page meta or global
        const tenantId = this.getTenantId();
        if (tenantId) {
          params.set('tenant_id', tenantId);
        }

        const apiBase = this.getApiBase();
        const response = await fetch(`${apiBase}/api/renderer/products?${params}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        this.renderProducts(data.products || []);
        this.renderPagination(data.pagination || {});
        this.hideLoading();
      } catch (error) {
        this.showError(error.message);
      }
    }

    showLoading() {
      this.state.isLoading = true;
      const loading = this.container.querySelector(SELECTORS.loading);
      if (loading) loading.style.display = 'flex';
      const content = this.container.querySelector(SELECTORS.productsContent);
      if (content) content.style.opacity = '0.5';
    }

    hideLoading() {
      this.state.isLoading = false;
      const loading = this.container.querySelector(SELECTORS.loading);
      if (loading) loading.style.display = 'none';
      const content = this.container.querySelector(SELECTORS.productsContent);
      if (content) content.style.opacity = '1';
    }

    showError(message) {
      this.hideLoading();
      const error = this.container.querySelector(SELECTORS.error);
      if (error) {
        error.style.display = 'flex';
        const errorMsg = error.querySelector('.plp-error-message');
        if (errorMsg) errorMsg.textContent = message || '加载失败，请稍后重试';
      }
    }

    hideError() {
      const error = this.container.querySelector(SELECTORS.error);
      if (error) error.style.display = 'none';
    }

    renderProducts(products) {
      const content = this.container.querySelector(SELECTORS.productsContent);
      if (!content) return;

      if (products.length === 0) {
        content.innerHTML = `
          <div class="plp-products-empty">
            <svg class="plp-empty-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" stroke-width="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <p class="plp-empty-text">暂无产品</p>
          </div>
        `;
        return;
      }

      const variant = this.container.getAttribute('data-variant') || 'grid';
      const html = variant === 'grid' ? this.renderProductsGrid(products) : this.renderProductsList(products);
      content.innerHTML = html;
    }

    renderProductsGrid(products) {
      const columns = this.config.columns || { desktop: 4, tablet: 3, mobile: 2 };
      return `
        <div class="plp-products-grid plp-grid-cols-${columns.desktop} plp-grid-md-${columns.tablet} plp-grid-sm-${columns.mobile}">
          ${products.map(p => `
            <div class="plp-product-card" data-product-id="${this.escapeHtml(p.id)}">
              <div class="plp-product-image-wrapper">
                <img src="${this.escapeHtml(p.image || '/placeholder.jpg')}" alt="${this.escapeHtml(p.name)}" class="plp-product-image" loading="lazy" />
              </div>
              <div class="plp-product-info">
                <h3 class="plp-product-name">${this.escapeHtml(p.name)}</h3>
                ${p.description ? `<p class="plp-product-description">${this.escapeHtml(p.description)}</p>` : ''}
                <div class="plp-product-price">¥${(p.price || 0).toFixed(2)}</div>
                <button class="plp-product-button" data-product-id="${this.escapeHtml(p.id)}">查看详情</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    renderProductsList(products) {
      return `
        <div class="plp-products-list-view">
          ${products.map(p => `
            <div class="plp-product-list-item" data-product-id="${this.escapeHtml(p.id)}">
              <div class="plp-product-list-image">
                <img src="${this.escapeHtml(p.image || '/placeholder.jpg')}" alt="${this.escapeHtml(p.name)}" loading="lazy" />
              </div>
              <div class="plp-product-list-content">
                <h3 class="plp-product-list-name">${this.escapeHtml(p.name)}</h3>
                <p class="plp-product-list-description">${this.escapeHtml(p.description || '暂无描述')}</p>
                <div class="plp-product-list-footer">
                  <div class="plp-product-list-price">¥${(p.price || 0).toFixed(2)}</div>
                  <button class="plp-product-list-button" data-product-id="${this.escapeHtml(p.id)}">查看详情</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    renderPagination(pagination) {
      const wrapper = this.container.querySelector('.plp-pagination-wrapper');
      if (!wrapper) return;

      if (!pagination || pagination.total_pages <= 1) {
        wrapper.innerHTML = '';
        return;
      }

      const { current_page, total_pages } = pagination;
      const pages = this.calculatePaginationPages(current_page, total_pages);

      wrapper.innerHTML = `
        <nav class="plp-pagination" aria-label="产品分页导航">
          <button class="plp-pagination-button plp-pagination-prev" data-page="${current_page - 1}" ${current_page === 1 ? 'disabled' : ''} aria-label="上一页">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="plp-pagination-pages">
            ${pages.map(page => page === '...' ? '<span class="plp-pagination-ellipsis">...</span>' : `
              <button class="plp-pagination-button plp-pagination-number ${page === current_page ? 'active' : ''}" data-page="${page}" ${page === current_page ? 'aria-current="page"' : ''}>${page}</button>
            `).join('')}
          </div>
          <button class="plp-pagination-button plp-pagination-next" data-page="${current_page + 1}" ${current_page === total_pages ? 'disabled' : ''} aria-label="下一页">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </nav>
      `;
    }

    calculatePaginationPages(current, total) {
      const pages = [1];
      const rangeStart = Math.max(2, current - 1);
      const rangeEnd = Math.min(total - 1, current + 1);
      if (rangeStart > 2) pages.push('...');
      for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
      if (rangeEnd < total - 1) pages.push('...');
      if (total > 1) pages.push(total);
      return pages;
    }

    updateActiveCategoryUI(categoryId) {
      const links = this.container.querySelectorAll(SELECTORS.categoryLink);
      links.forEach(link => {
        if (link.getAttribute('data-category-id') === categoryId) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    scrollToTop() {
      const main = this.container.querySelector('.plp-main');
      if (main) {
        main.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    getTenantId() {
      const meta = document.querySelector('meta[name="tenant-id"]');
      return meta ? meta.content : (window.__TENANT_ID__ || '');
    }

    getApiBase() {
      return window.__API_BASE__ || '';
    }

    escapeHtml(text) {
      if (typeof text !== 'string') return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
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
