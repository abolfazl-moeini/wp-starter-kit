/**
 * TASK-24a — feature catalog completeness audit.
 *
 * Every catalog feature must be owned by at least one generator (or
 * core glue). Features that are OFF on the minimal preset must be
 * addable via addFeature when their dependency rules are satisfied.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { getFeatureCatalog } from "../../packages/create-wp-project/src/features.js";
import { listGenerators } from "../../packages/create-wp-project/src/generators/index.js";
import { applyPreset } from "../../packages/create-wp-project/src/presets.js";
import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";

/** Features whose values are woven into core glue (no dedicated generator). */
const CORE_GLUE_FEATURES = new Set(["phpMinVersion", "wpMinVersion"]);

/** Variant features with multiple generator descriptors (js:typescript, …). */
const MULTI_GENERATOR_FEATURES = new Set(["js"]);

function generatorsForFeature(featureId) {
  return listGenerators().filter((g) => g.feature === featureId);
}

async function seedMinimalProject(tmp, { withComposer = false } = {}) {
  const features = applyPreset("minimal");
  const manifest = buildManifest({
    kitVersion: "0.4.0",
    features,
    distMode: "deps",
    generatedAt: new Date().toISOString(),
  });
  await writeManifest(tmp, manifest);
  await fs.writeFile(
    path.join(tmp, "project.config.json"),
    JSON.stringify(
      {
        slug: "audit-plugin",
        globalName: "AuditPlugin",
        vendorPrefix: "AuditVendor",
        features,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  if (withComposer) {
    await fs.writeFile(
      path.join(tmp, "composer.json"),
      JSON.stringify({ name: "audit/plugin", require: {} }, null, 2) + "\n",
      "utf8",
    );
  }
}

describe("feature catalog audit (TASK-24a)", () => {
  test("every catalog feature has a generator or is core glue", () => {
    for (const f of getFeatureCatalog()) {
      if (CORE_GLUE_FEATURES.has(f.id)) {
        continue;
      }
      const gens = generatorsForFeature(f.id);
      expect(gens.length).toBeGreaterThan(
        0,
        `feature "${f.id}" has no generator with feature: "${f.id}"`,
      );
      if (MULTI_GENERATOR_FEATURES.has(f.id)) {
        expect(gens.length).toBeGreaterThan(
          1,
          `variant feature "${f.id}" should have multiple generator descriptors`,
        );
      }
    }
  });

  describe("minimal-preset features that are OFF can be added", () => {
    let tmp;

    beforeEach(async () => {
      tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-audit-"));
      await seedMinimalProject(tmp);
    });

    afterEach(async () => {
      await fs.rm(tmp, { recursive: true, force: true });
    });

    test.each([
      ["husky", "on"],
      ["exampleFeature", "on"],
      ["i18n", "on"],
    ])(
      "addFeature(%s, %s) succeeds on minimal baseline",
      async (featureId, variant) => {
        const res = await addFeature(tmp, featureId, variant);
        expect(res.ok).toBe(true);
        expect(res.written?.length).toBeGreaterThan(0);
      },
    );
  });

  describe("composer-backed features can be added when composer.json exists", () => {
    let tmp;

    beforeEach(async () => {
      tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-audit-"));
      await seedMinimalProject(tmp, { withComposer: true });
    });

    afterEach(async () => {
      await fs.rm(tmp, { recursive: true, force: true });
    });

    test.each([
      ["blocks", "on"],
      ["mcpAbilities", "on"],
    ])(
      "addFeature(%s, %s) succeeds with composer.json present",
      async (featureId, variant) => {
        const res = await addFeature(tmp, featureId, variant);
        expect(res.ok).toBe(true);
        expect(res.written?.length).toBeGreaterThan(0);
      },
    );
  });

  test("restBatch and faultTolerance refuse invalid combos on minimal (js:none / php 7.4)", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-audit-"));
    try {
      await seedMinimalProject(tmp);
      const rest = await addFeature(tmp, "restBatch", "on");
      expect(rest.ok).toBe(false);
      const fault = await addFeature(tmp, "faultTolerance", "on");
      expect(fault.ok).toBe(false);
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});
