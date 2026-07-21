/**
 * Best-effort `composer dump-autoload` after composer.json autoload changes.
 *
 * When features add/remove register files from `autoload.files`, vendor/
 * Composer maps stay stale until dump-autoload runs — leading to fatals
 * like "Failed opening required .../src/blocks-register.php".
 */

import { existsSync } from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * @param {string} dir project root
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {{ ok: boolean, skipped?: boolean, reason?: string, warning?: string }}
 */
export function dumpComposerAutoload(dir, opts = {}) {
  if (!dir || typeof dir !== "string") {
    return { ok: false, reason: "dumpComposerAutoload: dir is required" };
  }
  const composerJson = path.join(dir, "composer.json");
  const vendorDir = path.join(dir, "vendor");
  if (!existsSync(composerJson)) {
    return { ok: true, skipped: true, reason: "no composer.json" };
  }
  if (!existsSync(vendorDir)) {
    return {
      ok: true,
      skipped: true,
      reason: "no vendor/ (run composer install first)",
    };
  }

  const timeout = opts.timeoutMs ?? 120_000;
  const result = spawnSync("composer", ["dump-autoload", "-o"], {
    cwd: dir,
    encoding: "utf8",
    timeout,
    env: process.env,
  });

  if (result.error) {
    // composer binary missing — do not fail the feature mutation
    return {
      ok: true,
      skipped: true,
      warning:
        "composer dump-autoload skipped: " +
        (result.error.message || String(result.error)),
    };
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().slice(0, 400);
    return {
      ok: true,
      skipped: false,
      warning:
        "composer dump-autoload exited " +
        String(result.status) +
        (detail ? `: ${detail}` : ""),
    };
  }
  return { ok: true };
}
