#!/usr/bin/env node

import fs from "node:fs";
import { lstat } from "node:fs/promises";
import path from "node:path";

export const SHARED_FRAMEWORK_ID = "wpdev";

export const PROFILE_S = "s";
export const STANDALONE_PROFILE = "standalone";

// ---------------------------------------------------------------------------
// Legacy static registry (Gate #2 purge): intentionally EMPTY and frozen.
// All build targets are consumer-provided via loadTargetRegistry(),
// buildRegistryFromConfig(), or autoDiscoverTargets() below — never hardcoded
// here. The export name is kept for backward compatibility with legacy
// callers; resolveConsumerSource() treats an empty registry as "unknown
// consumer" and falls through to convention-based auto-discovery
// (resolveByConvention), still fail-closed when nothing matches.
// ---------------------------------------------------------------------------
export const TARGET_REGISTRY = Object.freeze({});

export const IMPACT_ONLY_TARGETS = Object.freeze({
  wpdev: Object.freeze({
    kind: "shared-framework-source",
    sourceDirectoryName: "wpdev",
    standaloneArtifact: false,
  }),
});

export function listStandaloneConsumers() {
  return Object.keys(TARGET_REGISTRY);
}

function assertSafeSegment(name, label) {
  if (!name || typeof name !== "string") {
    throw new Error(`${label} is required`);
  }
  if (name.includes("..") || name.includes("/") || name.includes("\\") || name.includes("\0")) {
    throw new Error(`${label} contains illegal path characters: ${name}`);
  }
}

export async function resolveConsumerSource({ contentRoot, consumer, pluginsDir = null, registry = null }) {
  if (consumer === SHARED_FRAMEWORK_ID || consumer === "wpdev") {
    throw new Error("plugins/wpdev is a shared framework source and must not be assembled as a standalone artifact");
  }
  // Phase 1 coexistence: caller may inject a registry loaded via loadTargetRegistry().
  // Falls back to the legacy frozen TARGET_REGISTRY when omitted (kept as an
  // empty frozen {} for compat). When the effective registry has no entry for
  // the consumer — including when it is empty — resolution falls through to
  // convention-based auto-discovery below, still fail-closed on no match.
  const effectiveRegistry = registry || TARGET_REGISTRY;
  const rawEntry = effectiveRegistry[consumer];
  if (!rawEntry) {
    // Auto-discovery fallback (convention-over-configuration), still fail-closed.
    const autoEntry = await resolveByConvention(contentRoot, consumer, pluginsDir);
    if (!autoEntry) {
      throw new Error(`Unknown build consumer '${consumer}' (fail-closed)`);
    }
    return autoEntry;
  }

  // Accept both internal names (sourceDirectoryName) and config names (sourceDir).
  const entry = normalizeRegistryEntry(consumer, rawEntry);

  assertSafeSegment(entry.sourceDirectoryName, "sourceDirectoryName");
  assertSafeSegment(entry.deployDirectoryName, "deployDirectoryName");

  if (entry.sourceDirectoryName === entry.deployDirectoryName) {
    throw new Error(`Consumer '${consumer}' source and deploy directories must differ`);
  }

  const effectivePluginsDir = pluginsDir ? path.resolve(pluginsDir) : path.resolve(contentRoot, "plugins");
  const sourceDir = path.resolve(effectivePluginsDir, entry.sourceDirectoryName);
  const deployDir = path.resolve(effectivePluginsDir, entry.deployDirectoryName);
  const pluginsPrefix = effectivePluginsDir.endsWith(path.sep) ? effectivePluginsDir : effectivePluginsDir + path.sep;

  if (!sourceDir.startsWith(pluginsPrefix) || !deployDir.startsWith(pluginsPrefix)) {
    throw new Error(`Consumer '${consumer}' resolved outside plugins directory`);
  }

  let sourceStat;
  try {
    sourceStat = await lstat(sourceDir);
  } catch {
    throw new Error(`Plugin source directory missing: ${sourceDir} (fail-closed, fallback to deploy output forbidden)`);
  }

  if (sourceStat.isSymbolicLink()) {
    throw new Error(`Source directory must not be a symlink: ${sourceDir}`);
  }
  if (!sourceStat.isDirectory()) {
    throw new Error(`Source is not a directory: ${sourceDir}`);
  }
  if (sourceDir === deployDir) {
    throw new Error(`Source and deploy paths must not be the same for '${consumer}'`);
  }

  const bootstrapPath = path.join(sourceDir, entry.bootstrapFile);
  if (!fs.existsSync(bootstrapPath)) {
    throw new Error(`Bootstrap file missing in source: ${entry.bootstrapFile}`);
  }

  return {
    entry,
    sourceDir,
    deployDir,
    bootstrapFile: entry.bootstrapFile,
  };
}

