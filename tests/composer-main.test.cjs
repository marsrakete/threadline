"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

/**
 * Loads the Composer text module through Node's ES module loader.
 * @returns {Promise<object>} Exported Composer text helpers.
 */
async function loadComposerMainModule() {
  const source = fs.readFileSync(
    path.join(projectRoot, "js", "composer", "composer-main.js"),
    "utf8",
  );
  const encodedSource = Buffer.from(source, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encodedSource}`);
}

test("composer text helpers count visible graphemes and UTF-8 bytes", async () => {
  const composer = await loadComposerMainModule();
  const metrics = composer.getComposerPostTextMetrics("A😀e\u0301");

  assert.equal(metrics.graphemeCount, 3);
  assert.equal(metrics.utf8ByteCount, 8);
  assert.equal(composer.doesComposerTextFitLimit("😀", { graphemeLimit: 1, utf8ByteLimit: 4 }), true);
  assert.equal(composer.doesComposerTextFitLimit("😀", { graphemeLimit: 1, utf8ByteLimit: 3 }), false);
});

test("composer text helpers clamp whole grapheme clusters", async () => {
  const composer = await loadComposerMainModule();
  const clamped = composer.clampComposerTextLength("A😀e\u0301", 2);

  assert.deepEqual(clamped, {
    text: "A😀",
    truncated: true,
  });
});
