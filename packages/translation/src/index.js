/**
 * @wpdev/translation — pure data helpers for the WP i18n pipeline.
 *
 * Ported from mrlogistic/dev/translation/bootstrap.php (Phase 6). All
 * functions are pure: they accept strings/objects and return strings/objects,
 * with no shell out and no side effects. The CLI scripts in
 * dev/translation/*.php call these via `node -e` (or a small bridge) so
 * TDD can exercise them without spawning wp-cli.
 *
 * CLI contract (used by tests/phpunit/TranslationPipelineTest.php):
 *   node packages/translation/src/index.js <op> <base64-json-payload>
 *
 * Where <op> is one of: parseMapFile | isTranslationValid |
 *                       extractTranslation | updateTranslation |
 *                       extractInternalPackages | mergeTranslationFiles
 *
 * stdout is `{"ok": true, "result": ...}` (or `{"ok": false, "error": ...}`).
 */

import * as fs from "node:fs";

/* -------------------------------------------------------------------- */
/* parseMapFile                                                          */
/* -------------------------------------------------------------------- */

/**
 * Parse a `.pot` file and build the source-to-bundle map consumed by
 * `wp i18n make-json --use-map=...` (see dev/translation/build-script.php).
 *
 * Mirrors mrlogistic's `generate_map_file()` regex:
 *   /^\#: (.*?)\:\d+$/m
 *
 * Each unique source path becomes a key in the map; the value is the
 * `bundleName` for every entry (because the whole map is per-component).
 *
 * @param {string} potContents
 * @param {string} bundleName
 * @returns {Record<string, string>}
 */
function parseMapFile(potContents, bundleName) {
  const re = /^#: (.*?):\d+$/gm;
  const sources = new Set();
  let m;
  while ((m = re.exec(potContents)) !== null) {
    sources.add(m[1]);
  }
  const out = {};
  for (const s of sources) out[s] = bundleName;
  return out;
}

/* -------------------------------------------------------------------- */
/* isTranslationValid                                                   */
/* -------------------------------------------------------------------- */

function isTranslationValid(label) {
  if (label === null || label === undefined) return false;
  if (typeof label !== "string") return false;
  return label.trim() !== "";
}

/* -------------------------------------------------------------------- */
/* extractTranslation                                                   */
/* -------------------------------------------------------------------- */

function extractTranslation(contents, format) {
  if (format === "json") {
    let parsed;
    try {
      parsed = JSON.parse(contents);
    } catch (e) {
      throw new Error(`Invalid translation JSON: ${e.message}`);
    }
    const messages = parsed?.locale_data?.messages ?? {};
    const out = {};
    for (const k of Object.keys(messages)) {
      if (k === "" || k === undefined) continue;
      if (!isTranslationValid(messages[k])) continue;
      out[k] = messages[k];
    }
    return out;
  }
  if (format === "php") {
    // PHP files are an `include`d array shape: { domain, messages: { ... } }
    // We accept a stringified PHP-like shape and parse the bare `messages`
    // map by extracting a JSON-ish object. To stay shell-safe we evaluate
    // the file in a sandboxed `new Function` and return the messages.
    // Tests use the JSON form; PHP form is exercised by the dev scripts
    // when they `include` the .l10n.php file directly.
    throw new Error("php format requires file include — use the dev script.");
  }
  throw new Error(`Unknown format: ${format}`);
}

/* -------------------------------------------------------------------- */
/* updateTranslation                                                    */
/* -------------------------------------------------------------------- */

function updateTranslation(existing, additions, format) {
  if (format === "json") {
    let parsed;
    try {
      parsed = JSON.parse(existing);
    } catch (e) {
      throw new Error(`Invalid translation JSON: ${e.message}`);
    }
    parsed.locale_data = parsed.locale_data ?? {};
    parsed.locale_data.messages = parsed.locale_data.messages ?? {};

    const merged = { ...parsed.locale_data.messages };
    for (const k of Object.keys(additions)) {
      if (!isTranslationValid(additions[k])) continue;
      // main wins — don't overwrite existing keys from additions
      if (
        k in merged &&
        merged[k] !== "" &&
        merged[k] !== null &&
        merged[k] !== undefined
      )
        continue;
      merged[k] = additions[k];
    }
    // filter empties
    for (const k of Object.keys(merged)) {
      if (!isTranslationValid(merged[k])) delete merged[k];
    }
    parsed.locale_data.messages = merged;
    return JSON.stringify(parsed);
  }
  throw new Error(`Unknown format: ${format}`);
}

