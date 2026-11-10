"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { inspectTranslations } = require("../scripts/check-translations.cjs");
const { importProjectModule } = require("./module-test-helpers.cjs");

test("supported translations have matching keys and interpolation placeholders", async () => {
  const { translations, SUPPORTED_LOCALES } = await importProjectModule("js/core/app-translations.js");

  assert.deepEqual(inspectTranslations(translations, SUPPORTED_LOCALES), []);
});

test("translation validation reports missing keys, blank values, and placeholder mismatches", () => {
  const errors = inspectTranslations({
    en: { ready: "Ready {count}", missing: "Present" },
    de: { ready: "Bereit", missing: "  " },
    fr: { ready: "Prêt {total}", missing: "Présent" },
  }, ["en", "de", "fr"]);

  assert.deepEqual(errors, [
    "de.ready: placeholder mismatch (expected {count}, found {})",
    "de.missing: missing or empty translation",
    "fr.ready: placeholder mismatch (expected {count}, found {total})",
  ]);
});
