"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { hashAuditSource } = require("../scripts/audit-source.cjs");

test("audit source hashes match for LF, CRLF and mixed checkout line endings", () => {
  const lf = "function sample() {\n  return 1;\n}\n";
  assert.equal(hashAuditSource(lf), hashAuditSource(lf.replace(/\n/g, "\r\n")));
  assert.equal(hashAuditSource(lf), hashAuditSource(lf.replace("{\n", "{\r\n")));
});

test("audit hashing still detects code, whitespace, lone CR and final newline changes", () => {
  const source = "const value = 1;\n";
  for (const changed of ["const value = 2;\n", "const value = 1; \n", "const value = \r1;\n", "const value = 1;\r", "const value = 1;"]) {
    assert.notEqual(hashAuditSource(source), hashAuditSource(changed));
  }
});

test("audit hashing accepts empty source and rejects invalid input", () => {
  assert.equal(hashAuditSource(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  for (const source of [undefined, null, 42, {}, Buffer.from("source")]) {
    assert.throws(() => hashAuditSource(source), TypeError);
  }
});
