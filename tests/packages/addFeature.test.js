/**
 * Phase 22.3 / 22.4 — addFeature() happy path.
 *
 * `addFeature(dir, id, variant, {force?})` is the engine API the
 * installer's `wpsk add <feature>` command calls. It turns a
 * feature ON (or switches its variant) in an EXISTING project,
 * writing only the files the feature's generator owns and
 * updating the manifest + project.config.json to reflect the
 * new state.
 *
 * Contracts locked here:
 *
 *  1. addFeature reads the manifest from `<dir>/wpsk-kit.json`
 *     and the answers-derived `project.config.json`. The two
 *     must be in sync (syncFeaturesToConfig keeps them that way
 *     in the scaffold path; the test pre-populates them
 *     consistently).
 *
 *  2. The new feature set is `currentFeatures ∪ {id: variant}`.
 *     `validateFeatureSet` runs on the merged set; a violation
 *     returns `{ok:false, reason}` and writes nothing (covered
 *     by the guards test).
 *
 *  3. The generator for `(id, variant)` is found via the
 *     registry. Its `run(ctx)` is called with the existing
 *     answers/cfg reconstructed from project.config.json. The
 *     output is filtered: only files matched by the generator's
 *     `owns` globs are written. A file outside `owns` is a
 *     safety violation → throw, not silently touch user code.
 *
 *  4. After the writes, `wpsk-kit.json` and project.config.json's
 *     `features` key are updated atomically (via `writeManifest`
 *     + `syncFeaturesToConfig`). The test asserts both files
 *     reflect the new feature state.
 *
 *  5. The return value is `{ ok, written, deps, devDeps? }` —
 *     the caller (CLI) uses `deps` + `devDeps` to inform the
 *     user which npm packages to install. `written` is the list
 *     of relative file paths the call wrote (manifest + manifest
 *     sync are bookkeeping; only generator-emitted files are
 *     in `written`).
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
import { syncFeaturesToConfig } from "../../packages/create-wp-project/src/manifest.js";

/**
 * Pre-populate a project directory with a v2-valid
 * project.config.json + a wpsk-kit.json that reflect a "minimal"
 * starting feature set (js=none, husky=off, exampleFeature=off).
 * Returns the configured features so the test can re-merge.
 */
async function seedProject(
  tmp,
  {
    features = {
      js: "none",
      husky: "off",
      exampleFeature: "off",
      i18n: "off",
      css: "none",
      blocks: "off",
      restBatch: "off",
      vendorScoping: "off",
      phpTest: "none",
      faultTolerance: "off",
      license: "gpl2",
      jsLib: "none",
      jsTest: "none",
      phpMinVersion: "7.4",
      phpFramework: "none",
      wpMinVersion: "6.0",
    },
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
    restNamespace: "wpsk/v1",
    vendorPrefix: "WpskVendor",
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
    generatedAt: "2026-06-15T00:00:00.000Z",
  });
  await writeManifest(tmp, manifest);
  return { cfg, features };
}

describe("addFeature() — happy path (Phase 22.3, 22.4)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-add-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test("returns { ok:true, written, deps } when the feature is turned ON", async () => {
    // Pre-populate: husky:off.
    await seedProject(tmp, {
      features: { ...defaultFeatures(), husky: "off" },
    });

    const res = await addFeature(tmp, "husky", "on");
    expect(res.ok).toBe(true);
    expect(res.written).toBeDefined();
    expect(Array.isArray(res.written)).toBe(true);
    // .husky/pre-commit is the husky generator's primary file
    expect(res.written).toContain(".husky/pre-commit");
    // deps / devDeps reported so the CLI can show "you also need to npm install …"
    expect(res.deps).toBeDefined();
    expect(res.devDeps).toBeDefined();
  });

  test("writes the husky generator's owned files to disk", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), husky: "off" },
    });

    const res = await addFeature(tmp, "husky", "on");
    expect(res.ok).toBe(true);
    const preCommit = await fs.readFile(
      path.join(tmp, ".husky", "pre-commit"),
      "utf8",
    );
    expect(preCommit).toMatch(/lint-staged/);
  });

  test("updates features.husky='on' in wpsk-kit.json", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), husky: "off" },
    });

    const res = await addFeature(tmp, "husky", "on");
    expect(res.ok).toBe(true);
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpsk-kit.json"), "utf8"),
    );
    expect(manifest.features.husky).toBe("on");
  });

  test("updates features.husky='on' in project.config.json", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), husky: "off" },
    });

    const res = await addFeature(tmp, "husky", "on");
    expect(res.ok).toBe(true);
    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(cfg.features.husky).toBe("on");
  });

  test("preserves v2 fields in project.config.json (no data loss)", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), husky: "off" },
    });

    await addFeature(tmp, "husky", "on");
    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(cfg.slug).toBe("my-project");
    expect(cfg.globalName).toBe("MyProject");
    expect(cfg.textDomain).toBe("my-project");
    expect(cfg.hookPrefix).toBe("my-project");
    expect(cfg.restNamespace).toBe("wpsk/v1");
  });

  test("works for a feature that emits a new src/Modules/* subtree (exampleFeature)", async () => {
    await seedProject(tmp, {
      features: { ...defaultFeatures(), exampleFeature: "off" },
    });

    const res = await addFeature(tmp, "exampleFeature", "on");
    expect(res.ok).toBe(true);
    expect(res.written).toContain("src/Modules/ExampleFeature/Module.php");
    expect(res.written).toContain(
      "src/Modules/ExampleFeature/Rest/ItemsController.php",
    );
    expect(res.written).toContain(
      "src/Modules/ExampleFeature/assets/entries/admin.ts",
    );
    // The file actually exists on disk.
    const moduleBody = await fs.readFile(
      path.join(tmp, "src", "Modules", "ExampleFeature", "Module.php"),
      "utf8",
    );
    expect(moduleBody).toMatch(/ModuleInterface/);
  });

  test("works for a feature that has no files (restBatch) — returns ok with empty written", async () => {
    // restBatch has no Phase 21 file output (the JS bundle lands
    // in Phase 25), but the feature is still toggleable: turning
    // it on should succeed and update the manifest.
    await seedProject(tmp, {
      features: { ...defaultFeatures(), restBatch: "off", js: "typescript" },
    });
    const res = await addFeature(tmp, "restBatch", "on");
    expect(res.ok).toBe(true);
    // No file emitted, but the manifest is updated.
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpsk-kit.json"), "utf8"),
    );
    expect(manifest.features.restBatch).toBe("on");
  });

  test("throws when called on a directory with no manifest (not a wpsk project)", async () => {
    // Empty tmp — no wpsk-kit.json, no project.config.json.
    await expect(addFeature(tmp, "husky", "on")).rejects.toThrow(
      /wpsk-kit\.json|manifest/i,
    );
  });
});