// ---------------------------------------------------------------------------
// Phase 1 foundation (decoupling plan §6 Phase 1): config-driven registry.
// Coexistence rule: everything below is additive. TARGET_REGISTRY,
// IMPACT_ONLY_TARGETS, listStandaloneConsumers() and resolveConsumerSource()
// above keep working unchanged for legacy callers.
// Canonical JSON Schema lives in ./build-config.schema.json; validateBuildConfig()
// below mirrors it without requiring an external `ajv` dependency.
// ---------------------------------------------------------------------------

const BUILD_CONFIG_TOP_LEVEL_KEYS = new Set([
  "$schema",
  "contentRoot",
  "activeTheme",
  "functionPrefix",
  "pipelineTestModeEnvVar",
  "dockerContainerName",
  "targets",
  "impactTargets",
]);

const BUILD_TARGET_KEYS = new Set([
  "buildProfile",
  "sourceDir",
  "deployDir",
  "bootstrapFile",
  "sharedFramework",
  "themeRelationship",
  "phpTarget",
  "requiredFqcns",
]);

const IMPACT_TARGET_KEYS = new Set(["kind", "sourceDir", "sourceKind"]);

function failInvalid(reason) {
  throw new Error(`Invalid build.config.json: ${reason}`);
}

function assertPlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failInvalid(`${label} must be an object`);
  }
}

/**
 * Validate a parsed build.config.json against build-config.schema.json rules.
 * dependency-free mirror of the schema (fail-closed: throws on first violation).
 * @param {unknown} raw - parsed JSON value
 * @returns {object} the validated config (same reference)
 */
