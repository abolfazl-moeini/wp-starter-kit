/**
 * Read consumer project.config.json and map it back to scaffold answers.
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";

/**
 * @param {string} dir
 * @param {string} [label]  error prefix (e.g. "addFeature")
 */
export async function readProjectConfigFromDir(dir, label = "engine") {
  const file = path.join(dir, "project.config.json");
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `${label}: project.config.json not found at ${file} — ` +
          "is this a wp-starter-kit project?",
      );
    }
    throw new Error(
      `${label}: failed to read project.config.json at ${file}: ${error.message}`,
    );
  }
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${label}: malformed JSON in project.config.json at ${file}: ${error.message}`,
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
    phpFunctionPrefix: cfg.phpFunctionPrefix || "wpsk_",
    uiFramework: cfg.uiFramework,
    projectType: cfg.projectType || "plugin",
    vendor: cfg.vendor,
    vendorPrefix: cfg.vendorPrefix || "WpskVendor",
    vendorPrefixUpper:
      cfg.vendorPrefix && cfg.vendorPrefix.toUpperCase
        ? cfg.vendorPrefix.toUpperCase()
        : undefined,
    restNamespace: cfg.restNamespace || "wpsk/v1",
    phpMinVersion: cfg.phpMinVersion || "7.4",
    phpSourceVersion: cfg.phpSourceVersion || "8.1",
    batchEndpoint: cfg.batchEndpoint || "/batch/v1",
  };
}
