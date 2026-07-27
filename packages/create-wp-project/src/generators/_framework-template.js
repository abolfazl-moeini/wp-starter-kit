/**
 * Vendor kit module framework into generated projects under packages/framework/.
 *
 * Sources are copied at scaffold (or later replaced by a git submodule).
 * Composer requires `wpdev/framework` from the `packages/*` path repo so
 * `composer install` (and release:dist) place a runtime copy under
 * `vendor/wpdev/framework/` — `packages/` is stripped from the ship tree.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { resolveKitPackageSrc } from "../resolve-kit-paths.js";

const SKIP_DIRS = new Set(["vendor", "node_modules", "dist", ".git", "tests"]);

function frameworkPackageRoot() {
  const srcRoot = resolveKitPackageSrc(
    "framework",
    path.join("Core", "Plugin.php"),
  );
  if (!srcRoot) {
    throw new Error(
      "wpdev kit framework source not found. Expected packages/framework/src " +
        "beside create-wp-project (or set npm config wpdev-kit-root).",
    );
  }
  // resolveKitPackageSrc returns .../framework/src — package root is parent.
  return path.dirname(srcRoot);
}

function walkPackage(dir, base = dir) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      Object.assign(files, walkPackage(full, base));
      continue;
    }
    const rel = path.relative(base, full).replace(/\\/g, "/");
    files[rel] = readFileSync(full, "utf8");
  }
  return files;
}

/**
 * @returns {Record<string, string>} paths relative to packages/framework/
 */
export function frameworkPackageFiles() {
  const root = frameworkPackageRoot();
  if (!existsSync(root)) {
    throw new Error(`framework package root missing: ${root}`);
  }
  return walkPackage(root);
}
