#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const contentRoot = path.resolve(process.argv[2] || "");
const consumer = process.argv[3] || "tavangary-theme-panel";
const failures = [];
const safe = (v) => typeof v === "string" && v !== "" && !v.includes("\\") && !v.includes("\0") && !path.posix.isAbsolute(v) && path.posix.normalize(v) === v && v !== "." && v !== ".." && !v.startsWith("../");

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

const mappedSource = await resolveConsumerSource();
const manifestPath = process.argv[4] || path.join(mappedSource, "dev", "closure-review-manifest.json");
const read = async (file, label) => { try { const s = await fs.lstat(file); if (!s.isFile() || s.isSymbolicLink()) throw new Error("must be a regular file"); return JSON.parse(await fs.readFile(file, "utf8")); } catch (e) { failures.push(`${label}: cannot read valid JSON (${e.message})`); return null; } };

if (!/^[a-z0-9][a-z0-9-]*$/.test(consumer)) failures.push("consumer must be a safe slug");
const manifest = await read(manifestPath, "closure manifest");
const allowedRoles = new Set([
  "encode",
  "readable-preflight",
  "readable-migration-recovery",
  "readable-third-party",
  "static-public",
]);
if (manifest) {
  if (manifest.schema !== 1) failures.push("manifest: schema must be 1");
  if (manifest.consumer !== consumer) failures.push("manifest: consumer does not match requested consumer");
  const approved = manifest.status === "approved";
  if (manifest.status !== "review-required" && !approved) failures.push("manifest: status must be review-required or approved");
  if (approved) {
    // An approved closure manifest is a controlled build input: every
    // candidate must carry an allowed role and no blocker may remain open.
    if (manifest.buildInput !== true) failures.push("manifest: buildInput must be true");
  } else if (manifest.buildInput !== false) {
    failures.push("manifest: buildInput must be false");
  }
  if (!Array.isArray(manifest.candidatePaths) || manifest.candidatePaths.length === 0) failures.push("manifest: candidatePaths must be non-empty");
  const seen = new Set();
  for (const [i, entry] of (manifest.candidatePaths || []).entries()) {
    if (!entry || !safe(entry.path)) failures.push(`manifest: candidatePaths[${i}].path is unsafe`);
    else if (seen.has(entry.path)) failures.push(`manifest: duplicate candidate path ${entry.path}`);
    else seen.add(entry.path);
    const validStatus = approved ? entry?.status === "approved" : entry?.status === "unclassified" || entry?.status === "review-required";
    if (!validStatus) failures.push(`manifest: candidatePaths[${i}].status is invalid`);
    if (approved) {
      if (typeof entry?.proposedRole !== "string" || !allowedRoles.has(entry.proposedRole)) {
        failures.push(`manifest: candidatePaths[${i}].proposedRole is not an allowed role`);
      }
    } else if (entry?.proposedRole !== null && entry?.proposedRole !== undefined && typeof entry.proposedRole !== "string") {
      failures.push(`manifest: candidatePaths[${i}].proposedRole is invalid`);
    }
    if (!entry?.evidence || typeof entry.evidence !== "object" || Array.isArray(entry.evidence)) failures.push(`manifest: candidatePaths[${i}].evidence is required`);
  }
  const unresolved = manifest.blockers?.unresolvedIncludes;
  if (!Array.isArray(unresolved)) failures.push("manifest: blockers.unresolvedIncludes must be an array");
  else unresolved.forEach((e, i) => { if (!e || !safe(e.path) || typeof e.expression !== "string" || !e.expression) failures.push(`manifest: unresolvedIncludes[${i}] is invalid`); });
  if (approved && manifest.blockers && typeof manifest.blockers === "object" && !Array.isArray(manifest.blockers)) {
    for (const [name, value] of Object.entries(manifest.blockers)) {
      const open = Array.isArray(value) ? value.length > 0 : !!value;
      if (open) failures.push(`manifest: unresolved blocker ${name}`);
    }
  }
  if (!manifest.sourceInventory || typeof manifest.sourceInventory !== "string" || !safe(manifest.sourceInventory)) failures.push("manifest: sourceInventory must be a safe relative path");
  else {
    // Evidence paths in the Profile A manifests are content-root relative, while
    // older standalone fixtures kept the inventory beside the manifest. Prefer
    // the canonical content-root location and retain the fixture-compatible
    // fallback without permitting paths outside either declared root.
    const rootInventory = path.resolve(contentRoot, manifest.sourceInventory);
    const adjacentInventory = path.resolve(path.dirname(manifestPath), manifest.sourceInventory);
    try {
      const stat = await fs.lstat(rootInventory);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("must be a regular file");
      JSON.parse(await fs.readFile(rootInventory, "utf8"));
    } catch (rootError) {
      await read(adjacentInventory, "source inventory");
    }
  }
  if (!Array.isArray(manifest.promotionRules) || manifest.promotionRules.length === 0) failures.push("manifest: promotionRules must be non-empty");
  if (!manifest.reviewApproval || manifest.reviewApproval.promotionImpact !== "review-only") failures.push("manifest: review-only reviewApproval is required");
}
const report = { schema: 1, status: failures.length ? "blocked" : "valid-review-evidence", promotionReady: false, consumer, manifestPath, failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
