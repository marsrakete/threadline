/**
 * Creates an A4 PDF builder with explicit metadata providers.
 * @param {object} options - Metadata adapters.
 * @param {() => string} options.applicationLabel - Current application/version label.
 * @param {() => Date} options.now - Creation and modification time.
 * @returns {(pages: object[], metadata?: {title?: string}) => Blob} Builder for pages with content, JPEG images and optional link annotations.
 */
export function createPdfFileBuilder(options) {
  if (!options || typeof options.applicationLabel !== "function" || typeof options.now !== "function") {
    throw new TypeError("PDF builder requires application-label and clock adapters.");
  }
  /**
   * Escapes a PDF literal string.
   * @param {*} value - Plain text.
   * @returns {string} Escaped backslashes and parentheses.
   */
  function escapePdfText(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  /**
   * Encodes Unicode metadata as UTF-16BE hexadecimal with a BOM.
   * @param {*} value - Metadata text.
   * @returns {string} PDF hex string.
   */
  function encodePdfHexString(value) {
    const text = String(value || "");
    let hex = "FEFF";
    for (let index = 0; index < text.length; index += 1) {
      hex += text.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
    }
    return `<${hex}>`;
  }

  /**
   * Formats a JavaScript date as a PDF metadata date.
   * @param {Date} date - Date to format.
   * @returns {string} PDF date string.
   */
  function formatPdfMetadataDate(date = new Date()) {
    let safeDate = new Date();
    if (date instanceof Date) {
      safeDate = date;
    }
    const year = String(safeDate.getFullYear()).padStart(4, "0");
    const month = String(safeDate.getMonth() + 1).padStart(2, "0");
    const day = String(safeDate.getDate()).padStart(2, "0");
    const hours = String(safeDate.getHours()).padStart(2, "0");
    const minutes = String(safeDate.getMinutes()).padStart(2, "0");
    const seconds = String(safeDate.getSeconds()).padStart(2, "0");
    const offsetMinutes = -safeDate.getTimezoneOffset();
    let sign = "+";
    if (offsetMinutes < 0) {
      sign = "-";
    }
    const absoluteOffset = Math.abs(offsetMinutes);
    const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
    const offsetRemainder = String(absoluteOffset % 60).padStart(2, "0");
    return `D:${year}${month}${day}${hours}${minutes}${seconds}${sign}${offsetHours}'${offsetRemainder}'`;
  }

  /**
   * Builds a PDF Info dictionary for Threadline exports.
   * @param {string} title - Optional document title.
   * @returns {string} PDF Info dictionary object source.
   */
  function buildPdfMetadataInfoDictionary(title = "") {
    const applicationLabel = options.applicationLabel();
    const createdAt = formatPdfMetadataDate(options.now());
    const entries = [
      `/Author ${encodePdfHexString(applicationLabel)}`,
      `/Creator ${encodePdfHexString(applicationLabel)}`,
      `/Producer ${encodePdfHexString(applicationLabel)}`,
      `/CreationDate (${escapePdfText(createdAt)})`,
      `/ModDate (${escapePdfText(createdAt)})`,
    ];
    const normalizedTitle = String(title || "").trim();
    if (normalizedTitle) {
      entries.unshift(`/Title ${encodePdfHexString(normalizedTitle)}`);
    }
    return `<< ${entries.join(" ")} >>`;
  }

  /**
   * Exports the current comparison through the analysis PDF renderer.
   * @returns {Promise<void>} Completion.
   */

  /**
   * Builds an image-backed PDF blob with Threadline file metadata.
   * @param {Array<object>} pages - PDF pages with content, images and annotations.
   * @param {object} metadata - Optional metadata values.
   * @param {string} metadata.title - Optional PDF title.
   * @returns {Blob} PDF blob.
   */
  function buildPdfFile(pages, metadata = {}) {
    const encoder = new TextEncoder();
    const objects = [null];
    const fontRegularId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    /**
     * Adds a PDF object without changing object order.
     * @param {string|object} data - Literal object or byte stream.
     * @returns {number} Object reference.
     */
    function addObject(data) {
      objects.push(data);
      return objects.length - 1;
    }
    const pageIds = [];

    for (const page of pages) {
      const xObjects = {};
      for (const image of page.images) {
        const imageId = addObject({
          header: `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
          bytes: image.bytes,
          footer: "\nendstream",
        });
        xObjects[image.name] = imageId;
      }

      const contentBytes = encoder.encode(page.content);
      const contentId = addObject({
        header: `<< /Length ${contentBytes.length} >>\nstream\n`,
        bytes: contentBytes,
        footer: "\nendstream",
      });

      const annotationIds = (page.annotations || []).map((annotation) => addObject(
        `<< /Type /Annot /Subtype /Link /Rect [${annotation.rect.join(" ")}] /Border [0 0 0] /A << /S /URI /URI (${escapePdfText(annotation.url)}) >> >>`,
      ));

      const xObjectEntries = Object.entries(xObjects)
        .map(([name, id]) => `/${name} ${id} 0 R`)
        .join(" ");
      let xObjectResource = "";
      if (xObjectEntries) {
        xObjectResource = `/XObject << ${xObjectEntries} >> `;
      }
      const resources = `<< /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> ${xObjectResource}>>`;
      let annotations = "";
      if (annotationIds.length > 0) {
        annotations = ` /Annots [${annotationIds.map((id) => `${id} 0 R`).join(" ")}]`;
      }
      pageIds.push(addObject(`<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 595 842] /Resources ${resources} /Contents ${contentId} 0 R${annotations} >>`));
    }

    const pagesId = addObject(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
    objects[pagesId] = objects[pagesId].replace("PAGES_REF", `${pagesId} 0 R`);
    for (const pageId of pageIds) {
      objects[pageId] = objects[pageId].replace("PAGES_REF", `${pagesId} 0 R`);
    }
    const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    const infoId = addObject(buildPdfMetadataInfoDictionary(metadata.title || ""));

    const parts = [encoder.encode("%PDF-1.4\n")];
    const offsets = [0];
    let length = parts[0].length;

    for (let index = 1; index < objects.length; index += 1) {
      offsets[index] = length;
      const object = objects[index];
      const prefix = encoder.encode(`${index} 0 obj\n`);
      const suffix = encoder.encode("\nendobj\n");
      parts.push(prefix);
      length += prefix.length;
      if (typeof object === "string") {
        const body = encoder.encode(object);
        parts.push(body);
        length += body.length;
      } else {
        const header = encoder.encode(object.header);
        const footer = encoder.encode(object.footer);
        parts.push(header, object.bytes, footer);
        length += header.length + object.bytes.length + footer.length;
      }
      parts.push(suffix);
      length += suffix.length;
    }

    const xrefOffset = length;
    const xref = ["xref", `0 ${objects.length}`, "0000000000 65535 f "];
    for (let index = 1; index < objects.length; index += 1) {
      xref.push(`${String(offsets[index]).padStart(10, "0")} 00000 n `);
    }
    const trailer = `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(encoder.encode(`${xref.join("\n")}\n${trailer}`));

    return new Blob(parts, { type: "application/pdf" });
  }

  return buildPdfFile;
}
