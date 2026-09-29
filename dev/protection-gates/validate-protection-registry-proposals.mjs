#!/usr/bin/env node

import { lstat, readFile } from "node:fs/promises";
import path from "node:path";

const input = process.argv[2];
const failures = [];
const isPrefix = (value) => typeof value === "string" && /^[A-Za-z][A-Za-z0-9]*$/.test(value);

let document;
if (!input || !path.isAbsolute(input)) {
  failures.push("proposal manifest path must be absolute");
} else {
  try {
    const stat = await lstat(input);
    if (stat.isSymbolicLink()) throw new Error("symlink evidence path is not allowed");
    if (!stat.isFile()) throw new Error("evidence path must be a regular file");
    document = JSON.parse(await readFile(input, "utf8"));
  } catch (error) {
    failures.push(`proposal manifest: cannot read valid JSON (${error.message})`);
  }
}

if (!document || typeof document !== "object" || Array.isArray(document)) {
  failures.push("proposal manifest must be an object");
}
if (document?.schema !== 1) failures.push("proposal manifest: schema must be 1");
if (document?.purpose !== "private-runtime-artifact-proposals") {
  failures.push("proposal manifest: purpose must be private-runtime-artifact-proposals");
}
if (!Array.isArray(document?.artifacts) || document.artifacts.length === 0) {
  failures.push("proposal manifest: artifacts must be a non-empty array");
}

const slugs = new Set();
const artifactIds = new Set();
const runtimePrefixes = new Set();
const vendorPrefixes = new Set();
for (const [index, artifact] of (Array.isArray(document?.artifacts) ? document.artifacts : []).entries()) {
  const label = `artifacts[${index}]`;
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    failures.push(`${label} must be an object`);
    continue;
  }
  for (const [field, value] of Object.entries({
    proposedArtifactId: artifact.proposedArtifactId,
    slug: artifact.slug,
  })) {
    if (typeof value !== "string" || value === "") failures.push(`${label}.${field} is required`);
  }
  if (artifactIds.has(artifact.proposedArtifactId)) failures.push(`${label}.proposedArtifactId is duplicated`);
  if (slugs.has(artifact.slug)) failures.push(`${label}.slug is duplicated`);
  artifactIds.add(artifact.proposedArtifactId);
  slugs.add(artifact.slug);
  if (artifact.recordStatus !== "review-only") failures.push(`${label}.recordStatus must be review-only`);
  if (artifact.buildInput !== false) failures.push(`${label}.buildInput must be false`);
  for (const field of ["sourceDigest", "toolDigest", "migrationContractDigest"]) {
    if (artifact[field] !== null) failures.push(`${label}.${field} must be null`);
  }
  for (const [field, value] of Object.entries({
    currentVendorPrefix: artifact.current?.vendorPrefix,
    targetVendorPrefix: artifact.target?.vendorPrefix,
    targetRuntimePrefix: artifact.target?.runtimePrefix,
  })) {
    if (!isPrefix(value)) failures.push(`${label}.${field} must be a valid prefix`);
  }
  if (runtimePrefixes.has(artifact.target?.runtimePrefix)) failures.push(`${label}.target.runtimePrefix is duplicated`);
  if (vendorPrefixes.has(artifact.target?.vendorPrefix)) failures.push(`${label}.target.vendorPrefix is duplicated`);
  runtimePrefixes.add(artifact.target?.runtimePrefix);
  vendorPrefixes.add(artifact.target?.vendorPrefix);
  const migration = artifact.migration;
  if (!migration || typeof migration !== "object" || Array.isArray(migration)) {
    failures.push(`${label}.migration must be an object`);
  } else {
    for (const field of ["legacyLoadability", "coexistence", "serialization", "publicHooks", "activationOrdering", "rollback"]) {
      if (typeof migration[field] !== "string" && migration[field] !== true) {
        failures.push(`${label}.migration.${field} is required`);
      }
    }
  }
  if (!Array.isArray(artifact.blockers) || artifact.blockers.length === 0) {
    failures.push(`${label}.blockers must be a non-empty array`);
  }
}

const report = {
  schema: 1,
  generatedBy: "tools/validate-protection-registry-proposals.mjs",
  status: failures.length === 0 ? "valid-review-evidence" : "blocked",
  promotionReady: false,
  failures,
  promotionRule: "Proposals are review evidence only; null digests and buildInput:false are mandatory until immutable source/artifact/tool bytes and a migration contract are accepted.",
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
