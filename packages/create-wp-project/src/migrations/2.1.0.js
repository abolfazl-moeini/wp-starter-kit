/**
 * 2.1.0 migration — add production release packager to existing projects.
 *
 * Emits dev/release/prepare-release.mjs + prepareComposer.js and wires:
 *   - package.json scripts.release (when package.json exists)
 *   - composer.json scripts.release:dist + config.platform.php
 */

import { existsSync, readFileSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { updateJsonFile } from "../json-utils.js";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

export const version = "2.1.0";
export const description =
  "Add production release packager (dist/{slug}/) and release scripts";

export async function run(dir) {
  const releaseDir = path.join(dir, "dev/release");
  await fs.mkdir(releaseDir, { recursive: true });

  const releaseSrc = path.join(resolveEngineSrcDir(), "release");
  for (const name of ["prepare-release.js", "prepareComposer.js"]) {
    const src = path.join(releaseSrc, name);
    const dest = path.join(releaseDir, name);
    await fs.writeFile(dest, readFileSync(src, "utf8"), "utf8");
  }

  const packageJsonPath = path.join(dir, "package.json");
  if (existsSync(packageJsonPath)) {
    await updateJsonFile(packageJsonPath, (pkg) => {
      const next = { ...pkg, scripts: { ...(pkg.scripts || {}) } };
      if (!next.scripts.release) {
        next.scripts.release =
          "npm run build && node dev/release/prepare-release.js";
      }
      return next;
    });
  }

  const composerPath = path.join(dir, "composer.json");
  if (existsSync(composerPath)) {
    let phpMin = "7.4";
    const wpdevPath = path.join(dir, "wpdev.json");
    if (existsSync(wpdevPath)) {
      try {
        const cfg = JSON.parse(await fs.readFile(wpdevPath, "utf8"));
        if (cfg.phpMinVersion) phpMin = String(cfg.phpMinVersion);
      } catch {
        /* keep default */
      }
    }

    await updateJsonFile(composerPath, (composer) => {
      const next = {
        ...composer,
        require: { ...(composer.require || {}) },
        scripts: { ...(composer.scripts || {}) },
        config: { ...(composer.config || {}) },
      };
      if (!next.require.php) {
        next.require.php = `>=${phpMin}`;
      }
      next.config.platform = {
        ...(next.config.platform || {}),
        php: next.config.platform?.php || phpMin,
      };
      if (!next.scripts["release:dist"]) {
        next.scripts["release:dist"] = "node dev/release/prepare-release.js";
      }
      return next;
    });
  }

  return { ok: true };
}