export function validateBuildConfig(raw) {
  assertPlainObject(raw, "config");
  for (const key of Object.keys(raw)) {
    if (!BUILD_CONFIG_TOP_LEVEL_KEYS.has(key)) {
      failInvalid(`unknown top-level field '${key}'`);
    }
  }
  if (raw.contentRoot !== undefined && typeof raw.contentRoot !== "string") {
    failInvalid("contentRoot must be a string");
  }
  if (raw.activeTheme !== undefined && typeof raw.activeTheme !== "string") {
    failInvalid("activeTheme must be a string");
  }
  if (raw.functionPrefix !== undefined) {
    if (typeof raw.functionPrefix !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*_$/.test(raw.functionPrefix)) {
      failInvalid("functionPrefix must match ^[A-Za-z_][A-Za-z0-9_]*_$ (e.g. \"myplugin_\")");
    }
  }
  if (raw.pipelineTestModeEnvVar !== undefined) {
    if (typeof raw.pipelineTestModeEnvVar !== "string" || !/^[A-Z][A-Z0-9_]*$/.test(raw.pipelineTestModeEnvVar)) {
      failInvalid("pipelineTestModeEnvVar must match ^[A-Z][A-Z0-9_]*$");
    }
  }
  if (raw.dockerContainerName !== undefined && typeof raw.dockerContainerName !== "string") {
    failInvalid("dockerContainerName must be a string");
  }
  if (raw.targets !== undefined) {
    assertPlainObject(raw.targets, "targets");
    for (const [slug, target] of Object.entries(raw.targets)) {
      assertPlainObject(target, `targets['${slug}']`);
      for (const key of Object.keys(target)) {
        if (!BUILD_TARGET_KEYS.has(key)) {
          failInvalid(`targets['${slug}'] has unknown field '${key}'`);
        }
      }
      if (target.buildProfile !== undefined && target.buildProfile !== "standalone" && target.buildProfile !== PROFILE_S) {
        failInvalid(`targets['${slug}'].buildProfile must be "standalone" or "${PROFILE_S}"`);
      }
      for (const field of ["sourceDir", "deployDir", "sharedFramework", "themeRelationship"]) {
        if (target[field] !== undefined && typeof target[field] !== "string") {
          failInvalid(`targets['${slug}'].${field} must be a string`);
        }
      }
      if (target.bootstrapFile !== undefined) {
        if (typeof target.bootstrapFile !== "string" || !/^[^/\\]+\.php$/.test(target.bootstrapFile)) {
          failInvalid(`targets['${slug}'].bootstrapFile must be a file name like "{slug}.php"`);
        }
      }
      if (target.phpTarget !== undefined) {
        if (typeof target.phpTarget !== "string" || !/^[0-9]+\.[0-9]+$/.test(target.phpTarget)) {
          failInvalid(`targets['${slug}'].phpTarget must look like "7.4"`);
        }
      }
      if (target.requiredFqcns !== undefined) {
        if (!Array.isArray(target.requiredFqcns) || target.requiredFqcns.some((v) => typeof v !== "string" || v.length === 0)) {
          failInvalid(`targets['${slug}'].requiredFqcns must be an array of non-empty strings`);
        }
      }
    }
  }
  if (raw.impactTargets !== undefined) {
    assertPlainObject(raw.impactTargets, "impactTargets");
    for (const [name, target] of Object.entries(raw.impactTargets)) {
      assertPlainObject(target, `impactTargets['${name}']`);
      for (const key of Object.keys(target)) {
        if (!IMPACT_TARGET_KEYS.has(key)) {
          failInvalid(`impactTargets['${name}'] has unknown field '${key}'`);
        }
      }
      if (target.kind !== "shared-framework-source" && target.kind !== "impact-only-target") {
        failInvalid(`impactTargets['${name}'].kind must be "shared-framework-source" or "impact-only-target"`);
      }
      if (target.sourceDir !== undefined && typeof target.sourceDir !== "string") {
        failInvalid(`impactTargets['${name}'].sourceDir must be a string`);
      }
      if (target.sourceKind !== undefined && !["theme", "plugin", "framework"].includes(target.sourceKind)) {
        failInvalid(`impactTargets['${name}'].sourceKind must be "theme", "plugin" or "framework"`);
      }
    }
  }
  return raw;
}

/**
 * Normalize one target entry (config names or legacy internal names) by
 * applying convention-over-configuration defaults.
 * Convention: sourceDir={slug}-dev, deployDir={slug}, bootstrapFile={slug}.php,
 * buildProfile="standalone", phpTarget="7.4", sharedFramework="wpdev",
 * themeRelationship="none".
 * @param {string} slug - consumer slug (registry key)
 * @param {object} raw - partial target definition
 * @returns {object} frozen normalized entry in internal registry shape
 */
