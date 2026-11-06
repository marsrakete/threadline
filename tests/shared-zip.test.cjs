"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { importProjectModule } = require("./module-test-helpers.cjs");

/**
 * Creates a ZIP codec with deterministic timestamps and observable output.
 * @param {object} overrides - Optional adapter replacements.
 * @returns {Promise<object>} Module, codec, adapters and recording byte sink.
 */
async function zipFixture(overrides = {}) {
  const module = await importProjectModule("js/shared/shared-zip.js");
  const options = {
    encode: (value) => new TextEncoder().encode(String(value)),
    now: () => new Date("2026-10-16T12:34:56.000Z"),
    invalidArchive: () => "invalid archive",
    closedWriter: () => "writer closed",
    ...overrides,
  };
  const chunks = [];
  let closeCount = 0;
  const sink = {
    async write(bytes) { chunks.push(bytes.slice()); },
    async close() { closeCount += 1; },
  };
  return { module, options, codec: module.createStoredZipCodec(options), chunks, sink, closes: () => closeCount };
}

test("ZIP codec requires explicit encoding, clock and localized error adapters", async () => {
  const { module, options } = await zipFixture();
  for (const value of [null, {}, { ...options, encode: null }, { ...options, now: 1 },
    { ...options, invalidArchive: "error" }, { ...options, closedWriter: undefined }]) {
    assert.throws(() => module.createStoredZipCodec(value), TypeError);
  }
});

test("buffered ZIP preserves UTF-8 names, zero bytes, empty files and ArrayBuffer payloads", async () => {
  const { codec, options } = await zipFixture();
  const entries = [
    { name: "données/日本語.txt", data: options.encode("Grüße 🌍") },
    { name: "empty", data: new Uint8Array() },
    { name: "binary", data: Uint8Array.of(0, 255, 17).buffer },
  ];
  const archive = codec.build(entries);
  const files = codec.parse(archive);
  assert.deepEqual([...files.keys()], entries.map((entry) => entry.name));
  assert.equal(new TextDecoder().decode(files.get(entries[0].name)), "Grüße 🌍");
  assert.deepEqual(files.get("empty"), new Uint8Array());
  assert.deepEqual(files.get("binary"), Uint8Array.of(0, 255, 17));
  assert.deepEqual(codec.parse(archive.buffer), files);
  assert.throws(() => codec.build(null), TypeError);
});

test("buffered ZIP records standard CRC-32, store method, UTC timestamp and directory offsets", async () => {
  const { codec, options } = await zipFixture();
  const archive = codec.build([{ name: "crc", data: options.encode("123456789") }]);
  const view = new DataView(archive.buffer);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint16(6, true), 0x0800);
  assert.equal(view.getUint16(8, true), 0);
  assert.equal(view.getUint16(10, true), (12 << 11) | (34 << 5) | 28);
  assert.equal(view.getUint16(12, true), (46 << 9) | (10 << 5) | 16);
  assert.equal(view.getUint32(14, true), 0xcbf43926);
  const end = archive.length - 22;
  const directoryOffset = view.getUint32(end + 16, true);
  assert.equal(view.getUint32(directoryOffset, true), 0x02014b50);
  assert.equal(view.getUint32(directoryOffset + 16, true), 0xcbf43926);
  assert.equal(view.getUint32(directoryOffset + 42, true), 0);
  assert.equal(view.getUint32(end, true), 0x06054b50);
  assert.equal(view.getUint16(end + 8, true), 1);
});

test("empty archives retain their end record and minimum DOS year remains 1980", async () => {
  const { codec } = await zipFixture({ now: () => new Date("1970-01-02T00:00:00Z") });
  const empty = codec.build([]);
  assert.equal(empty.length, 22);
  assert.equal(new DataView(empty.buffer).getUint32(0, true), 0x06054b50);
  assert.deepEqual(codec.parse(empty), new Map());
  assert.deepEqual(codec.parse(new Uint8Array()), new Map());
  const dated = codec.build([{ name: "empty", data: new Uint8Array() }]);
  assert.equal(new DataView(dated.buffer).getUint16(12, true), (1 << 5) | 2);
});

test("ZIP reader supports byte subviews, last duplicate wins and rejects unsupported headers", async () => {
  let errorText = "invalid archive";
  const { codec } = await zipFixture({ invalidArchive: () => errorText });
  const archive = codec.build([{ name: "same", data: [1] }, { name: "same", data: [2] }]);
  const padded = new Uint8Array(archive.length + 10);
  padded.set(archive, 5);
  assert.deepEqual(codec.parse(padded.subarray(5, 5 + archive.length)).get("same"), Uint8Array.of(2));
  const compressed = archive.slice();
  new DataView(compressed.buffer).setUint16(8, 8, true);
  assert.throws(() => codec.parse(compressed), { message: "invalid archive" });
  errorText = "nouveau message";
  assert.throws(() => codec.parse(new Uint8Array(30)), { message: "nouveau message" });
  assert.throws(() => codec.parse(Symbol("invalid")), TypeError);
});

test("streaming ZIP matches buffered bytes and closes its caller-owned sink only once", async () => {
  const { codec, sink, chunks, closes, options } = await zipFixture();
  const entries = [{ name: "one.txt", data: options.encode("one") }, { name: "é/empty", data: new Uint8Array() }];
  const writer = codec.createWriter(sink);
  for (const entry of entries) {
    await writer.addFile(entry.name, entry.data);
  }
  await writer.close();
  await writer.close();
  assert.equal(closes(), 1);
  const bytes = Buffer.concat(chunks);
  assert.deepEqual(new Uint8Array(bytes), codec.build(entries));
  assert.deepEqual([...codec.parse(bytes).keys()], ["one.txt", "é/empty"]);
  await assert.rejects(writer.addFile("late", [3]), { message: "writer closed" });
});

test("streaming ZIP supports explicit dates, empty archives and optional empty payloads", async () => {
  const { codec, sink, chunks, closes } = await zipFixture();
  const writer = codec.createWriter(sink);
  await writer.addFile("empty", undefined, new Date("2000-01-01T00:00:00Z"));
  await writer.close();
  const bytes = Buffer.concat(chunks);
  assert.equal(bytes.readUInt16LE(12), 20 << 9 | 1 << 5 | 1);
  assert.deepEqual([...codec.parse(bytes).get("empty")], []);
  assert.equal(closes(), 1);
  const empty = await zipFixture();
  await empty.codec.createWriter(empty.sink).close();
  assert.deepEqual(new Uint8Array(Buffer.concat(empty.chunks)), empty.codec.build([]));
});

test("streaming ZIP propagates write and close failures without reporting successful closure", async () => {
  const { codec } = await zipFixture();
  const failure = new Error("disk full");
  let closed = false;
  const writer = codec.createWriter({
    async write() { throw failure; },
    async close() { closed = true; },
  });
  await assert.rejects(writer.addFile("file", [1]), (error) => error === failure);
  assert.equal(writer.entryCount, 0);
  assert.equal(closed, false);
  const closeFailure = codec.createWriter({ async write() {}, async close() { throw failure; } });
  await assert.rejects(closeFailure.close(), (error) => error === failure);
  assert.equal(closeFailure.closed, false);
});
