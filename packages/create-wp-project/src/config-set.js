/**
 * @wpdev/create-wp-project — setConfigValue() for config-only features.
 *
 * Features like phpMinVersion, wpMinVersion, license, and ci have no
 * on/off toggle — they are set to a catalog variant via `wpdev set`.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";

import { getFeatureCatalog, validateFeatureSet } from "./features.js";
import {
  readManifest,
  writeManifest,
  buildManifest,
  DEFAULT_DIST_MODE,
} from "./manifest.js";
import { findGenerator } from "./generators/index.js";
import { descriptor as licenseDescriptor } from "./generators/license.js";
import {
  readProjectConfigFromDir,
  projectConfigToAnswers,
} from "./project-config-io.js";
import { refreshGlue } from "./refresh-glue.js";
import { tplVars } from "./generators/_templates.js";

/** Feature ids settable via `wpdev set` (not add/remove). */
export const CONFIG_SETTABLE_IDS = new Set([
  "phpMinVersion",
  "wpMinVersion",
  "license",
  "ci",
]);

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isConfigSettable(id) {
  return CONFIG_SETTABLE_IDS.has(id);
}

/**
 * @param {string} id
 * @returns {Object|null}
 */
function findCatalogEntry(id) {
  for (const f of getFeatureCatalog()) {
    if (f.id === id) return f;
  }
  return null;
}

/**
 * Set a config-only feature variant on an existing project.
 *
 * @param {string} dir
 * @param {string} key
 * @param {string} value
 * @returns {Promise<{ ok: boolean, reason?: string, written?: string[]|false, manifest?: Object }>}
 */
export async function setConfigValue(dir, key, value) {
  if (!dir || typeof dir !== "string") {
    throw new Error("setConfigValue: dir is required (string)");
  }
  if (!key || typeof key !== "string") {
    throw new Error("setConfigValue: key is required (string)");
  }
  if (!value || typeof value !== "string") {
    return { ok: false, reason: "setConfigValue: value is required (string)" };
  }

  if (!isConfigSettable(key)) {
    const gen = findGenerator(key) || findGenerator(`${key}:${value}`);
    if (gen || getFeatureCatalog().some((f) => f.id === key)) {
      return {
        ok: false,
        reason: `setConfigValue: "${key}" is not config-only; use 'wpdev add ${key}' or 'wpdev remove ${key}'`,
      };
    }
    return {
      ok: false,
      reason: `setConfigValue: "${key}" is not a known feature id`,
    };
  }

  const entry = findCatalogEntry(key);
  if (!entry) {
    return {
      ok: false,
      reason: `setConfigValue: "${key}" is not a known feature id`,
    };
  }
  if (!entry.variants.includes(value)) {
    return {
      ok: false,
      reason: `${key}="${value}" is not a known variant (allowed: ${entry.variants.join(", ")})`,
    };
  }

  const manifest = readManifest(dir);
  if (!manifest) {
    return {
      ok: false,
      reason:
        `setConfigValue: no wpdev.json at ${dir} — ` +
        "is this a wp-starter-kit project?",
    };
  }

  const currentFeatures = manifest.features || {};
  const newFeatures = { ...currentFeatures, [key]: value };

  let answers = {};
  try {
    const { cfg } = await readProjectConfigFromDir(dir, "setConfigValue");
    answers = projectConfigToAnswers(cfg);
  } catch {
    // wpdev.json may be missing on hand-edited projects;
    // validation still runs with empty answers.
  }

  const v = validateFeatureSet(newFeatures, answers);
  if (!v.ok) {
    const first = Object.entries(v.errors)[0];
    return {
      ok: false,
      reason: `invalid feature set: ${first[0]}=${JSON.stringify(first[1])}`,
    };
  }

  const existing = manifest || {};
  const nextManifest = buildManifest({
    kitVersion: existing.kitVersion,
    features: newFeatures,
    distMode: existing.distMode,
    slug: existing.slug,
    globalName: existing.globalName,
    localizeVar: existing.localizeVar,
    textDomain: existing.textDomain,
    hookPrefix: existing.hookPrefix,
    npmScope: existing.npmScope,
    depsBundle: existing.depsBundle,
    phpFunctionPrefix: existing.phpFunctionPrefix,
    uiFramework: existing.uiFramework,
    restNamespace: existing.restNamespace,
    vendorPrefix: existing.vendorPrefix,
    phpMinVersion: existing.phpMinVersion,
    phpSourceVersion: existing.phpSourceVersion,
    batchEndpoint: existing.batchEndpoint,
    projectType: existing.projectType,
    build: existing.build,
  });
  await writeManifest(dir, nextManifest);

  const written = [];

  if (key === "license") {
    const { cfg } = await readProjectConfigFromDir(dir, "setConfigValue");
    const licenseAnswers = projectConfigToAnswers(cfg);
    const vars = tplVars(licenseAnswers, cfg);
    const ctx = {
      answers: licenseAnswers,
      cfg,
      features: newFeatures,
      vars,
    };
    const out = licenseDescriptor.run(ctx);
    for (const [rel, body] of Object.entries(out.files || {})) {
      const abs = path.join(dir, rel);
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, body, "utf8");
      written.push(rel);
    }
  }

  const glueWritten = await refreshGlue(dir, newFeatures);
  if (glueWritten.length > 0) {
    written.push(...glueWritten);
  }

  return {
    ok: true,
    written: written.length > 0 ? written : false,
    manifest: nextManifest,
  };
}
