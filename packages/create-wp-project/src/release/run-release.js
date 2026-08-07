#!/usr/bin/env node
/**
 * npm `release` entry: unit/e2e gate → optional `npm run build` → pack dist.
 *
 * Composer `release:dist` still calls prepare-release.js directly (no asset
 * build). Bypass tests with --skip-tests or WPDEV_SKIP_TESTS=1.
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

import { prepareRelease } from "./prepare-release.js";
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

function printHelp() {
  process.stdout.write(`Usage: node run-release.js [options]

Run pre-dist tests, then npm run build (if defined), then package dist/.

Options match prepare-release.js (--skip-tests, --skip-zip, …).
`);
}

function runNpmBuild(root) {
  const pkgPath = path.join(root, "package.json");
  if (!existsSync(pkgPath)) return { skipped: true };
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch {
    return { skipped: true };
  }
  if (!pkg?.scripts || typeof pkg.scripts.build !== "string") {
    return { skipped: true };
  }

  process.stderr.write("release: running npm run build…\n");
  const result = spawnSync("npm", ["run", "build"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: process.env,
    stdio: "inherit",
  });
  const status =
    result && typeof result.status === "number" ? result.status : 1;
  if (status !== 0) {
    throw new Error(`npm run build failed (exit ${status})`);
  }
  return { skipped: false };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  const root = path.resolve(opts.root);
  gateReleaseTests(root, { skipTests: opts.skipTests });
  runNpmBuild(root);

  const result = await prepareRelease({
    ...opts,
    root,
    skipTests: true,
  });
  process.stdout.write(`Release package ready: ${result.distRoot}\n`);
  if (result.zipPath) {
    process.stdout.write(`Release zip ready: ${result.zipPath}\n`);
  }
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
const isDirect =
  entry.endsWith(`${path.sep}run-release.js`) ||
  entry.endsWith("/run-release.js") ||
  entry.endsWith("run-release.js");

if (isDirect) {
  main().catch((err) => {
    process.stderr.write(
      `run-release failed: ${err && err.message ? err.message : err}\n`,
    );
    process.exit(1);
  });
}

export { parseArgs, runNpmBuild };
