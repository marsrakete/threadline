document.body.classList.remove("archive-html-nojs");

const archiveBootstrap = window.__THREADLINE_ARCHIVE_BOOTSTRAP__ || {};
const archiveHtmlI18n = archiveBootstrap.htmlI18n || { en: {} };
const archiveRuntimeData = archiveBootstrap.runtimeData || {};
const archiveTemplateDefaults = archiveBootstrap.defaults || {};
const browserLocales = Array.isArray(navigator.languages) && navigator.languages.length > 0
  ? navigator.languages
  : [navigator.language || "en"];
const archiveLocale = browserLocales
  .map((value) => String(value || "").toLowerCase())
  .map((value) => value.split("-")[0])
  .find((value) => Object.prototype.hasOwnProperty.call(archiveHtmlI18n, value)) || "en";
const archiveStrings = archiveHtmlI18n[archiveLocale] || archiveHtmlI18n.en || {};
const groups = Array.from(document.querySelectorAll("[data-archive-entry]"));
const searchInput = document.querySelector("#archive-search");
const fromInput = document.querySelector("#archive-filter-from");
const toInput = document.querySelector("#archive-filter-to");
const onlyImagesInput = document.querySelector("#archive-only-images");
const onlyThreadsInput = document.querySelector("#archive-only-threads");
const resetButton = document.querySelector("#archive-reset-filters");
const toggleAllButton = document.querySelector("#archive-toggle-all");
const toggleThreadsButton = document.querySelector("#archive-toggle-threads");
const toggleSinglesButton = document.querySelector("#archive-toggle-singles");
const indentButton = document.querySelector("#archive-toggle-indent");
const statusLine = document.querySelector("#archive-filter-status");
const hashtagButtons = Array.from(document.querySelectorAll("[data-archive-hashtag]"));
const lightbox = document.querySelector("#archive-lightbox");
const lightboxImage = document.querySelector("#archive-lightbox-image");
const lightboxCaption = document.querySelector("#archive-lightbox-caption");
const lightboxTitle = document.querySelector("#archive-lightbox-title");
const lightboxClose = document.querySelector("#archive-lightbox-close");
const editDialog = document.querySelector("#archive-edit-dialog");
const editDialogClose = document.querySelector("#archive-edit-close");
const editDialogMeta = document.querySelector("#archive-edit-meta");
const editDialogOriginal = document.querySelector("#archive-edit-original");
const editDialogCurrent = document.querySelector("#archive-edit-current");
let indentThreads = true;
let lastAppliedQuery = "";
let filterApplyTimer = 0;

function formatArchiveTemplate(template, values) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}