export function normalizeRegistryEntry(slug, raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const normalized = Object.freeze({
    artifactId: source.artifactId || slug,
    consumer: source.consumer || slug,
    sourceDirectoryName: source.sourceDirectoryName || source.sourceDir || `${slug}-dev`,
    deployDirectoryName: source.deployDirectoryName || source.deployDir || slug,
    bootstrapFile: source.bootstrapFile || `${slug}.php`,
    sharedFramework: source.sharedFramework || SHARED_FRAMEWORK_ID,
    themeRelationship: source.themeRelationship || "none",
    runtimeVendorPrefix: source.runtimeVendorPrefix || "WPDevFramework",
    phpTarget: source.phpTarget || "7.4",
    publicCompatibilityPolicy: source.publicCompatibilityPolicy || "frozen-public-contracts",
    kind: source.kind || "standalone-plugin",
    buildProfile: source.buildProfile || STANDALONE_PROFILE,
    requiredFqcns: Object.freeze([...(source.requiredFqcns || [])]),
  });
  assertSafeSegment(normalized.sourceDirectoryName, "sourceDirectoryName");
  assertSafeSegment(normalized.deployDirectoryName, "deployDirectoryName");
  return normalized;
}

/**
 * Build a validated registry bundle from a parsed build.config.json value.
 * @param {object} rawConfig - parsed JSON object
 * @param {string|null} contentRoot - explicit contentRoot override (takes precedence)
 * @param {string|null} configDir - directory of the config file (for resolving relative contentRoot)
 * @returns {{ registry: object, impactTargets: object, config: object }}
 */
export async function buildRegistryFromConfig(rawConfig, contentRoot = null, configDir = null) {
  const raw = validateBuildConfig(rawConfig);
  let resolvedContentRoot = contentRoot || raw.contentRoot || null;
  if (resolvedContentRoot && configDir && !path.isAbsolute(resolvedContentRoot)) {
    resolvedContentRoot = path.resolve(configDir, resolvedContentRoot);
  }
  const targets = raw.targets || {};
  const registryEntries = {};
  for (const [slug, target] of Object.entries(targets)) {
    registryEntries[slug] = normalizeRegistryEntry(slug, target);
  }
  const registry = Object.freeze(registryEntries);
  const impactEntries = {};
  for (const [name, target] of Object.entries(raw.impactTargets || {})) {
    impactEntries[name] = Object.freeze({
      kind: target.kind,
      sourceDirectoryName: target.sourceDir || target.sourceDirectoryName || name.split("/").pop(),
      ...(target.sourceKind ? { sourceKind: target.sourceKind } : {}),
    });
  }
  const impactTargets = Object.freeze(impactEntries);
  const config = Object.freeze({
    contentRoot: resolvedContentRoot,
    activeTheme: raw.activeTheme || null,
    functionPrefix: raw.functionPrefix || null,
    pipelineTestModeEnvVar: raw.pipelineTestModeEnvVar || "WPDEV_PIPELINE_TEST_MODE",
    dockerContainerName: raw.dockerContainerName || null,
  });
  return { registry, impactTargets, config };
}

/**
 * Resolve a single consumer purely by naming convention, without any static
 * registry lookup. Returns null when the convention does not match the
 * filesystem (caller turns that into a fail-closed error).
 * @param {string} contentRoot - path to wp-content
 * @param {string} consumer - consumer slug (e.g. "sample-standalone-plugin")
 * @param {string|null} pluginsDir - explicit plugins dir override
 * @returns {Promise<{ entry, sourceDir, deployDir, bootstrapFile }|null>}
 */
