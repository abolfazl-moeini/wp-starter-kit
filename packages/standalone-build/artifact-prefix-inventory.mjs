#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const requestedConsumers = process.argv.slice(3);

function isInScopeConsumer(name) {
  return name !== "wpdev" && (/^(?:tavangary|wpdev|drm)-/.test(name) || /^tavangary/.test(name));
}

async function regularMetadataFile(pluginRoot, name) {
  const file = path.join(pluginRoot, name);
  try {
    const stat = await fs.lstat(file);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error(`${path.basename(pluginRoot)}/${name}: must be a regular non-symlink file`);
    }
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function discoverConsumers() {
  const entries = await fs.readdir(path.join(contentRoot, "plugins"), { withFileTypes: true });
  const discovered = [];
  for (const entry of entries) {
    if (!isInScopeConsumer(entry.name)) continue;
    if (entry.isSymbolicLink()) {
      throw new Error(`${entry.name}: consumer directory symlinks are not allowed`);
    }
    if (!entry.isDirectory()) continue;
    const pluginRoot = path.join(contentRoot, "plugins", entry.name);
    const [hasWpdev, hasComposer] = await Promise.all([
      regularMetadataFile(pluginRoot, "wpdev.json"),
      regularMetadataFile(pluginRoot, "composer.json"),
    ]);
    if (!hasWpdev && !hasComposer) continue;
    if (!hasWpdev || !hasComposer) {
      throw new Error(`${entry.name}: wpdev.json and composer.json must both be regular files for prefix inventory`);
    }
    discovered.push(entry.name);
  }
  return discovered.sort();
}

for (const consumer of requestedConsumers) {
  if (!isInScopeConsumer(consumer)) {
    throw new Error(`Invalid requested consumer: ${consumer}`);
  }
}
const discoveredConsumers = await discoverConsumers();
if (requestedConsumers.length > 0) {
  const requested = [...new Set(requestedConsumers)].sort();
  if (
    requested.length !== requestedConsumers.length ||
    requested.length !== discoveredConsumers.length ||
    requested.some((consumer, index) => consumer !== discoveredConsumers[index])
  ) {
    throw new Error("requested consumers must exactly match the discovered full scope");
  }
}
const consumers = discoveredConsumers;

function studly(value) {
  return String(value)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join("");
}

async function readJson(file) {
  const stat = await fs.lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${path.basename(path.dirname(file))}/${path.basename(file)}: must be a regular non-symlink file`);
  }
  return JSON.parse(await fs.readFile(file, "utf8"));
}

const artifacts = [];
for (const consumer of consumers) {
  const root = path.join(contentRoot, "plugins", consumer);
  const [wpdev, composer] = await Promise.all([
    readJson(path.join(root, "wpdev.json")),
    readJson(path.join(root, "composer.json")),
  ]);
  const strauss = composer.extra?.strauss || {};
  const current = wpdev.vendorPrefix || strauss.namespace_prefix || null;
  const proposed = `${studly(wpdev.slug || consumer)}Vendor`;
  artifacts.push({
    consumer,
    slug: wpdev.slug || consumer,
    currentVendorPrefix: current,
    composerVendorPrefix: strauss.namespace_prefix || null,
    proposedVendorPrefix: proposed,
    proposedClassmapPrefix: `${proposed}_`,
    proposedConstantPrefix: `${proposed.toUpperCase()}_`,
    migrationRequired: current !== proposed,
    status: "review-required",
    buildInput: false,
  });
}

const byCurrentPrefix = {};
for (const artifact of artifacts) {
  if (!artifact.currentVendorPrefix) continue;
  (byCurrentPrefix[artifact.currentVendorPrefix] ||= []).push(artifact.consumer);
}
const collisions = Object.fromEntries(
  Object.entries(byCurrentPrefix).filter(([, owners]) => owners.length > 1),
);
const report = {
  schema: 1,
  generatedBy: "tools/artifact-prefix-inventory.mjs",
  purpose: "Prefix migration review evidence; not a release registry or build input.",
  decisions: {
    uniquePrefixes: {
      status: "approved-proposal",
      approvedBy: "product-owner",
      note: "Proposed per-artifact prefixes are accepted in principle. No shipped prefix changes are authorized until the immutable registry and migration/coexistence contract are encoded and tested.",
    },
  },
  artifacts,
  collisions,
  blockers: {
    sharedCurrentVendorPrefixes: collisions,
    migrationRequired: artifacts.filter((artifact) => artifact.migrationRequired).map((artifact) => artifact.consumer),
  },
  promotionRules: [
    "The default inventory includes every plugin with an in-scope folder prefix and both wpdev.json and composer.json; the standalone plugins/wpdev folder is always excluded.",
    "Do not change a shipped vendor prefix without an accepted migration and coexistence contract.",
    "A future registry must assign one immutable artifact id and unique runtime/vendor prefixes before Profile A assembly.",
    "This inventory is review-only and must not be consumed as a release policy.",
  ],
};

const output = path.join(contentRoot, "artifact-prefix-inventory.json");
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Artifact prefix inventory written: ${output}\n`);
