/**
 * 排序选项配置
 * 用于产品列表和博客列表的排序功能
 */

/**
 * 产品排序选项
 * @type {Array<{value: string, name: string}>}
 */
export const PRODUCT_SORT_OPTIONS = [
  { value: "name-asc", name: "名称 A-Z" },
  { value: "name-desc", name: "名称 Z-A" },
  { value: "date-desc", name: "最新上架" },
  { value: "date-asc", name: "最早上架" }
];

/**
 * 博客排序选项
 * @type {Array<{value: string, name: string}>}
 */
export const BLOG_SORT_OPTIONS = [
  {value: "published_at-desc", name: "最新发布"},
  {value: "published_at-asc", name: "最早发布"},
  {value: "name-asc", name: "标题 A-Z"},
  {value: "name-desc", name: "标题 Z-A"}
];

/**
 * 默认排序值
 */
export const DEFAULT_PRODUCT_SORT = "name-asc";
export const DEFAULT_BLOG_SORT = "published_at-desc";

/**
 * 排序字段映射（前端字段 → API 字段）
 * 用于将前端的排序字段名映射到 API 所需的字段名
 */
export const SORT_FIELD_MAP = {
  name: "name",        // 名称字段
  price: "price",      // 价格字段
  date: "created_at"   // 日期字段映射到 created_at
};

/**
 * 解析排序值为 API 所需的字段和顺序
 * @param {string} sortValue - 排序值，格式为 "field-order"（如 "name-asc"）
 * @param {boolean} mapField - 是否映射字段名到 API 字段（默认 true）
 * @returns {{sortBy: string, sortOrder: string}} 返回 sortBy 和 sortOrder
 *
 * @example
 * parseSortValue("name-asc")   // { sortBy: "name", sortOrder: "asc" }
 * parseSortValue("price-desc") // { sortBy: "price", sortOrder: "desc" }
 * parseSortValue("date-asc")   // { sortBy: "created_at", sortOrder: "asc" }
 */
export function parseSortValue(sortValue) {
  if (!sortValue || typeof sortValue !== 'string') {
    return { sortBy: '', sortOrder: '' };
  }
  const [sortBy, sortOrder] = sortValue.split("-");

  return {
    sortBy: sortBy || "",
    sortOrder: sortOrder || ""
  };
}

/**
 * 根据排序字段和顺序组合成排序值
 * @param {string} sortBy - 排序字段（如 "name"、"price"、"date"）
 * @param {string} sortOrder - 排序顺序（"asc" 或 "desc"）
 * @returns {string} 排序值（如 "name-asc"）
 *
 * @example
 * buildSortValue("name", "asc")  // "name-asc"
 * buildSortValue("price", "desc") // "price-desc"
 */
export function buildSortValue(sortBy, sortOrder) {
  if (!sortBy || !sortOrder) {
    return '';
  }
  return `${sortBy}-${sortOrder}`;
}

/**
 * 验证排序值是否有效
 * @param {string} sortValue - 要验证的排序值
 * @param {string} type - 类型（"product" 或 "blog"）
 * @returns {boolean} 是否有效
 *
 * @example
 * isValidSortValue("name-asc", "product")   // true
 * isValidSortValue("invalid", "product")    // false
 */
export function isValidSortValue(sortValue, type = "product") {
  const options = type === "blog" ? BLOG_SORT_OPTIONS : PRODUCT_SORT_OPTIONS;
  return options.some(option => option.value === sortValue);
}

/**
 * 获取有效的排序值或返回默认值
 * @param {string} sortValue - 要验证的排序值
 * @param {string} type - 类型（"product" 或 "blog"）
 * @returns {string} 有效的排序值
 *
 * @example
 * getValidSortValue("name-asc", "product")   // "name-asc"
 * getValidSortValue("invalid", "product")    // "name-asc" (默认值)
 */
export function getValidSortValue(sortValue, type = "product") {
  if (isValidSortValue(sortValue, type)) {
    return sortValue;
  }
  return type === "blog" ? DEFAULT_BLOG_SORT : DEFAULT_PRODUCT_SORT;
}