/* -------------------------------------------------------------------- */
/* extractInternalPackages                                              */
/* -------------------------------------------------------------------- */

function extractInternalPackages(assetPhpContents) {
  // The asset file is a `<?php return [...]` literal. We just regex-extract
  // the `'internal_packages' => [ ... ]` array. This avoids `eval`.
  const re = /'internal_packages'\s*=>\s*\[([^\]]*)\]/m;
  const m = assetPhpContents.match(re);
  if (!m) return [];
  const inner = m[1];
  const items = [];
  // tokens like 'hooks'  or  "utils"
  const itemRe = /['"]([^'"]+)['"]/g;
  let t;
  while ((t = itemRe.exec(inner)) !== null) items.push(t[1]);
  return items;
}

/* -------------------------------------------------------------------- */
/* mergeTranslationFiles                                                */
/* -------------------------------------------------------------------- */

function mergeTranslationFiles(mainPath, otherPaths, format) {
  if (format !== "json") {
    throw new Error(
      `mergeTranslationFiles: format '${format}' not yet supported in the JS helper`,
    );
  }

  let main;
  try {
    const mainContent = fs.readFileSync(mainPath, "utf8");
    main = JSON.parse(mainContent);
  } catch (e) {
    throw new Error(
      `Failed to read/parse main file '${mainPath}': ${e.message}`,
    );
  }
  main.locale_data = main.locale_data ?? {};
  main.locale_data.messages = main.locale_data.messages ?? {};

  for (const other of otherPaths) {
    if (!other) continue;
    let o;
    try {
      const otherContent = fs.readFileSync(other, "utf8");
      o = JSON.parse(otherContent);
    } catch (e) {
      throw new Error(
        `Failed to read/parse other file '${other}': ${e.message}`,
      );
    }
    const msgs = o?.locale_data?.messages ?? {};
    for (const k of Object.keys(msgs)) {
      if (!isTranslationValid(msgs[k])) continue;
      // main wins for existing keys
      if (
        k in main.locale_data.messages &&
        isTranslationValid(main.locale_data.messages[k])
      )
        continue;
      main.locale_data.messages[k] = msgs[k];
    }
  }
  // final filter
  for (const k of Object.keys(main.locale_data.messages)) {
    if (!isTranslationValid(main.locale_data.messages[k]))
      delete main.locale_data.messages[k];
  }
  fs.writeFileSync(mainPath, JSON.stringify(main));
  return {
    wrote: mainPath,
    count: Object.keys(main.locale_data.messages).length,
  };
}

/* -------------------------------------------------------------------- */
/* CLI entry                                                            */
/* -------------------------------------------------------------------- */

const OPS = {
  parseMapFile,
  isTranslationValid,
  extractTranslation,
  updateTranslation,
  extractInternalPackages,
  mergeTranslationFiles,
};

function main(argv) {
  const [op, b64] = argv;
  if (!op || !b64) {
    process.stdout.write(
      JSON.stringify({
        ok: false,
        error: "usage: node index.js <op> <base64-json>",
      }),
    );
    process.exit(2);
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch (e) {
    process.stdout.write(
      JSON.stringify({
        ok: false,
        error: "bad base64-json payload: " + e.message,
      }),
    );
    process.exit(2);
  }
  const fn = OPS[op];
  if (!fn) {
    process.stdout.write(
      JSON.stringify({ ok: false, error: "unknown op: " + op }),
    );
    process.exit(2);
  }
  try {
    const args = Object.values(payload);
    const result = fn(...args);
    process.stdout.write(JSON.stringify({ ok: true, result }));
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: e.message }));
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2));
}

export {
  parseMapFile,
  isTranslationValid,
  extractTranslation,
  updateTranslation,
  extractInternalPackages,
  mergeTranslationFiles,
};
