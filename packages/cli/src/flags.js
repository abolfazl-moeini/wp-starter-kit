/**
 * `parseFlags(argv)` — pure mapping from a raw CLI argv array to a
 * normalized `{ answers, features, runOptions }` shape. Used by
 * `gather.js` (Phase I2) and the command stubs (Phase I3+).
 *
 * The function is the single source of truth for the flag set the
 * plan.installer.md Appendix A describes. The registry (`KNOWN_FLAGS`)
 * is the cross-check: a flag outside the registry produces a clear
 * error that lists every valid flag, so a typo'd flag is loud
 * immediately rather than silently ignored.
 *
 * Design notes:
 *  - The positional arg is the project slug (sanitized) and also
 *    seeds the directory name when --dir is omitted.
 *  - --slug and the positional both target `answers.slug`; --slug
 *    wins because explicit flags always trump positional defaults.
 *  - `--install` / `--git` / `--force` / `--yes` / `--verbose` are
 *    booleans (presence toggles true). We never accept a value
 *    after them.
 *  - Unknown flag → throws a single Error with a list of every
 *    valid flag so the user can fix typos without re-reading docs.
 */

import { sanitizeSlug } from "./slug.js";

/**
 * Every flag the plan.installer.md Appendix A defines. Kept as a
 * sorted array so the "Unknown flag" error message renders a
 * predictable list and tests can assert membership.
 */
export const KNOWN_FLAGS = [
  "--blocks=",
  "--css=",
  "--dir=",
  "--domain=",
  "--example=",
  "--fault-tolerance=",
  "--frontend-stack=",
  "--mcp-abilities=",
  "--force",
  "--git",
  "--global=",
  "--hook=",
  "--husky=",
  "--i18n=",
  "--install",
  "--js-lib=",
  "--js-test=",
  "--js=",
  "--kit-version=",
  "--license=",
  "--php-fn=",
  "--php-framework=",
  "--php-min=",
  "--php-source=",
  "--php-test=",
  "--preset=",
  "--rest-batch=",
  "--scope=",
  "--slug=",
  "--vendor-scoping=",
  "--verbose",
  "--wp-min=",
  "--yes",
  "-y",
];

/**
 * Map: flag → (out, key). `out` is one of "answers" | "features" |
 * "runOptions". `kind` is "kv" for `--key=value` and "bool" for
 * bare booleans. The first matching prefix wins, so `--js=...`
 * must come before any `--js-*=` longer prefix when checking.
 */
const FLAG_MAP = [
  // answers.*
  ["answers", "slug", "--slug=", "kv"],
  ["answers", "npmScope", "--scope=", "kv"],
  ["answers", "globalName", "--global=", "kv"],
  ["answers", "textDomain", "--domain=", "kv"],
  ["answers", "hookPrefix", "--hook=", "kv"],
  ["answers", "phpFunctionPrefix", "--php-fn=", "kv"],
  ["answers", "phpSourceVersion", "--php-source=", "kv"],

  // features.* (kept in plan-table order)
  ["features", "js", "--js=", "kv"],
  ["features", "jsLib", "--js-lib=", "kv"],
  ["features", "jsTest", "--js-test=", "kv"],
  ["features", "css", "--css=", "kv"],
  ["features", "blocks", "--blocks=", "kv"],
  ["features", "phpMinVersion", "--php-min=", "kv"],
  ["features", "phpFramework", "--php-framework=", "kv"],
  ["features", "phpTest", "--php-test=", "kv"],
  ["features", "license", "--license=", "kv"],
  ["features", "wpMinVersion", "--wp-min=", "kv"],
  ["features", "restBatch", "--rest-batch=", "kv"],
  ["features", "faultTolerance", "--fault-tolerance=", "kv"],
  ["features", "vendorScoping", "--vendor-scoping=", "kv"],
  ["features", "husky", "--husky=", "kv"],
  ["features", "exampleFeature", "--example=", "kv"],
  ["features", "i18n", "--i18n=", "kv"],
  ["features", "frontendStack", "--frontend-stack=", "kv"],
  ["features", "mcpAbilities", "--mcp-abilities=", "kv"],

  // runOptions.*
  ["runOptions", "targetDir", "--dir=", "kv"],
  ["runOptions", "preset", "--preset=", "kv"],
  ["runOptions", "kitVersion", "--kit-version=", "kv"],
  ["runOptions", "install", "--install", "bool"],
  ["runOptions", "git", "--git", "bool"],
  ["runOptions", "force", "--force", "bool"],
  // --yes / -y: the default is `interactive: true`; the flag
  // inverts to `false`. We model this by setting the literal
  // value false in the FLAG_MAP so the parser doesn't have to
  // know which keys are "invert" semantically.
  ["runOptions", "interactive", "--yes", "boolFalse"],
  ["runOptions", "interactive", "-y", "boolFalse"],
  ["runOptions", "verbose", "--verbose", "bool"],
];

