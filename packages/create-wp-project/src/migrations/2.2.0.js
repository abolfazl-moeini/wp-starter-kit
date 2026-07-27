/**
 * 2.2.0 migration — emit Rector downgrade/prefix/upgrade tooling.
 *
 * Copies `dev/rector-*.php` from the engine and wires composer scripts +
 * `require-dev.rector/rector` so consumer projects can run
 * `composer rector:build` (and so `release:dist` can downgrade dist/).
 */

import { existsSync, readFileSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { updateJsonFile } from "../json-utils.js";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

export const version = "2.2.0";
export const description =
  "Add Rector PHP downgrade/prefix tooling (dev/rector-*.php + composer scripts)";

const RECTOR_FILES = [
  "rector-config.php",
  "rector-build.php",
  "rector-upgrade.php",
  "rector-prefix.php",
];

export async function run(dir) {
  const rectorSrc = path.join(resolveEngineSrcDir(), "rector");
  const rectorDest = path.join(dir, "dev");
  await fs.mkdir(rectorDest, { recursive: true });

  for (const name of RECTOR_FILES) {
    const src = path.join(rectorSrc, name);
    if (!existsSync(src)) {
      return {
        ok: false,
        reason: `Rector script missing at ${src}`,
      };
    }
    await fs.writeFile(
      path.join(rectorDest, name),
      readFileSync(src, "utf8"),
      "utf8",
    );
  }

  const composerPath = path.join(dir, "composer.json");
  if (existsSync(composerPath)) {
    await updateJsonFile(composerPath, (composer) => {
      const next = {
        ...composer,
        scripts: { ...(composer.scripts || {}) },
        "require-dev": { ...(composer["require-dev"] || {}) },
      };

      if (!next.scripts["rector:upgrade"]) {
        next.scripts["rector:upgrade"] =
          "@php ./vendor/bin/rector process -c dev/rector-upgrade.php --clear-cache";
      }
      if (!next.scripts["rector:prefix"]) {
        next.scripts["rector:prefix"] =
          "@php ./vendor/bin/rector process -c dev/rector-prefix.php --clear-cache";
      }
      if (!next.scripts["rector:build"]) {
        next.scripts["rector:build"] =
          "@php ./vendor/bin/rector process -c dev/rector-build.php --clear-cache";
      }
      if (!next["require-dev"]["rector/rector"]) {
        next["require-dev"]["rector/rector"] = "^2.0";
      }

      return next;
    });
  }

  return { ok: true };
}
