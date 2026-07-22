/**
 * Mirror wpdev/php-fault-tolerance into generated projects.
 *
 * Consumers get a path-repo copy under packages/php-fault-tolerance/
 * with Composer symlink:false so Docker / remote hosts do not depend on
 * kit-absolute host paths (see wpdev-php-modules skill).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { resolveKitPackageSrc } from "../resolve-kit-paths.js";

const SKIP_DIRS = new Set(["vendor", "node_modules", "dist", ".git", "tests"]);

function phpFaultToleranceRoot() {
  const srcRoot = resolveKitPackageSrc(
    "php-fault-tolerance",
    path.join("bootstrap.php"),
  );
  if (!srcRoot) {
    throw new Error(
      "wpdev/php-fault-tolerance source not found. Expected packages/php-fault-tolerance beside create-wp-project (or set npm config wpdev-kit-root to your kit checkout).",
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
 * @returns {Record<string, string>} paths relative to packages/php-fault-tolerance/
 */
export function phpFaultTolerancePackageFiles() {
  return walkPackage(phpFaultToleranceRoot());
}
