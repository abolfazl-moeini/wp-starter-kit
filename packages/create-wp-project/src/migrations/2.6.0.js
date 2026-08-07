/**
 * 2.6.0 migration — refresh release packager with pre-dist test gate.
 *
 * Re-emits `dev/release/prepare-release.js`, `prepareComposer.js`, and
 * `releaseTests.js` so existing projects gate dist zip on unit/e2e tests
 * (bypass: --skip-tests / WPDEV_SKIP_TESTS=1).
 */

import { existsSync, readFileSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

export const version = "2.6.0";
export const description =
  "Refresh release packager (pre-dist unit/e2e gate; --skip-tests bypass)";

export async function run(dir) {
  const releaseDir = path.join(dir, "dev/release");
  await fs.mkdir(releaseDir, { recursive: true });

  const releaseSrc = path.join(resolveEngineSrcDir(), "release");
  for (const name of [
    "prepare-release.js",
    "prepareComposer.js",
    "releaseTests.js",
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

  return { ok: true };
}
