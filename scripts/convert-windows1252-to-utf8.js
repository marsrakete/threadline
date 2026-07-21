#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const iconv = require("iconv-lite");

const USAGE_TEXT = "Usage: node scripts/convert-windows1252-to-utf8.js <file> [more files]";

/**
 * Prints command usage help.
 * @returns {void} No return value.
 */
function printUsage() {
  console.log(USAGE_TEXT);
}

/**
 * Returns normalized repository-relative file paths from the CLI.
 * @returns {string[]} File paths passed to the script.
 */
function getTargetFiles() {
  return process.argv.slice(2);
}

/**
 * Resolves one CLI path against the current working directory.
 * @param {string} filePath - Raw CLI file path.
 * @returns {string} Absolute file path.
 */
function resolveTargetPath(filePath) {
  return path.resolve(process.cwd(), filePath);
}

/**
 * Returns whether a path exists and is a file.
 * @param {string} filePath - Candidate file path.
 * @returns {boolean} True when the path points to an existing file.
 */
function isExistingFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/**
 * Converts one Windows-1252 encoded file into UTF-8 without BOM.
 * @param {string} filePath - File that should be converted.
 * @returns {void} No return value.
 */
function convertFile(filePath) {
  const rawBytes = fs.readFileSync(filePath);
  const decodedText = iconv.decode(rawBytes, "win1252");
  fs.writeFileSync(filePath, decodedText, "utf8");
  console.log(`Converted ${filePath} from Windows-1252 to UTF-8.`);
}

/**
 * Runs the CLI conversion flow.
 * @returns {void} No return value.
 */
function main() {
  const targets = getTargetFiles();
  if (targets.length === 0) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  let hadError = false;

  for (const target of targets) {
    const fullPath = resolveTargetPath(target);
    if (!isExistingFile(fullPath)) {
      console.error(`File not found: ${target}`);
      hadError = true;
      continue;
    }

    convertFile(fullPath);
  }

  if (hadError) {
    process.exitCode = 1;
    return;
  }
}

main();