/**
 * Throw the canonical "Unknown flag" error. The error message lists
 * every flag in the registry in three columns so the user can scan
 * for typos. We pass the full known set rather than a "did you mean"
 * hint because the list is short (32 entries).
 */
function unknownFlagError(flag) {
  const sorted = [...KNOWN_FLAGS].sort();
  // Three-column layout in the error text — keeps the message
  // scannable without rendering tables in the terminal.
  const cols = 3;
  const width = Math.max(...sorted.map((f) => f.length)) + 2;
  const lines = [];
  for (let i = 0; i < sorted.length; i += cols) {
    const row = sorted
      .slice(i, i + cols)
      .map((f) => f.padEnd(width, " "))
      .join("");
    lines.push("  " + row);
  }
  const err = new Error(
    `Unknown flag: ${flag}\n` +
      `Valid flags (plan.installer.md Appendix A):\n` +
      lines.join("\n"),
  );
  err.code = "WPSK_UNKNOWN_FLAG";
  return err;
}

/**
 * Find the entry in FLAG_MAP whose flag-string is a prefix of `arg`.
 * Bare boolean flags require an exact match (so `--verbose` does
 * not consume `--verbose-extra=...` if we ever add one).
 */
function matchFlag(arg) {
  for (const entry of FLAG_MAP) {
    const [out, key, flagStr, kind] = entry;
    if (kind === "bool") {
      if (arg === flagStr) return { out, key, value: true };
    } else if (kind === "boolFalse") {
      if (arg === flagStr) return { out, key, value: false };
    } else {
      // kv: must be --key=value shape (no space-separated form — we
      // keep the parser simple and the surface consistent with the
      // plan examples).
      if (arg.startsWith(flagStr)) {
        return { out, key, value: arg.slice(flagStr.length) };
      }
    }
  }
  return null;
}

/**
 * Normalize a raw argv to `{ answers, features, runOptions }`.
 *
 * @param {string[]} argv
 * @returns {{
 *   answers: Record<string, string>,
 *   features: Record<string, string>,
 *   runOptions: Record<string, string|boolean>,
 * }}
 */
export function parseFlags(argv) {
  if (!Array.isArray(argv)) {
    throw new TypeError("parseFlags(argv): argv must be an array of strings");
  }

  const answers = {};
  const features = {};
  const runOptions = { interactive: true };

  let positional = null;

  for (const raw of argv) {
    if (typeof raw !== "string") {
      throw new TypeError(
        "parseFlags(argv): every entry must be a string (got: " +
          typeof raw +
          ")",
      );
    }

    // Skip command name (when invoked through commander, argv looks
    // like ["node", "wpsk.js", "create", ...]). Tests can pass any
    // tail; we only care about the actual flags.
    if (raw.startsWith("-")) {
      const m = matchFlag(raw);
      if (!m) {
        throw unknownFlagError(raw);
      }
      // Object property assignment via computed keys keeps the
      // branch terse. We always overwrite — last flag wins,
      // matching POSIX convention.
      if (m.out === "answers") answers[m.key] = m.value;
      else if (m.out === "features") features[m.key] = m.value;
      else runOptions[m.key] = m.value;
    } else if (positional === null) {
      positional = raw;
    } else {
      // Second positional — currently not used. Surface it loudly so
      // we notice if a future flag ever needs two positionals.
      throw new Error(
        "parseFlags: unexpected second positional argument: " +
          JSON.stringify(raw) +
          " (only one positional — the slug — is supported)",
      );
    }
  }

  // --slug=... wins over the positional. Without --slug, the
  // positional is the slug, sanitized.
  if (positional !== null) {
    const cleaned = sanitizeSlug(positional);
    if (answers.slug === undefined) {
      answers.slug = cleaned;
    }
    // Also seed the target directory from the slug when --dir is
    // absent. gather.js / runCreate may still override this with
    // a default like the cwd.
    if (runOptions.targetDir === undefined) {
      runOptions.targetDir = cleaned;
    }
  }

  return { answers, features, runOptions };
}
