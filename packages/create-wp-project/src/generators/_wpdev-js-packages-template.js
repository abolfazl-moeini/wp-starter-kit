/**
 * Vendor unpublished @wpdev/* (and @core/utils) npm packages into the
 * consumer project under packages/* so `npm install` resolves them via
 * workspaces — not the public registry (they are not on npmjs.com).
 *
 * Mirrors the PHP kit-framework approach (packages/framework + PSR-4).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  CONSUMER_BUILD_WPDEV_PACKAGES,
  CONSUMER_RUNTIME_WPDEV_PACKAGES,
} from "../dep-versions.js";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

const SKIP_DIRS = new Set([
  "node_modules",
  "vendor",
  "dist",
  ".git",
  "tests",
  "coverage",
  "__tests__",
]);

/**
 * Source relative to kit root → dest folder under consumer packages/
 * @type {Array<{ name: string, srcRel: string, destDir: string }>}
 */
export const CONSUMER_VENDORED_JS_PACKAGES = [
  // Runtime libs (packages/* in the kit)
  { name: "@wpdev/hooks", srcRel: "packages/hooks", destDir: "hooks" },
  { name: "@wpdev/utils", srcRel: "packages/utils", destDir: "utils" },
  {
    name: "@wpdev/rest-utils",
    srcRel: "packages/rest-utils",
    destDir: "rest-utils",
  },
  {
    name: "@wpdev/html-utils",
    srcRel: "packages/html-utils",
    destDir: "html-utils",
  },
  {
    name: "@wpdev/translation",
    srcRel: "packages/translation",
    destDir: "translation",
  },
  // Build tools live under core/packages/* in the kit; ship under packages/*
  // so consumer workspaces: ["packages/*"] picks them up.
  { name: "@wpdev/build", srcRel: "core/packages/build", destDir: "build" },
  {
    name: "@wpdev/dependency-extraction-esbuild-plugin",
    srcRel: "core/packages/dependency-extraction-esbuild-plugin",
    destDir: "dependency-extraction-esbuild-plugin",
  },
  // Transitive of @wpdev/build — not published either.
  {
    name: "@core/utils",
    srcRel: "core/packages/utils",
    destDir: "core-utils",
  },
];

function kitRootFromEngine() {
  // …/packages/create-wp-project/src → kit root is three levels up
  return path.resolve(resolveEngineSrcDir(), "..", "..", "..");
}

function walkPackage(dir, base = dir) {
  /** @type {Record<string, string>} */
  const files = {};
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      Object.assign(files, walkPackage(full, base));
      continue;
    }
    // Skip maps / local lock noise
    if (entry.endsWith(".map") || entry === "package-lock.json") continue;
    const rel = path.relative(base, full).replace(/\\/g, "/");
    // Text packages only — these are pure JS/TS/json
    files[rel] = readFileSync(full, "utf8");
  }
  return files;
}

/**
 * @returns {Record<string, string>} paths relative to project root
 *   e.g. "packages/hooks/package.json" → contents
 */
export function consumerWpdevJsPackageFiles() {
  const kitRoot = kitRootFromEngine();
  /** @type {Record<string, string>} */
  const out = {};

  for (const pkg of CONSUMER_VENDORED_JS_PACKAGES) {
    const abs = path.join(kitRoot, pkg.srcRel);
    if (!existsSync(path.join(abs, "package.json"))) {
      throw new Error(
        `Missing kit package ${pkg.name} at ${pkg.srcRel} (under ${kitRoot}). ` +
          "Cannot vendor JS deps for the scaffolded project.",
      );
    }
    const prefix = `packages/${pkg.destDir}/`;
    for (const [rel, body] of Object.entries(walkPackage(abs))) {
      out[`${prefix}${rel}`] = body;
    }
  }

  return out;
}

/**
 * Assert catalog stays aligned with dep-versions consumer lists.
 * (Runtime + build only — @core/utils is extra transitive.)
 */
export function expectedConsumerWpdevPackageNames() {
  return [...CONSUMER_RUNTIME_WPDEV_PACKAGES, ...CONSUMER_BUILD_WPDEV_PACKAGES];
}
