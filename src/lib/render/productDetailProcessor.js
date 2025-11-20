import { generateGalleryHtml } from "../../utils/productdetail/generateGallery.js";
import { generateProductInfoHtml } from "../../utils/productdetail/generateProductInfo.js";
import { generateDescriptionTabsHtml } from "../../utils/productdetail/generateDescriptionTabs.js";

/**
 * 处理产品详情组件的 SSR 渲染
 * @param {CheerioAPI} $ - Cheerio 实例
 * @param {Cheerio} $elem - 组件元素
 * @param {object} productDetailData - 产品详情数据（来自 page_data.product_detail）
 */
export function processProductDetailComponent($, $elem, productDetailData) {
  if (!productDetailData) {
    console.warn('No product detail data provided');
    return;
  }

  // 解析配置
  const configStr = $elem.attr('data-config');
  const config = configStr ? JSON.parse(configStr) : {};

  const {id, name, summary, files = {}, contact = {}, contents = []} = productDetailData;

  // 从 files.images 提取图片数据
  const images = files.images || [];

  // 1. 注入产品图片轮播
  const $gallery = $elem.find('.pd-gallery');
  if ($gallery.length > 0 && images.length > 0) {
    const galleryHtml = generateGalleryHtml(images);
    $gallery.html(galleryHtml);
  }

  // 2. 注入产品信息
  const $info = $elem.find('.pd-info');
  if ($info.length > 0) {
    const infoHtml = generateProductInfoHtml(productDetailData, config);
    $info.html(infoHtml);
  }

  // 3. 注入产品描述标签页
  const $description = $elem.find('.pd-description');
  if ($description.length > 0 && contents.length > 0) {
    const descriptionHtml = generateDescriptionTabsHtml(contents);
    $description.html(descriptionHtml);
  }

  // 4. 设置 data-product-id 供 CSR 使用（加载相关产品）
  $elem.attr('data-product-id', id);

  // 5. 相关产品容器保持骨架图，等待 CSR 加载
}
