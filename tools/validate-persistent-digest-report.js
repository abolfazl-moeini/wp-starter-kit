#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const HEX64 = /^[0-9a-f]{64}$/i;
const HEX40 = /^[0-9a-f]{40}$/i;

const forbidden = new Set([
  "approved",
  "approval",
  "artifact",
  "artifactDigest",
  "registryEntry",
  "buildInputOverride",
  "production",
  "promotionReady",
  "promote",
  "promoted",
  "releaseReady",
]);

function walk(value, key = "") {
  if (key && forbidden.has(key))
    throw new Error(`forbidden mutation field: ${key}`);
  if (!value || typeof value !== "object") return;
  for (const [childKey, childValue] of Object.entries(value))
    walk(childValue, childKey);
}

export function validatePersistentDigestReport(report, options = {}) {
  if (!report || typeof report !== "object" || Array.isArray(report))
    throw new Error("report must be an object");
  walk(report);
  if (report.schema !== 1 || report.purpose !== "pre-registry-digest-report")
    throw new Error("invalid persistent digest report identity");
  if (
    report.authority !== "non-authoritative-review-evidence" ||
    report.recordStatus !== "review-only"
  )
    throw new Error("persistent digest report must remain review-only");
  if (report.buildInput !== false)
    throw new Error("persistent digest report cannot be a build input");
  if (!HEX40.test(report.pinnedCommit))
    throw new Error("pinnedCommit must be a full commit hash");
  for (const field of ["sourceDigest", "toolDigest"]) {
    if (!HEX64.test(report[field]))
      throw new Error(`${field} must be a SHA-256 digest`);
  }
  const input = report.toolInput;
  if (
    !input ||
    typeof input.manifestPath !== "string" ||
    !path.isAbsolute(input.manifestPath) ||
    input.manifestPath.includes("\0") ||
    input.manifestPath.includes("..") ||
    !Number.isInteger(input.byteLength) ||
    input.byteLength < 0 ||
    !HEX64.test(input.rawSha256)
  )
    throw new Error("toolInput metadata is incomplete");
  if (
    options.candidateManifestPath &&
    input.manifestPath !== options.candidateManifestPath
  )
    throw new Error("toolInput is not linked to the candidate manifest");
  if (options.pinnedCommit && report.pinnedCommit !== options.pinnedCommit)
    throw new Error("report is linked to a different pinned commit");
  if (options.sourceDigest && report.sourceDigest !== options.sourceDigest)
    throw new Error("report is linked to a different source digest");
  if (options.toolDigest && report.toolDigest !== options.toolDigest)
    throw new Error("report is linked to a different tool digest");
  if (options.rawSha256 && input.rawSha256 !== options.rawSha256)
    throw new Error("toolInput rawSha256 mismatch");
  if (
    !Array.isArray(report.blockers) ||
    report.blockers.length === 0 ||
    report.blockers.some(
      (blocker) => typeof blocker !== "string" || blocker.trim() === "",
    )
  )
    throw new Error("persistent review report must retain blockers");
  return true;
}

if (
  process.argv[1] &&
  process.argv[1].endsWith("validate-persistent-digest-report.js")
) {
  try {
    const reportPath = process.argv[2];
    if (!reportPath) throw new Error("report path is required");
    const stat = fs.lstatSync(reportPath);
    if (!stat.isFile() || stat.isSymbolicLink())
      throw new Error("report must be a non-symlink regular file");
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    validatePersistentDigestReport(report);
    process.stdout.write("valid-persistent-digest-report\n");
  } catch (error) {
    process.stderr.write(
      `validate-persistent-digest-report: ${error.message}\n`,
    );
    process.exitCode = 1;
  }
}
