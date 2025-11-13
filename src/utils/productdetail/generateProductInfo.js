/**
 * 生成产品信息区 HTML
 * @param {Object} data - 产品数据
 * @param {Object} config - 配置对象
 * @returns {string} HTML 字符串
 */
export function generateProductInfoHtml(data, config = {}) {
  const { title, description, contact = {}, files = [] } = data;
  const showFiles = config.showFiles !== false;

  return `
    <div class="pd-info-wrapper">
      <h1 class="pd-title">${title || "Product Title"}</h1>

      ${
        description
          ? `
        <div class="pd-brief-description">${description}</div>
      `
          : ""
      }

      ${
        contact.email || contact.phone || contact.whatsapp
          ? `
        <div class="pd-contact">
          ${
            contact.email
              ? `
            <div class="contact-item">
              <span class="contact-label">Email:</span>
              <a href="mailto:${contact.email}" class="contact-value">${contact.email}</a>
            </div>
          `
              : ""
          }

          ${
            contact.phone
              ? `
            <div class="contact-item">
              <span class="contact-label">Tel:</span>
              <a href="tel:${contact.phone}" class="contact-value">${contact.phone}</a>
            </div>
          `
              : ""
          }

          ${
            contact.whatsapp
              ? `
            <div class="contact-item">
              <span class="contact-label">WhatsApp:</span>
              <a href="https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}"
                 target="_blank"
                 rel="noopener noreferrer"
                 class="contact-value">${contact.whatsapp}</a>
            </div>
          `
              : ""
          }
        </div>
      `
          : ""
      }

      <div>
        <button class="pd-quote-btn">REQUEST A QUOTE</button>
      </div>

      ${
        showFiles && files.length > 0
          ? `
        <div class="pd-files">
          <h3>Downloads</h3>
          <div class="file-list">
            ${files
              .map(
                (file) => `
              <a href="${file.url}"
                 download
                 class="file-item"
                 target="_blank"
                 rel="noopener noreferrer">
                <img class="file-icon" src="https://shopsource.singoo.cc/common/special/bxs-file-pdf.svg" />
                <span class="file-name">${file.name}</span>
              </a>
            `
              )
              .join("")}
          </div>
        </div>
      `
          : ""
      }
    </div>
  `;
}
