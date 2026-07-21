#!/usr/bin/env node
/**
 * Prepare a production-ready plugin package under dist/{slug}/.
 *
 * Source tree is left untouched. Steps:
 *   1. Resolve slug + phpMinVersion from wpdev.json (or project.config.json)
 *   2. Copy project → dist/{slug}/ (excluding node_modules, vendor, dist, …)
 *   3. If composer.json exists: harden for release, composer install --no-dev
 *   4. Strip dev-only paths (tests, docs, packages, package.json, .* dirs, …)
 *
 * Usage (from project root):
 *   node dev/release/prepare-release.js
 *   node dev/release/prepare-release.js --out=dist --skip-composer
 *
 * Wired as:
 *   npm run release  →  npm run build && node dev/release/prepare-release.js
 *   composer release:dist  →  node dev/release/prepare-release.js
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
  lstatSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

import {
  prepareComposerForRelease,
  releaseCopyExcludeNames,
  shouldStripRelativePath,
} from "./prepareComposer.js";

function parseArgs(argv) {
  const opts = {
    out: "dist",
    skipComposer: false,
    root: process.cwd(),
  };
  for (const arg of argv) {
    if (arg === "--skip-composer") opts.skipComposer = true;
    else if (arg.startsWith("--out=")) opts.out = arg.slice("--out=".length);
    else if (arg.startsWith("--root="))
      opts.root = path.resolve(arg.slice("--root=".length));
    else if (arg === "--help" || arg === "-h") opts.help = true;
  }
  return opts;
}

function readProjectConfig(root) {
  const wpdevPath = path.join(root, "wpdev.json");
  const legacyPath = path.join(root, "project.config.json");
  const configPath = existsSync(wpdevPath)
    ? wpdevPath
    : existsSync(legacyPath)
      ? legacyPath
      : null;
  if (!configPath) {
    throw new Error(
      "wpdev.json (or project.config.json) not found in project root",
    );
  }
  const raw = JSON.parse(readFileSync(configPath, "utf8"));
  if (!raw || typeof raw !== "object" || !raw.slug) {
    throw new Error(
      `${path.basename(configPath)} must contain a non-empty "slug"`,
    );
  }
  return {
    slug: String(raw.slug),
    phpMinVersion: String(raw.phpMinVersion || "7.4"),
    configPath,
  };
}

function shouldExcludeOnCopy(relative, excludeNames) {
  const normalized = relative.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  for (const seg of segments) {
    if (excludeNames.includes(seg)) return true;
  }
  return false;
}

function copyTree(srcRoot, destRoot, excludeNames) {
  mkdirSync(destRoot, { recursive: true });
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    const fromDir = rel ? path.join(srcRoot, rel) : srcRoot;
    let entries;
    try {
      entries = readdirSync(fromDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (shouldExcludeOnCopy(childRel, excludeNames)) continue;
      const from = path.join(srcRoot, childRel);
      const to = path.join(destRoot, childRel);
      let st;
      try {
        st = lstatSync(from);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) {
        // Skip symlinks — release packages must not ship host links.
        continue;
      }
      if (st.isDirectory()) {
        mkdirSync(to, { recursive: true });
        stack.push(childRel);
        continue;
      }
      if (st.isFile()) {
        mkdirSync(path.dirname(to), { recursive: true });
        copyFileSync(from, to);
      }
    }
  }
}

function walkFiles(root) {
  const out = [];
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    const dir = rel ? path.join(root, rel) : root;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        stack.push(childRel);
      } else if (entry.isFile()) {
        out.push(childRel.replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

function stripDist(distRoot) {
  const files = walkFiles(distRoot);
  for (const rel of files) {
    if (shouldStripRelativePath(rel)) {
      try {
        rmSync(path.join(distRoot, rel), { force: true });
      } catch {
        /* ignore */
      }
    }
  }

  const allDirs = [];
  const stack = [""];
  while (stack.length) {
    const rel = stack.pop();
    const dir = rel ? path.join(distRoot, rel) : distRoot;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      stack.push(childRel);
      allDirs.push(childRel.replace(/\\/g, "/"));
    }
  }
  allDirs.sort((a, b) => b.length - a.length);
  for (const rel of allDirs) {
    if (shouldStripRelativePath(rel)) {
      try {
        rmSync(path.join(distRoot, rel), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }

  for (const entry of readdirSync(distRoot, { withFileTypes: true })) {
    const rel = entry.name;
    if (shouldStripRelativePath(rel)) {
      try {
        rmSync(path.join(distRoot, rel), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  }
}

function runComposerInstall(distRoot) {
  const result = spawnSync(
    "composer",
    [
      "install",
      "--no-dev",
      "--no-interaction",
      "--no-progress",
      "--prefer-dist",
    ],
    {
      cwd: distRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    const out = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(
      `composer install --no-dev failed in ${distRoot} (exit ${result.status}):\n${out}`,
    );
  }
}

/**
 * Programmatic entry (for tests and CLI).
 *
 * @param {{ root?: string, out?: string, skipComposer?: boolean }} options
 * @returns {Promise<{ distRoot: string, slug: string, phpMinVersion: string }>}
 */
export async function prepareRelease(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const outBase = options.out || "dist";
  const skipComposer = Boolean(options.skipComposer);

  const { slug, phpMinVersion } = readProjectConfig(root);
  const distRoot = path.join(root, outBase, slug);

  if (existsSync(distRoot)) {
    rmSync(distRoot, { recursive: true, force: true });
  }
  mkdirSync(path.dirname(distRoot), { recursive: true });

  copyTree(root, distRoot, releaseCopyExcludeNames());

  const composerPath = path.join(distRoot, "composer.json");
  if (existsSync(composerPath)) {
    const composer = JSON.parse(readFileSync(composerPath, "utf8"));
    const prepared = prepareComposerForRelease(composer, phpMinVersion, root);
    writeFileSync(
      composerPath,
      JSON.stringify(prepared, null, 2) + "\n",
      "utf8",
    );

    if (!skipComposer) {
      runComposerInstall(distRoot);
    }
  }

  stripDist(distRoot);

  // Marker only (no wall-clock stamp in the emitted scaffold body).
  writeFileSync(
    path.join(distRoot, ".dist-built"),
    `ok\nphpMinVersion=${phpMinVersion}\n`,
    "utf8",
  );

  return { distRoot, slug, phpMinVersion };
}

function printHelp() {
  process.stdout.write(`Usage: node prepare-release.js [options]

Prepare a production plugin package under dist/{slug}/ without
modifying the source tree.

Options:
  --out=DIR          Output base directory (default: dist)
  --root=DIR         Project root (default: cwd)
  --skip-composer    Skip composer install --no-dev
  -h, --help         Show this help
`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }
  try {
    const result = await prepareRelease(opts);
    process.stdout.write(`Release package ready: ${result.distRoot}\n`);
  } catch (err) {
    process.stderr.write(
      `prepare-release failed: ${err && err.message ? err.message : err}\n`,
    );
    process.exit(1);
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirect =
  entry.endsWith(`${path.sep}prepare-release.js`) ||
  entry.endsWith("/prepare-release.js") ||
  entry.endsWith("prepare-release.js");

if (isDirect) {
  main();
}
