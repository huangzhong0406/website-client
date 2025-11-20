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

  if (rangeStart > 2) pages.push("...");
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < totalPages - 1) pages.push("...");
  if (totalPages > 1) pages.push(totalPages);

  return pages;
}

/**
 * Generate pagination HTML
 * @param {Object} pagination - 分页信息 {page: 当前页码, size: 每页数量, total: 总记录数}
 * @param {Object} currentParams - 当前 URL 参数（用于保留 sort 等参数）
 */
export function generatePagination(pagination, currentParams = {}) {
  if (!pagination || pagination.total <= 0) {
    return "";
  }

  const {page, size, total} = pagination;
  // 计算总页数：总记录数 / 每页数量，向上取整
  const totalPages = Math.ceil(total / size);

  // 如果只有一页，不显示分页器
  if (totalPages <= 1) {
    return "";
  }

  const pages = calculatePages(page, totalPages);

  // 构建分页 URL（保留其他参数，如 sort）
  const buildPageUrl = (page) => {
    const params = new URLSearchParams(currentParams);
    params.set("page", page);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  return `
    <nav class="plp-pagination" aria-label="产品分页导航">
      ${
        page > 1
          ? `
        <a
          href="${buildPageUrl(page - 1)}"
          class="plp-pagination-button plp-pagination-prev"
          aria-label="上一页"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </a>
      `
          : `
        <span
          class="plp-pagination-button plp-pagination-prev"
          aria-disabled="true"
          aria-label="上一页"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </span>
      `
      }

      <div class="plp-pagination-pages">
        ${pages
          .map((item) => {
            if (item === "...") {
              return '<span class="plp-pagination-ellipsis">...</span>';
            }
            if (item === page) {
              return `
              <span
                class="plp-pagination-button plp-pagination-number active"
                aria-current="page"
              >
                ${item}
              </span>
            `;
            }
            return `
            <a
              href="${buildPageUrl(item)}"
              class="plp-pagination-button plp-pagination-number"
            >
              ${item}
            </a>
          `;
          })
          .join("")}
      </div>

      ${
        page < totalPages
          ? `
        <a
          href="${buildPageUrl(page + 1)}"
          class="plp-pagination-button plp-pagination-next"
          aria-label="下一页"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </a>
      `
          : `
        <span
          class="plp-pagination-button plp-pagination-next"
          aria-disabled="true"
          aria-label="下一页"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </span>
      `
      }
    </nav>
  `;
}
