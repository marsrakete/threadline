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
