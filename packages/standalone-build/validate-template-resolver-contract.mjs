#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const contractPath = path.resolve(process.argv[2] || "");
const contentRoot = path.resolve(process.argv[3] || path.join(path.dirname(contractPath), "..", ".."));
const closureManifestPath = process.argv[4] ? path.resolve(process.argv[4]) : null;
const failures = [];

function safeRelative(value, label) {
  if (typeof value !== "string" || value === "" || path.posix.isAbsolute(value) || value.includes("\\") || value.includes("\0") || path.posix.normalize(value) !== value || value === ".") {
    failures.push(`${label} must be a safe relative path`);
    return;
  }
  const resolved = path.resolve(contentRoot, value);
  if (resolved !== contentRoot && !resolved.startsWith(`${contentRoot}${path.sep}`)) failures.push(`${label} escapes content root`);
}

let contract;
try { contract = JSON.parse(await fs.readFile(contractPath, "utf8")); } catch (error) { failures.push(`contract is unreadable: ${error.message}`); }
if (contract) {
  if (contract.schema !== 1) failures.push("schema must be 1");
  const approved = contract.status === "approved";
  if (contract.status !== "review-required" && !approved) failures.push("status must be review-required or approved");
  if (approved) {
    // An approved resolver contract is a controlled build input: the dynamic
    // edge must carry explicit bounded-resolution evidence and no blocker may
    // remain open.
    if (contract.buildInput !== true) failures.push("buildInput must be true");
    if (!contract.resolution || typeof contract.resolution !== "object" || Array.isArray(contract.resolution)) {
      failures.push("resolution evidence is required for an approved resolver contract");
    } else {
      if (typeof contract.resolution.policy !== "string" || contract.resolution.policy === "") failures.push("resolution.policy must be a non-empty string");
      if (!Array.isArray(contract.resolution.evidence) || contract.resolution.evidence.length === 0) failures.push("resolution.evidence must be a non-empty array");
      else contract.resolution.evidence.forEach((v, i) => safeRelative(v, `resolution.evidence[${i}]`));
    }
    if (Array.isArray(contract.blockers) && contract.blockers.some((b) => typeof b === "string" && b.trim() !== "")) failures.push("blockers must be empty once the resolver contract is approved");
  } else {
    if (contract.buildInput !== false) failures.push("buildInput must be false");
  }
  if (!Array.isArray(contract.failClosed) || contract.failClosed.length === 0) failures.push("failClosed must be non-empty");
  for (const [label, value] of [["source.path", contract.source?.path], ["evidence.implementation", contract.evidence?.implementation], ...((contract.evidence?.tests || []).map((v, i) => [`evidence.tests[${i}]`, v]))]) safeRelative(value, label);
  if (typeof contract.source?.expression !== "string" || contract.source.expression === "") failures.push("source.expression must be a non-empty string");
  if (typeof contract.source?.call !== "string" || contract.source.call === "") failures.push("source.call must be a non-empty string");
  if (typeof contract.resolver?.rootPolicy !== "string" || typeof contract.resolver?.viewPolicy !== "string") failures.push("resolver root/view policy is required");
  if (!approved && contract.blockers?.length === 0) failures.push("blockers must remain explicit");
  if (closureManifestPath) {
    let closure;
    try { closure = JSON.parse(await fs.readFile(closureManifestPath, "utf8")); }
    catch (error) { failures.push(`closure manifest is unreadable: ${error.message}`); }
    if (closure) {
      const unresolved = closure?.blockers?.unresolvedIncludes;
      const covered = Array.isArray(unresolved) && unresolved.some((entry) => entry && typeof entry.path === "string" && typeof entry.expression === "string" && entry.path === contract.source?.path && entry.expression === contract.source?.expression);
      if (approved) {
        if (covered) failures.push("resolver edge is still unresolved in the closure manifest");
        else {
          const resolved = Array.isArray(closure?.resolvedDynamicIncludes) && closure.resolvedDynamicIncludes.some((entry) => entry && typeof entry.path === "string" && typeof entry.expression === "string" && entry.path === contract.source?.path && entry.expression === contract.source?.expression);
          if (!resolved) failures.push("closure manifest has no resolution record for the resolver edge");
        }
      } else if (!Array.isArray(unresolved)) failures.push("closure manifest blockers.unresolvedIncludes must be an array");
      else if (!covered) failures.push("resolver source is not covered by closure manifest unresolvedIncludes");
    }
  }
}
const report = { schema: 1, status: failures.length ? "blocked" : "valid-review-evidence", promotionReady: false, contractPath, failures };
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
