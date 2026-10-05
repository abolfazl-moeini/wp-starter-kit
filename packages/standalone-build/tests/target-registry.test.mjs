import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  IMPACT_ONLY_TARGETS,
  TARGET_REGISTRY,
  buildRegistryFromConfig,
  listStandaloneConsumers,
  resolveConsumerSource,
} from "../target-registry.mjs";

import { resolveContentRoot } from "../resolve-content-root.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let contentRoot;
try {
  contentRoot = resolveContentRoot({ scriptDir: packageRoot, cwd: process.cwd(), env: process.env });
} catch {
  contentRoot = null;
}

// Gate #2: the legacy static registry is intentionally empty and frozen.
// Consumer targets come from build.config.json via buildRegistryFromConfig().
// This inline fixture mirrors the production 7-target config shape.
function buildSevenTargetFixture() {
  return buildRegistryFromConfig({
    contentRoot: "./wordpress/wp-content",
    activeTheme: "sample-theme",
    targets: {
      "sample-standalone-plugin": { buildProfile: "standalone" },
      "sample-profile-s-plugin": { buildProfile: "standalone", themeRelationship: "themes/sample-theme" },
      "wpdev-crm": { buildProfile: "s" },
      "wpdev-tickets": { buildProfile: "s" },
      "drm-connector": { buildProfile: "s" },
      "wpdev-analytics": { buildProfile: "s" },
      "wpdev-woo-persian": { buildProfile: "s" },
    },
    impactTargets: {
      wpdev: { kind: "shared-framework-source", sourceDir: "wpdev" },
      "themes/sample-theme": { kind: "impact-only-target", sourceDir: "sample-theme", sourceKind: "theme" },
    },
  });
}

test("Target registry: legacy static registry is empty/frozen, config provides the seven consumers", async () => {
  assert.deepEqual(TARGET_REGISTRY, {}, "legacy TARGET_REGISTRY must be empty (targets come from build.config.json)");
  assert.ok(Object.isFrozen(TARGET_REGISTRY), "legacy TARGET_REGISTRY must stay frozen for compat");
  assert.deepEqual(listStandaloneConsumers(), [], "legacy listStandaloneConsumers() must be empty (compat export)");

  const { registry, impactTargets } = await buildSevenTargetFixture();
  const consumers = Object.keys(registry);
  assert.deepEqual(
    [...consumers].sort(),
    [
      "drm-connector",
      "sample-profile-s-plugin",
      "sample-standalone-plugin",
      "wpdev-analytics",
      "wpdev-crm",
      "wpdev-tickets",
      "wpdev-woo-persian",
    ].sort()
  );
  assert.equal(registry.wpdev, undefined, "wpdev must not be a standalone registry target");
  assert.equal(IMPACT_ONLY_TARGETS.wpdev.kind, "shared-framework-source");
  assert.equal(IMPACT_ONLY_TARGETS.wpdev.standaloneArtifact, false);
  assert.equal(impactTargets["themes/sample-theme"].kind, "impact-only-target");

  for (const consumer of consumers) {
    const entry = registry[consumer];
    assert.notEqual(entry.sourceDirectoryName, entry.deployDirectoryName);
    assert.equal(entry.sourceDirectoryName, `${consumer}-dev`);
    assert.equal(entry.deployDirectoryName, consumer);
    assert.equal(entry.sharedFramework, "wpdev");
    assert.equal(entry.kind, "standalone-plugin");
  }
});

