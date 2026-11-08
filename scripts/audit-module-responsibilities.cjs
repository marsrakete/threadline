"use strict";

// Development-only inventory. Playwright is already a pinned test dependency.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const playwrightRoot = path.dirname(require.resolve("playwright/package.json"));
const parser = require(path.join(playwrightRoot, "lib/transform/babelBundle.js"));

/** Suggests a domain from existing entry-point naming; it does not establish ownership.
 * @param {string} name - Function name. @returns {string} Review grouping.
 */
function suggestDomain(name) {
  const rules = [
    [/ThreadExplorer|Snapshot|LivePost|LikeState/, "explorer"],
    [/Archive|PostEdit/, "archive"], [/Dm/, "dm"], [/Network/, "network"],
    [/Search/, "search"], [/Analysis/, "analysis"],
    [/Composer|Segment|LinkCard|ReplyTarget|Mention|Image|Hashtag|Publish|History|Tip/, "composer"],
  ];
  for (const [pattern, domain] of rules) {
    if (pattern.test(name)) { return domain; }
  }
  return "core";
}

/** Inventories all top-level functions and their lexical state coupling.
 * @param {string} filename - Entry source path. @returns {object} Source hash, counts and functions.
 */
function inspectEntry(filename) {
  const source = fs.readFileSync(filename, "utf8");
  const ast = parser.babelParse(source, filename, true);
  const functions = [];
  parser.traverse(ast, {
    FunctionDeclaration(functionPath) {
      if (functionPath.parent.type !== "Program") { return; }
      const node = functionPath.node;
      const reads = new Set();
      const writes = new Set();
      /** Checks whether an identifier belongs to outer lexical state.
       * @param {object} identifier - Babel identifier path. @returns {boolean} External binding.
       */
      function isExternal(identifier) {
        const binding = identifier.scope.getBinding(identifier.node.name);
        return Boolean(binding && binding.kind !== "module" && binding.kind !== "hoisted"
          && (binding.path.node.start < node.start || binding.path.node.end > node.end));
      }
      functionPath.traverse({
        ReferencedIdentifier(identifier) {
          if (isExternal(identifier)) { reads.add(identifier.node.name); }
        },
        AssignmentExpression(assignment) {
          let target = assignment.get("left");
          while (target.node?.type === "MemberExpression") { target = target.get("object"); }
          if (target.node?.type === "Identifier" && isExternal(target)) { writes.add(target.node.name); }
        },
        UpdateExpression(update) {
          const target = update.get("argument");
          if (target.node?.type === "Identifier" && isExternal(target)) { writes.add(target.node.name); }
        },
      });
      let category = "behavior";
      const first = node.body.body[0];
      if (node.body.body.length === 1 && ["ReturnStatement", "ExpressionStatement"].includes(first?.type)) {
        category = "adapter";
      }
      if (/^get.*(Controller|Gate|Presentation|Interactions)$/.test(node.id.name) || /^getWorker/.test(node.id.name)) {
        category = "composition";
      }
      functions.push({ name: node.id.name, domain: suggestDomain(node.id.name), category,
        stateReads: [...reads].sort(), stateWrites: [...writes].sort() });
    },
  });
  const domains = {};
  for (const item of functions) {
    domains[item.domain] ??= { total: 0, adapters: 0, composition: 0, behavior: 0, stateWriters: 0 };
    const counts = domains[item.domain];
    counts.total += 1;
    let category = item.category;
    if (category === "adapter") { category = "adapters"; }
    counts[category] += 1;
    if (item.stateWrites.length) { counts.stateWriters += 1; }
  }
  return { sourceSha256: crypto.createHash("sha256").update(source).digest("hex"), functionCount: functions.length, domains, functions };
}

const report = {
  schemaVersion: 1,
  baseline: process.env.THREADLINE_AUDIT_BASE || "b4f2d0529dccecd7f2fa66a04da5e76783f3ecab",
  date: "2026-11-08",
  method: "AST inventory of every top-level named function, not a function-length filter. Category is structural evidence, not a completion verdict. Shared-state reads/writes include nested callbacks; property mutation requires the manual review described in MODULARIZATION-AUDIT.md.",
  files: {},
};
for (const filename of ["app.js", "sw.js"]) { report.files[filename] = inspectEntry(filename); }
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync("docs/modularization-inventory.json", JSON.stringify(report, null, 2) + "\n");
for (const [filename, entry] of Object.entries(report.files)) {
  console.log(filename, entry.functionCount);
  console.table(entry.domains);
}
