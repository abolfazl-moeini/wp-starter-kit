/**
 * Phase 22.5 / 22.6 — addFeature() guards.
 *
 * Two failure modes the engine must handle cleanly:
 *
 *  1. IDEMPOTENT: turning a feature ON that's already ON with the
 *     same variant. The expected behavior is `{ ok: true,
 *     noop: true }` — the call succeeded, but no files were
 *     written and the manifest is unchanged. The test compares
 *     the manifest's `generatedAt` before/after to confirm the
 *     "no-op" path did NOT bump the timestamp.
 *
 *  2. VALIDATION FAIL: turning a feature ON that violates a §1.1
 *     dependency rule. The example: `faultTolerance: on` while
 *     `phpMinVersion: 7.4` (faultTolerance requires ≥ 8.1). The
 *     expected behavior is `{ ok: false, reason }` — the call
 *     failed cleanly, no files were written, the manifest is
 *     unchanged, and the error message identifies which feature
 *     violated which rule.
 *
 * In BOTH cases, "no partial writes" is the contract: the engine
 * computes the new state in memory first, then writes. A failure
 * leaves the on-disk state untouched.
 *
 * The test asserts BOTH the return value AND the on-disk state
 * (manifest + project.config.json are unchanged on failure).
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { addFeature } from "../../packages/create-wp-project/src/addFeature.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";

async function seedProject(
  tmp,
  {
    features = defaultFeatures(),
    generatedAt = "2026-06-15T00:00:00.000Z",
  } = {},
) {
  const cfg = {
    slug: "my-project",
    globalName: "MyProject",
    localizeVar: "MyProjectLoc",
    textDomain: "my-project",
    hookPrefix: "my-project",
    npmScope: "@myorg",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "myprj_",
    uiFramework: "preact",
    projectType: "plugin",
    restNamespace: "wpdev/v1",
    vendorPrefix: "WpdevVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
  };
  await fs.writeFile(
    path.join(tmp, "project.config.json"),
    JSON.stringify({ ...cfg, features: { ...features } }, null, 2) + "\n",
    "utf8",
  );
  const manifest = buildManifest({
    kitVersion: "0.1.0",
    features,
    generatedAt,
  });
  await writeManifest(tmp, manifest);
  return { cfg, manifest, features };
}

describe("addFeature() — guards (Phase 22.5, 22.6)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-add-guard-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  /* -- idempotent: feature already ON with the same variant -- */

  test("returns { ok:true, noop:true } when the feature is already ON with the same variant", async () => {
    // husky is on by default. Calling addFeature for husky:on must
    // detect the no-op and return noop:true.
    await seedProject(tmp, { features: { ...defaultFeatures(), husky: "on" } });

    const res = await addFeature(tmp, "husky", "on");
    expect(res.ok).toBe(true);
    expect(res.noop).toBe(true);
    expect(res.written).toEqual([]);
  });

  test("the idempotent path does NOT touch existing files (byte-for-byte stable)", async () => {
    // Seed: manifest says husky:on AND a pre-existing
    // .husky/pre-commit body (could be from the scaffold, or
    // a hand-edited one). The idempotent addFeature must
    // detect the no-op and leave the file alone — even if the
    // file's body is not the generator's "current" output.
    // (Refreshing a stale body is the job of `update` / migrations,
    // not addFeature.)
    await seedProject(tmp, { features: { ...defaultFeatures(), husky: "on" } });
    const handEditedBody =
      "#!/usr/bin/env sh\n# hand-edited — keep me\necho hello\n";
    await fs.mkdir(path.join(tmp, ".husky"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, ".husky/pre-commit"),
      handEditedBody,
      "utf8",
    );

    const res = await addFeature(tmp, "husky", "on");
    expect(res.ok).toBe(true);
    expect(res.noop).toBe(true);
    const actual = await fs.readFile(
      path.join(tmp, ".husky", "pre-commit"),
      "utf8",
    );
    expect(actual).toBe(handEditedBody);
  });

  test("the idempotent path does NOT bump wpdev-kit.json generatedAt", async () => {
    const generatedAt = "2026-06-15T00:00:00.000Z";
    await seedProject(tmp, {
      features: { ...defaultFeatures(), husky: "on" },
      generatedAt,
    });

    await addFeature(tmp, "husky", "on");
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev-kit.json"), "utf8"),
    );
    expect(manifest.generatedAt).toBe(generatedAt);
  });

  test("idempotency with exampleFeature (a feature that emits multiple files)", async () => {
    // First, turn the feature off and add it — this writes the files.
    // Then turn it on (already on) — should be a no-op.
    await seedProject(tmp, {
      features: { ...defaultFeatures(), exampleFeature: "off" },
    });
    const first = await addFeature(tmp, "exampleFeature", "on");
    expect(first.ok).toBe(true);
    expect(first.written.length).toBeGreaterThan(0);
    const moduleBody = await fs.readFile(
      path.join(tmp, "src/Modules/ExampleFeature/Module.php"),
      "utf8",
    );
    expect(moduleBody.length).toBeGreaterThan(0);

    // Second call: feature is already on per the manifest.
    const second = await addFeature(tmp, "exampleFeature", "on");
    expect(second.ok).toBe(true);
    expect(second.noop).toBe(true);
    expect(second.written).toEqual([]);
    // Body must not have changed.
    const moduleAfter = await fs.readFile(
      path.join(tmp, "src/Modules/ExampleFeature/Module.php"),
      "utf8",
    );
    expect(moduleAfter).toBe(moduleBody);
  });

  /* -- validation-fail: dependency rule violated -- */

  test("returns { ok:false, reason } when the merged set violates a dependency rule (faultTolerance on PHP 7.4)", async () => {
    // phpMinVersion=7.4 (default). faultTolerance requires ≥ 8.1.
    // The merged set: { phpMinVersion: "7.4", faultTolerance: "on" } → invalid.
    await seedProject(tmp, {
      features: {
        ...defaultFeatures(),
        faultTolerance: "off",
        phpMinVersion: "7.4",
      },
    });

    const res = await addFeature(tmp, "faultTolerance", "on");
    expect(res.ok).toBe(false);
    expect(res.reason).toBeDefined();
    expect(res.reason).toMatch(/faultTolerance|8\.1/);
    // No files written, no manifest update.
    expect(res.written).toEqual([]);
  });

  test("validation-fail does NOT modify wpdev-kit.json (no partial writes)", async () => {
    const generatedAt = "2026-06-15T00:00:00.000Z";
    await seedProject(tmp, {
      features: {
        ...defaultFeatures(),
        faultTolerance: "off",
        phpMinVersion: "7.4",
      },
      generatedAt,
    });

    await addFeature(tmp, "faultTolerance", "on");
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev-kit.json"), "utf8"),
    );
    expect(manifest.features.faultTolerance).toBe("off");
    expect(manifest.generatedAt).toBe(generatedAt);
  });

  test("validation-fail does NOT modify project.config.json's features", async () => {
    await seedProject(tmp, {
      features: {
        ...defaultFeatures(),
        faultTolerance: "off",
        phpMinVersion: "7.4",
      },
    });

    await addFeature(tmp, "faultTolerance", "on");
    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(cfg.features.faultTolerance).toBe("off");
  });

  test("validation-fail does NOT create any feature files on disk", async () => {
    await seedProject(tmp, {
      features: {
        ...defaultFeatures(),
        blocks: "off",
        js: "typescript",
        wpMinVersion: "6.0",
      },
    });

    // js: pure (not typescript) while restBatch:on is a violation
    // (restBatch=on requires js ≠ none — pure is not none, so
    // actually this IS valid. Let me use a different rule.
    // Use: faultTolerance with phpMinVersion=7.4).
    await seedProject(tmp, {
      features: {
        ...defaultFeatures(),
        faultTolerance: "off",
        phpMinVersion: "7.4",
      },
    });

    await addFeature(tmp, "faultTolerance", "on");
    // No fault-tolerance files should exist (the feature's
    // generator hasn't actually emitted any in Phase 21, but
    // even checking for a representative file is fine).
    const entries = await fs.readdir(tmp);
    // tmp only contains project.config.json + wpdev-kit.json.
    expect(entries.sort()).toEqual(["project.config.json", "wpdev-kit.json"]);
  });

  test("returns { ok:false, reason } when wpdev-kit.json is missing (no throw)", async () => {
    const res = await addFeature(tmp, "husky", "on");
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/wpdev-kit\.json/i);
  });

  test("returns { ok:false, reason } for an unknown feature id", async () => {
    await seedProject(tmp, { features: defaultFeatures() });

    const res = await addFeature(tmp, "totallyMadeUpFeature", "on");
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/not a known feature id|unknown|no generator/i);
  });

  test("returns { ok:false, reason } when trying to add the always-on core feature", async () => {
    await seedProject(tmp, { features: defaultFeatures() });

    const res = await addFeature(tmp, "core", "on");
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/core|always-on/i);
  });
});
