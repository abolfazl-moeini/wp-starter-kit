/**
 * @wpsk/create-wp-project — manifest writer / reader.
 *
 * Phase 20 of plan.v3.md. The manifest is the consumer project's
 * durable record of "which kit version generated this project,
 * which features are on, in which distMode". It lives at
 * `<projectRoot>/wpsk-kit.json` and is the single source of truth
 * for every later phase that needs to ask "what is in this project".
 *
 * Three contracts (locked by tests/packages/manifest*.test.js):
 *  - buildManifest({kitVersion, features, distMode?}) returns
 *    `{ schema:1, kitVersion, distMode, generatedAt, features }`.
 *    `distMode` defaults to "vendored" — Phase 23 will flip the
 *    default to "deps" once the framework is a Composer package.
 *  - writeManifest(dir, manifest) writes `wpsk-kit.json` with
 *    stable key order + trailing newline + 2-space indent (so
 *    diffs stay readable). Creates the directory if missing.
 *  - readManifest(dir) returns the parsed object or `null` if
 *    the file is absent. A malformed JSON file is an Error whose
 *    message includes the absolute file path (so the installer
 *    can show the user where the corruption is).
 *
 * The file is intentionally human-editable; consumers can read
 * it directly to learn which features are on. The engine treats
 * unknown fields in `features` as forward-compat: buildManifest
 * preserves them verbatim so a future kit version can round-trip
 * its own extra fields through the same JSON file.
 */

import { promises as fs, readFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import { updateJsonFile } from "./json-utils.js";

/* -------------------------------------------------------------------- */
/* Constants                                                             */
/* -------------------------------------------------------------------- */

export const MANIFEST_FILENAME = "wpsk-kit.json";
export const MANIFEST_SCHEMA = 1;
export const DEFAULT_DIST_MODE = "vendored";

/* -------------------------------------------------------------------- */
/* buildManifest                                                         */
/* -------------------------------------------------------------------- */

/**
 * Build a manifest object. Pure: no I/O, no clock side effects other
 * than `new Date()` to stamp `generatedAt`. The result is a plain
 * object — callers may pass it to writeManifest, JSON.stringify,
 * or merge it with extras.
 *
 * @param {Object} args
 * @param {string} args.kitVersion     Kit version that generated
 *                                    (or last touched) the project.
 * @param {Record<string,string>} args.features
 *                                    The validated feature set.
 * @param {string} [args.distMode="vendored"]
 *                                    "vendored" = src/Core copied
 *                                    (Phase 20–22). "deps" =
 *                                    wpsk/framework via Composer
 *                                    (Phase 23).
 * @param {string} [args.generatedAt]  ISO-8601 timestamp; defaults
 *                                    to `new Date().toISOString()`.
 *                                    Tests inject a frozen value.
 * @returns {{
 *   schema: number,
 *   kitVersion: string,
 *   distMode: string,
 *   generatedAt: string,
 *   features: Record<string,string>,
 * }}
 */
export function buildManifest({
  kitVersion,
  features,
  distMode = DEFAULT_DIST_MODE,
  generatedAt = new Date().toISOString(),
} = {}) {
  if (typeof kitVersion !== "string" || kitVersion.length === 0) {
    throw new Error("buildManifest: kitVersion is required (string)");
  }
  if (!features || typeof features !== "object") {
    throw new Error("buildManifest: features is required (object)");
  }
  return {
    schema: MANIFEST_SCHEMA,
    kitVersion,
    distMode,
    generatedAt,
    features: { ...features },
  };
}

/* -------------------------------------------------------------------- */
/* writeManifest                                                         */
/* -------------------------------------------------------------------- */

/**
 * Write a manifest to `<dir>/wpsk-kit.json`. Creates the directory
 * if it doesn't exist. The output is JSON with 2-space indent
 * and a trailing newline (so POSIX tools that expect a final '\n'
 * are happy, and so byte-for-byte idempotency is achievable).
 *
 * Key order is fixed:
 *   schema, kitVersion, distMode, generatedAt, features
 * with the `features` object also serialised in stable order
 * (sorted by key — features have no implied order, and sorted
 * keys are easier to diff than insertion order).
 *
 * @param {string} dir
 * @param {Object} manifest  The result of buildManifest() or a
 *                           plain object with the same shape.
 * @returns {Promise<void>}
 */
export async function writeManifest(dir, manifest) {
  if (!dir || typeof dir !== "string") {
    throw new Error("writeManifest: dir is required (string)");
  }
  if (!manifest || typeof manifest !== "object") {
    throw new Error("writeManifest: manifest is required (object)");
  }
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, MANIFEST_FILENAME);
  const json = JSON.stringify(manifest, null, 2) + "\n";
  await fs.writeFile(file, json, "utf8");
}

/* -------------------------------------------------------------------- */
/* readManifest                                                          */
/* -------------------------------------------------------------------- */

