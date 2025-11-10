/**
 * Generate Pagination HTML (Server-side)
 * @description SSR-safe pagination generation
 */

/**
 * Calculate pagination pages
 */
function calculatePages(currentPage, totalPages) {
  const pages = [1];
  const rangeStart = Math.max(2, currentPage - 1);
  const rangeEnd = Math.min(totalPages - 1, currentPage + 1);

  if (rangeStart > 2) pages.push('...');
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < totalPages - 1) pages.push('...');
  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

/**
 * Generate pagination HTML
 */
export function generatePagination(pagination) {
  if (!pagination || pagination.total_pages <= 1) {
    return '';
  }

  const { current_page, total_pages } = pagination;
  const pages = calculatePages(current_page, total_pages);

  return `
    <nav class="plp-pagination" aria-label="产品分页导航">
      <button
        class="plp-pagination-button plp-pagination-prev"
        data-page="${current_page - 1}"
        ${current_page === 1 ? 'disabled' : ''}
        aria-label="上一页"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>

      <div class="plp-pagination-pages">
        ${pages.map(page => {
          if (page === '...') {
            return '<span class="plp-pagination-ellipsis">...</span>';
          }
          return `
            <button
              class="plp-pagination-button plp-pagination-number ${page === current_page ? 'active' : ''}"
              data-page="${page}"
              ${page === current_page ? 'aria-current="page"' : ''}
            >
              ${page}
            </button>
          `;
        }).join('')}
      </div>

      <button
        class="plp-pagination-button plp-pagination-next"
        data-page="${current_page + 1}"
        ${current_page === total_pages ? 'disabled' : ''}
        aria-label="下一页"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    </nav>
  `;
}
