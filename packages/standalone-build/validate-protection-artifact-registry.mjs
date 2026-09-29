#!/usr/bin/env node

import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const contentRoot = path.resolve(process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), ".."));
const registryRelative = process.argv[3] || "config/protection-artifact-registry.json";
const inventoryRelative = process.argv[4] || "artifact-prefix-inventory.json";
const failures = [];
const fileDigests = {};

function safeRelative(value) {
  if (typeof value === "string" && path.isAbsolute(value)) {
    return path.resolve(value);
  }
  if (
    typeof value !== "string" ||
    value === "" ||
    value.includes("\\") ||
    path.posix.normalize(value) !== value ||
    value.startsWith("../") ||
    value === ".."
  ) {
    failures.push(`${String(value)}: unsafe registry evidence path`);
    return null;
  }
  return path.join(contentRoot, value);
}

async function readJson(relative, label) {
  const safePath = safeRelative(relative);
  if (!safePath) return null;
  try {
    const stat = await fs.lstat(safePath);
    if (stat.isSymbolicLink()) {
      throw new Error("symlink evidence path is not allowed");
    }
    if (!stat.isFile()) {
      throw new Error("evidence path must be a regular file");
    }
    const bytes = await fs.readFile(safePath);
    fileDigests[label] = crypto.createHash("sha256").update(bytes).digest("hex");
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    failures.push(`${label}: cannot read valid JSON (${error.message})`);
    return null;
  }
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function isPrefix(value) {
  return typeof value === "string" && /^[A-Za-z][A-Za-z0-9]*$/.test(value);
}

const [registry, inventory] = await Promise.all([
  readJson(registryRelative, "registry"),
  readJson(inventoryRelative, "inventory"),
]);

if (registry) {
  if (registry.version !== 1) failures.push(`registry: version must be 1, found ${String(registry.version)}`);
  if (registry.registryPurpose !== "private-runtime-artifacts") {
    failures.push("registry: registryPurpose must be private-runtime-artifacts");
  }
  if (registry.digestScheme !== "sha256(sorted-posix-path\\0file-bytes\\0)") {
    failures.push("registry: unsupported digestScheme");
  }
  if (!Array.isArray(registry.artifacts) || registry.artifacts.length === 0) {
    failures.push("registry: artifacts must be a non-empty array");
  }
}

const registryBySlug = new Map();
const seenIds = new Set();
const seenRuntimePrefixes = new Set();
const seenVendorPrefixes = new Set();
const registryArtifacts = Array.isArray(registry?.artifacts) ? registry.artifacts : [];
for (const [index, artifact] of registryArtifacts.entries()) {
  const label = `registry.artifacts[${index}]`;
  if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
    failures.push(`${label}: must be an object`);
    continue;
  }
  for (const [field, value] of Object.entries({
    artifactId: artifact.artifactId,
    slug: artifact.slug,
    runtimePrefix: artifact.runtimePrefix,
    vendorPrefix: artifact.vendorPrefix,
  })) {
    if (typeof value !== "string" || value === "") failures.push(`${label}: ${field} is required`);
  }
  if (seenIds.has(artifact.artifactId)) failures.push(`${label}: duplicate artifactId ${artifact.artifactId}`);
  if (registryBySlug.has(artifact.slug)) failures.push(`${label}: duplicate slug ${artifact.slug}`);
  if (seenRuntimePrefixes.has(artifact.runtimePrefix)) {
    failures.push(`${label}: duplicate runtimePrefix ${artifact.runtimePrefix}`);
  }
  if (seenVendorPrefixes.has(artifact.vendorPrefix)) {
    failures.push(`${label}: duplicate vendorPrefix ${artifact.vendorPrefix}`);
  }
  seenIds.add(artifact.artifactId);
  registryBySlug.set(artifact.slug, artifact);
  seenRuntimePrefixes.add(artifact.runtimePrefix);
  seenVendorPrefixes.add(artifact.vendorPrefix);
  if (!isPrefix(artifact.runtimePrefix)) failures.push(`${label}: invalid runtimePrefix`);
  if (!isPrefix(artifact.vendorPrefix)) failures.push(`${label}: invalid vendorPrefix`);
  if (!isSha256(artifact.sourceDigest)) failures.push(`${label}: sourceDigest must be a lowercase SHA-256`);
  if (!isSha256(artifact.toolDigest)) failures.push(`${label}: toolDigest must be a lowercase SHA-256`);
}

const inventoryArtifacts = inventory?.artifacts;
if (!Array.isArray(inventoryArtifacts)) {
  failures.push("inventory: artifacts must be an array");
} else {
  const seenConsumers = new Set();
  for (const [index, artifact] of inventoryArtifacts.entries()) {
    const label = `inventory.artifacts[${index}]`;
    if (!artifact || typeof artifact !== "object" || Array.isArray(artifact)) {
      failures.push(`${label}: must be an object`);
      continue;
    }
    if (seenConsumers.has(artifact.consumer)) failures.push(`${label}: duplicate consumer ${artifact.consumer}`);
    seenConsumers.add(artifact.consumer);
    const registered = registryBySlug.get(artifact.slug);
    if (!registered) {
      failures.push(`${artifact.consumer}: no immutable registry entry for slug ${artifact.slug}`);
      continue;
    }
    if (registered.vendorPrefix !== artifact.proposedVendorPrefix) {
      failures.push(`${artifact.consumer}: proposedVendorPrefix mismatch (inventory ${artifact.proposedVendorPrefix}, registry ${registered.vendorPrefix})`);
    }
  }
  for (const artifact of registryArtifacts) {
    if (!inventoryArtifacts.some((candidate) => candidate.slug === artifact.slug)) {
      failures.push(`registry: entry ${artifact.slug} has no matching inventory artifact`);
    }
  }
}

const report = {
  schema: 1,
  generatedBy: "tools/validate-protection-artifact-registry.mjs",
  registry: registryRelative,
  inventory: inventoryRelative,
  registryDigest: fileDigests.registry || null,
  inventoryDigest: fileDigests.inventory || null,
  status: failures.length === 0 ? "ready" : "blocked",
  failures,
  promotionRule: "Registry evidence is authoritative only when its immutable entries exactly match the inventory; this validator never mutates shipped prefixes.",
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) {
  process.exitCode = 1;
}
