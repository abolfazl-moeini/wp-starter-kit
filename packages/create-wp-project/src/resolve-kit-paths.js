/**
 * Resolve create-wp-project and sibling kit package paths.
 *
 * Works under native ESM (no __dirname) and under Jest/babel (no import.meta).
 *
 * Critical: global/npm-linked bins often appear under
 * `~/.nvm/.../node_modules/@wpdev/cli/...` as *symlinks* into the kit.
 * Walking the symlink path never reaches the kit root — always realpath
 * anchors before walking, and prefer `require.resolve` of the package.
 */

import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
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

/**
 * @param {string} p
 * @returns {string}
 */
function safeRealpath(p) {
  try {
    return realpathSync(p);
  } catch {
    return path.resolve(p);
  }
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
 * Try to resolve the engine src dir via Node's package resolution
 * (`@wpdev/create-wp-project`) from a file anchor.
 *
 * @param {string} anchorFile absolute path to an existing file
 * @returns {string | null}
 */
function resolveEngineViaPackage(anchorFile) {
  try {
    const req = createRequire(anchorFile);
    const entry = req.resolve("@wpdev/create-wp-project");
    const srcDir = path.dirname(entry);
    if (isEngineSrcDir(srcDir)) {
      return srcDir;
    }
  } catch {
    /* not resolvable from this anchor */
  }
  return null;
}

/**
 * @returns {string}
 */
export function resolveEngineSrcDir() {
  // 1. Jest / CJS transform: __dirname is this file's directory
  //    (…/create-wp-project/src) or a child under it.
  if (typeof __dirname !== "undefined" && __dirname) {
    if (isEngineSrcDir(__dirname)) {
      return __dirname;
    }
    const parent = path.dirname(__dirname);
    if (isEngineSrcDir(parent)) {
      return parent;
    }
  }

  // 2. Prefer realpath(argv[1]) + package resolution. Global bins are
  //    often symlinks under nvm's node_modules; walking the symlink
  //    path never reaches the monorepo root.
  const argv1 = process.argv[1];
  if (argv1) {
    const realArgv = safeRealpath(argv1);
    const viaPkg = resolveEngineViaPackage(realArgv);
    if (viaPkg) return viaPkg;

    const found = walkUpForEngineSrc(path.dirname(realArgv));
    if (found) return found;
  }

  // 3. Walk realpath(cwd) — useful when developing inside the kit.
  const realCwd = safeRealpath(process.cwd());
  const fromCwd = walkUpForEngineSrc(realCwd);
  if (fromCwd) return fromCwd;

  // 4. Explicit kit root override (npm config).
  const kitRoot = readWpdevKitRoot();
  if (kitRoot) {
    const candidate = path.join(
      safeRealpath(kitRoot),
      "packages/create-wp-project/src",
    );
    if (isEngineSrcDir(candidate)) {
      return candidate;
    }
  }

  // 5. Last resort — only if the path actually exists. Never return a
  //    phantom path that later fails with a confusing "missing file".
  const fallback = path.join(process.cwd(), "packages/create-wp-project/src");
  if (isEngineSrcDir(fallback)) {
    return fallback;
  }

  throw new Error(
    "Could not locate @wpdev/create-wp-project engine src " +
      "(generators/_templates.js). Tried realpath(argv[1]), cwd walk, " +
      "npm config wpdev-kit-root, and cwd/packages/create-wp-project/src.",
  );
}

/**
 * @param {string} packageDirName e.g. "mcp-integration"
 * @param {string} markerRelPath file under package src/ that must exist
 * @returns {string | null}
 */
export function resolveKitPackageSrc(packageDirName, markerRelPath) {
  let srcDir;
  try {
    srcDir = resolveEngineSrcDir();
  } catch {
    srcDir = path.join(process.cwd(), "packages/create-wp-project/src");
  }

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

  // Also resolve via package name when published as @wpdev/*
  if (process.argv[1]) {
    try {
      const req = createRequire(safeRealpath(process.argv[1]));
      const npmName = `@wpdev/${packageDirName}`;
      try {
        const entry = req.resolve(npmName);
        candidates.unshift(path.dirname(entry));
      } catch {
        /* package may not be on the dependency graph */
      }
    } catch {
      /* ignore */
    }
  }

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, markerRelPath))) {
      return candidate;
    }
  }
  return null;
}