export async function resolveByConvention(contentRoot, consumer, pluginsDir = null) {
  if (!consumer || typeof consumer !== "string") {
    return null;
  }
  if (consumer.includes("..") || consumer.includes("/") || consumer.includes("\\") || consumer.includes("\0")) {
    throw new Error(`Invalid consumer name: ${consumer}`);
  }
  if (!contentRoot && !pluginsDir) {
    return null;
  }
  const entry = normalizeRegistryEntry(consumer, {});
  const effectivePluginsDir = pluginsDir ? path.resolve(pluginsDir) : path.resolve(contentRoot, "plugins");
  const sourceDir = path.resolve(effectivePluginsDir, entry.sourceDirectoryName);
  const deployDir = path.resolve(effectivePluginsDir, entry.deployDirectoryName);
  const pluginsPrefix = effectivePluginsDir.endsWith(path.sep) ? effectivePluginsDir : effectivePluginsDir + path.sep;
  if (!sourceDir.startsWith(pluginsPrefix) || !deployDir.startsWith(pluginsPrefix)) {
    throw new Error(`Consumer '${consumer}' resolved outside plugins directory`);
  }
  let sourceStat;
  try {
    sourceStat = await lstat(sourceDir);
  } catch {
    return null;
  }
  if (sourceStat.isSymbolicLink()) {
    throw new Error(`Source directory must not be a symlink: ${sourceDir}`);
  }
  if (!sourceStat.isDirectory()) {
    return null;
  }
  const bootstrapPath = path.join(sourceDir, entry.bootstrapFile);
  if (!fs.existsSync(bootstrapPath)) {
    return null;
  }
  return { entry, sourceDir, deployDir, bootstrapFile: entry.bootstrapFile };
}

/**
 * Auto-discover build targets by scanning for `*-dev` plugin directories.
 * Convention per target: sourceDir={slug}-dev, deployDir={slug},
 * bootstrapFile={slug}.php, buildProfile="standalone", phpTarget="7.4".
 * Only directories containing their bootstrap file are included.
 * @param {string} contentRoot - path to wp-content
 * @param {string|null} pluginsDir - explicit plugins dir override
 * @returns {Promise<{ registry: object, impactTargets: object, config: object }>}
 */
export async function autoDiscoverTargets(contentRoot, pluginsDir = null) {
  if (!contentRoot && !pluginsDir) {
    throw new Error("autoDiscoverTargets requires contentRoot or pluginsDir (fail-closed)");
  }
  const effectivePluginsDir = pluginsDir ? path.resolve(pluginsDir) : path.resolve(contentRoot, "plugins");
  let dirents;
  try {
    dirents = await fs.promises.readdir(effectivePluginsDir, { withFileTypes: true });
  } catch {
    throw new Error(`Plugins directory missing: ${effectivePluginsDir} (fail-closed)`);
  }
  const registryEntries = {};
  for (const dirent of dirents) {
    if (!dirent.isDirectory() || dirent.isSymbolicLink()) {
      continue;
    }
    if (!dirent.name.endsWith("-dev")) {
      continue;
    }
    const slug = dirent.name.slice(0, -"-dev".length);
    if (!slug) {
      continue;
    }
    const found = await resolveByConvention(contentRoot || effectivePluginsDir, slug, effectivePluginsDir);
    if (found) {
      registryEntries[slug] = found.entry;
    }
  }
  return {
    registry: Object.freeze(registryEntries),
    impactTargets: Object.freeze({}),
    config: Object.freeze({
      contentRoot: contentRoot || null,
      activeTheme: null,
      functionPrefix: null,
      pipelineTestModeEnvVar: "WPDEV_PIPELINE_TEST_MODE",
      dockerContainerName: null,
    }),
  };
}

/**
 * Load target registry from an external build.config.json file, or
 * auto-discover from the content root when configPath is null.
 * Coexists with legacy TARGET_REGISTRY — legacy exports are untouched.
 * @param {string|null} configPath - path to build.config.json (or null for auto-discovery)
 * @param {string|null} contentRoot - path to wp-content directory
 * @returns {Promise<{ registry: object, impactTargets: object, config: object }>}
 */
export async function loadTargetRegistry(configPath, contentRoot) {
  if (configPath) {
    const absolutePath = path.resolve(configPath);
    let text;
    try {
      text = await fs.promises.readFile(absolutePath, "utf-8");
    } catch (error) {
      throw new Error(`Cannot read build config '${absolutePath}': ${error.message}`);
    }
    let raw;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      throw new Error(`Invalid JSON in build config '${absolutePath}': ${error.message}`);
    }
    return buildRegistryFromConfig(raw, contentRoot || null, path.dirname(absolutePath));
  }
  return autoDiscoverTargets(contentRoot);
}
