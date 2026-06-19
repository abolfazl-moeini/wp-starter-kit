/**
 * @wpdev/create-wp-project — `doctorProject` health check.
 *
 * Phase 24 of plan.v3.md (24.9, 24.10). The installer's
 * `wpdev doctor` command runs this function and prints the
 * result. The doctor is the installer's "is this consumer
 * project healthy?" surface.
 *
 * The contract:
 *
 *   doctorProject(dir) → {
 *     ok: boolean,           // true iff errors.length === 0
 *     warnings: string[],    // non-fatal drift
 *     errors: string[],      // fatal — `wpdev update` recommended
 *   }
 *
 * SAFE contract: the function NEVER throws. A malformed
 * manifest is a `warnings.push("manifest unreadable: ...")`,
 * NOT a throw — the CLI shows the user the warning and
 * exits non-zero only when errors.length > 0.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import * as path from "node:path";
import minimatch from "minimatch";

import { readManifest, MANIFEST_SCHEMA } from "./manifest.js";
import {
  fillFeatureDefaults,
  getFeatureCatalog,
  isFeatureOffVariant,
  validateFeatureSet,
} from "./features.js";
import { getDepVersions } from "./dep-versions.js";
import { getOwnedPathsForFeature } from "./generators/index.js";
import { getMaxKnownSchema } from "./migrations/index.js";
import { projectConfigToAnswers } from "./project-config-io.js";
import { validateProjectConfig } from "./validate-config.js";

/* -------------------------------------------------------------------- */
/* Constants                                                             */
/* -------------------------------------------------------------------- */

const VENDORED_FRAMEWORK_DIR = "vendor/wpdev/framework";
const LEGACY_PLUGIN_PHP = path.join("src", "Core", "Plugin.php");

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

function compareSemver(a, b) {
  const aParts = String(a)
    .split(".")
    .slice(0, 3)
    .map((n) => parseInt(n, 10) || 0);
  const bParts = String(b)
    .split(".")
    .slice(0, 3)
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
  }
  return 0;
}

function modulePath(...parts) {
  let here;
  if (typeof __dirname !== "undefined" && __dirname) {
    here = __dirname;
  } else if (
    process.argv[1] &&
    process.argv[1].endsWith("create-wp-project/src/doctor.js")
  ) {
    here = path.dirname(process.argv[1]);
  } else {
    here = path.join(process.cwd(), "packages/create-wp-project/src");
  }
  return path.join(here, ...parts);
}

function readInstalledKitVersion() {
  try {
    const pkgPath = modulePath("..", "..", "..", "package.json");
    if (!existsSync(pkgPath)) return "0.0.0";
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * @param {string} rel
 * @param {string[]} globs
 * @returns {boolean}
 */
function isMatchedByAny(rel, globs) {
  return globs.some((glob) => minimatch(rel, glob, { dot: true }));
}

/**
 * Walk project files (skips node_modules, vendor, .git, etc.).
 *
 * @param {string} root
 * @yields {{ rel: string, abs: string }}
 */
function* walkFilesSync(root, dir = root, depth = 0) {
  const MAX_DEPTH = 10;
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (
        ent.name === "node_modules" ||
        ent.name === "vendor" ||
        ent.name === "dist" ||
        ent.name === "build" ||
        ent.name === ".git"
      ) {
        continue;
      }
      yield* walkFilesSync(root, abs, depth + 1);
    } else if (ent.isFile()) {
      const rel = path.relative(root, abs).split(path.sep).join("/");
      yield { rel, abs };
    }
  }
}

/**
 * @param {string} dir
 * @param {string[]} globs
 * @returns {string[]}
 */
function findMatchingFiles(dir, globs) {
  const matches = [];
  if (!globs.length) return matches;
  for (const { rel } of walkFilesSync(dir)) {
    if (isMatchedByAny(rel, globs)) matches.push(rel);
  }
  return matches;
}

/**
 * Detect whether legacy src/Core/Plugin.php is a shim (forwards to
 * vendor) or a stale full framework copy.
 *
 * @param {string} content
 * @returns {boolean}
 */
export function isFrameworkPluginShim(content) {
  if (typeof content !== "string" || content.length === 0) return false;
  if (/shim|delegat|require_once/i.test(content)) return true;
  if (/vendor\/wpdev\/framework/i.test(content)) return true;
  if (
    /class\s+Plugin/.test(content) &&
    /function\s+(boot|config|loader|set_plugin_dir)/.test(content)
  ) {
    return false;
  }
  return true;
}

/**
 * Vendored-mode framework presence check (replaces placeholder checksum).
 *
 * @param {string} dir
 * @returns {string[]}
 */
export function checkVendoredChecksum(dir) {
  if (!dir || typeof dir !== "string") return [];
  const warnings = [];
  const pluginPhp = path.join(dir, LEGACY_PLUGIN_PHP);
  if (!existsSync(pluginPhp)) {
    warnings.push(
      "vendored distMode but src/Core/Plugin.php is missing — run `wpdev update` to migrate framework sources",
    );
    return warnings;
  }
  let content = "";
  try {
    content = readFileSync(pluginPhp, "utf8");
  } catch {
    return warnings;
  }
  if (!isFrameworkPluginShim(content)) {
    warnings.push(
      "Legacy vendored framework sources found under src/Core/ (stale non-shim Plugin.php). " +
        "Run `wpdev update` to migrate to deps mode.",
    );
  }
  const frameworkDir = path.join(dir, VENDORED_FRAMEWORK_DIR);
  if (existsSync(frameworkDir)) {
    // Post-composer vendor copy — composer.lock is source of truth.
  }
  return warnings;
}

