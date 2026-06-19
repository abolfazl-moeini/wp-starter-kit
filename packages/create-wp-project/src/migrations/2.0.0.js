/**
 * 2.0.0 migration — Merge config files into wpdev.json.
 *
 * Merges project.config.json + build.config.json + wpdev-kit.json
 * into a single wpdev.json. Deletes the old files.
 * Idempotent: if wpdev.json already exists and old files are gone, no-op.
 */

import { existsSync, promises as fs } from "node:fs";
import * as path from "node:path";

export const version = "2.0.0";
export const description =
  "Merge project.config.json, build.config.json, and wpdev-kit.json into wpdev.json";

export async function run(dir) {
  const wpdevJsonPath = path.join(dir, "wpdev.json");
  const projectConfigPath = path.join(dir, "project.config.json");
  const buildConfigPath = path.join(dir, "build.config.json");
  const kitJsonPath = path.join(dir, "wpdev-kit.json");
  const straussPath = path.join(dir, "strauss.json");

  // If wpdev.json already exists and old files are absent, already migrated.
  if (
    existsSync(wpdevJsonPath) &&
    !existsSync(projectConfigPath) &&
    !existsSync(kitJsonPath)
  ) {
    return { ok: true };
  }

  // Read old files (any may be absent in partial states).
  let projectCfg = {};
  let buildCfg = {
    assetMappings: [],
    globalMappings: {},
    styleEntryPoints: ["assets/stylesheets/style.css"],
  };
  let kitManifest = {};

  if (existsSync(projectConfigPath)) {
    try {
      projectCfg = JSON.parse(await fs.readFile(projectConfigPath, "utf8"));
    } catch {
      return { ok: false, reason: "project.config.json is malformed JSON" };
    }
  }

  if (existsSync(buildConfigPath)) {
    try {
      buildCfg = JSON.parse(await fs.readFile(buildConfigPath, "utf8"));
    } catch {
      return { ok: false, reason: "build.config.json is malformed JSON" };
    }
  }

  if (existsSync(kitJsonPath)) {
    try {
      kitManifest = JSON.parse(await fs.readFile(kitJsonPath, "utf8"));
    } catch {
      return { ok: false, reason: "wpdev-kit.json is malformed JSON" };
    }
  }

  // Merge into wpdev.json. Kit metadata fields take precedence over
  // projectCfg for overlapping keys (kitVersion, schema, distMode,
  // generatedAt, features). Branding fields come from projectCfg.
  const merged = {
    schema: 2,
    kitVersion: kitManifest.kitVersion || projectCfg.kitVersion || "0.0.0",
    distMode: kitManifest.distMode || "deps",
    generatedAt: kitManifest.generatedAt || new Date().toISOString(),
    // Branding from project.config.json
    slug: projectCfg.slug,
    globalName: projectCfg.globalName,
    localizeVar: projectCfg.localizeVar,
    textDomain: projectCfg.textDomain,
    hookPrefix: projectCfg.hookPrefix,
    npmScope: projectCfg.npmScope,
    depsBundle: projectCfg.depsBundle,
    phpFunctionPrefix: projectCfg.phpFunctionPrefix,
    uiFramework: projectCfg.uiFramework,
    restNamespace: projectCfg.restNamespace,
    vendorPrefix: projectCfg.vendorPrefix,
    phpMinVersion: projectCfg.phpMinVersion,
    phpSourceVersion: projectCfg.phpSourceVersion,
    batchEndpoint: projectCfg.batchEndpoint,
    // Features from kit manifest (authoritative) or project.config.json fallback
    features: kitManifest.features || projectCfg.features || {},
    // Build section from build.config.json
    build: buildCfg,
  };

  // Preserve migration trail if present in kit manifest.
  if (kitManifest.previousKitVersion)
    merged.previousKitVersion = kitManifest.previousKitVersion;
  if (kitManifest.migratedAt) merged.migratedAt = kitManifest.migratedAt;

  // Remove undefined values.
  for (const key of Object.keys(merged)) {
    if (merged[key] === undefined) delete merged[key];
  }

  await fs.writeFile(
    wpdevJsonPath,
    JSON.stringify(merged, null, 2) + "\n",
    "utf8",
  );

  // Delete old files.
  for (const oldFile of [
    projectConfigPath,
    buildConfigPath,
    kitJsonPath,
    straussPath,
  ]) {
    if (existsSync(oldFile)) {
      await fs.unlink(oldFile);
    }
  }

  return { ok: true };
}
