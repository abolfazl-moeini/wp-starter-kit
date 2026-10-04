#!/usr/bin/env node

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

import { loadTargetRegistry } from "./target-registry.mjs";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const positional = process.argv.slice(3).filter((value) => !value.startsWith("--strauss-bin="));
const straussArgument = process.argv.slice(3).find((value) => value.startsWith("--strauss-bin="));
const straussBin = straussArgument ? path.resolve(straussArgument.slice("--strauss-bin=".length)) : null;
const discoveryFailures = [];
function resolveBuildConfigPath(argv = process.argv, env = process.env) {
  const eqArg = (argv || []).find((a) => typeof a === "string" && a.startsWith("--config="));
  if (eqArg) {
    const value = eqArg.slice("--config=".length).trim();
    return value || null;
  }
  const idx = (argv || []).findIndex((a) => a === "--config");
  if (idx !== -1 && typeof argv[idx + 1] === "string" && !argv[idx + 1].startsWith("--")) {
    return argv[idx + 1];
  }
  const fromEnv = env?.WPDEV_BUILD_CONFIG;
  return typeof fromEnv === "string" && fromEnv.trim() ? fromEnv.trim() : null;
}
function isKnownConsumer(name, registry) {
  if (name === "wpdev") return false;
  if (Object.prototype.hasOwnProperty.call(registry, name)) return true;
  // Source-tree convention: `*-dev` directories map to their slug.
  if (name.endsWith("-dev")) {
    const slug = name.slice(0, -"-dev".length);
    if (slug && Object.prototype.hasOwnProperty.call(registry, slug)) return true;
  }
  return false;
}
async function loadScopeRegistry() {
  try {
    const bundle = await loadTargetRegistry(resolveBuildConfigPath(), contentRoot);
    if (bundle?.registry && Object.keys(bundle.registry).length > 0) return bundle.registry;
  } catch {
    // Fall through to convention scope below (fail-closed per-consumer downstream).
  }
  return null;
}
const scopeRegistry = await loadScopeRegistry();
function isInScopeConsumer(name) {
  if (name === "wpdev") return false;
  if (scopeRegistry) return isKnownConsumer(name, scopeRegistry);
  // Convention fallback (no static allowlist): any plugin directory is in
  // scope; composer.json/lock presence is still gated in discoverConsumers().
  return true;
}

async function discoverConsumers() {
  const entries = await fs.readdir(path.join(contentRoot, "plugins"), { withFileTypes: true });
  const discovered = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !isInScopeConsumer(entry.name)) continue;
    const composerPath = path.join(contentRoot, "plugins", entry.name, "composer.json");
    const lockPath = path.join(contentRoot, "plugins", entry.name, "composer.lock");
    let composerStat;
    try {
      composerStat = await fs.lstat(composerPath);
    } catch (error) {
      if (error.code !== "ENOENT") discoveryFailures.push(`${entry.name}: cannot inspect composer.json (${error.message})`);
      continue;
    }
    if (!composerStat.isFile() || composerStat.isSymbolicLink()) {
      discoveryFailures.push(`${entry.name}: composer.json must be a regular non-symlink file`);
      continue;
    }
    try {
      const lockStat = await fs.lstat(lockPath);
      if (!lockStat.isFile() || lockStat.isSymbolicLink()) {
        discoveryFailures.push(`${entry.name}: composer.lock must be a regular non-symlink file`);
        continue;
      }
      discovered.push(entry.name);
    } catch (error) {
      discoveryFailures.push(error.code === "ENOENT"
        ? `${entry.name}: composer.lock is required for staging`
        : `${entry.name}: cannot inspect composer.lock (${error.message})`);
    }
  }
  return discovered.sort();
}

