#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

import { loadTargetRegistry } from "./target-registry.mjs";

const contentRoot = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const reportInput = process.argv[3] || "staging-report.json";
const failures = [];

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

function inScope(name) {
  if (name === "wpdev") return false;
  if (scopeRegistry) return isKnownConsumer(name, scopeRegistry);
  // Convention fallback (no static allowlist): any plugin directory is in
  // scope; composer.json/lock presence is still gated in discover().
  return true;
}

function resolveReport(value) {
  if (path.isAbsolute(value)) return path.resolve(value);
  if (!value || value.includes("\\") || path.posix.normalize(value) !== value || value.startsWith("../") || value === "..") {
    failures.push("report path is unsafe");
    return null;
  }
  return path.join(contentRoot, value);
}

async function discover() {
  const root = path.join(contentRoot, "plugins");
  const entries = await fs.readdir(root, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !inScope(entry.name)) continue;
    const composerPath = path.join(root, entry.name, "composer.json");
    const lockPath = path.join(root, entry.name, "composer.lock");
    try {
      const composerStat = await fs.lstat(composerPath);
      if (!composerStat.isFile() || composerStat.isSymbolicLink()) {
        failures.push(`${entry.name}: composer.json must be a regular non-symlink file`);
        continue;
      }
    } catch (error) {
      if (error.code !== "ENOENT") failures.push(`${entry.name}: cannot inspect composer.json (${error.message})`);
      continue;
    }
    try {
      const lockStat = await fs.lstat(lockPath);
      if (!lockStat.isFile() || lockStat.isSymbolicLink()) {
        failures.push(`${entry.name}: composer.lock must be a regular non-symlink file`);
        continue;
      }
      result.push(entry.name);
    } catch (error) {
      failures.push(error.code === "ENOENT"
        ? `${entry.name}: composer.lock is required for staging evidence`
        : `${entry.name}: cannot inspect composer.lock (${error.message})`);
    }
  }
  return result.sort();
}

let report = null;
const reportPath = resolveReport(reportInput);
if (reportPath) {
  try {
    const stat = await fs.lstat(reportPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("report must be a regular non-symlink file");
    report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  } catch (error) {
    failures.push(`report: cannot read valid JSON (${error.message})`);
  }
}

const discovered = await discover();
const lockedDigests = new Map(await Promise.all(discovered.map(async (consumer) => [
  consumer,
  createHash("sha256")
    .update(await fs.readFile(path.join(contentRoot, "plugins", consumer, "composer.lock")))
    .digest("hex"),
])));
if (!report || report.schema !== 1) failures.push("report: schema must be 1");
if (report?.generatedBy !== "tools/verify-composer-staging.mjs") failures.push("report: generatedBy must identify the staging verifier");
if (typeof report?.straussBin !== "string" || !path.isAbsolute(report.straussBin)) failures.push("report: absolute Strauss binary evidence is required");
if (typeof report?.straussBin === "string" && path.isAbsolute(report.straussBin)) {
  try {
    const stat = await fs.lstat(report.straussBin);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("not a regular non-symlink file");
    const currentDigest = createHash("sha256").update(await fs.readFile(report.straussBin)).digest("hex");
    if (report.straussBinSha256 !== currentDigest) failures.push("report: Strauss binary SHA-256 does not match current bytes");
  } catch (error) {
    failures.push(`report: cannot verify Strauss binary (${error.message})`);
  }
}
if (!Array.isArray(report?.requestedConsumers) || report.requestedConsumers.length !== 0) failures.push("report: requestedConsumers must be empty for full-scope evidence");
if (report?.scopeComplete !== true) failures.push("report: scopeComplete must be true");
if (JSON.stringify(report?.discoveredConsumers || []) !== JSON.stringify(discovered)) failures.push("report: discoveredConsumers does not match the current locked scope");

const reports = report?.reports;
if (!Array.isArray(reports) || reports.length !== discovered.length) {
  failures.push("report: reports must contain exactly one entry per discovered consumer");
} else {
  const seen = new Set();
  for (const item of reports) {
    if (!item || typeof item.consumer !== "string" || seen.has(item.consumer)) {
      failures.push("report: duplicate or invalid consumer entry");
      continue;
    }
    seen.add(item.consumer);
    if (!discovered.includes(item.consumer)) failures.push(`report: unknown consumer ${item.consumer}`);
    if (item.composerLockSha256 !== lockedDigests.get(item.consumer)) {
      failures.push(`${item.consumer}: composer.lock SHA-256 does not match current bytes`);
    }
    if (item.status !== "passed") failures.push(`${item.consumer}: staging status is not passed`);
    if (item.command !== "composer install --no-dev --no-scripts --no-plugins" || item.error !== null) {
      failures.push(`${item.consumer}: locked Composer command evidence is incomplete`);
    }
    if (!Array.isArray(item.autoloadFiles) || !Array.isArray(item.devAutoloadFiles)) {
      failures.push(`${item.consumer}: Composer autoload evidence is incomplete`);
    } else if (item.devAutoloadFiles.length > 0) {
      failures.push(`${item.consumer}: development autoload files present`);
    }
    const strauss = item.strauss;
    if (
      !strauss ||
      strauss.binary !== report?.straussBin ||
      typeof strauss.targetDirectory !== "string" || !strauss.targetDirectory ||
      typeof strauss.namespacePrefix !== "string" || !strauss.namespacePrefix ||
      !Array.isArray(strauss.files) ||
      !strauss.files.includes("autoload.php") ||
      !Array.isArray(strauss.devFiles) ||
      strauss.error !== null
    ) {
      failures.push(`${item.consumer}: Strauss execution evidence is incomplete`);
    } else if (strauss.devFiles.length > 0) {
      failures.push(`${item.consumer}: Strauss development files present`);
    }
  }
  for (const consumer of discovered) if (!seen.has(consumer)) failures.push(`report: missing consumer ${consumer}`);
}

const output = {
  schema: 1,
  generatedBy: "tools/validate-composer-staging-report.mjs",
  contentRoot,
  report: reportInput,
  discoveredConsumers: discovered,
  status: failures.length === 0 ? "ready" : "blocked",
  failures,
  promotionRule: "Only a full-scope report with clean Composer and Strauss output is valid staging evidence.",
};
process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
