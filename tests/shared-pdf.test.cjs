"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/**
 * Records Canvas calls and measures text at five units per Unicode code point.
 * @returns {object} Context double and ordered calls.
 */
function drawingFixture() {
  const calls = [];
  const context = { measureText: (value) => ({ width: Array.from(value).length * 5 }) };
  for (const name of ["save", "restore", "beginPath", "closePath", "moveTo", "arcTo", "arc", "fill", "stroke", "clip", "fillRect", "drawImage", "fillText"]) {
    context[name] = (...args) => calls.push([name, ...args]);
  }
  return { context, calls };
}

/**
 * Creates an isolated text layout with an explicit facet resolver.
 * @param {Function} facetRuns - Optional authoritative rich-text run resolver.
 * @returns {Promise<object>} Layout API and source module.
 */
async function textFixture(facetRuns = () => null) {
  const module = await importProjectModule("js/shared/shared-pdf-text.js");
  return { module, layout: module.createPdfTextLayout({ facetRuns }) };
}

test("text layout requires a facet adapter and preserves authoritative targets", async () => {
  let received = null;
  const runs = [{ text: "a label", url: "https://target.test", kind: "link" }];
  const { module, layout } = await textFixture((text, facets) => { received = [text, facets]; return runs; });
  assert.throws(() => module.createPdfTextLayout(null), TypeError);
  assert.throws(() => module.createPdfTextLayout({ facetRuns: 1 }), TypeError);
  const facets = [{ index: { byteStart: 0, byteEnd: 7 } }];
  assert.equal(layout.links("a label", facets), runs);
  assert.deepEqual(received, ["a label", facets]);
});

test("text links retain punctuation outside URLs and infer bare domains", async () => {
  const { layout } = await textFixture();
  const runs = layout.links("See (example.test/page). https://next.test/a(b)! end");
  assert.deepEqual(runs.filter((run) => run.url).map((run) => [run.text, run.url]), [
    ["example.test/page", "https://example.test/page"], ["https://next.test/a(b)", "https://next.test/a(b)"],
  ]);
  assert.equal(runs.map((run) => run.text).join(""), "See (example.test/page). https://next.test/a(b)! end");
  assert.deepEqual(layout.links(null), [{ text: "" }]);
});

test("text wrapping preserves blank lines, measured links and complete Unicode code points", async () => {
  const { layout } = await textFixture();
  const { context } = drawingFixture();
  const lines = layout.wrap(context, "ab\n\n😀😀😀", 10);
  assert.deepEqual(lines.map((line) => line.fragments.map((fragment) => fragment.text).join("")), ["ab", "", "😀😀", "😀"]);
  assert.deepEqual(lines.map((line) => line.width), [10, 0, 10, 5]);
  const linked = layout.wrap(context, "https://example.test", 25);
  assert.ok(linked.length > 1);
  assert.ok(linked.every((line) => line.fragments.every((fragment) => fragment.url === "https://example.test")));
  assert.deepEqual(layout.wrap(context, null, 10), [{ fragments: [], width: 0 }]);
  assert.equal(layout.wrap(context, "abc", 0).length, 3);
  assert.throws(() => layout.wrap(null, "abc", 10), TypeError);
});

test("text drawing returns measured block height and link bounds without empty annotations", async () => {
  const { layout } = await textFixture();
  const { context, calls } = drawingFixture();
  const result = layout.draw(context, [{ fragments: [
    { text: "plain", width: 25 }, { text: "link", url: "https://example.test", width: 20 }, { text: "", width: 0 },
  ] }], 10, 20, 14);
  assert.deepEqual(result, { height: 14, annotations: [{ x: 35, y: 20, width: 20, height: 14, url: "https://example.test" }] });
  assert.deepEqual(calls.filter((call) => call[0] === "fillText"), [["fillText", "plain", 10, 20], ["fillText", "link", 35, 20]]);
  assert.deepEqual(calls.find((call) => call[0] === "fillRect"), ["fillRect", 35, 32, 20, 1.12]);
  assert.deepEqual(layout.draw(context, [], 0, 0, 14), { height: 0, annotations: [] });
  assert.throws(() => layout.draw(null, [], 0, 0, 14), TypeError);
});

test("annotation rectangles invert Canvas Y and scale precisely to A4", async () => {
  const { layout } = await textFixture();
  assert.deepEqual(layout.rectangle({ x: 10, y: 20, width: 30, height: 40 }, 1190, 1684), [5, 812, 20, 832]);
  assert.deepEqual(layout.rectangle({ x: 0, y: 0, width: 0, height: 0 }, 595, 842), [0, 842, 0, 842]);
  assert.throws(() => layout.rectangle(null, 595, 842), TypeError);
});

test("rounded Canvas fills and strokes clamp radii and balance save/restore", async () => {
  const module = await importProjectModule("js/shared/shared-canvas.js");
  for (const operation of [module.fillRoundedRect, module.strokeRoundedRect]) {
    const { context, calls } = drawingFixture();
    operation(context, 1, 2, 4, 10, 99, "#123456");
    assert.equal(calls[0][0], "save");
    assert.equal(calls.at(-1)[0], "restore");
    assert.ok(calls.filter((call) => call[0] === "arcTo").every((call) => call.at(-1) === 2));
    assert.throws(() => operation(null, 0, 0, 1, 1, 0, "black"), TypeError);
    const zero = drawingFixture();
    operation(zero.context, 0, 0, 0, 0, 10, "black");
    assert.ok(zero.calls.filter((call) => call[0] === "arcTo").every((call) => call.at(-1) === 0));
  }
});

