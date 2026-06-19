/**
 * Resolve create-wp-project and sibling kit package paths.
 *
 * Works under native ESM (no __dirname) and under Jest/babel (no import.meta).
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const ENGINE_MARKER = path.join("generators", "_templates.js");

let cachedKitRoot = undefined;

function readWpdevKitRoot() {
  if (cachedKitRoot !== undefined) {
    return cachedKitRoot;
  }
  try {
    const value = execSync("npm config get wpdev-kit-root", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    cachedKitRoot =
      value && value !== "undefined" && value !== "null" ? value : null;
  } catch {
    cachedKitRoot = null;
  }
  return cachedKitRoot;
}

function isEngineSrcDir(candidate) {
  return existsSync(path.join(candidate, ENGINE_MARKER));
}

function walkUpForEngineSrc(startDir) {
  let dir = path.resolve(startDir);
  for (let depth = 0; depth < 12; depth++) {
    const candidate = path.join(dir, "packages/create-wp-project/src");
    if (isEngineSrcDir(candidate)) {
      return candidate;
    }
    if (isEngineSrcDir(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/**
 * @returns {string}
 */
export function resolveEngineSrcDir() {
  if (typeof __dirname !== "undefined" && __dirname) {
    if (isEngineSrcDir(__dirname)) {
      return __dirname;
    }
    const parent = path.dirname(__dirname);
    if (isEngineSrcDir(parent)) {
      return parent;
    }
  }

  const anchors = [process.argv[1], process.cwd()].filter(Boolean);
  for (const anchor of anchors) {
    const found = walkUpForEngineSrc(path.dirname(anchor));
    if (found) {
      return found;
    }
  }

  const kitRoot = readWpdevKitRoot();
  if (kitRoot) {
    const candidate = path.join(kitRoot, "packages/create-wp-project/src");
    if (isEngineSrcDir(candidate)) {
      return candidate;
    }
  }

  return path.join(process.cwd(), "packages/create-wp-project/src");
}

/**
 * @param {string} packageDirName e.g. "mcp-integration"
 * @param {string} markerRelPath file under package src/ that must exist
 * @returns {string | null}
 */
export function resolveKitPackageSrc(packageDirName, markerRelPath) {
  const srcDir = resolveEngineSrcDir();
  /** @type {string[]} */
  const candidates = [
    path.join(path.dirname(path.dirname(srcDir)), packageDirName, "src"),
    path.join(process.cwd(), "packages", packageDirName, "src"),
  ];

  const kitRoot = readWpdevKitRoot();
  if (kitRoot) {
    candidates.push(path.join(kitRoot, "packages", packageDirName, "src"));
  }

  let dir = path.dirname(path.dirname(srcDir));
  for (let depth = 0; depth < 8; depth++) {
    candidates.push(path.join(dir, "packages", packageDirName, "src"));
    candidates.push(path.join(dir, packageDirName, "src"));
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, markerRelPath))) {
      return candidate;
    }
  }
  return null;
}
