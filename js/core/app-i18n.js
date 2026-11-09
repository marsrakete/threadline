import { DEFAULT_LOCALE, SUPPORTED_LOCALES, translations } from "./app-translations.js";

/**
 * Returns the translation table for the requested locale or the default locale fallback.
 * @param {string} locale - Requested locale code such as `de`, `en`, or `fr`.
 * @returns {Record<string, string>} Translation object for the requested locale.
 */
function getTranslationsForLocale(locale) {
  const normalizedLocale = String(locale || "").trim();
  if (translations[normalizedLocale]) {
    return translations[normalizedLocale];
  }

  return translations[DEFAULT_LOCALE];
}

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getTranslationsForLocale,
  translations,
};


/** Creates a document translator independent of workspace controls and application state.
 * @param {object} options - document, translate(key), locale() adapters.
 * @returns {{render: Function}} API that translates current markup on every call.
 */
export function createApplicationTranslationRenderer(options) {
  if (!options?.document?.querySelectorAll || typeof options.translate !== "function" || typeof options.locale !== "function") {
    throw new TypeError("Translation renderer requires document, translate and locale adapters");
  }
  const { document, translate, locale } = options;
  /** Translates current markup, including nodes added since the previous render. @returns {void} Updated document. */
  function render() {
    const language = locale();
    document.documentElement.lang = language;
    for (const [attribute, target] of [["data-i18n", "textContent"], ["data-i18n-placeholder", "placeholder"], ["data-i18n-alt", "alt"]]) {
      for (const element of document.querySelectorAll("[" + attribute + "]")) {
        element[target] = translate(element.getAttribute(attribute));
      }
    }
    for (const element of document.querySelectorAll("[data-i18n-title]")) {
      const label = translate(element.getAttribute("data-i18n-title"));
      element.setAttribute("title", label); element.setAttribute("aria-label", label);
    }
    for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
      element.setAttribute("aria-label", translate(element.getAttribute("data-i18n-aria-label")));
    }
    for (const element of document.querySelectorAll(".help-trigger")) {
      element.setAttribute("aria-label", translate("contextHelpButtonLabel"));
      element.setAttribute("title", translate("contextHelpButtonLabel"));
    }
    let anchor = DEFAULT_LOCALE;
    if (language === "de" || language === "fr") { anchor = language; }
    for (const link of document.querySelectorAll("[data-privacy-language-link]")) {
      link.setAttribute("href", "./datenschutz.html#" + anchor);
    }
  }
  return Object.freeze({ render });
}

/** Detects a supported base language from browser preferences.
 * @param {object} browser - language and languages values.
 * @returns {string} First supported language or the default.
 */
export function detectApplicationLocale(browser = {}) {
  const candidates = [browser.language, ...(browser.languages || [])].filter(Boolean).map(value => value.toLowerCase().split("-")[0]);
  return candidates.find(value => SUPPORTED_LOCALES.includes(value)) || DEFAULT_LOCALE;
}

/** Resolves translated data or interpolated text with default-locale fallback.
 * @param {string} key - Translation key.
 * @param {object} values - Named interpolation values.
 * @param {string} locale - Current language.
 * @returns {*} Translated scalar/collection or the key when unavailable.
 */
export function translateApplicationValue(key, values = {}, locale = DEFAULT_LOCALE) {
  const localeStrings = getTranslationsForLocale(locale), fallback = getTranslationsForLocale(DEFAULT_LOCALE);
  const template = localeStrings[key] ?? fallback[key] ?? key;
  if (typeof template !== "string") { return template; }
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

/** Sets a translated tooltip and accessible label on a supplied node.
 * @param {Element|null} element - Target.
 * @param {string} key - Translation key.
 * @param {Function} translate - Current translation function.
 * @returns {void} Updated accessible labels.
 */
export function applyApplicationTranslatedTitle(element, key, translate) {
  if (!element || !key) { return; }
  const label = translate(key);
  element.setAttribute("title", label); element.setAttribute("aria-label", label);
}
