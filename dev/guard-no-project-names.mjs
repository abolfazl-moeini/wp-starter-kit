#!/usr/bin/env node

/**
 * CI / Test Guard: Zero Project Name Leakage in Boilerplate
 *
 * Scans packages/, config/, dev/, core/, src/, skills/, and migration/inventory.tsv
 * to ensure absolute zero occurrences of project-specific / client names.
 *
 * Excludes historical .md archive documents and build artifacts/cache.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..");

// Define forbidden tokens via base64 to avoid self-matching
const FORBIDDEN_TOKENS = [
  Buffer.from("dGF2YW5nYXJ5", "base64").toString("utf8"),
  Buffer.from("bmlrYW1vb3o=", "base64").toString("utf8"),
];

const SCAN_TARGETS = [
  "packages",
  "config",
  "dev",
  "core",
  "src",
  "skills",
  "migration/inventory.tsv",
];

const IGNORE_PATTERNS = [
  /\.git\b/,
  /node_modules\b/,
  /\.cache\b/,
  /dist\b/,
  /\.md$/i, // Historical documentation / review notes
];

function shouldIgnore(pathStr) {
  if (pathStr === __filename) {
    return true;
  }
  return IGNORE_PATTERNS.some((p) => p.test(pathStr));
}

function scanFile(filePath, violations) {
  if (shouldIgnore(filePath)) {
    return;
  }
  let content;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return; // binary or unreadable
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();
    for (const token of FORBIDDEN_TOKENS) {
      if (lower.includes(token)) {
        violations.push({
          file: relative(repoRoot, filePath),
          line: i + 1,
          matchedTerm: token,
          content: line.trim(),
        });
      }
    }
  }
}

function scanDir(dirPath, violations) {
  let entries;
  try {
    entries = readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (shouldIgnore(fullPath)) {
      continue;
    }
    if (entry.isDirectory()) {
      scanDir(fullPath, violations);
    } else if (entry.isFile()) {
      scanFile(fullPath, violations);
    }
  }
}

function main() {
  const violations = [];

  for (const target of SCAN_TARGETS) {
    const fullPath = join(repoRoot, target);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath, violations);
      } else if (stat.isFile()) {
        scanFile(fullPath, violations);
      }
    } catch {
      // Path does not exist in this workspace, skip
    }
  }

  if (violations.length > 0) {
    console.error(`\x1b[31m✖ [FAIL-CLOSED] Project name leakage guard failed!\x1b[0m`);
    console.error(`Found ${violations.length} forbidden project name occurrence(s):`);
    for (const v of violations) {
      console.error(`  - ${v.file}:${v.line} [found: "${v.matchedTerm}"]: ${v.content.slice(0, 100)}`);
    }
    process.exit(1);
  }

  console.log(`\x1b[32m✔ Project name purge verified: 0 occurrences of forbidden names found.\x1b[0m`);
  process.exit(0);
}

main();
