#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Returns whether a file should be checked for text encoding problems.
 * @param {string} filePath - Absolute or relative file path.
 * @returns {boolean} True when the file extension is part of the text allowlist.
 */
function isSupportedTextFile(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const supportedExtensions = new Set([
    ".js",
    ".json",
    ".css",
    ".html",
    ".md",
    ".txt",
    ".ps1",
    ".php",
    ".svg",
    ".yml",
    ".yaml",
    ".webmanifest",
  ]);
  return supportedExtensions.has(extension);
}

/**
 * Returns whether a directory should be skipped during the scan.
 * @param {string} directoryName - Plain directory name.
 * @returns {boolean} True when the directory should not be scanned.
 */
function shouldSkipDirectory(directoryName) {
  const skippedDirectories = new Set([
    ".git",
    "node_modules",
  ]);
  return skippedDirectories.has(directoryName);
}

/**
 * Walks the repository recursively and collects supported text files.
 * @param {string} directoryPath - Directory that should be scanned.
 * @param {string[]} results - Mutable result array.
 * @returns {string[]} The same result array for convenience.
 */
function collectTextFiles(directoryPath, results) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entry.name)) {
        collectTextFiles(fullPath, results);
      }
      continue;
    }

    if (entry.isFile() && isSupportedTextFile(fullPath)) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Builds line and column information for the first suspicious match.
 * @param {string} text - Full decoded file text.
 * @param {number} offset - Zero-based string offset.
 * @returns {{ line: number, column: number }} One-based line and column numbers.
 */
function getLineAndColumn(text, offset) {
  const prefix = text.slice(0, offset);
  const lines = prefix.split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Finds likely mojibake patterns caused by UTF-8 being interpreted as CP1252.
 * @param {string} text - UTF-8-decoded file text.
 * @returns {{ sample: string, offset: number } | null} Suspicious match metadata, or null.
 */
function findSuspiciousMojibake(text) {
  const patterns = [
    /Ã[\u0080-\u00bfA-Za-z]/u,
    /â[\u0080-\u00bfA-Za-z]/u,
    /Â[\u0080-\u00bfA-Za-z]/u,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && typeof match.index === "number") {
      return {
        sample: match[0],
        offset: match.index,
      };
    }
  }

  const replacementCharacterOffset = text.indexOf("\uFFFD");
  if (replacementCharacterOffset >= 0) {
    return {
      sample: "\uFFFD",
      offset: replacementCharacterOffset,
    };
  }

  return null;
}

/**
 * Reads one file as UTF-8 and reports likely encoding corruption.
 * @param {string} filePath - File that should be checked.
 * @returns {{ filePath: string, line: number, column: number, sample: string } | null} Finding, or null.
 */
function checkFileForEncodingProblems(filePath) {
  const buffer = fs.readFileSync(filePath);
  const text = buffer.toString("utf8");
  const suspiciousMatch = findSuspiciousMojibake(text);

  if (!suspiciousMatch) {
    return null;
  }

  const position = getLineAndColumn(text, suspiciousMatch.offset);
  return {
    filePath,
    line: position.line,
    column: position.column,
    sample: suspiciousMatch.sample,
  };
}

/**
 * Formats one finding for console output.
 * @param {{ filePath: string, line: number, column: number, sample: string }} finding - Encoding finding.
 * @returns {string} Human-readable report line.
 */
function formatFinding(finding) {
  return `${finding.filePath}:${finding.line}:${finding.column} suspicious encoding near "${finding.sample}"`;
}

/**
 * Runs the repository encoding scan and exits with a failing status when findings exist.
 * @returns {void} No return value.
 */
function main() {
  const repositoryRoot = process.cwd();
  const files = collectTextFiles(repositoryRoot, []);
  const findings = [];

  for (const filePath of files) {
    const finding = checkFileForEncodingProblems(filePath);
    if (finding) {
      findings.push(finding);
    }
  }

  if (findings.length === 0) {
    console.log("Encoding check passed. No obvious mojibake patterns found.");
    return;
  }

  console.error("Encoding check found suspicious text that may have been damaged by mixed UTF-8/CP1252 handling:");
  for (const finding of findings) {
    console.error(formatFinding(finding));
  }
  process.exitCode = 1;
}

main();
