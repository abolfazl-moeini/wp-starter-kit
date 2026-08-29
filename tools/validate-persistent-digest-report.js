#!/usr/bin/env node

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
  if (!Array.isArray(report.blockers) || report.blockers.length === 0)
    throw new Error("persistent review report must retain blockers");
  return true;
}