/**
 * @param {string} dir
 * @param {Record<string, string>} features
 * @returns {string[]}
 */
function checkOwnedFileDrift(dir, features) {
  const warnings = [];
  const catalogById = new Map(getFeatureCatalog().map((f) => [f.id, f]));

  for (const [id, variant] of Object.entries(features)) {
    if (!catalogById.has(id) || id === "core") continue;
    const owns = getOwnedPathsForFeature(id, variant);
    if (!owns.length) continue;

    const matches = findMatchingFiles(dir, owns);
    const off = isFeatureOffVariant(id, variant);

    if (!off && matches.length === 0) {
      warnings.push(
        `feature ${id} is on but its files are missing: ${owns.join(", ")}`,
      );
    } else if (off && matches.length > 0) {
      warnings.push(
        `feature ${id} is off but orphan files remain: ${matches.join(", ")}`,
      );
    }
  }
  return warnings;
}

/* -------------------------------------------------------------------- */
/* doctorProject                                                          */
/* -------------------------------------------------------------------- */

/**
 * @param {string} dir
 * @returns {{ ok: boolean, warnings: string[], errors: string[] }}
 */
export function doctorProject(dir) {
  const result = { ok: true, warnings: [], errors: [] };
  if (!dir || typeof dir !== "string") {
    result.errors.push("manifest missing");
    result.ok = false;
    return result;
  }

  let manifest;
  try {
    manifest = readManifest(dir);
  } catch (error) {
    result.warnings.push(
      `manifest unreadable: ${error && error.message ? error.message : String(error)}`,
    );
    return result;
  }
  if (!manifest) {
    result.errors.push("manifest missing");
    result.ok = false;
    return result;
  }

  if (
    typeof manifest.schema === "number" &&
    manifest.schema !== MANIFEST_SCHEMA
  ) {
    if (manifest.schema > getMaxKnownSchema()) {
      result.errors.push(
        `unsupported manifest schema ${manifest.schema} — upgrade the kit before updating this project (expected schema ${MANIFEST_SCHEMA})`,
      );
    } else {
      result.warnings.push(
        `manifest schema ${manifest.schema} is newer than this kit (${MANIFEST_SCHEMA}) — run wpdev update`,
      );
    }
  }

  const knownIds = new Set(getFeatureCatalog().map((f) => f.id));
  const rawFeatures = (manifest && manifest.features) || {};
  for (const id of Object.keys(rawFeatures)) {
    if (!knownIds.has(id)) {
      result.warnings.push(
        `feature ${id} is from a newer kit; run wpdev update`,
      );
    }
  }

  const catalogById = new Map(getFeatureCatalog().map((f) => [f.id, f]));
  for (const [id, value] of Object.entries(rawFeatures)) {
    const entry = catalogById.get(id);
    if (!entry) continue;
    if (!entry.variants.includes(value)) {
      result.errors.push(`feature ${id} has invalid value ${value}`);
    }
  }

  const features = fillFeatureDefaults(rawFeatures);

  let answers = {};
  const cfgPath = path.join(dir, "wpdev.json");
  if (existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
      answers = projectConfigToAnswers(cfg);
    } catch {
      // Answers are optional for validation; prefix rules may be skipped.
    }
  }

  const configCheck = validateProjectConfig(dir);
  for (const msg of configCheck.errors || []) {
    if (!result.errors.includes(msg)) result.errors.push(msg);
  }
  for (const msg of configCheck.warnings || []) {
    if (!result.warnings.includes(msg)) result.warnings.push(msg);
  }

  const validation = validateFeatureSet(features, answers, {
    allowUnknown: true,
  });
  for (const msg of Object.values(validation.errors || {})) {
    if (!result.errors.includes(msg)) result.errors.push(msg);
  }
  for (const msg of Object.values(validation.warnings || {})) {
    if (!result.warnings.includes(msg)) result.warnings.push(msg);
  }

  const installed = readInstalledKitVersion();
  const project =
    typeof manifest.kitVersion === "string" ? manifest.kitVersion : null;
  if (project && installed !== "0.0.0") {
    if (compareSemver(project, installed) > 0) {
      result.warnings.push(
        `project manifest kitVersion (${project}) is newer than the installed kit (${installed}) — run wpdev update`,
      );
    }
  }

  if (manifest.distMode === "vendored") {
    for (const w of checkVendoredChecksum(dir)) {
      result.warnings.push(w);
    }
  }

  for (const w of checkOwnedFileDrift(dir, features)) {
    result.warnings.push(w);
  }

  const registry = getDepVersions();
  if (registry.size === 0) {
    result.warnings.push(
      "dep registry is empty — the kit's own package.json/composer.json may be missing",
    );
  }

  result.ok = result.errors.length === 0;
  return result;
}
