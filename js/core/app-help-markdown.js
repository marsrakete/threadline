/** Creates the README markup renderer with explicit URL context. @param {object} options - Current URL and HTML-escaping adapters. @returns {object} Render and URL-validation operations. */
export function createHelpMarkdownRenderer(options) {
  const escapeHtml = options.escapeHtml;
  /** Decodes the small entity set accepted by README URLs. @param {string} value - Encoded URL. @returns {string} Decoded value. */
  function decodeMinimalHtmlEntities(value) {
    return String(value || "")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }

  /** Filters README link/image destinations. @param {string} rawUrl - URL input. @param {string} type - Link or image. @returns {string} Escaped safe URL or empty string. */
  function sanitizeHelpUrl(rawUrl, type = "link") {
    const trimmed = String(rawUrl || "").trim();
    if (!trimmed || /^\/\//.test(trimmed)) {
      return "";
    }

    const decoded = decodeMinimalHtmlEntities(trimmed);
    if (decoded.startsWith("#")) {
      return escapeHtml(decoded);
    }

    try {
      const parsed = new URL(decoded, options.href());
      const protocol = parsed.protocol.toLowerCase();
      const isAllowedProtocol = protocol === "https:" || protocol === "http:" || (type === "link" && protocol === "mailto:");
      if (!isAllowedProtocol) {
        return "";
      }
      return escapeHtml(parsed.href);
    } catch {
      const normalized = decoded.toLowerCase();
      const looksLikeRelativePath = !/^[a-z][a-z0-9+.-]*:/i.test(normalized);
      if (!looksLikeRelativePath) {
        return "";
      }
      if (/[\u0000-\u001f]/.test(decoded)) {
        return "";
      }
      return escapeHtml(decoded);
    }
  }

  /** Renders escaped inline README markup. @param {string} text - Inline source. @returns {string} Controlled HTML. */
  function renderInlineMarkdown(text) {
    let html = escapeHtml(text);
    html = html.replace(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g, (_, alt, imageUrl, linkUrl) => {
      const safeImageUrl = sanitizeHelpUrl(imageUrl, "image");
      const safeLinkUrl = sanitizeHelpUrl(linkUrl, "link");
      if (!safeImageUrl || !safeLinkUrl) {
        return escapeHtml(alt);
      }
      return `<a href="${safeLinkUrl}" target="_blank" rel="noreferrer noopener"><img src="${safeImageUrl}" alt="${alt}"></a>`;
    });
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, imageUrl) => {
      const safeImageUrl = sanitizeHelpUrl(imageUrl, "image");
      if (safeImageUrl) { return `<img src="${safeImageUrl}" alt="${alt}">`; }
      return escapeHtml(alt);
    });
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, linkUrl) => {
      const safeLinkUrl = sanitizeHelpUrl(linkUrl, "link");
      if (safeLinkUrl) { return `<a href="${safeLinkUrl}" target="_blank" rel="noreferrer noopener">${label}</a>`; }
      return label;
    });
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    return html;
  }

  /** Converts centered README blocks into controlled tokens. @param {string} markdown - Source. @returns {object} Prepared source and trusted generated blocks. */
  function convertHtmlBlocks(markdown) {
    const blocks = [];
    /** Stores one generated block behind a source-inaccessible marker. @param {string} html - Controlled block. @returns {string} Marker. */
    function store(html) { const index = blocks.push(html) - 1; return `\u0000HELP:${index}\u0000`; }
    const text = markdown.replace(/\u0000/g, "")
      .replace(/<p\s+align="center">\s*<img\s+src="([^"]+)"\s+alt="([^"]*)"\s+width="([^"]+)"\s*>\s*<\/p>/gi, (_, src, alt, width) => {
        const safeImageUrl = sanitizeHelpUrl(src, "image");
        if (safeImageUrl) {
          return store(`<p class="help-centered"><img src="${safeImageUrl}" alt="${escapeHtml(alt)}" width="${escapeHtml(width)}"></p>`);
        }
        return store(`<p class="help-centered">${escapeHtml(alt)}</p>`);
      })
      .replace(/<p\s+align="center">\s*([\s\S]*?)\s*<\/p>/gi, (_, content) =>
        store(`<p class="help-centered">${renderInlineMarkdown(content.trim())}</p>`));
    return { text, blocks };
  }

  /** Renders README headings, lists, code and paragraphs. @param {string} markdown - Source. @returns {string} Controlled HTML. */
  function renderMarkdownAsHtml(markdown) {
    const prepared = convertHtmlBlocks(String(markdown || "").replace(/\r\n/g, "\n"));
    const lines = prepared.text.split("\n");
    const html = [];
    let inList = false;
    let listTag = "";
    let inCode = false;
    let codeLines = [];
    let paragraph = [];

    /** Flushes buffered paragraph text. @returns {void} */
    const flushParagraph = () => {
      if (!paragraph.length) {
        return;
      }
      html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    };

    /** Closes an open list. @returns {void} */
    const flushList = () => {
      if (!inList) {
        return;
      }
      html.push(`</${listTag}>`);
      inList = false;
      listTag = "";
    };

    /** Flushes escaped fenced code. @returns {void} */
    const flushCode = () => {
      if (!inCode) {
        return;
      }
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      inCode = false;
      codeLines = [];
    };

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        flushParagraph();
        flushList();
        if (inCode) {
          flushCode();
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        flushList();
        continue;
      }

      const centered = line.trim().match(/^\u0000HELP:(\d+)\u0000$/);
      if (centered) {
        flushParagraph();
        flushList();
        html.push(prepared.blocks[Number(centered[1])]);
        continue;
      }

      const heading = line.match(/^(#{1,3})\s+(.*)$/);
      if (heading) {
        flushParagraph();
        flushList();
        const level = heading[1].length;
        html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
        continue;
      }

      const ordered = line.match(/^\d+\.\s+(.*)$/);
      const unordered = line.match(/^-\s+(.*)$/);
      if (ordered || unordered) {
        flushParagraph();
        let nextTag = "ul";
        if (ordered) { nextTag = "ol"; }
        if (!inList || listTag !== nextTag) {
          flushList();
          inList = true;
          listTag = nextTag;
          html.push(`<${listTag}>`);
        }
        html.push(`<li>${renderInlineMarkdown((ordered || unordered)[1])}</li>`);
        continue;
      }

      paragraph.push(line.trim());
    }

    flushParagraph();
    flushList();
    flushCode();

    return html.join("");
  }


  return { render: renderMarkdownAsHtml, sanitizeUrl: sanitizeHelpUrl };
}
