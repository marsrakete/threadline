"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

const DEFAULT_EDIT = { zoom: 1, offsetX: 0, offsetY: 0, flipX: false, flipY: false, rotation: 0, fitMode: "cover" };

/**
 * Creates processing with controlled decoding, Canvas, file reading and export sizes.
 * @param {object} overrides - Replacement browser/geometry dependencies.
 * @returns {Promise<object>} Processing operations, image, canvas log and original blob.
 */
async function createProcessingFixture(overrides = {}) {
  const module = await importProjectModule("js/composer/composer-image-processing.js");
  const calls = [];
  const original = new Blob(["original"], { type: "image/png" });
  const image = { dataUrl: "data:image/png;base64,AA==", width: 100, height: 200, edit: { ...DEFAULT_EDIT } };
  const options = {
    createImage: () => ({ naturalWidth: 100, naturalHeight: 200, set src(_value) { this.onload(); } }),
    createFileReader: () => ({ result: "data:image/png;base64,AA==", readAsDataURL() { this.onload(); } }),
    fetchData: async () => ({ ok: true, blob: async () => original }),
    createImageBitmap: async () => ({ width: 100, height: 200 }),
    createId: () => "image-id",
    createCanvas: () => ({
      width: 0, height: 0,
      toBlob(callback, type, quality) { calls.push(["blob", this.width, this.height, type, quality]); callback(new Blob(["jpeg"])); },
    }),
    getDevicePixelRatio: () => 2,
    normalizeThreadImage: (entry) => {
      if (!entry?.dataUrl) { return null; }
      return { ...entry, edit: { ...DEFAULT_EDIT, ...entry.edit } };
    },
    createDefaultImageEdit: () => ({ ...DEFAULT_EDIT }),
    normalizeImageEdit: (edit) => ({ ...DEFAULT_EDIT, ...edit }),
    isImageUsingDefaultEdit: (entry) => entry.edit.zoom === 1 && entry.edit.rotation === 0 && !entry.edit.offsetX && !entry.edit.offsetY,
    hasExplicitImageUploadTransform: (entry) => Boolean(entry.transformed || entry.exportScale < 1 || entry.edit.zoom !== 1),
    normalizeImageAutoResizeMode: (value) => value,
    getAutoResizeMode: () => "off",
    getImageEditorCanvasDimensions: () => ({ width: 100, height: 200 }),
    getEditedImageExportDimensions: (_image, _edit, _source, scale) => ({ width: 140 * scale, height: 280 * scale }),
    getImageMetrics: () => ({}),
    renderComposerImageToCanvas: async (_image, canvas, settings) => calls.push(["render", canvas.width, canvas.height, settings]),
    t: (key) => key,
    IMAGE_MIN_EXPORT_SCALE: 0.1, IMAGE_MAX_DIMENSION: 1000, IMAGE_BLOB_LIMIT: 1000,
    ...overrides,
  };
  return { processing: module.createComposerImageProcessing(options), calls, original, image };
}

