/**
 * Read consumer wpdev.json and map it back to scaffold answers.
 */

import { deriveUiFramework } from "./derive-ui-framework.js";

import { promises as fs } from "node:fs";
import * as path from "node:path";

/**
 * @param {string} dir
 * @param {string} [label]  error prefix (e.g. "addFeature")
 */
export async function readProjectConfigFromDir(dir, label = "engine") {
  const file = path.join(dir, "wpdev.json");
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `${label}: wpdev.json not found at ${file} — ` +
          "is this a wp-starter-kit project?",
      );
    }
    throw new Error(
      `${label}: failed to read wpdev.json at ${file}: ${error.message}`,
    );
  }
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${label}: malformed JSON in wpdev.json at ${file}: ${error.message}`,
    );
  }
  return { cfg, raw };
}

/**
 * @param {Object} cfg
 * @returns {Object}
 */
export function projectConfigToAnswers(cfg) {
  const slug = cfg.slug;
  const features = cfg.features || {};
  const uiFramework =
    deriveUiFramework(features, cfg) || cfg.uiFramework || undefined;
  return {
    slug,
    npmScope:
      typeof cfg.npmScope === "string" && cfg.npmScope.startsWith("@")
        ? cfg.npmScope.slice(1)
        : cfg.npmScope,
    globalName: cfg.globalName,
    localizeVar:
      cfg.localizeVar || (cfg.globalName ? `${cfg.globalName}Loc` : undefined),
    textDomain: cfg.textDomain,
    hookPrefix: cfg.hookPrefix,
    depsBundle: cfg.depsBundle || (slug ? `${slug}-deps.js` : undefined),
    phpFunctionPrefix: cfg.phpFunctionPrefix || "wpdev_",
    uiFramework,
    projectType: cfg.projectType || "plugin",
    vendor: cfg.vendor,
    vendorPrefix: cfg.vendorPrefix || "WpdevVendor",
    vendorPrefixUpper:
      cfg.vendorPrefix && cfg.vendorPrefix.toUpperCase
        ? cfg.vendorPrefix.toUpperCase()
        : undefined,
    restNamespace: cfg.restNamespace || "wpdev/v1",
    phpMinVersion: cfg.phpMinVersion || "7.4",
    phpSourceVersion: cfg.phpSourceVersion || "8.1",
    batchEndpoint: cfg.batchEndpoint || "/batch/v1",
  };
}