const discoveredConsumers = await discoverConsumers();
if (discoveryFailures.length > 0) {
  process.stderr.write(`Incomplete Composer staging scope:\n${discoveryFailures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exit(2);
}
if (
  positional.length > 0 &&
  (new Set(positional).size !== positional.length || positional.some((consumer) => !discoveredConsumers.includes(consumer)))
) {
  process.stderr.write("Invalid consumer subset: consumer subset must contain unique discovered consumers.\n");
  process.exit(2);
}
if (!straussBin) {
  process.stderr.write("A pinned --strauss-bin is required for Composer/Strauss staging.\n");
  process.exit(2);
}
const consumers = positional.length > 0 ? positional : discoveredConsumers;
const devMarkers = ["phpunit", "plugin-core-test", "polyfills", "deep-copy", "rector", "phpstan"];
const sourceExcludedDirectories = new Set(["vendor", "dist", ".git", "node_modules"]);

async function copySource(source, target) {
  await fs.cp(source, target, {
    recursive: true,
    filter: (entry) => {
      const relative = path.relative(source, entry).replaceAll(path.sep, "/");
      if (!relative) return true;
      return !relative.split("/").some((segment) => ["vendor", "dist", ".git", "node_modules"].includes(segment));
    },
  });
}

async function firstSourceSymlink(root, current = root) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (sourceExcludedDirectories.has(entry.name)) continue;
    const candidate = path.join(current, entry.name);
    if (entry.isSymbolicLink()) return path.relative(root, candidate).replaceAll(path.sep, "/");
    if (entry.isDirectory()) {
      const nested = await firstSourceSymlink(root, candidate);
      if (nested) return nested;
    }
  }
  return null;
}

function runComposer(root) {
  return spawnSync(
    "composer",
    [
      "install",
      "--no-dev",
      "--no-scripts",
      "--no-plugins",
      "--no-interaction",
      "--no-progress",
      "--prefer-dist",
    ],
    { cwd: root, encoding: "utf8", timeout: 180_000 },
  );
}

function runStrauss(root) {
  return spawnSync("php", [straussBin, "--no-interaction"], {
    cwd: root,
    encoding: "utf8",
    timeout: 180_000,
  });
}

function extractAutoloadFiles(source) {
  return [...source.matchAll(/\$vendorDir\s*\.\s*['"]([^'"]+)['"]/g)]
    .map((match) => match[1].replace(/^\/+/, ""))
    .sort();
}

async function verifyConsumer(consumer) {
  const source = path.join(contentRoot, "plugins", consumer);
  const composerLockSha256 = createHash("sha256")
    .update(await fs.readFile(path.join(source, "composer.lock")))
    .digest("hex");
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), `wpdev-composer-${consumer}-`));
  const result = {
    consumer,
    composerLockSha256,
    command: "composer install --no-dev --no-scripts --no-plugins",
    status: "failed",
    autoloadFiles: [],
    devAutoloadFiles: [],
    strauss: straussBin ? { binary: straussBin, targetDirectory: null, namespacePrefix: null, files: [], devFiles: [], error: null } : null,
    error: null,
  };
  try {
    const sourceSymlink = await firstSourceSymlink(source);
    if (sourceSymlink) {
      result.error = `staging source contains symbolic link: ${sourceSymlink}`;
      return result;
    }
    await copySource(source, temp);
    const composer = runComposer(temp);
    if (composer.error || composer.status !== 0) {
      result.error = `${composer.error?.message || "composer exited " + composer.status}\n${(composer.stderr || composer.stdout || "").trim()}`.trim();
      return result;
    }
    const mapPath = path.join(temp, "vendor/composer/autoload_files.php");
    let map;
    try {
      map = await fs.readFile(mapPath, "utf8");
    } catch (error) {
      result.error = `Composer did not create autoload_files.php: ${error.message}`;
      return result;
    }
    result.autoloadFiles = extractAutoloadFiles(map);
    result.devAutoloadFiles = result.autoloadFiles.filter((file) => devMarkers.some((marker) => file.toLowerCase().includes(marker)));
    if (result.devAutoloadFiles.length > 0) {
      result.error = `development files present in --no-dev autoload map: ${result.devAutoloadFiles.join(", ")}`;
      return result;
    }
    if (straussBin) {
      const composerJson = JSON.parse(await fs.readFile(path.join(temp, "composer.json"), "utf8"));
      const config = composerJson.extra?.strauss || {};
      result.strauss.targetDirectory = config.target_directory || null;
      result.strauss.namespacePrefix = config.namespace_prefix || null;
      if (!result.strauss.targetDirectory || !result.strauss.namespacePrefix) {
        result.error = "Strauss configuration has no target directory or namespace prefix";
        return result;
      }
      const strauss = runStrauss(temp);
      if (strauss.error || strauss.status !== 0) {
        result.strauss.error = `${strauss.error?.message || "Strauss exited " + strauss.status}\n${(strauss.stderr || strauss.stdout || "").trim()}`.trim();
        result.error = "Strauss staging failed";
        return result;
      }
      const prefixRoot = path.join(temp, result.strauss.targetDirectory);
      const autoload = path.join(prefixRoot, "autoload.php");
      try {
        const stat = await fs.lstat(autoload);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular file");
      } catch (error) {
        result.error = `Strauss did not create a safe autoload entry: ${error.message}`;
        return result;
      }
      const entries = await fs.readdir(prefixRoot, { recursive: true });
      result.strauss.files = entries.filter((entry) => typeof entry === "string").sort();
      result.strauss.devFiles = result.strauss.files.filter((file) => devMarkers.some((marker) => file.toLowerCase().includes(marker)));
      if (result.strauss.devFiles.length > 0) {
        result.error = `development files present in Strauss output: ${result.strauss.devFiles.join(", ")}`;
        return result;
      }
    }
    result.status = "passed";
    return result;
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

const reports = [];
let straussBinSha256 = null;
if (straussBin) {
  try {
    const stat = await fs.lstat(straussBin);
    if (stat.isSymbolicLink()) throw new Error("symbolic links are not accepted");
    if (!stat.isFile()) throw new Error("not a file");
    straussBinSha256 = createHash("sha256").update(await fs.readFile(straussBin)).digest("hex");
  } catch (error) {
    process.stderr.write(`Invalid Strauss binary: ${error.message}\n`);
    process.exit(2);
  }
}
for (const consumer of consumers) reports.push(await verifyConsumer(consumer));
const scopeComplete = positional.length === 0 &&
  reports.map((report) => report.consumer).sort().join("\0") === discoveredConsumers.join("\0");
process.stdout.write(`${JSON.stringify({
  schema: 1,
  generatedBy: "tools/verify-composer-staging.mjs",
  straussBin,
  straussBinSha256,
  discoveredConsumers,
  requestedConsumers: positional,
  scopeComplete,
  reports,
}, null, 2)}\n`);
if (reports.some((report) => report.status !== "passed")) process.exitCode = 1;