test("Composer image geometry preserves orientation, minimum export sizes and cover/contain offsets", async () => {
  const module = await importProjectModule("js/composer/composer-image-geometry.js");
  const geometry = module.createComposerImageGeometry({
    normalizeImageEdit: (edit) => ({ ...DEFAULT_EDIT, ...edit }),
    isImageUsingDefaultEdit: (image) => image.edit.zoom === 1,
    clamp: (value, min, max) => Math.min(max, Math.max(min, value)),
    IMAGE_EDITOR_CANVAS_WIDTH: 980, IMAGE_EDITOR_CANVAS_HEIGHT: 630, IMAGE_EXPORT_WIDTH: 1400,
  });
  const image = { width: 100, height: 200, edit: { ...DEFAULT_EDIT } };
  assert.deepEqual(geometry.getImageEditorCanvasDimensions(image), { width: 630, height: 980 });
  assert.equal(geometry.isPortraitEditorImage(image), true);
  assert.deepEqual(geometry.getImageEditorCanvasDimensions(image, { rotation: 90 }), { width: 980, height: 630 });
  assert.deepEqual(geometry.getEditedImageExportDimensions(image, image.edit, null, 0), { width: 320, height: 320 });
  assert.deepEqual(geometry.getImagePreviewFrameDimensions(image), { width: 100, height: 200 });
  const cover = geometry.getImageMetrics(image, 100, 100, { zoom: 2, offsetX: 999, offsetY: -999 });
  assert.deepEqual([cover.offsetX, cover.offsetY, cover.maxOffsetX, cover.maxOffsetY], [50, -150, 50, 150]);
  const contain = geometry.clampImageEditToFrame(image, 100, 100, { offsetX: 20, offsetY: 20 }, "contain");
  assert.deepEqual([contain.offsetX, contain.offsetY, contain.fitMode], [0, 0, "contain"]);
  assert.ok(Number.isFinite(geometry.getImageMetrics({}, 100, 100).drawWidth));
  assert.deepEqual(geometry.getContainedPreviewBox(100, 200, 50, 50), { width: 25, height: 50 });
});

test("Composer processing decodes files into normalized records with original metadata", async () => {
  const { processing } = await createProcessingFixture();
  const record = await processing.createThreadImageFromFile({ name: "photo.png", type: "image/png", size: 42 });
  assert.deepEqual([record.id, record.name, record.type, record.width, record.height, record.originalSizeBytes, record.alt],
    ["image-id", "photo.png", "image/png", 100, 200, 42, ""]);
  assert.deepEqual(record.edit, DEFAULT_EDIT);
  const bitmap = await processing.loadImageBitmapForDataUrl(record.dataUrl);
  assert.equal(bitmap.width, 100);
});

test("Composer processing propagates file-read, image-decode and blob-fetch failures", async () => {
  const readError = new Error("read");
  const reading = await createProcessingFixture({ createFileReader: () => ({
    error: readError, readAsDataURL() { this.onerror(); },
  }) });
  await assert.rejects(reading.processing.fileToDataUrl({}), (error) => error.message === "fileReadFailed" && error.cause === readError);
  const decoding = await createProcessingFixture({ createImage: () => ({ set src(_value) { this.onerror(); } }) });
  await assert.rejects(decoding.processing.createThreadImageFromFile({}), /imageLoadFailed/);
  const fetching = await createProcessingFixture({ fetchData: async () => ({ ok: false }) });
  await assert.rejects(fetching.processing.renderImageToBlob(fetching.image), /imageBlobCreateFailed/);
});

test("Composer image export preserves original bytes and distinguishes resize from edited-frame JPEG export", async () => {
  const { processing, image, calls, original } = await createProcessingFixture();
  const unchanged = await processing.renderImageToBlob(image);
  assert.equal(unchanged.blob, original);
  assert.equal(unchanged.blob.type, "image/png");
  assert.equal(calls.length, 0);
  image.exportScale = 0.5;
  await processing.renderImageToBlob(image);
  assert.deepEqual(calls.at(-1), ["blob", 50, 100, "image/jpeg", 0.88]);
  assert.equal(calls[0][3].fit, "contain");
  calls.length = 0;
  image.exportScale = 1;
  image.edit = { ...DEFAULT_EDIT, zoom: 2, offsetX: 10, offsetY: -5 };
  await processing.renderImageToBlob(image);
  assert.deepEqual(calls.at(-1), ["blob", 140, 280, "image/jpeg", 0.88]);
  assert.deepEqual([calls[0][3].edit.offsetX, calls[0][3].edit.offsetY], [14, -7]);
  assert.deepEqual([image.edit.offsetX, image.edit.offsetY], [10, -5]);
  assert.equal(typeof calls[0][3].normalizeEdit, "function");
  assert.equal(typeof calls[0][3].loadBitmap, "function");
});