test("Target registry: config-driven sources resolve to *-dev and never to deploy output", async () => {
  // Empty legacy registry falls through to convention-based auto-discovery.
  const tmp = await mkdtemp(path.join(os.tmpdir(), "target-registry-convention-"));
  try {
    const { registry } = await buildSevenTargetFixture();
    for (const consumer of ["sample-standalone-plugin", "wpdev-crm"]) {
      const pluginsDir = path.join(tmp, "plugins");
      const sourceDir = path.join(pluginsDir, `${consumer}-dev`);
      await mkdir(sourceDir, { recursive: true });
      await writeFile(path.join(sourceDir, `${consumer}.php`), "<?php // fixture");
      const resolved = await resolveConsumerSource({ contentRoot: tmp, consumer, registry });
      assert.equal(path.basename(resolved.sourceDir), `${consumer}-dev`);
      assert.equal(path.basename(resolved.deployDir), consumer);
      assert.notEqual(path.resolve(resolved.sourceDir), path.resolve(resolved.deployDir));
      assert.ok(fs.existsSync(path.join(resolved.sourceDir, resolved.entry.bootstrapFile)));
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }

  // Real in-repo sources (when present) still resolve via auto-discovery.
  if (contentRoot) {
    let tested = 0;
    const { registry } = await buildSevenTargetFixture();
    for (const consumer of Object.keys(registry)) {
      const entry = registry[consumer];
      const sourceDir = path.join(contentRoot, "plugins", entry.sourceDirectoryName);
      if (!fs.existsSync(sourceDir)) {
        continue;
      }
      const resolved = await resolveConsumerSource({ contentRoot, consumer, registry });
      assert.equal(path.basename(resolved.sourceDir), `${consumer}-dev`);
      assert.equal(path.basename(resolved.deployDir), consumer);
      assert.notEqual(path.resolve(resolved.sourceDir), path.resolve(resolved.deployDir));
      assert.ok(fs.existsSync(path.join(resolved.sourceDir, resolved.entry.bootstrapFile)));
      tested++;
    }
    assert.ok(tested > 0, "At least one consumer must be present and tested");
  }
});

test("Target registry: missing -dev source is fail-closed and must not fall back to deploy output", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "target-registry-missing-"));
  try {
    const deployOnly = path.join(tmp, "plugins", "sample-standalone-plugin");
    await mkdir(deployOnly, { recursive: true });
    await writeFile(path.join(deployOnly, "sample-standalone-plugin.php"), "<?php // deploy output");

    await assert.rejects(
      () => resolveConsumerSource({ contentRoot: tmp, consumer: "sample-standalone-plugin" }),
      /fail-closed|missing|fallback/i
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("Target registry: unknown consumer, wpdev standalone, symlink and traversal are rejected", async () => {
  if (contentRoot) {
    await assert.rejects(
      () => resolveConsumerSource({ contentRoot, consumer: "wpdev" }),
      /shared framework|unknown/i
    );
    await assert.rejects(
      () => resolveConsumerSource({ contentRoot, consumer: "not-a-plugin" }),
      /unknown/i
    );
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), "target-registry-unsafe-"));
  try {
    const pluginsDir = path.join(tmp, "plugins");
    await mkdir(pluginsDir, { recursive: true });
    const real = path.join(tmp, "outside-source");
    await mkdir(real, { recursive: true });
    await writeFile(path.join(real, "sample-standalone-plugin.php"), "<?php");
    await symlink(real, path.join(pluginsDir, "sample-standalone-plugin-dev"));

    await assert.rejects(
      () => resolveConsumerSource({ contentRoot: tmp, consumer: "sample-standalone-plugin" }),
      /symlink/i
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});

test("Release routing: every consumer declares a buildProfile and resolves fail-closed", async () => {
  const { resolveReleaseProfile } = await import("../build-plan.mjs");
  const { registry } = await buildSevenTargetFixture();

  for (const consumer of Object.keys(registry)) {
    const entry = registry[consumer];
    assert.equal(
      typeof entry.buildProfile,
      "string",
      `${consumer} must declare a buildProfile in the target registry`
    );
    const profile = resolveReleaseProfile(consumer, entry, null);
    assert.ok(
      profile === "s" || profile === "spaghetti" || profile === "standalone",
      `${consumer} resolved to an unsupported profile: ${profile}`
    );
  }

  assert.equal(resolveReleaseProfile("wpdev-crm", registry["wpdev-crm"], null), "s");
  assert.equal(resolveReleaseProfile("sample-standalone-plugin", registry["sample-standalone-plugin"], null), "standalone");
  assert.equal(resolveReleaseProfile("drm-connector", registry["drm-connector"], null), "s");

  assert.throws(
    () => resolveReleaseProfile("mystery-plugin", {}, null),
    /fail-closed|no buildProfile/i,
    "An unknown consumer without a declared profile must fail closed"
  );
  assert.throws(
    () => resolveReleaseProfile("wpdev-crm", registry["wpdev-crm"], "turbo"),
    /Invalid release profile/i
  );

  assert.equal(
    resolveReleaseProfile("sample-standalone-plugin", registry["sample-standalone-plugin"], "profile-s"),
    "s",
    "An explicit operator override must still win over the registry default"
  );

  assert.equal(
    resolveReleaseProfile("sample-standalone-plugin", registry["sample-standalone-plugin"], "auto"),
    "standalone",
    "--profile=auto must route sample-standalone-plugin to the registry default"
  );
  assert.equal(
    resolveReleaseProfile("wpdev-crm", registry["wpdev-crm"], "auto"),
    "s",
    "--profile=auto must route wpdev consumers to Profile S"
  );
});
