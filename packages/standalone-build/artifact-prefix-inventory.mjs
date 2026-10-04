#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

import { loadTargetRegistry } from "./target-registry.mjs";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const requestedConsumers = process.argv.slice(3).filter((a) => !a.startsWith("--config"));

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

function lookupRegistryEntry(name) {
  if (!scopeRegistry) return null;
  if (Object.prototype.hasOwnProperty.call(scopeRegistry, name)) return scopeRegistry[name];
  if (name.endsWith("-dev")) {
    const slug = name.slice(0, -"-dev".length);
    if (slug && Object.prototype.hasOwnProperty.call(scopeRegistry, slug)) return scopeRegistry[slug];
  }
  return null;
}

function isInScopeConsumer(name) {
  if (name === "wpdev") return false;
  if (scopeRegistry) return isKnownConsumer(name, scopeRegistry);
  // Convention fallback (no static allowlist): any plugin directory is in
  // scope; wpdev.json/composer.json presence is still gated in discoverConsumers().
  return true;
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
    if (!entry.name.endsWith("-dev")) {
      const devCompanion = path.join(contentRoot, "plugins", `${entry.name}-dev`);
      try {
        const devStat = await fs.stat(devCompanion);
        if (devStat.isDirectory()) continue;
      } catch {}
    }
    const pluginRoot = path.join(contentRoot, "plugins", entry.name);
    const [hasWpdev, hasComposer] = await Promise.all([
      regularMetadataFile(pluginRoot, "wpdev.json"),
      regularMetadataFile(pluginRoot, "composer.json"),
    ]);
    if (!hasWpdev && !hasComposer) continue;
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

/**
 * Composer metadata is optional: a consumer may ship only wpdev.json when it
 * has no Composer dependencies. A symlinked metadata file is still rejected by
 * regularMetadataFile(), so the fail-closed guarantee is unchanged.
 */
async function readOptionalJson(file) {
  try {
    await fs.lstat(file);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  return readJson(file);
}

const artifacts = [];
for (const consumer of consumers) {
  const sourceName = lookupRegistryEntry(consumer)?.sourceDirectoryName || consumer;
  const root = path.join(contentRoot, "plugins", sourceName);
  const [wpdev, composer] = await Promise.all([
    readJson(path.join(root, "wpdev.json")),
    readOptionalJson(path.join(root, "composer.json")),
  ]);
  const strauss = composer?.extra?.strauss || {};
  const current = wpdev.vendorPrefix || strauss.namespace_prefix || null;
  const proposed = `${studly(wpdev.slug || consumer)}Vendor`;
  artifacts.push({
    consumer,
    slug: wpdev.slug || consumer,
    currentVendorPrefix: current,
    composerVendorPrefix: composer ? strauss.namespace_prefix || null : null,
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
    "The default inventory includes every plugin with an in-scope folder prefix and at least one regular wpdev.json or composer.json; the standalone plugins/wpdev folder is always excluded.",
    "Do not change a shipped vendor prefix without an accepted migration and coexistence contract.",
    "A future registry must assign one immutable artifact id and unique runtime/vendor prefixes before Profile A assembly.",
    "This inventory is review-only and must not be consumed as a release policy.",
  ],
};

const output = path.join(contentRoot, "artifact-prefix-inventory.json");
await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`Artifact prefix inventory written: ${output}\n`);