test("Composer preview scales edit offsets and clamps device pixel ratio", async () => {
  const { processing, image, calls } = await createProcessingFixture({ getDevicePixelRatio: () => 9 });
  image.edit = { ...DEFAULT_EDIT, zoom: 2, offsetX: 10, offsetY: -20 };
  const canvas = { width: 0, height: 0, getBoundingClientRect: () => ({ width: 50, height: 100 }) };
  await processing.renderPreviewCanvas(image, canvas);
  assert.deepEqual([canvas.width, canvas.height], [150, 300]);
  assert.deepEqual([calls[0][3].edit.offsetX, calls[0][3].edit.offsetY], [15, -30]);
  assert.equal(calls[0][3].fit, "cover");
});

test("Composer image validation treats exact limits as valid and null Canvas blobs as errors", async () => {
  const exact = await createProcessingFixture({ fetchData: async () => ({ ok: true, blob: async () => new Blob([new Uint8Array(1000)]) }) });
  exact.image.width = 1000;
  const validation = await exact.processing.validateThreadImage(exact.image);
  assert.equal(validation.tooBig, false);
  exact.image.width = 1001;
  assert.equal((await exact.processing.validateThreadImage(exact.image)).exceedsDimensions, true);
  const tooLarge = await createProcessingFixture({ fetchData: async () => ({ ok: true, blob: async () => new Blob([new Uint8Array(1001)]) }) });
  assert.equal((await tooLarge.processing.validateThreadImage(tooLarge.image)).tooBig, true);
  const failed = await createProcessingFixture({ createCanvas: () => ({ toBlob: (callback) => callback(null) }) });
  failed.image.exportScale = 0.5;
  await assert.rejects(failed.processing.renderImageToBlob(failed.image), /imageBlobCreateFailed/);
});

test("Composer upload preparation fits dimensions on a copy and bounds lossy retries", async () => {
  const fitting = await createProcessingFixture();
  fitting.image.width = 2000; fitting.image.height = 1000;
  const result = await fitting.processing.prepareImageForUpload(fitting.image, "fit");
  assert.deepEqual([result.width, result.height, result.validation.tooBig], [1000, 500, false]);
  assert.equal(fitting.image.exportScale, undefined);
  assert.equal(fitting.image.validation, undefined);
  let jpegExports = 0;
  const lossy = await createProcessingFixture({
    fetchData: async () => ({ ok: true, blob: async () => new Blob([new Uint8Array(1001)]) }),
    createCanvas: () => ({ toBlob(callback) { jpegExports += 1; callback(new Blob([new Uint8Array(1001)])); } }),
    renderComposerImageToCanvas: async () => {},
  });
  const oversized = await lossy.processing.prepareImageForUpload(lossy.image, "lossy");
  assert.equal(oversized.validation.tooBig, true);
  assert.equal(jpegExports, 9);
  assert.equal(lossy.image.exportQuality, undefined);
  await assert.rejects(lossy.processing.prepareImageForUpload({}), /imageBlobCreateFailed/);
  const unmodified = await fitting.processing.prepareImageForUpload(fitting.image, "off");
  assert.equal(unmodified.width, 2000);
  assert.equal(unmodified.validation.tooBig, true);
});

test("Composer validation batches ignore stale renders and report scheduled failures", async () => {
  const module = await importProjectModule("js/composer/composer-images.js");
  const pending = []; let renders = 0;
  const controller = module.createComposerImageValidationController({
    getImages: () => [[{}]], validateImage: () => new Promise((resolve) => pending.push(resolve)),
    render: () => { renders += 1; }, reportError: () => {},
  });
  const older = controller.validate(); const newer = controller.validate();
  pending[1](); await newer; pending[0](); await older;
  assert.equal(renders, 1);
  let error;
  const failing = module.createComposerImageValidationController({
    getImages: () => [[{}]], validateImage: async () => { throw new Error("decode"); },
    render: () => assert.fail("failed validation must not render"), reportError: (value) => { error = value; },
  });
  failing.schedule();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(error.message, "decode");
});
