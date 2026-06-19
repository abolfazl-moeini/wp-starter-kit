/**
 * Mirror wpdev/plugin-core-test into generated projects.
 *
 * The package is private; consumers get a path-repo copy under
 * packages/plugin-core-test/ (see wordpress-plugin-unit-tests skill).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { resolveKitPackageSrc } from "../resolve-kit-paths.js";

const SKIP_DIRS = new Set(["vendor", "node_modules", "dist", ".git", "tests"]);

function pluginCoreTestRoot() {
  const srcRoot = resolveKitPackageSrc(
    "plugin-core-test",
    path.join("Setup.php"),
  );
  if (!srcRoot) {
    throw new Error(
      "wpdev/plugin-core-test source not found. Expected packages/plugin-core-test beside create-wp-project (or set npm config wpdev-kit-root to your kit checkout).",
    );
  }
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
 * @returns {Record<string, string>} paths relative to packages/plugin-core-test/
 */
export function pluginCoreTestPackageFiles() {
  return walkPackage(pluginCoreTestRoot());
}
