const fs = require("fs");
const path = require("path");

const TARGET_FILES = [
  path.join(__dirname, "..", "translations.js"),
  path.join(__dirname, "..", "index.html"),
  path.join(__dirname, "..", "app.js"),
];

const REPLACEMENTS = new Map([
  ["\u00c3\u00a4", "\u00e4"],
  ["\u00c3\u0084", "\u00c4"],
  ["\u00c3\u00b6", "\u00f6"],
  ["\u00c3\u0096", "\u00d6"],
  ["\u00c3\u00bc", "\u00fc"],
  ["\u00c3\u009c", "\u00dc"],
  ["\u00c3\u009f", "\u00df"],
  ["\u00c3\u00a9", "\u00e9"],
  ["\u00c3\u00a8", "\u00e8"],
  ["\u00c3\u00aa", "\u00ea"],
  ["\u00c3\u00a0", "\u00e0"],
  ["\u00c3\u00a1", "\u00e1"],
  ["\u00c3\u00b4", "\u00f4"],
  ["\u00c3\u00bb", "\u00fb"],
  ["\u00c3\u00a7", "\u00e7"],
  ["\u00e2\u20ac\u00a6", "\u2026"],
  ["\u00e2\u20ac\u201d", "\u2014"],
  ["\u00e2\u20ac\u201c", "\u2013"],
  ["\u00e2\u20ac\u017e", "\u201e"],
  ["\u00e2\u20ac\u0153", "\u201c"],
  ["\u00e2\u20ac\u009d", "\u201d"],
  ["\u00e2\u20ac\u2122", "\u2019"],
  ["\u00c2\u00b7", "\u00b7"],
  [" \u00c2\u00b7 ", " \u00b7 "],
  ["\u00c2\u00ab", "\u00ab"],
  ["\u00c2\u00bb", "\u00bb"],
  ["\u00e2\u2013\u00b6", "\u25b6"],
  ["\u00e2\u2014\u20ac", "\u25c0"],
  ["\u00e2\u2013\u00bc", "\u25bc"],
  ["\u00e2\u2013\u00b2", "\u25b2"],
  ["\u00e2\u00a4\u00b5\u00ef\u00b8\u008f", "\u2935\ufe0f"],
]);

/**
 * Replaces all configured mojibake patterns inside one text string.
 * @param {string} text - UTF-8-decoded source text.
 * @returns {string} Repaired source text.
 */
function repairText(text) {
  let repairedText = text;
  for (const [from, to] of REPLACEMENTS) {
    repairedText = repairedText.split(from).join(to);
  }
  return repairedText;
}

/**
 * Repairs one configured file in place.
 * @param {string} filePath - Absolute file path.
 * @returns {void} No return value.
 */
function repairFile(filePath) {
  const originalText = fs.readFileSync(filePath, "utf8");
  const repairedText = repairText(originalText);
  fs.writeFileSync(filePath, repairedText, "utf8");
}

/**
 * Runs the mojibake repair pass across the configured target files.
 * @returns {void} No return value.
 */
function main() {
  for (const filePath of TARGET_FILES) {
    repairFile(filePath);
  }
}

main();
