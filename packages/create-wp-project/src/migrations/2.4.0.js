/**
 * 2.4.0 migration — ship WPDev framework via Composer vendor.
 *
 * Root PSR-4 `WPDev\\` → `packages/framework/src/` breaks after
 * `release:dist` strips `packages/`. Require `wpdev/framework` from the
 * path repo so `composer install --no-dev` places it under
 * `vendor/wpdev/framework/` (survives strip).
 */

import { existsSync, promises as fs } from "node:fs";
import * as path from "node:path";
import { updateJsonFile } from "../json-utils.js";

export const version = "2.4.0";
export const description =
  "Require wpdev/framework in vendor (fix release:dist ModuleInterface missing)";

export async function run(dir) {
  const composerPath = path.join(dir, "composer.json");
  if (!existsSync(composerPath)) {
    return {
      ok: true,
      warning: "no composer.json — skipped framework require",
    };
  }

  const frameworkSrc = path.join(dir, "packages/framework/composer.json");
  if (!existsSync(frameworkSrc)) {
    return {
      ok: false,
      reason:
        "packages/framework missing — cannot require wpdev/framework for release",
    };
  }

  // Path packages without a version resolve as dev-main and fail under
  // default minimum-stability=stable (same pattern as php-fault-tolerance).
  await updateJsonFile(frameworkSrc, (pkg) => {
    if (!pkg.version) {
      return { ...pkg, version: "1.0.0" };
    }
    return pkg;
  });

  await updateJsonFile(composerPath, (composer) => {
    const next = {
      ...composer,
      require: { ...(composer.require || {}) },
      autoload: { ...(composer.autoload || {}) },
      repositories: Array.isArray(composer.repositories)
        ? [...composer.repositories]
        : [],
    };

    next.require["wpdev/framework"] = next.require["wpdev/framework"] || "*";

    const hasPackagesRepo = next.repositories.some(
      (r) =>
        r &&
        r.type === "path" &&
        typeof r.url === "string" &&
        (r.url === "packages/*" || r.url.endsWith("/packages/*")),
    );
    if (!hasPackagesRepo) {
      next.repositories.push({
        type: "path",
        url: "packages/*",
        options: { monorepo: true, symlink: false },
      });
    }

    if (next.autoload["psr-4"] && typeof next.autoload["psr-4"] === "object") {
      const psr4 = { ...next.autoload["psr-4"] };
      const wpdevPath = psr4["WPDev\\"];
      if (
        typeof wpdevPath === "string" &&
        wpdevPath.replace(/\\/g, "/").includes("packages/framework")
      ) {
        delete psr4["WPDev\\"];
        next.autoload["psr-4"] = psr4;
      }
    }

    return next;
  });

  return { ok: true };
}
