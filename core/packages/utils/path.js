import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname as nodeDirname, join } from "node:path";

export function getMetaUrl() {
  return import.meta.url;
}

/**
 * Gets the directory name of a path, with an optional number of levels to go up.
 * Mimics PHP's dirname() with a  argument.
 * @param {string} path - The input path.
 * @param {number} [levels=1] - Number of parent directories to go up (default: 1).
 * @returns {string} The resulting directory path.
 * @throws {TypeError} If path is not a string or levels is not a positive integer.
 */
export function dirname(path, levels = 1) {
  if (typeof path !== "string") {
    throw new TypeError("Path must be a string");
  }
  if (!Number.isInteger(levels) || levels < 0) {
    throw new TypeError("Levels must be a non-negative integer");
  }

  let result = path;
  for (let i = 0; i < levels; i++) {
    result = nodeDirname(result);
    // If we reach the root (e.g., '/' or 'C:'), stop
    if (result === "/" || /^[A-Za-z]:\\?$/.test(result)) {
      break;
    }
  }
  return result;
}

/**
 * Absolute path to the project / kit root that owns `wpdev.json`.
 *
 * Walks up from this package so both layouts work:
 * - generated plugin: `packages/core-utils` → plugin root (3 levels)
 * - kit monorepo: `core/packages/utils` → kit root (4 levels)
 *
 * @returns {string} The root directory path.
 */
export function getRootPath() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    let cwdDir = process.cwd();
    for (let i = 0; i < 12; i++) {
      if (
        existsSync(join(cwdDir, "wpdev.json")) ||
        existsSync(join(cwdDir, "project.config.json"))
      ) {
        return cwdDir;
      }
      const parent = nodeDirname(cwdDir);
      if (parent === cwdDir) {
        break;
      }
      cwdDir = parent;
    }
  }

  const __filename = fileURLToPath(getMetaUrl());
  let dir = nodeDirname(__filename);

  for (let i = 0; i < 12; i++) {
    if (
      existsSync(join(dir, "wpdev.json")) ||
      existsSync(join(dir, "project.config.json"))
    ) {
      return dir;
    }
    const parent = nodeDirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  // Fallback for unit tests that mock getMetaUrl without a wpdev.json tree.
  return dirname(__filename, 4);
}
