#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");

/**
 * Finds translation keys that are missing, blank, or have mismatched placeholders.
 * @param {Record<string, Record<string, string>>} translations - Locale dictionaries.
 * @param {string[]} locales - Supported locale names.
 * @param {string} referenceLocale - Locale used to validate placeholder names.
 * @returns {string[]} Human-readable validation errors.
 */
function inspectTranslations(translations, locales, referenceLocale = "en") {
  const errors = [];
  const flattened = Object.fromEntries(locales.map(locale => [locale, flattenTranslations(translations[locale] || {})]));
  const allKeys = new Set(locales.flatMap(locale => Object.keys(flattened[locale])));
  const reference = flattened[referenceLocale] || {};

  for (const locale of locales) {
    const dictionary = flattened[locale];
    for (const key of allKeys) {
      const value = dictionary[key];
      if (typeof value !== "string" || value.trim() === "") {
        errors.push(locale + "." + key + ": missing or empty translation");
        continue;
      }
      if (typeof reference[key] === "string") {
        const expected = getPlaceholders(reference[key]);
        const actual = getPlaceholders(value);
        if (expected.join("\u0000") !== actual.join("\u0000")) {
          errors.push(locale + "." + key + ": placeholder mismatch (expected {" + expected.join("}, {")
            + "}, found {" + actual.join("}, {") + "})");
        }
      }
    }
  }

  return errors;
}

/**
 * Converts nested translation strings and arrays into comparable dotted paths.
 * @param {object} dictionary - Locale dictionary.
 * @returns {Record<string, string>} Flattened string leaves.
 */
function flattenTranslations(dictionary) {
  const entries = {};
  function visit(value, prefix) {
    if (typeof value === "string") {
      entries[prefix] = value;
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        visit(child, prefix ? prefix + "." + key : key);
      }
    }
  }
  visit(dictionary, "");
  return entries;
}

/**
 * Lists interpolation placeholders in stable order.
 * @param {string} value - Translation string.
 * @returns {string[]} Placeholder names, including duplicates.
 */
function getPlaceholders(value) {
  return Array.from(value.matchAll(/\{([^{}]+)\}/g), match => match[1]).sort();
}

/**
 * Imports the browser translation module without changing the repository package mode.
 * @returns {Promise<{translations: object, SUPPORTED_LOCALES: string[]}>} Translation exports.
 */
async function loadTranslations() {
  const sourcePath = path.join(projectRoot, "js/core/app-translations.js");
  const source = fs.readFileSync(sourcePath, "utf8");
  const encoded = Buffer.from(source, "utf8").toString("base64");
  return import("data:text/javascript;base64," + encoded);
}

async function main() {
  const { translations, SUPPORTED_LOCALES } = await loadTranslations();
  const errors = inspectTranslations(translations, SUPPORTED_LOCALES);
  if (errors.length > 0) {
    process.stderr.write("Translation check failed (" + errors.length + " issue"
      + (errors.length === 1 ? "" : "s") + "):\n");
    for (const error of errors) {
      process.stderr.write("- " + error + "\n");
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write("Translation check passed for " + SUPPORTED_LOCALES.length + " locales.\n");
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write("Translation check could not run: " + error.message + "\n");
    process.exitCode = 1;
  });
}

module.exports = { inspectTranslations };
