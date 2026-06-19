/**
 * @wpdev/create-wp-project — manifest writer / reader.
 *
 * Phase 20 of plan.v3.md. The manifest is the consumer project's
 * durable record of "which kit version generated this project,
 * which features are on, in which distMode". It lives at
 * `<projectRoot>/wpdev.json` and is the single source of truth
 * for every later phase that needs to ask "what is in this project".
 *
 * Three contracts (locked by tests/packages/manifest*.test.js):
 *  - buildManifest({kitVersion, features, distMode?}) returns
 *    `{ schema:1, kitVersion, distMode, generatedAt, features }`.
 *    `distMode` defaults to "deps" (Phase 23+). Legacy projects may
 *    carry "vendored"; migrations + doctor handle the upgrade path.
 *  - writeManifest(dir, manifest) writes `wpdev.json` with
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
import { getFeatureCatalog } from "./features.js";

/* -------------------------------------------------------------------- */
/* Constants                                                             */
/* -------------------------------------------------------------------- */

export const MANIFEST_FILENAME = "wpdev.json";
export const MANIFEST_SCHEMA = 2;
export const DEFAULT_DIST_MODE = "deps";

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
 * @param {string} [args.distMode="deps"]
 *                                    "deps" = wpdev/framework via Composer (Phase 23+ default).
 *                                    "vendored" = legacy src/Core copies (pre-Phase 23 projects only).
 * @param {string} [args.generatedAt]  ISO-8601 timestamp; defaults
 *                                    to `new Date().toISOString()`.
 *                                    Tests inject a frozen value.
 * @returns {Object} manifest with schema, kit metadata, branding fields, features, optional build
 */
export function buildManifest({
  kitVersion,
  features,
  distMode = DEFAULT_DIST_MODE,
  generatedAt = new Date().toISOString(),
  // branding fields (from wpdev.json — now merged)
  slug,
  globalName,
  localizeVar,
  textDomain,
  hookPrefix,
  npmScope,
  depsBundle,
  phpFunctionPrefix,
  uiFramework,
  restNamespace,
  vendorPrefix,
  phpMinVersion,
  phpSourceVersion,
  batchEndpoint,
  projectType,
  // build section (from wpdev.json build — now nested)
  build,
} = {}) {
  if (typeof kitVersion !== "string" || kitVersion.length === 0) {
    throw new Error("buildManifest: kitVersion is required (string)");
  }
  if (!features || typeof features !== "object") {
    throw new Error("buildManifest: features is required (object)");
  }
  const sortedFeatures = {};
  const catalogOrder = getFeatureCatalog().map((f) => f.id);
  for (const id of catalogOrder) {
    if (features[id] !== undefined) sortedFeatures[id] = features[id];
  }
  for (const id of Object.keys(features)) {
    if (!(id in sortedFeatures)) sortedFeatures[id] = features[id];
  }

  const manifest = {
    schema: MANIFEST_SCHEMA,
    kitVersion,
    distMode,
    generatedAt,
  };

  // Branding fields (only include if provided)
  const brandingFields = {
    slug,
    globalName,
    localizeVar,
    textDomain,
    hookPrefix,
    npmScope,
    depsBundle,
    phpFunctionPrefix,
    uiFramework,
    restNamespace,
    vendorPrefix,
    phpMinVersion,
    phpSourceVersion,
    batchEndpoint,
    projectType,
  };
  for (const [k, v] of Object.entries(brandingFields)) {
    if (v !== undefined) manifest[k] = v;
  }

  manifest.features = sortedFeatures;

  if (build && typeof build === "object") {
    manifest.build = build;
  }

  return manifest;
}

/**
 * @param {Object} manifest
 * @param {Object} [opts]
 * @param {string} [opts.previousKitVersion]
 * @param {string} [opts.migratedAt]
 * @returns {Object}
 */
export function withMigrationTrail(manifest, opts = {}) {
  const out = { ...manifest };
  if (opts.previousKitVersion) out.previousKitVersion = opts.previousKitVersion;
  if (opts.migratedAt) out.migratedAt = opts.migratedAt;
  return out;
}

/* -------------------------------------------------------------------- */
/* writeManifest                                                         */
/* -------------------------------------------------------------------- */

/**
 * Write a manifest to `<dir>/wpdev.json`. Creates the directory
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
  // Merge with existing file so branding fields written separately are preserved.
  let existing = {};
  if (existsSync(file)) {
    try {
      existing = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      existing = {};
    }
  }
  const merged = { ...existing, ...manifest };
  const json = JSON.stringify(merged, null, 2) + "\n";
  await fs.writeFile(file, json, "utf8");
}

/* -------------------------------------------------------------------- */
/* readManifest                                                          */
/* -------------------------------------------------------------------- */

/**
 * Read a manifest from `<dir>/wpdev.json`.
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
  const manifestPath = file;
  let raw;
  try {
    raw = readFileSync(manifestPath, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read manifest at ${manifestPath}: ${error.message}`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${manifestPath}: malformed JSON in manifest (${error.message})`,
    );
  }
}
