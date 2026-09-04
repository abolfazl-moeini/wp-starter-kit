#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(process.argv[2] || path.join(here, ".."));
const consumer = process.argv[3] || "tavangary-theme-panel";
const failures = [];
const blockers = [];
const safe = (v) => typeof v === "string" && v !== "" && !v.includes("\\") && !v.includes("\0") && !path.posix.isAbsolute(v) && path.posix.normalize(v) === v && v !== "." && v !== ".." && !v.startsWith("../");
const plain = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const canon = (v) => Array.isArray(v) ? v.map(canon) : plain(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const equal = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
async function readJson(file, label) {
  try { const s = await fs.lstat(file); if (s.isSymbolicLink() || !s.isFile()) throw new Error("evidence path must be a regular file"); return JSON.parse(await fs.readFile(file, "utf8")); }
  catch (e) { failures.push(`${label}: cannot read valid JSON (${e.message})`); return null; }
}
if (!/^[a-z0-9][a-z0-9-]*$/.test(consumer)) { process.stderr.write("Invalid consumer slug.\n"); process.exit(2); }

async function resolveConsumerSource() {
  const canonicalRelative = `plugins/${consumer}`;
  const legacyRelative = `plugins/${consumer}-dev`;
  const mapPath = path.join(contentRoot, "protection-consumer-source-map.json");
  let relative = canonicalRelative;
  try {
    const stat = await fs.lstat(mapPath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error("source map must be a regular non-symlink file");
    }
    const map = JSON.parse(await fs.readFile(mapPath, "utf8"));
    if (map.schema !== 1 || !map.consumers || typeof map.consumers !== "object" || Array.isArray(map.consumers)) {
      throw new Error("source map must provide schema 1 and a consumers object");
    }
    if (Object.hasOwn(map.consumers, consumer)) relative = map.consumers[consumer];
  } catch (error) {
    if (error.code !== "ENOENT") failures.push(`consumer source map: ${error.message}`);
    try {
      const canonicalStat = await fs.lstat(path.join(contentRoot, canonicalRelative));
      if (!canonicalStat.isDirectory() || canonicalStat.isSymbolicLink()) {
        relative = legacyRelative;
      }
    } catch {
      relative = legacyRelative;
    }
  }
  if (
    typeof relative !== "string" ||
    !relative.startsWith("plugins/") ||
    !safe(relative)
  ) {
    failures.push(`consumer source map: unsafe source path for ${consumer}`);
    relative = canonicalRelative;
  }
  return path.join(contentRoot, relative);
}

const sourceDir = await resolveConsumerSource();
const inventory = await readJson(path.join(sourceDir, "dev", "serialized-callback-inventory.json"), "inventory");
const manifest = await readJson(path.join(sourceDir, "dev", "serialized-callback-review-manifest.json"), "manifest");
if (inventory) {
  if (inventory.schema !== 1 || inventory.consumer !== consumer || inventory.status !== "review-required" || inventory.buildInput !== false) failures.push("inventory: schema, consumer, review-required status, and buildInput=false are required");
  if (!Array.isArray(inventory.findings)) failures.push("inventory: findings must be an array");
}
let isApproved = false;
if (manifest) {
  if (manifest.schema !== 1) failures.push("manifest: schema must be 1");
  if (manifest.consumer !== consumer) failures.push("manifest: consumer does not match requested consumer");
  isApproved = manifest.status === "approved";
  if (manifest.status !== "review-required" && !isApproved) failures.push("manifest: status must be review-required or approved");
  if (isApproved) {
    if (manifest.buildInput !== true) failures.push("manifest: buildInput must be true");
  } else if (manifest.buildInput !== false) {
    failures.push("manifest: buildInput must be false for review evidence");
  }
  if (manifest.sourceInventory !== "serialized-callback-inventory.json") failures.push("manifest: sourceInventory must reference serialized-callback-inventory.json");
  if (!plain(manifest.reviewApproval) || manifest.reviewApproval.promotionImpact !== "review-only" || !Array.isArray(manifest.reviewApproval.limitations) || manifest.reviewApproval.limitations.length === 0) failures.push("manifest: explicit review-only reviewApproval with non-empty limitations is required");
  const findings = Array.isArray(inventory?.findings) ? inventory.findings : [];
  if (!Array.isArray(manifest.candidateFindings)) failures.push("manifest: candidateFindings must be an array");
  else {
    for (const [i, f] of manifest.candidateFindings.entries()) {
      if (!plain(f) || !safe(f.file) || !Number.isInteger(f.line) || f.line < 1 || typeof f.kind !== "string" || f.kind === "" || typeof f.operation !== "string" || f.operation === "") failures.push(`manifest: candidateFindings[${i}] has invalid finding shape`);
      if (isApproved) {
        if (f.status !== "approved") failures.push(`manifest: candidateFindings[${i}].status must be approved`);
        if (!f.compatibility || f.compatibility === "unclassified" || f.compatibility === "review-required") {
          failures.push(`manifest: candidateFindings[${i}].compatibility must be an approved classification`);
        }
      } else {
        if (f.status !== "unclassified" && f.status !== "review-required") failures.push(`manifest: candidateFindings[${i}].status must remain unclassified or review-required`);
        if (f.compatibility !== "unclassified" && f.compatibility !== "review-required") failures.push(`manifest: candidateFindings[${i}].compatibility must remain unclassified or review-required`);
      }
    }
    if (!equal(manifest.candidateFindings.map(({ file, line, kind, operation }) => ({ file, line, kind, operation })), findings)) failures.push("manifest: candidateFindings must exactly match source inventory findings");
  }
  if (isApproved) {
    if (manifest.blockers && manifest.blockers.persistedCallbackClosure !== null && manifest.blockers.persistedCallbackClosure !== undefined && manifest.blockers.persistedCallbackClosure !== "") {
      failures.push("manifest: persistedCallbackClosure must be null or resolved for approved manifest");
    }
  } else {
    if (!plain(manifest.blockers) || typeof manifest.blockers.persistedCallbackClosure !== "string" || manifest.blockers.persistedCallbackClosure === "") failures.push("manifest: persistedCallbackClosure blocker is required");
    else if (!equal(manifest.blockers.persistedCallbackClosure, inventory?.blockers?.persistedCallbackClosure)) failures.push("manifest: persistedCallbackClosure must match source inventory");
  }
  if (!Array.isArray(manifest.promotionRules) || manifest.promotionRules.length === 0) failures.push("manifest: promotionRules must be non-empty");
}
if (!isApproved && inventory?.findings?.length) blockers.push("serialized callback findings require frozen fixtures and compatibility review");
const report = { status: failures.length ? "blocked" : "valid-review-evidence", promotionReady: false, consumer, findingCount: manifest?.candidateFindings?.length || 0, blockers: [...new Set(blockers)], failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