function formatArchiveDateTime(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat(archiveLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function applyArchiveLanguage() {
  document.documentElement.lang = archiveLocale;
  document.querySelectorAll("[data-i18n-key]").forEach((element) => {
    const key = element.dataset.i18nKey;
    if (!key || !archiveStrings[key]) {
      return;
    }
    element.textContent = archiveStrings[key];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (!key || !archiveStrings[key]) {
      return;
    }
    element.setAttribute("placeholder", archiveStrings[key]);
  });

  document.title = formatArchiveTemplate(archiveStrings.archiveHtmlTitle, {
    handle: archiveRuntimeData.handle,
  });
  const pageTitle = document.querySelector("#archive-page-title");
  if (pageTitle) {
    pageTitle.textContent = document.title;
  }
  const generatedCopy = document.querySelector("#archive-generated-copy");
  if (generatedCopy) {
    generatedCopy.textContent = formatArchiveTemplate(archiveStrings.archiveHtmlGenerated, {
      exportedAt: formatArchiveDateTime(archiveRuntimeData.exportedAtIso),
    });
  }
  const skippedCopy = document.querySelector("#archive-skipped-copy");
  if (skippedCopy) {
    skippedCopy.textContent = formatArchiveTemplate(archiveStrings.archiveSkippedImagesNotice, {
      skipped: archiveRuntimeData.skippedImageCount || 0,
    });
  }
  const filterCopy = document.querySelector("#archive-filter-copy");
  if (filterCopy) {
    const hashtags = archiveRuntimeData.filterHashtagCount > 0
      ? formatArchiveTemplate(archiveStrings.archiveHtmlFilterHashtagsSuffix, {
          count: archiveRuntimeData.filterHashtagCount || 0,
          skipped: archiveRuntimeData.filterSkippedCount || 0,
        })
      : "";
    filterCopy.textContent = formatArchiveTemplate(archiveStrings.archiveHtmlFilterSummary, {
      scope: archiveRuntimeData.filterScope || "",
      hashtags,
    });
  }
  const rangeCopy = document.querySelector("#archive-range-copy");
  if (rangeCopy) {
    rangeCopy.textContent = formatArchiveTemplate(archiveStrings.archiveHtmlArchiveRangeValue, {
      from: formatArchiveDateTime(rangeCopy.dataset.rangeFrom),
      to: formatArchiveDateTime(rangeCopy.dataset.rangeTo),
    });
  }
  document.querySelectorAll("time[datetime]").forEach((element) => {
    element.textContent = formatArchiveDateTime(element.getAttribute("datetime"));
  });
  syncToggleAllButton();
}

function getAllEntries() {
  return Array.from(document.querySelectorAll("details[data-archive-entry]"));
}

function getThreadEntries() {
  return Array.from(document.querySelectorAll("details[data-entry-kind='thread']"));
}

function getSingleEntries() {
  return Array.from(document.querySelectorAll("details[data-entry-kind='single']"));
}

function syncToggleAllButton() {
  if (!toggleAllButton) {
    return;
  }
  const entries = getAllEntries();
  const allOpen = entries.length > 0 && entries.every((entry) => entry.open);
  const key = allOpen ? "archiveHtmlToggleAllClose" : "archiveHtmlToggleAllOpen";
  toggleAllButton.dataset.i18nKey = key;
  toggleAllButton.textContent = archiveStrings[key] || key;
}

function syncSectionToggleButtons() {
  const threadEntries = getThreadEntries();
  const singleEntries = getSingleEntries();
  const allThreadsOpen = threadEntries.length > 0 && threadEntries.every((entry) => entry.open);
  const allSinglesOpen = singleEntries.length > 0 && singleEntries.every((entry) => entry.open);
  const threadKey = allThreadsOpen ? "archiveHtmlCollapseThreads" : "archiveHtmlExpandThreads";
  const singleKey = allSinglesOpen ? "archiveHtmlCollapseSingles" : "archiveHtmlExpandSingles";
  if (toggleThreadsButton) {
    toggleThreadsButton.dataset.i18nKey = threadKey;
    toggleThreadsButton.textContent = archiveStrings[threadKey] || threadKey;
  }
  if (toggleSinglesButton) {
    toggleSinglesButton.dataset.i18nKey = singleKey;
    toggleSinglesButton.textContent = archiveStrings[singleKey] || singleKey;
  }
}

function clearArchiveHighlights(root) {
  if (!root) {
    return;
  }
  root.querySelectorAll("mark[data-archive-highlight='true']").forEach((mark) => {
    const text = document.createTextNode(mark.textContent || "");
    mark.replaceWith(text);
  });
  root.normalize();
}

function highlightArchiveQueryInElement(root, query) {
  if (!root || !query) {
    return;
  }
  clearArchiveHighlights(root);
  const lowerQuery = String(query || "").trim().toLowerCase();
  if (!lowerQuery) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement?.closest("mark[data-archive-highlight='true']")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach((node) => {
    const source = node.nodeValue || "";
    const lower = source.toLowerCase();
    let startIndex = 0;
    let matchIndex = lower.indexOf(lowerQuery);
    if (matchIndex < 0) {
      return;
    }
    const fragment = document.createDocumentFragment();
    while (matchIndex >= 0) {
      if (matchIndex > startIndex) {
        fragment.appendChild(document.createTextNode(source.slice(startIndex, matchIndex)));
      }
      const mark = document.createElement("mark");
      mark.dataset.archiveHighlight = "true";
      mark.textContent = source.slice(matchIndex, matchIndex + lowerQuery.length);
      fragment.appendChild(mark);
      startIndex = matchIndex + lowerQuery.length;
      matchIndex = lower.indexOf(lowerQuery, startIndex);
    }
    if (startIndex < source.length) {
      fragment.appendChild(document.createTextNode(source.slice(startIndex)));
    }
    node.parentNode?.replaceChild(fragment, node);
  });
}

function syncHashtagState() {
  const query = String(searchInput?.value || "").trim().toLowerCase();
  hashtagButtons.forEach((button) => {
    button.classList.toggle("is-active", query === String(button.dataset.archiveHashtag || "").trim().toLowerCase());
  });
}

function refreshArchiveHighlights(query) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const queryChanged = normalizedQuery !== lastAppliedQuery;

  if (queryChanged && lastAppliedQuery) {
    document.querySelectorAll("[data-archive-richtext='true'], [data-archive-searchable='true']").forEach((element) => {
      clearArchiveHighlights(element);
    });
  }

  if (!normalizedQuery) {
    lastAppliedQuery = "";
    return;
  }

  const visibleElements = [];
  document.querySelectorAll("[data-archive-post]:not([hidden])").forEach((post) => {
    visibleElements.push(...post.querySelectorAll("[data-archive-richtext='true'], [data-archive-searchable='true']"));
  });
  visibleElements.forEach((element) => {
    highlightArchiveQueryInElement(element, normalizedQuery);
  });
  lastAppliedQuery = normalizedQuery;
}

function applyArchiveFilters() {
  if (!searchInput || !fromInput || !toInput || !onlyImagesInput || !onlyThreadsInput || !statusLine) {
    return;
  }
  const query = String(searchInput.value || "").trim().toLowerCase();
  const fromValue = fromInput.value ? Date.parse(`${fromInput.value}T00:00:00Z`) : null;
  const toValue = toInput.value ? Date.parse(`${toInput.value}T23:59:59Z`) : null;
  const onlyImages = onlyImagesInput.checked;
  const onlyThreads = onlyThreadsInput.checked;
  let visibleEntries = 0;
  let visibleThreads = 0;
  let visiblePosts = 0;

  groups.forEach((group) => {
    const isThread = group.dataset.isThread === "true";
    const posts = Array.from(group.querySelectorAll("[data-archive-post]"));
    const groupMatchesQuery = query
      ? posts.some((post) => String(post.dataset.search || "").includes(query))
      : false;
    let groupVisiblePosts = 0;

    posts.forEach((post) => {
      const created = Number(post.dataset.created || 0);
      const hasImages = post.dataset.hasImages === "true";
      const haystack = String(post.dataset.search || "");
      let visibleBase = true;

      if (fromValue && created < fromValue) {
        visibleBase = false;
      }
      if (toValue && created > toValue) {
        visibleBase = false;
      }
      if (onlyImages && !hasImages) {
        visibleBase = false;
      }
      const queryMatch = !query || haystack.includes(query);
      const visible = query
        ? (isThread && groupMatchesQuery ? visibleBase : (visibleBase && queryMatch))
        : visibleBase;

      post.hidden = !visible;
      if (visible) {
        groupVisiblePosts += 1;
        visiblePosts += 1;
      }
    });

    const groupVisible = groupVisiblePosts > 0 && (!onlyThreads || isThread);
    group.hidden = !groupVisible;
    if (groupVisible) {
      visibleEntries += 1;
      if (isThread) {
        visibleThreads += 1;
      }
    }
  });

  statusLine.textContent = visiblePosts > 0
    ? formatArchiveTemplate(archiveStrings.archiveHtmlVisibleStatus, {
        entries: visibleEntries,
        threads: visibleThreads,
        posts: visiblePosts,
      })
    : archiveStrings.archiveHtmlNoMatches;
  refreshArchiveHighlights(query);
  syncHashtagState();
  syncToggleAllButton();
  syncSectionToggleButtons();
}

function queueArchiveFilterApply(delay = 120) {
  window.clearTimeout(filterApplyTimer);
  filterApplyTimer = window.setTimeout(() => {
    applyArchiveFilters();
  }, delay);
}

function syncIndentButton() {
  if (!indentButton) {
    return;
  }
  indentButton.classList.toggle("is-active", indentThreads);
  document.body.classList.toggle("archive-html-indent", indentThreads);
}

function openLightboxFromImage(image) {
  if (!lightbox || !lightboxImage || !lightboxCaption || !lightboxTitle || !image) {
    return;
  }
  lightbox.hidden = false;
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt || "";
  lightboxTitle.textContent = image.closest("[data-archive-post]")?.querySelector(".archive-html-author-handle")?.textContent || archiveRuntimeData.title || document.title;
  lightboxCaption.textContent = image.alt || "";
}

/**
 * Splits edit comparison text into whitespace-preserving tokens.
 * @param {string} text - Text to tokenize.
 * @returns {string[]} Token list.
 */
function tokenizeArchiveEditText(text) {
  return String(text || "").match(/\s+|[^\s]+/g) || [];
}

/**
 * Calculates original/current token parts for an archive edit dialog.
 * @param {string} originalText - Original post text.
 * @param {string} currentText - Current post text.
 * @returns {object} Original and current diff parts.
 */
function diffArchiveEditTokens(originalText, currentText) {
  const originalTokens = tokenizeArchiveEditText(originalText);
  const currentTokens = tokenizeArchiveEditText(currentText);
  const originalLength = originalTokens.length;
  const currentLength = currentTokens.length;
  const matrix = Array.from({ length: originalLength + 1 }, () => new Uint16Array(currentLength + 1));

  for (let originalIndex = originalLength - 1; originalIndex >= 0; originalIndex -= 1) {
    for (let currentIndex = currentLength - 1; currentIndex >= 0; currentIndex -= 1) {
      if (originalTokens[originalIndex] === currentTokens[currentIndex]) {
        matrix[originalIndex][currentIndex] = matrix[originalIndex + 1][currentIndex + 1] + 1;
      } else {
        matrix[originalIndex][currentIndex] = Math.max(matrix[originalIndex + 1][currentIndex], matrix[originalIndex][currentIndex + 1]);
      }
    }
  }

  const originalParts = [];
  const currentParts = [];
  let originalIndex = 0;
  let currentIndex = 0;
  while (originalIndex < originalLength && currentIndex < currentLength) {
    if (originalTokens[originalIndex] === currentTokens[currentIndex]) {
      originalParts.push({ type: "equal", text: originalTokens[originalIndex] });
      currentParts.push({ type: "equal", text: currentTokens[currentIndex] });
      originalIndex += 1;
      currentIndex += 1;
    } else if (matrix[originalIndex + 1][currentIndex] >= matrix[originalIndex][currentIndex + 1]) {
      originalParts.push({ type: "removed", text: originalTokens[originalIndex] });
      originalIndex += 1;
    } else {
      currentParts.push({ type: "added", text: currentTokens[currentIndex] });
      currentIndex += 1;
    }
  }

  while (originalIndex < originalLength) {
    originalParts.push({ type: "removed", text: originalTokens[originalIndex] });
    originalIndex += 1;
  }
  while (currentIndex < currentLength) {
    currentParts.push({ type: "added", text: currentTokens[currentIndex] });
    currentIndex += 1;
  }

  return {
    originalParts,
    currentParts,
  };
}

/**
 * Renders edit diff parts into an archive HTML dialog text container.
 * @param {HTMLElement|null} container - Target text container.
 * @param {Array<object>} parts - Diff parts to render.
 * @returns {void}
 */
function renderArchiveEditDiff(container, parts) {
  if (!container) {
    return;
  }
  container.replaceChildren();
  parts.forEach((part) => {
    if (part.type === "equal") {
      container.append(document.createTextNode(part.text));
      return;
    }
    const mark = document.createElement("mark");
    mark.textContent = part.text;
    if (part.type === "added") {
      mark.className = "archive-html-edit-added";
    }
    if (part.type === "removed") {
      mark.className = "archive-html-edit-removed";
    }
    container.appendChild(mark);
  });
}

/**
 * Opens the archive HTML edit dialog from an edit marker button.
 * @param {HTMLButtonElement|null} button - Button carrying edit metadata.
 * @returns {void}
 */
function openArchiveEditDialog(button) {
  if (!editDialog || !editDialogMeta || !editDialogOriginal || !editDialogCurrent || !button) {
    return;
  }
  const originalText = String(button.dataset.editOriginal || "");
  const currentText = String(button.dataset.editCurrent || "");
  const diff = diffArchiveEditTokens(originalText, currentText);
  editDialog.hidden = false;
  editDialogMeta.textContent = `${formatArchiveDateTime(button.dataset.editCreated)} - ${formatArchiveDateTime(button.dataset.editUpdated)}`;
  renderArchiveEditDiff(editDialogOriginal, diff.originalParts);
  renderArchiveEditDiff(editDialogCurrent, diff.currentParts);
}

/**
 * Closes and clears the archive HTML edit dialog.
 * @returns {void}
 */
function closeArchiveEditDialog() {
  if (!editDialog || !editDialogOriginal || !editDialogCurrent || !editDialogMeta) {
    return;
  }
  editDialog.hidden = true;
  editDialogMeta.textContent = "";
  editDialogOriginal.replaceChildren();
  editDialogCurrent.replaceChildren();
}

searchInput?.addEventListener("input", () => queueArchiveFilterApply(140));
[fromInput, toInput, onlyImagesInput, onlyThreadsInput].forEach((element) => {
  element?.addEventListener("input", () => applyArchiveFilters());
  element?.addEventListener("change", () => applyArchiveFilters());
});

resetButton?.addEventListener("click", () => {
  if (!searchInput || !fromInput || !toInput || !onlyImagesInput || !onlyThreadsInput) {
    return;
  }
  searchInput.value = "";
  fromInput.value = archiveTemplateDefaults.fromValue || "";
  toInput.value = archiveTemplateDefaults.toValue || "";
  onlyImagesInput.checked = false;
  onlyThreadsInput.checked = false;
  applyArchiveFilters();
});

toggleThreadsButton?.addEventListener("click", () => {
  const threadEntries = getThreadEntries().filter((entry) => !entry.hidden);
  const shouldOpen = threadEntries.some((entry) => !entry.open);
  threadEntries.forEach((item) => {
    item.open = shouldOpen;
  });
  syncToggleAllButton();
  syncSectionToggleButtons();
});

toggleSinglesButton?.addEventListener("click", () => {
  const singleEntries = getSingleEntries().filter((entry) => !entry.hidden);
  const shouldOpen = singleEntries.some((entry) => !entry.open);
  singleEntries.forEach((item) => {
    item.open = shouldOpen;
  });
  syncToggleAllButton();
  syncSectionToggleButtons();
});

toggleAllButton?.addEventListener("click", () => {
  const entries = getAllEntries().filter((entry) => !entry.hidden);
  const shouldOpen = entries.some((entry) => !entry.open);
  entries.forEach((entry) => {
    entry.open = shouldOpen;
  });
  syncToggleAllButton();
  syncSectionToggleButtons();
});

indentButton?.addEventListener("click", () => {
  indentThreads = !indentThreads;
  syncIndentButton();
});

document.querySelectorAll("[data-archive-load-image]").forEach((button) => {
  button.addEventListener("click", () => {
    const figure = button.closest("[data-archive-image-remote]");
    const remoteUrl = String(figure?.getAttribute("data-archive-image-remote") || "").trim();
    const remoteAlt = String(figure?.getAttribute("data-archive-image-alt") || "").trim();
    if (!figure || !remoteUrl || figure.querySelector("img")) {
      return;
    }
    const image = document.createElement("img");
    image.src = remoteUrl;
    image.alt = remoteAlt;
    image.loading = "lazy";
    image.addEventListener("click", () => {
      openLightboxFromImage(image);
    });
    const placeholder = figure.querySelector(".archive-html-image-placeholder");
    if (placeholder) {
      placeholder.replaceWith(image);
    } else {
      figure.prepend(image);
    }
  });
});

getAllEntries().forEach((entry) => {
  entry.addEventListener("toggle", () => {
    syncToggleAllButton();
    syncSectionToggleButtons();
  });
});

hashtagButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!searchInput) {
      return;
    }
    const tag = String(button.dataset.archiveHashtag || "").trim();
    searchInput.value = String(searchInput.value || "").trim().toLowerCase() === tag.toLowerCase() ? "" : tag;
    applyArchiveFilters();
  });
});

document.querySelectorAll(".archive-html-image img").forEach((image) => {
  image.addEventListener("click", () => {
    openLightboxFromImage(image);
  });
});

document.querySelectorAll("[data-archive-edit-button]").forEach((button) => {
  button.addEventListener("click", () => {
    openArchiveEditDialog(button);
  });
});

function closeLightbox() {
  if (!lightbox || !lightboxImage || !lightboxCaption) {
    return;
  }
  lightbox.hidden = true;
  lightboxImage.src = "";
  lightboxImage.alt = "";
  lightboxCaption.textContent = "";
}

lightboxClose?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) {
    closeLightbox();
  }
});
editDialogClose?.addEventListener("click", closeArchiveEditDialog);
editDialog?.addEventListener("click", (event) => {
  if (event.target === editDialog) {
    closeArchiveEditDialog();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && lightbox && !lightbox.hidden) {
    closeLightbox();
  }
  if (event.key === "Escape" && editDialog && !editDialog.hidden) {
    closeArchiveEditDialog();
  }
});

applyArchiveLanguage();
applyArchiveFilters();
syncIndentButton();