test("Canvas image contain and cover preserve aspect ratio and center the image", async () => {
  const module = await importProjectModule("js/shared/shared-canvas.js");
  const bitmap = { width: 200, height: 100 };
  const contain = drawingFixture();
  module.drawRoundedImageContain(contain.context, bitmap, 0, 0, 100, 100, 10);
  assert.deepEqual(contain.calls.find((call) => call[0] === "drawImage"), ["drawImage", bitmap, 0, 25, 100, 50]);
  assert.equal(contain.calls.at(-1)[0], "restore");
  const cover = drawingFixture();
  module.drawCircularImageCover(cover.context, bitmap, 0, 0, 100);
  assert.deepEqual(cover.calls.find((call) => call[0] === "drawImage"), ["drawImage", bitmap, -50, 0, 200, 100]);
  assert.deepEqual(cover.calls.find((call) => call[0] === "arc"), ["arc", 50, 50, 50, 0, Math.PI * 2]);
  assert.equal(cover.calls.at(-1)[0], "restore");
  const emptyFrame = drawingFixture();
  module.drawRoundedImageContain(emptyFrame.context, bitmap, 1, 2, 0, 0, 0);
  assert.deepEqual(emptyFrame.calls.find((call) => call[0] === "drawImage"), ["drawImage", bitmap, 1, 2, 0, 0]);
  const emptyCircle = drawingFixture();
  module.drawCircularImageCover(emptyCircle.context, bitmap, 1, 2, 0);
  assert.deepEqual(emptyCircle.calls.find((call) => call[0] === "drawImage"), ["drawImage", bitmap, 1, 2, 0, 0]);
  assert.throws(() => module.drawRoundedImageContain(null, bitmap, 0, 0, 1, 1, 0), TypeError);
  assert.throws(() => module.drawCircularImageCover(null, bitmap, 0, 0, 1), TypeError);
});

/**
 * Creates deterministic local PDF metadata, including a non-whole-hour timezone.
 * @returns {Date} Fixed local date with a +05:30 timezone.
 */
function metadataDate() {
  const date = new Date(2026, 9, 16, 12, 34, 56);
  date.getTimezoneOffset = () => -330;
  return date;
}

/**
 * Reads a generated PDF and checks that each xref offset points at its object.
 * @param {Blob} blob - Generated PDF.
 * @returns {Promise<string>} PDF decoded for structural assertions.
 */
async function inspectPdf(blob) {
  assert.equal(blob.type, "application/pdf");
  const bytes = Buffer.from(await blob.arrayBuffer());
  const source = bytes.toString("latin1");
  assert.ok(source.startsWith("%PDF-1.4\n"));
  const startxref = Number(source.match(/startxref\n(\d+)\n%%EOF$/)[1]);
  assert.equal(bytes.subarray(startxref, startxref + 4).toString(), "xref");
  const xref = source.slice(startxref).split("\n");
  const count = Number(xref[1].split(" ")[1]);
  for (let id = 1; id < count; id += 1) {
    const offset = Number(xref[id + 2].slice(0, 10));
    assert.ok(bytes.subarray(offset).toString("latin1").startsWith(`${id} 0 obj\n`));
  }
  assert.ok(!source.includes("PAGES_REF"));
  return source;
}

test("PDF builder requires explicit metadata adapters and emits a valid empty object graph", async () => {
  const { createPdfFileBuilder } = await importProjectModule("js/shared/shared-pdf.js");
  assert.throws(() => createPdfFileBuilder(null), TypeError);
  assert.throws(() => createPdfFileBuilder({ now: metadataDate }), TypeError);
  const build = createPdfFileBuilder({ now: metadataDate, applicationLabel: () => "Threadline" });
  const source = await inspectPdf(build([]));
  assert.ok(source.includes("/Count 0"));
  assert.ok(!source.includes("/Title"));
  assert.ok(source.includes("D:20261016123456+05'30'"));
  assert.throws(() => build(null), TypeError);
  assert.throws(() => build([{ content: "missing image array" }]), TypeError);
});

test("PDF builder preserves Unicode metadata, binary images, annotation escaping and byte offsets", async () => {
  const { createPdfFileBuilder } = await importProjectModule("js/shared/shared-pdf.js");
  let label = "Threadline";
  const build = createPdfFileBuilder({ now: metadataDate, applicationLabel: () => label });
  label = "Test";
  const page = { content: "BT (Grüße) Tj ET", images: [{ name: "Page", width: 2, height: 1, bytes: Uint8Array.of(255, 216, 0, 255, 217) }],
    annotations: [{ rect: [1, 2, 3, 4], url: "https://example.test/a(b)\\c" }] };
  const source = await inspectPdf(build([page, { content: "", images: [] }], { title: " 漢🌍 " }));
  assert.ok(source.includes("/Count 2"));
  assert.ok(source.includes("/Title <FEFF6F22D83CDF0D>"));
  assert.ok(source.includes("/Creator <FEFF0054006500730074>"));
  assert.ok(source.includes("/Width 2 /Height 1"));
  assert.ok(source.includes("/Subtype /Image"));
  assert.ok(source.includes("/URI (https://example.test/a\\(b\\)\\\\c)"));
  assert.ok(source.includes("/Rect [1 2 3 4]"));
});
