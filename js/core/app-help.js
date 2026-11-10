/** Selects the localized README file. @param {string} locale - Active language. @returns {string} Relative README URL. */
export function getHelpReadmePath(locale) {
  if (locale === "de") { return "./README.de.md"; }
  return "./README.md";
}

/** Resolves topic translation keys without embedding visible text. @param {string} id - Topic identifier. @param {object} catalog - Topic configuration. @param {Function} t - Translator. @returns {object|null} Translated topic. */
export function getHelpTopic(id, catalog, t) {
  const key = String(id || "").trim();
  if (!Object.hasOwn(catalog, key)) { return null; }
  const topic = catalog[key];
  return { eyebrow: t("helpEyebrow"), title: t(topic.title), text: t(topic.text), bullets: topic.bullets.map((entry) => t(entry)) };
}

/**
 * Owns README loading/cache, contextual topics and help dialog lifecycle.
 * @param {object} elements - Dialog, header/status/content and topic template.
 * @param {object} options - Locale, translation, catalog, renderer and fetch adapters.
 * @returns {object} Dialog and loading operations plus delegated topic handler.
 */
export function createHelpController(elements, options) {
  let cache = { path: "", text: "" };
  let generation = 0;
  /** Applies translated dialog headings. @param {string} eyebrow - Category. @param {string} title - Heading. @returns {void} */
  function header(eyebrow, title) {
    if (elements.eyebrow) { elements.eyebrow.textContent = eyebrow || options.t("helpEyebrow"); }
    if (elements.title) { elements.title.textContent = title || options.t("helpTitle"); }
  }
  /** Invalidates pending content when the dialog closes. @returns {void} */
  function cancel() { generation += 1; }
  /** Loads or reuses the localized README and ignores stale results. @returns {Promise<void>} Loading completion. */
  async function loadReadme() {
    const token = ++generation;
    const path = getHelpReadmePath(options.locale());
    if (cache.path === path && cache.text) {
      elements.status.textContent = "";
      elements.content.innerHTML = options.markdown.render(cache.text);
      return;
    }
    elements.status.textContent = options.t("helpLoading"); elements.content.replaceChildren();
    try {
      const response = await options.fetch(path, { cache: "no-cache" });
      if (!response.ok) { throw new Error("README unavailable"); }
      const text = await response.text();
      if (token !== generation) { return; }
      cache = { path, text };
      elements.status.textContent = "";
      // The Markdown renderer owns the only intentional HTML boundary.
      elements.content.innerHTML = options.markdown.render(text);
    } catch (error) {
      if (token !== generation) { return; }
      options.report(error); elements.status.textContent = options.t("helpFailed");
      if (!(cache.path === path && cache.text)) { elements.content.replaceChildren(); }
    }
  }
  /** Opens the README view. @returns {void} */
  function openReadme() { header(); elements.dialog.showModal(); void loadReadme(); }
  /** Opens one topic using plain text and cloned markup. @param {string} id - Topic key. @returns {void} */
  function openTopic(id) {
    const topic = getHelpTopic(id, options.catalog, options.t);
    if (!topic) { return; }
    cancel(); header(topic.eyebrow, topic.title); elements.status.textContent = "";
    const fragment = elements.template.content.cloneNode(true);
    const paragraph = fragment.querySelector("p"); const list = fragment.querySelector("ul"); const item = list.querySelector("li");
    paragraph.textContent = topic.text;
    if (!topic.text) { paragraph.remove(); }
    list.replaceChildren();
    for (const text of topic.bullets.filter(Boolean)) { const row = item.cloneNode(true); row.textContent = text; list.append(row); }
    if (!list.childElementCount) { list.remove(); }
    elements.content.replaceChildren(fragment);
    if (!elements.dialog.open) { elements.dialog.showModal(); }
  }
  /** Routes a delegated contextual-help click. @param {MouseEvent} event - Native click. @returns {void} */
  function topicClick(event) {
    const target = event.target;
    if (!target || typeof target.closest !== "function") { return; }
    const button = target.closest("[data-help-topic]");
    if (button) { openTopic(button.dataset.helpTopic || ""); }
  }
  elements.dialog.addEventListener("close", cancel);
  return { header, loadReadme, openReadme, openTopic, topicClick, cancel };
}
