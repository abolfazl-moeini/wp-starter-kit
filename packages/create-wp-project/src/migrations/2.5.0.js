/**
 * 2.5.0 migration — backfill e2eTest feature (Browser E2E / Playwright).
 *
 * Older manifests omit `e2eTest`. Default is `none` (opt-in). Files are
 * not scaffolded here — run:
 *   wpdev add e2eTest --variant playwright
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import { updateJsonFile } from "../json-utils.js";

export const version = "2.5.0";
export const description =
  "Backfill features.e2eTest=none (enable later: wpdev add e2eTest --variant playwright)";

export async function run(dir) {
  const manifestPath = path.join(dir, "wpdev.json");
  if (!existsSync(manifestPath)) {
    return {
      ok: true,
      warning: "no wpdev.json — skipped e2eTest backfill",
    };
  }

  await updateJsonFile(manifestPath, (m) => {
    const features = { ...(m.features || {}) };
    if (
      features.e2eTest === undefined ||
      features.e2eTest === null ||
      features.e2eTest === ""
    ) {
      features.e2eTest = "none";
    }
    // Drop legacy half-landed catalog values if any consumer copied them.
    if (features.e2eTest === "cypress") {
      features.e2eTest = "none";
    }
    return { ...m, features };
  });

  return { ok: true };
}
