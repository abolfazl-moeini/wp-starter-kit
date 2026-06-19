import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

import { readManifest } from "./manifest.js";
import { deriveUiFramework } from "./derive-ui-framework.js";

const REQUIRED_PROJECT_KEYS = [
  "slug",
  "globalName",
  "localizeVar",
  "textDomain",
  "hookPrefix",
  "npmScope",
  "depsBundle",
  "restNamespace",
  "batchEndpoint",
  "vendorPrefix",
  "phpMinVersion",
  "phpSourceVersion",
];

/**
 * @param {string} dir
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateProjectConfig(dir) {
  const errors = [];
  const warnings = [];

  if (!dir || typeof dir !== "string") {
    errors.push("Config consistency: project directory is required");
    return { errors, warnings };
  }

  const cfgPath = path.join(dir, "wpdev.json");
  const kitPath = path.join(dir, "wpdev.json");

  if (!existsSync(cfgPath)) {
    errors.push("Config consistency: wpdev.json is missing");
    return { errors, warnings };
  }
  if (!existsSync(kitPath)) {
    errors.push("Config consistency: wpdev.json is missing");
    return { errors, warnings };
  }

  let cfg;
  try {
    cfg = JSON.parse(readFileSync(cfgPath, "utf8"));
  } catch (e) {
    errors.push(
      `Config consistency: wpdev.json is not valid JSON (${e && e.message ? e.message : String(e)})`,
    );
    return { errors, warnings };
  }

  let manifest;
  try {
    manifest = readManifest(dir);
  } catch (e) {
    errors.push(
      `Config consistency: wpdev.json is not valid (${e && e.message ? e.message : String(e)})`,
    );
    return { errors, warnings };
  }

  if (!cfg || typeof cfg !== "object") {
    errors.push("Config consistency: wpdev.json must be a JSON object");
    return { errors, warnings };
  }

  for (const key of REQUIRED_PROJECT_KEYS) {
    const value = cfg[key];
    if (value === undefined || value === null || value === "") {
      errors.push(`Config consistency: missing field ${key}`);
    }
  }

  const features = (manifest && manifest.features) || {};
  const manifestPhpMin = features.phpMinVersion;
  if (
    manifestPhpMin !== undefined &&
    manifestPhpMin !== null &&
    manifestPhpMin !== "" &&
    cfg.phpMinVersion !== undefined &&
    String(manifestPhpMin) !== String(cfg.phpMinVersion)
  ) {
    errors.push(
      `Config consistency: phpMinVersion drift — wpdev.json has "${manifestPhpMin}" but wpdev.json has "${cfg.phpMinVersion}"`,
    );
  }

  const derived = deriveUiFramework(features);
  const configured = cfg.uiFramework;
  if (derived === null) {
    if (configured === "preact" || configured === "react") {
      errors.push(
        `Config consistency: uiFramework "${configured}" is set but manifest features imply no UI framework (jsLib is none)`,
      );
    }
  } else {
    if (configured === undefined || configured === null || configured === "") {
      errors.push("Config consistency: missing field uiFramework");
    } else if (configured !== derived) {
      errors.push(
        `Config consistency: uiFramework drift — wpdev.json has "${configured}" but deriveUiFramework(features) yields "${derived}"`,
      );
    }
  }

  return { errors, warnings };
}
