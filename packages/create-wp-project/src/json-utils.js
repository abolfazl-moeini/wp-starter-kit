/**
 * @wpsk/create-wp-project — safe JSON file editing helper.
 *
 * Phase 20 of plan.v3.md. The kit edits a number of JSON files
 * in consumer projects (project.config.json, wpsk-kit.json,
 * package.json, etc.) as it adds / removes features in
 * Phase 22+ (addFeature, removeFeature, runMigrations). The
 * naive approach — read, parse, modify, JSON.stringify with a
 * fixed indent — is wrong: it reformats the entire file, which
 * produces noisy diffs and breaks user customisations.
 *
 * updateJsonFile(filePath, callback) reads a JSON file, parses
 * it, calls callback with the parsed value, and writes the
 * result back with the SAME indentation the file had on disk:
 *
 *  - 2-space indent  (the kit default — project.config.json,
 *                     wpsk-kit.json, package.json all use it)
 *  - 4-space indent  (some IDE-formatted configs)
 *  - tab indent      (Makefiles, some style guides)
 *  - compact         (single-line JSON; treated as a degenerate
 *                     0-space indent)
 *
 * Detection rule: take the leading whitespace of the first
 * non-empty indented line, classify it as a tab (\t) or count
 * spaces, and re-use that unit. Trailing-newline state is
 * preserved too — a file with '\n' on the end stays that way.
 *
 * Locked by tests/packages/jsonUtils.test.js.
 */

import { promises as fs } from "node:fs";

/**
 * @typedef {Object} UpdateResult
 * @property {boolean} ok
 * @property {*}      value  The value the callback returned
 *                           (the post-mutation object).
 */

/**
 * @param {string}   filePath
 * @param {(value: any) => any} callback
 * @returns {Promise<UpdateResult>}
 */
export async function updateJsonFile(filePath, callback) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("updateJsonFile: filePath is required (string)");
  }
  if (typeof callback !== "function") {
    throw new Error("updateJsonFile: callback is required (function)");
  }

  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new Error(`updateJsonFile: file not found at ${filePath}`);
    }
    throw new Error(
      `updateJsonFile: failed to read ${filePath} (${error.message})`,
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `updateJsonFile: malformed JSON in ${filePath} (${error.message})`,
    );
  }

  const next = callback(parsed);
  if (next === undefined || next === null) {
    throw new Error("updateJsonFile: callback must return the (mutated) value");
  }

  const { indent, hasTrailingNewline } = detectIndent(raw);
  const serialized =
    indent === "\t"
      ? JSON.stringify(next, null, "\t")
      : JSON.stringify(next, null, indent);
  const out = serialized + (hasTrailingNewline ? "\n" : "");

  await fs.writeFile(filePath, out, "utf8");

  return { ok: true, value: next };
}

/**
 * Inspect a JSON file's raw text and return its indent unit
 * (number of spaces OR the literal tab character) and whether
 * the file ends with a trailing newline.
 *
 * Rules:
 *  - Walk every non-empty line; the FIRST one that has leading
 *    whitespace wins (so a 2-space-indented file is detected
 *    as 2 even if a later object uses different nesting).
 *  - Leading whitespace made of a single tab → return '\t'.
 *  - Leading whitespace made of spaces → return the count
 *    (the count is taken from the first indented line, so a
 *    consistent 2-space file reports 2, a consistent 4-space
 *    file reports 4, etc.).
 *  - No indented lines found (compact / single-line JSON) →
 *    return 0 (no indent unit) and write back compact.
 *  - Trailing newline: true if the file ends in '\n', false
 *    otherwise. The 'split("\n").pop()' check treats '\r\n'
 *    the same way because the '\r' still leaves a trailing
 *    '\n' (Windows line endings) — but a file written with
 *    explicit '\r\n' may have a trailing '\r' followed by
 *    no '\n'; we treat that as no trailing newline.
 *
 * @param {string} raw
 * @returns {{ indent: number | "\t", hasTrailingNewline: boolean }}
 */
export function detectIndent(raw) {
  let hasTrailingNewline = false;
  if (raw.length > 0 && raw.endsWith("\n")) {
    hasTrailingNewline = true;
  }
  const lines = raw.split("\n");
  for (const line of lines) {
    if (line.length === 0) continue;
    const m = line.match(/^([\t ]+)/);
    if (m) {
      if (m[1][0] === "\t") return { indent: "\t", hasTrailingNewline };
      return { indent: m[1].length, hasTrailingNewline };
    }
  }
  return { indent: 0, hasTrailingNewline };
}
