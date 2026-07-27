/**
 * 2.3.0 migration — refresh release packager.
 *
 * Re-emits `dev/release/prepare-release.js` + `prepareComposer.js` so
 * existing projects get:
 *   - strip of root `composer.json` / `composer.lock` after install
 *   - `dist/{slug}.zip` next to `dist/{slug}/` (WordPress-style)
 */

import { existsSync, readFileSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

export const version = "2.3.0";
export const description =
  "Refresh release packager (strip composer.json/lock; emit dist/{slug}.zip)";

export async function run(dir) {
  const releaseDir = path.join(dir, "dev/release");
  await fs.mkdir(releaseDir, { recursive: true });

  const releaseSrc = path.join(resolveEngineSrcDir(), "release");
  for (const name of ["prepare-release.js", "prepareComposer.js"]) {
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

  return { ok: true };
}
