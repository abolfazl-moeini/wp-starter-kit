#!/usr/bin/env node

import fs from "node:fs";
import { lstat } from "node:fs/promises";
import path from "node:path";

export const SHARED_FRAMEWORK_ID = "wpdev";

export const TARGET_REGISTRY = Object.freeze({
  "tavangary-core": Object.freeze({
    artifactId: "tavangary-core",
    consumer: "tavangary-core",
    sourceDirectoryName: "tavangary-core-dev",
    deployDirectoryName: "tavangary-core",
    bootstrapFile: "tavangary-core.php",
    sharedFramework: SHARED_FRAMEWORK_ID,
    themeRelationship: "none",
    runtimeVendorPrefix: "WPDevFramework",
    phpTarget: "7.4",
    publicCompatibilityPolicy: "frozen-public-contracts",
    kind: "standalone-plugin",
  }),
  "tavangary-theme-panel": Object.freeze({
    artifactId: "tavangary-theme-panel",
    consumer: "tavangary-theme-panel",
    sourceDirectoryName: "tavangary-theme-panel-dev",
    deployDirectoryName: "tavangary-theme-panel",
    bootstrapFile: "tavangary-theme-panel.php",
    sharedFramework: SHARED_FRAMEWORK_ID,
    themeRelationship: "themes/tavangary",
    runtimeVendorPrefix: "WPDevFramework",
    phpTarget: "7.4",
    publicCompatibilityPolicy: "frozen-public-contracts",
    kind: "standalone-plugin",
  }),
  "wpdev-crm": Object.freeze({
    artifactId: "wpdev-crm",
    consumer: "wpdev-crm",
    sourceDirectoryName: "wpdev-crm-dev",
    deployDirectoryName: "wpdev-crm",
    bootstrapFile: "wpdev-crm.php",
    sharedFramework: SHARED_FRAMEWORK_ID,
    themeRelationship: "none",
    runtimeVendorPrefix: "WPDevFramework",
    phpTarget: "7.4",
    publicCompatibilityPolicy: "frozen-public-contracts",
    kind: "standalone-plugin",
  }),
  "wpdev-tickets": Object.freeze({
    artifactId: "wpdev-tickets",
    consumer: "wpdev-tickets",
    sourceDirectoryName: "wpdev-tickets-dev",
    deployDirectoryName: "wpdev-tickets",
    bootstrapFile: "wpdev-tickets.php",
    sharedFramework: SHARED_FRAMEWORK_ID,
    themeRelationship: "none",
    runtimeVendorPrefix: "WPDevFramework",
    phpTarget: "7.4",
    publicCompatibilityPolicy: "frozen-public-contracts",
    kind: "standalone-plugin",
  }),
  "drm-connector": Object.freeze({
    artifactId: "drm-connector",
    consumer: "drm-connector",
    sourceDirectoryName: "drm-connector-dev",
    deployDirectoryName: "drm-connector",
    bootstrapFile: "drm-connector.php",
    sharedFramework: SHARED_FRAMEWORK_ID,
    themeRelationship: "none",
    runtimeVendorPrefix: "WPDevFramework",
    phpTarget: "7.4",
    publicCompatibilityPolicy: "frozen-public-contracts",
    kind: "standalone-plugin",
  }),
  "wpdev-analytics": Object.freeze({
    artifactId: "wpdev-analytics",
    consumer: "wpdev-analytics",
    sourceDirectoryName: "wpdev-analytics-dev",
    deployDirectoryName: "wpdev-analytics",
    bootstrapFile: "wpdev-analytics.php",
    sharedFramework: SHARED_FRAMEWORK_ID,
    themeRelationship: "none",
    runtimeVendorPrefix: "WPDevFramework",
    phpTarget: "7.4",
    publicCompatibilityPolicy: "frozen-public-contracts",
    kind: "standalone-plugin",
  }),
  "wpdev-woo-persian": Object.freeze({
    artifactId: "wpdev-woo-persian",
    consumer: "wpdev-woo-persian",
    sourceDirectoryName: "wpdev-woo-persian-dev",
    deployDirectoryName: "wpdev-woo-persian",
    bootstrapFile: "wpdev-woo-persian.php",
    sharedFramework: SHARED_FRAMEWORK_ID,
    themeRelationship: "none",
    runtimeVendorPrefix: "WPDevFramework",
    phpTarget: "7.4",
    publicCompatibilityPolicy: "frozen-public-contracts",
    kind: "standalone-plugin",
  }),
});

export const IMPACT_ONLY_TARGETS = Object.freeze({
  wpdev: Object.freeze({
    kind: "shared-framework-source",
    sourceDirectoryName: "wpdev",
    standaloneArtifact: false,
  }),
  "themes/tavangary": Object.freeze({
    kind: "impact-only-target",
    sourceDirectoryName: "tavangary",
    sourceKind: "theme",
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

export async function resolveConsumerSource({ contentRoot, consumer, pluginsDir = null }) {
  if (consumer === SHARED_FRAMEWORK_ID || consumer === "wpdev") {
    throw new Error("plugins/wpdev is a shared framework source and must not be assembled as a standalone artifact");
  }
  const entry = TARGET_REGISTRY[consumer];
  if (!entry) {
    throw new Error(`Unknown build consumer '${consumer}' (fail-closed)`);
  }

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
