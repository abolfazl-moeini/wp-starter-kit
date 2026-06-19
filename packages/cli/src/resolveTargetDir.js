/**
 * Resolve and validate the output directory for `wpdev create`.
 */

import * as path from "node:path";
import { stat, readdir } from "node:fs/promises";

/**
 * Commander may pass unknown flags (e.g. `--yes`) as the `[slug]`
 * positional when `allowUnknownOption` is enabled. Ignore those.
 *
 * @param {string|undefined} slug
 * @returns {string|undefined}
 */
export function normalizePositionalSlug(slug) {
  if (!slug || typeof slug !== "string") return undefined;
  if (slug.startsWith("-")) return undefined;
  return slug;
}

/**
 * @param {{
 *   cwd?: string,
 *   runOptions?: { targetDir?: string },
 *   positionalSlug?: string,
 * }} input
 * @returns {string}
 */
export function resolveCreateTargetDir(input) {
  const i = input || {};
  const cwd = i.cwd || process.cwd();
  const targetDir = i.runOptions?.targetDir;

  if (targetDir && typeof targetDir === "string" && targetDir.length > 0) {
    return path.isAbsolute(targetDir)
      ? path.resolve(targetDir)
      : path.resolve(cwd, targetDir);
  }

  if (i.positionalSlug && typeof i.positionalSlug === "string") {
    return path.resolve(cwd, i.positionalSlug);
  }

  return path.resolve(cwd);
}

/**
 * Hidden dotfiles (.DS_Store, .git, .gitignore, etc.) do not block
 * scaffolding — only visible entries count toward "not empty".
 *
 * @param {string[]} entries
 * @returns {boolean}
 */
export function hasVisibleDirEntries(entries) {
  return (
    Array.isArray(entries) &&
    entries.some((name) => typeof name === "string" && !name.startsWith("."))
  );
}

/**
 * Return true when the target path exists and is not scaffold-ready
 * (directory with visible files, or a regular file at the path).
 *
 * @param {string} dir
 * @returns {Promise<boolean>}
 */
export async function isCreateTargetDirNonEmpty(dir) {
  let fileStat;
  try {
    fileStat = await stat(dir);
  } catch {
    return false;
  }
  if (!fileStat.isDirectory()) {
    return true;
  }
  const entries = await readdir(dir);
  return hasVisibleDirEntries(entries);
}

/**
 * @param {string} dir
 * @returns {string}
 */
export function formatCreateTargetDirConflictReason(dir) {
  return (
    "target directory is not empty: " +
    dir +
    " — pass --force to overwrite, or pick an empty directory"
  );
}

/**
 * Fail-fast guard for `wpdev create`: resolve the output directory
 * from flags/positionals and refuse non-empty targets unless --force.
 *
 * @param {{
 *   cwd?: string,
 *   runOptions?: { targetDir?: string, force?: boolean },
 *   positionalSlug?: string,
 *   force?: boolean,
 * }} input
 * @returns {Promise<{ ok: true, targetDir: string } | { ok: false, targetDir: string, reason: string }>}
 */
export async function validateCreateTargetDir(input) {
  const i = input || {};
  const targetDir = resolveCreateTargetDir({
    cwd: i.cwd,
    runOptions: i.runOptions,
    positionalSlug: i.positionalSlug,
  });
  const force = i.force === true || i.runOptions?.force === true;
  if (force) {
    return { ok: true, targetDir };
  }
  const conflict = await isCreateTargetDirNonEmpty(targetDir);
  if (conflict) {
    return {
      ok: false,
      targetDir,
      reason: formatCreateTargetDirConflictReason(targetDir),
    };
  }
  return { ok: true, targetDir };
}
