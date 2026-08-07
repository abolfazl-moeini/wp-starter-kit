#!/usr/bin/env node
/**
 * Prepare a production-ready plugin package under dist/{slug}/.
 *
 * Source tree is left untouched. Steps:
 *   0. Run enabled PHP/JS unit + Playwright e2e (unless --skip-tests)
 *   1. Resolve slug + phpMinVersion from wpdev.json (or project.config.json)
 *   2. Copy project → dist/{slug}/ (excluding node_modules, vendor, dist, …)
 *   3. Downgrade PHP in dist/ via Rector to phpMinVersion (host `vendor/bin/rector`)
 *   4. If composer.json exists: harden for release, composer install --no-dev
 *   5. Strip dev-only paths (tests, docs, packages, composer.json/lock, …)
 *   6. Zip dist/{slug}/ → dist/{slug}.zip (WordPress-style: folder as zip root)
 *
 * Usage (from project root):
 *   node dev/release/prepare-release.js
 *   node dev/release/prepare-release.js --out=dist --skip-composer
 *   node dev/release/prepare-release.js --skip-rector
 *   node dev/release/prepare-release.js --skip-zip
 *   node dev/release/prepare-release.js --skip-tests
 *
 * Pre-dist gate (default ON): runs enabled PHP/JS unit tests and Playwright
 * e2e from wpdev.json features before mutating dist/. Bypass with
 * --skip-tests or WPDEV_SKIP_TESTS=1.
 *
 * Wired as:
 *   npm run release  →  node dev/release/run-release.js
 *     (tests → npm run build → prepare-release --skip-tests)
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
import { gateReleaseTests } from "./releaseTests.js";

function parseArgs(argv) {
  const opts = {
    out: "dist",
    skipComposer: false,
    skipRector: false,
    skipZip: false,
    skipTests: false,
    root: process.cwd(),
  };
  for (const arg of argv) {
    if (arg === "--skip-composer") opts.skipComposer = true;
    else if (arg === "--skip-rector") opts.skipRector = true;
    else if (arg === "--skip-zip") opts.skipZip = true;
    else if (arg === "--skip-tests") opts.skipTests = true;
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
 * Downgrade PHP in the dist tree to phpMinVersion using the *host*
 * project's Rector binary (dist has no vendor yet / will install --no-dev).
 *
 * Soft-skip when rector is not installed or configs are missing — projects
 * that already author at phpMinVersion do not need this step.
 *
 * @param {string} root Project root (has vendor/bin/rector).
 * @param {string} distRoot Copied tree still containing dev/rector-*.php.
 */
function runRectorBuildOnDist(root, distRoot) {
  const rectorBin = path.join(root, "vendor/bin/rector");
  const config = path.join(distRoot, "dev/rector-build.php");
  if (!existsSync(rectorBin) || !existsSync(config)) {
    return { skipped: true, reason: "rector binary or config missing" };
  }

  const result = spawnSync(
    "php",
    [rectorBin, "process", "-c", "dev/rector-build.php", "--clear-cache"],
    {
      cwd: distRoot,
      encoding: "utf8",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) {
    const out = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(
      `rector:build failed in ${distRoot} (exit ${result.status}):\n${out}`,
    );
  }
  return { skipped: false };
}

/**
 * Zip dist/{slug}/ into dist/{slug}.zip with `{slug}/…` as the archive root
 * (WordPress plugin install convention).
 *
 * @param {string} outAbs Absolute path to the output base (e.g. …/dist)
 * @param {string} slug Plugin slug / folder name inside outAbs
 * @returns {string} Absolute path to the zip file
 */
function createReleaseZip(outAbs, slug) {
  const zipPath = path.join(outAbs, `${slug}.zip`);
  if (existsSync(zipPath)) {
    rmSync(zipPath, { force: true });
  }

  let result;
  if (process.platform === "win32") {
    // Compress-Archive includes the folder name as the zip root entry.
    result = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-Command",
        `Compress-Archive -Path '${slug.replace(/'/g, "''")}' -DestinationPath '${slug.replace(/'/g, "''")}.zip' -Force`,
      ],
      { cwd: outAbs, encoding: "utf8" },
    );
  } else {
    result = spawnSync("zip", ["-r", "-q", `${slug}.zip`, slug], {
      cwd: outAbs,
      encoding: "utf8",
    });
  }

  if (result.status !== 0) {
    const out = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    throw new Error(
      `zip failed for ${zipPath} (exit ${result.status}):\n${out}`,
    );
  }
  if (!existsSync(zipPath)) {
    throw new Error(`zip reported success but ${zipPath} was not created`);
  }
  return zipPath;
}

/**
 * Programmatic entry (for tests and CLI).
 *
 * @param {{ root?: string, out?: string, skipComposer?: boolean, skipRector?: boolean, skipZip?: boolean, skipTests?: boolean }} options
 * @returns {Promise<{ distRoot: string, zipPath: string|null, slug: string, phpMinVersion: string }>}
 */
export async function prepareRelease(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const outBase = options.out || "dist";
  const skipComposer = Boolean(options.skipComposer);
  const skipRector = Boolean(options.skipRector);
  const skipZip = Boolean(options.skipZip);
  const skipTests = Boolean(options.skipTests);

  // Gate BEFORE wiping dist so a failed suite leaves an existing package intact.
  gateReleaseTests(root, { skipTests });

  const { slug, phpMinVersion } = readProjectConfig(root);
  const outAbs = path.join(root, outBase);
  const distRoot = path.join(outAbs, slug);

  if (existsSync(distRoot)) {
    rmSync(distRoot, { recursive: true, force: true });
  }
  mkdirSync(outAbs, { recursive: true });

  copyTree(root, distRoot, releaseCopyExcludeNames());

  // Downgrade *before* composer --no-dev and before stripping `dev/`.
  if (!skipRector) {
    runRectorBuildOnDist(root, distRoot);
  }

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

  const zipPath = skipZip ? null : createReleaseZip(outAbs, slug);

  return { distRoot, zipPath, slug, phpMinVersion };
}

function printHelp() {
  process.stdout.write(`Usage: node prepare-release.js [options]

Prepare a production plugin package under dist/{slug}/ (and
dist/{slug}.zip) without modifying the source tree.

By default, enabled PHP/JS unit tests and Playwright e2e (from
wpdev.json features) run before packaging. Failures block dist/.

Options:
  --out=DIR          Output base directory (default: dist)
  --root=DIR         Project root (default: cwd)
  --skip-composer    Skip composer install --no-dev
  --skip-rector      Skip PHP downgrade (rector:build) on dist/
  --skip-zip         Skip creating dist/{slug}.zip
  --skip-tests       Skip pre-dist unit/e2e suites (or set WPDEV_SKIP_TESTS=1)
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
    if (result.zipPath) {
      process.stdout.write(`Release zip ready: ${result.zipPath}\n`);
    }
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
