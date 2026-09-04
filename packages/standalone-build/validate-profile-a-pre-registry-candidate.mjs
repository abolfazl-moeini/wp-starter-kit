#!/usr/bin/env node

import crypto from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const manifestPath = process.argv[2];
const contentRoot = process.argv[3];
const failures = [];
const object = (v) => v && typeof v === "object" && !Array.isArray(v);
const hex = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const tree = (v) => typeof v === "string" && (/^[a-f0-9]{40}$/.test(v) || /^[a-f0-9]{64}$/.test(v));
const commit = (v) => typeof v === "string" && /^[a-f0-9]{40}$/.test(v);
const prefix = (v) => typeof v === "string" && /^[A-Za-z][A-Za-z0-9_]*$/.test(v);
const safe = (v) => typeof v === "string" && v !== "" && !v.includes("\\") && !v.includes("\0") && !path.posix.isAbsolute(v) && path.posix.normalize(v) === v && v !== "." && v !== ".." && !v.startsWith("../");

if (!contentRoot || !path.isAbsolute(contentRoot)) {
  failures.push("contentRoot path must be absolute");
}

async function evidence(file, label) {
  if (!file || !path.isAbsolute(file)) { failures.push(`${label} path must be absolute`); return null; }
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("regular non-symlink file required");
    const bytes = await readFile(file);
    return { value: JSON.parse(bytes), digest: crypto.createHash("sha256").update(bytes).digest("hex") };
  } catch (error) { failures.push(`${label}: ${error.message}`); return null; }
}

const manifestEvidence = await evidence(manifestPath, "manifest");
const m = manifestEvidence?.value;

if (!object(m)) failures.push("manifest must be an object");
if (m?.schema !== 1) failures.push("schema must be 1");
if (m?.purpose !== "profile-a-pre-registry-candidate") failures.push("purpose must be profile-a-pre-registry-candidate");
if (m?.consumer !== "tavangary-theme-panel") failures.push("consumer must be tavangary-theme-panel");
if (m?.recordStatus !== "review-only") failures.push("recordStatus must be review-only");
if (m?.buildInput !== false) failures.push("buildInput must be false");
if (m?.source?.repositoryRoot !== "plugins/tavangary-theme-panel") failures.push("source.repositoryRoot must use canonical path");
if (!commit(m?.source?.commit)) failures.push("source.commit must be a 40-character SHA-1");
if (!tree(m?.source?.tree)) failures.push("source.tree must be a 40-character SHA-1 or 64-character SHA-256 tree digest");
if (m?.source?.worktree !== "clean") failures.push("source.worktree must be clean");

if (!object(m?.migrationContract) || !safe(m.migrationContract.path) || m.migrationContract.path !== "plugins/tavangary-theme-panel/dev/prefix-migration-coexistence-contract.json" || !hex(m.migrationContract.sha256)) {
  failures.push("migrationContract path and sha256 are required");
} else if (contentRoot && path.isAbsolute(contentRoot)) {
  try {
    let contractPath = path.join(contentRoot, m.migrationContract.path);
    try {
      await lstat(contractPath);
    } catch {
      const devPath = path.join(contentRoot, "plugins/tavangary-theme-panel-dev/dev/prefix-migration-coexistence-contract.json");
      const statDev = await lstat(devPath);
      if (statDev.isFile() && !statDev.isSymbolicLink()) {
        contractPath = devPath;
      }
    }
    const stat = await lstat(contractPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("regular non-symlink file required");
    const digest = crypto.createHash("sha256").update(await readFile(contractPath)).digest("hex");
    if (digest !== m.migrationContract.sha256) failures.push("migrationContract sha256 mismatch");
  } catch (error) { failures.push(`migrationContract: ${error.message}`); }
}

for (const field of ["vendorPrefix", "runtimePrefix", "classmapPrefix", "constantPrefix"]) {
  if (!prefix(m?.target?.[field])) failures.push(`target.${field} must be a safe non-empty prefix`);
}

if (!object(m?.digests) || m.digests.artifact !== null || m.digests.source !== null || m.digests.toolBundle !== null) {
  failures.push("digests must remain null until acceptance");
}

if (!Array.isArray(m?.toolInputs) || m.toolInputs.length === 0) {
  failures.push("toolInputs must be non-empty");
} else {
  const seenTools = new Set();
  for (const [i, tool] of m.toolInputs.entries()) {
    if (!object(tool) || !safe(tool?.path) || !hex(tool?.sha256)) {
      failures.push(`invalid tool input ${tool?.path || `at index ${i}`}`);
      continue;
    }
    if (seenTools.has(tool.path)) {
      failures.push(`duplicate tool input ${tool.path}`);
      continue;
    }
    seenTools.add(tool.path);
    if (contentRoot && path.isAbsolute(contentRoot)) {
      try {
        let toolPath = path.join(contentRoot, tool.path);
        try {
          const s = await lstat(toolPath);
          if (!s.isFile() || s.isSymbolicLink()) throw new Error("regular non-symlink file required");
        } catch {
          const packageDir = path.dirname(fileURLToPath(import.meta.url));
          const altPath = path.join(packageDir, tool.path.replace(/^tools\//, ""));
          toolPath = altPath;
        }
        const stat = await lstat(toolPath);
        if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("regular non-symlink file required");
        const digest = crypto.createHash("sha256").update(await readFile(toolPath)).digest("hex");
        if (digest !== tool.sha256) failures.push(`tool input digest mismatch: ${tool.path}`);
      } catch (error) { failures.push(`tool input ${tool.path}: ${error.message}`); }
    }
  }
}

if (!Array.isArray(m?.blockers) || m.blockers.length === 0 || m.blockers.some((b) => typeof b !== "string" || b.trim() === "")) {
  failures.push("blockers must be non-empty while review-only");
}

if (m?.promotionReady === true || m?.approved === true || m?.buildInput === true || m?.status === "ready") {
  failures.push("promotion/approval fields cannot be enabled");
}

const report = {
  schema: 1,
  generatedBy: "tools/validate-profile-a-pre-registry-candidate.mjs",
  candidate: manifestPath || null,
  candidateDigest: manifestEvidence?.digest || null,
  status: failures.length ? "blocked" : "valid-review-evidence",
  promotionReady: false,
  failures,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
