/**
 * 2.6.0 migration — refresh release packager with pre-dist test gate.
 *
 * Re-emits `dev/release/*` packager scripts and points `package.json`
 * `scripts.release` at `run-release.js` (tests → build → pack).
 * Bypass: --skip-tests / WPDEV_SKIP_TESTS=1.
 */

import { existsSync, readFileSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

export const version = "2.6.0";
export const description =
  "Refresh release packager (pre-dist unit/e2e gate; run-release.js; --skip-tests bypass)";

export async function run(dir) {
  const releaseDir = path.join(dir, "dev/release");
  await fs.mkdir(releaseDir, { recursive: true });

  const releaseSrc = path.join(resolveEngineSrcDir(), "release");
  for (const name of [
    "prepare-release.js",
    "prepareComposer.js",
    "releaseTests.js",
    "run-release.js",
  ]) {
    const src = path.join(releaseSrc, name);
    if (!existsSync(src)) {
      return {
        ok: false,
        reason: `Release script missing at ${src}`,
      };
    }
    await fs.writeFile(
      path.join(releaseDir, name),
      readFileSync(src, "utf8"),
      "utf8",
    );
  }

  const pkgPath = path.join(dir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await fs.readFile(pkgPath, "utf8"));
      if (pkg && typeof pkg === "object") {
        pkg.scripts = pkg.scripts || {};
        const prev = pkg.scripts.release;
        if (
          typeof prev !== "string" ||
          prev.includes("prepare-release.js") ||
          prev.includes("run-release.js") ||
          !prev
        ) {
          pkg.scripts.release = "node dev/release/run-release.js";
          await fs.writeFile(
            pkgPath,
            JSON.stringify(pkg, null, 2) + "\n",
            "utf8",
          );
        }
      }
    } catch {
      // Leave package.json untouched if unreadable.
    }
  }

  return { ok: true };
}
