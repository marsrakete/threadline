const currentLocale = bootstrap.locale;
const htmlI18n = bootstrap.i18n;
const supported = Object.keys(htmlI18n || {});
let browserLocale = currentLocale || "en";
const languages = navigator.languages || [navigator.language];
for (const language of languages) {
  const locale = String(language || "").slice(0, 2);
  if (supported.includes(locale)) {
    browserLocale = locale;
    break;
  }
}
const strings = htmlI18n[browserLocale] || htmlI18n.en || {};
const searchInput = document.getElementById("dm-search");
const resetButton = document.getElementById("dm-reset");
const statusNode = document.getElementById("dm-status");
const messages = Array.from(document.querySelectorAll("[data-dm-message]"));

/** Formats one standalone translation with substitutions. @param {string} key - Translation key. @param {object} vars - Placeholder values. @returns {string} Localized text. */
function t(key, vars = {}) {
  let value = strings[key] || key;
  Object.entries(vars).forEach(([name, replacement]) => {
    value = value.replace(new RegExp("\\{" + name + "\\}", "g"), String(replacement));
  });
  return value;
}

/** Escapes literal search text for highlighting. @param {string} value - Search text. @returns {string} Safe regular-expression source. */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Removes previous highlight wrappers. @param {HTMLElement} node - Searchable content. @returns {void} */
function clearHighlights(node) {
  node.querySelectorAll("mark[data-dm-highlight]").forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) {
      return;
    }
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
}

/** Highlights literal matches without changing links or markup. @param {HTMLElement} node - Searchable content. @param {string} query - Search query. @returns {void} */
function highlightNode(node, query) {
  clearHighlights(node);
  if (!query) {
    return;
  }
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const matches = [];
  const regex = new RegExp(escapeRegExp(query), "ig");
  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    if (!textNode.nodeValue || !textNode.nodeValue.trim()) {
      continue;
    }
    let match;
    while (match = regex.exec(textNode.nodeValue)) {
      matches.push({
        node: textNode,
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  matches.reverse().forEach(entry => {
    const range = document.createRange();
    range.setStart(entry.node, entry.start);
    range.setEnd(entry.node, entry.end);
    const mark = document.getElementById("dm-html-highlight-template").content.firstElementChild.cloneNode(true);
    range.surroundContents(mark);
  });
}

/** Filters messages and updates highlights and result count. @returns {void} */
function updateFilter() {
  const query = String(searchInput.value || "").trim().toLowerCase();
  let visible = 0;
  messages.forEach(message => {
    const haystack = String(message.dataset.search || "");
    const matches = !query || haystack.includes(query);
    message.hidden = !matches;
    if (matches) {
      visible += 1;
    }
    message.querySelectorAll("[data-dm-searchable], [data-dm-richtext]").forEach(node => highlightNode(node, query));
  });
  if (visible) {
    statusNode.textContent = t("dmHtmlVisibleStatus", {
      visible,
      total: messages.length
    });
  } else {
    statusNode.textContent = t("dmHtmlNoMatches");
  }
}
searchInput.addEventListener("input", updateFilter);
resetButton.addEventListener("click", () => {
  searchInput.value = "";
  updateFilter();
});
updateFilter();