/**
 * Read a manifest from `<dir>/wpsk-kit.json`.
 *
 *  - File absent → returns `null`. The installer treats `null` as
 *    "not a wp-starter-kit project" and decides whether that's
 *    an error (when invoked on a directory the user said was a
 *    project) or a starting point (when invoked on a fresh
 *    directory to scaffold into).
 *  - File present + parses → returns the parsed object.
 *  - File present + malformed JSON → throws an Error whose
 *    `.message` includes the absolute file path. The format is
 *    `<path>: <node's JSON.parse error>`. Catching the Error is
 *    the caller's responsibility; we don't return a typed result
 *    here because the installer's "show the user what's wrong"
 *    flow needs the actual path in the message text.
 *
 * Sync (uses `readFileSync`) to match the rest of the kit's
 * config-reading helpers. Manifest writes go through the async
 * `writeManifest` because they're called during scaffold.
 *
 * @param {string} dir
 * @returns {Object|null}
 */
export function readManifest(dir) {
  if (!dir || typeof dir !== "string") {
    throw new Error("readManifest: dir is required (string)");
  }
  const file = path.join(dir, MANIFEST_FILENAME);
  if (!existsSync(file)) {
    return null;
  }
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read ${MANIFEST_FILENAME} at ${file}: ${error.message}`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${file}: malformed JSON in ${MANIFEST_FILENAME} (${error.message})`,
    );
  }
}

/* -------------------------------------------------------------------- */
/* syncFeaturesToConfig                                                  */
/* -------------------------------------------------------------------- */

const PROJECT_CONFIG_FILENAME = "project.config.json";

/**
 * Minimal v2 branding defaults used when project.config.json
 * does not exist yet. Mirrors the v2 default set in
 * `answersToProjectConfig()` (kit's `index.js`) and the
 * `OPTIONAL_DEFAULTS` in `core/packages/utils/readProjectConfig.js`
 * so a freshly-scaffolded project — or a hand-written minimal
 * project — sees the same shape.
 *
 * The values are deliberately generic: a real scaffold will
 * overwrite them with the user's answers-based branding. The
 * sync helper's job is just to make a valid skeleton that won't
 * break readProjectConfig on the first read.
 */
const MINIMAL_V2_BRANDING = {
  slug: "wpsk-project",
  globalName: "WpskProject",
  localizeVar: "WpskProjectLoc",
  textDomain: "wpsk-project",
  hookPrefix: "wpsk-project",
  npmScope: "@wpsk",
  phpFunctionPrefix: "wpsk_",
  uiFramework: "preact",
  projectType: "plugin",
  restNamespace: "wpsk/v1",
  vendorPrefix: "WpskVendor",
  phpMinVersion: "7.4",
  phpSourceVersion: "8.1",
  batchEndpoint: "/batch/v1",
};

/**
 * Write the same `features` object to BOTH `wpsk-kit.json` and
 * a `features` key in `project.config.json`.
 *
 * This helper does ONLY the project.config.json half — the
 * manifest half is `writeManifest`. The scaffold (Phase 21)
 * calls them in sequence:
 *
 *   1. writeManifest(dir, buildManifest({ kitVersion, features }))
 *   2. syncFeaturesToConfig(dir, features)
 *
 * Why duplicate? `wpsk-kit.json` is the durable kit state
 * (kitVersion, distMode, generatedAt, features). Putting
 * `features` ALSO in `project.config.json` means:
 *
 *  - Pre-Phase 20 readers of project.config.json (the kit's
 *    PHP classes, the JS asset bundle) can answer
 *    "which features are on?" without discovering
 *    wpsk-kit.json.
 *  - The kit's own state is self-contained — `wpsk-kit.json`
 *    can be read in isolation.
 *
 * project.config.json is updated via `updateJsonFile`, so the
 * existing file's indentation and trailing-newline state are
 * preserved. If the file does not exist, a minimal v2-valid
 * config is created (so the sync never throws ENOENT) and
 * populated with the v2 defaults + the `features` key.
 *
 * @param {string} dir
 * @param {Record<string,string>} features
 * @returns {Promise<void>}
 */
export async function syncFeaturesToConfig(dir, features) {
  if (!dir || typeof dir !== "string") {
    throw new Error("syncFeaturesToConfig: dir is required (string)");
  }
  if (!features || typeof features !== "object") {
    throw new Error("syncFeaturesToConfig: features is required (object)");
  }

  await fs.mkdir(dir, { recursive: true });
  const cfgPath = path.join(dir, PROJECT_CONFIG_FILENAME);

  if (!existsSync(cfgPath)) {
    // Bootstrap path — create a minimal v2-valid config + features.
    const minimal = { ...MINIMAL_V2_BRANDING, features: { ...features } };
    await fs.writeFile(
      cfgPath,
      JSON.stringify(minimal, null, 2) + "\n",
      "utf8",
    );
    return;
  }

  // Update path — preserve existing shape, set/replace `features`.
  await updateJsonFile(cfgPath, (cfg) => {
    cfg.features = { ...features };
    return cfg;
  });
}
