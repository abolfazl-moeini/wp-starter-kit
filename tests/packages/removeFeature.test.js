/**
 * Phase 22.9 / 22.10 — removeFeature().
 *
 * The mirror of addFeature(): turn a feature OFF in an EXISTING
 * project. Whereas addFeature writes a feature's owned files when
 * it's enabled, removeFeature DELETES them when it's disabled.
 *
 * The safety model is identical to addFeature's (per plan.v3.md §22):
 *
 *  - The manifest is the source of truth for "is this feature on?" —
 *    removeFeature reads it to discover the current variant and to
 *    refuse removal of always-on `core`.
 *  - No partial writes on failure: the new feature set is computed
 *    in-memory, validation runs, and only then are deletes issued
 *    and the manifest + project.config.json updated.
 *  - A generator's `owns` globs are the only paths removeFeature
 *    touches. A file matched by any other still-ON feature's owns
 *    is preserved (shared-owned protection). Files OUTSIDE the
 *    feature's owns are never touched — that's the same safety
 *    rule addFeature's filterToOwned enforces, just applied
 *    in the delete direction.
 *  - `core` cannot be removed — it's always-on and lives in the
 *    scaffold's domain, not the runtime mutation domain.
 *
 * Returns:
 *   { ok: true,  written: string[]|false, removed: string[], manifest }
 *   { ok: false, reason: string,  removed: [] }    on refuse
 *
 * `written` is `false` when glue is unchanged, or a list of
 * core-owned glue paths refreshed after the removal.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { removeFeature } from "../../packages/create-wp-project/src/removeFeature.js";
import { defaultFeatures } from "../../packages/create-wp-project/src/features.js";
import {
  buildManifest,
  writeManifest,
} from "../../packages/create-wp-project/src/manifest.js";

/**
 * Pre-populate a project directory with a v2-valid
 * project.config.json + a wpdev-kit.json that reflect a starting
 * feature set. Mirrors the seedProject helper in addFeature.test.js
 * so the test contract is parallel: addFeature and removeFeature
 * share the same on-disk shape.
 *
 * @param {string} tmp
 * @param {Record<string,string>} features
 * @returns {Promise<{cfg: Object, features: Object}>}
 */
async function seedProject(tmp, features) {
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
    generatedAt: "2026-06-15T00:00:00.000Z",
  });
  await writeManifest(tmp, manifest);
  return { cfg, features };
}

/**
 * Mirror the husky generator's run() output: write the owned
 * file the way a scaffold with husky:on would have left it. The
 * body matches `TEMPLATE_HUSKY_PRE_COMMIT` in
 * `generators/_templates.js` (the canonical "lint-staged" body),
 * so the test asserts a real artifact, not a synthetic stub.
 */
async function seedHuskyOn(tmp) {
  await fs.mkdir(path.join(tmp, ".husky"), { recursive: true });
  await fs.writeFile(
    path.join(tmp, ".husky", "pre-commit"),
    "#!/usr/bin/env sh\n\nnpx lint-staged\n",
    "utf8",
  );
  await fs.writeFile(
    path.join(tmp, ".husky", "commit-msg"),
    '#!/usr/bin/env sh\n\nnpx --no -- commitlint --edit "$1"\n',
    "utf8",
  );
  await fs.writeFile(
    path.join(tmp, "commitlint.config.cjs"),
    'module.exports = { extends: ["@commitlint/config-conventional"] };\n',
    "utf8",
  );
}

describe("removeFeature() — turn a feature OFF (Phase 22.9, 22.10)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-rm-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  /* -- happy path: toggle OFF removes owned files -- */

  test("turning husky off deletes husky-owned hook and commitlint files", async () => {
    // Seed: defaults (husky:on by default) + the real husky
    // artifact on disk (mimics what scaffoldProject would have
    // written when husky:on was the default).
    await seedProject(tmp, defaultFeatures());
    await seedHuskyOn(tmp);
    // Sanity: file exists before the call.
    const before = await fs.readFile(
      path.join(tmp, ".husky", "pre-commit"),
      "utf8",
    );
    expect(before).toMatch(/lint-staged/);

    const res = await removeFeature(tmp, "husky");
    expect(res.ok).toBe(true);
    expect(res.removed).toContain(".husky/pre-commit");
    expect(res.removed).toContain(".husky/commit-msg");
    expect(res.removed).toContain("commitlint.config.cjs");
    expect(Array.isArray(res.written) ? res.written.length : 0).toBeGreaterThan(
      0,
    );

    // Files are gone from disk.
    await expect(
      fs.readFile(path.join(tmp, ".husky", "pre-commit"), "utf8"),
    ).rejects.toThrow(/ENOENT/);
    await expect(
      fs.readFile(path.join(tmp, ".husky", "commit-msg"), "utf8"),
    ).rejects.toThrow(/ENOENT/);
    await expect(
      fs.readFile(path.join(tmp, "commitlint.config.cjs"), "utf8"),
    ).rejects.toThrow(/ENOENT/);
  });

  test("turning husky off sets features.husky='off' in wpdev-kit.json", async () => {
    await seedProject(tmp, defaultFeatures());
    await seedHuskyOn(tmp);

    const res = await removeFeature(tmp, "husky");
    expect(res.ok).toBe(true);

    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev-kit.json"), "utf8"),
    );
    expect(manifest.features.husky).toBe("off");
  });

  test("turning husky off sets features.husky='off' in project.config.json", async () => {
    await seedProject(tmp, defaultFeatures());
    await seedHuskyOn(tmp);

    await removeFeature(tmp, "husky");

    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(cfg.features.husky).toBe("off");
  });

  test("removeFeature preserves v2 fields in project.config.json (no data loss)", async () => {
    await seedProject(tmp, defaultFeatures());
    await seedHuskyOn(tmp);

    await removeFeature(tmp, "husky");

    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "project.config.json"), "utf8"),
    );
    expect(cfg.slug).toBe("my-project");
    expect(cfg.globalName).toBe("MyProject");
    expect(cfg.textDomain).toBe("my-project");
    expect(cfg.hookPrefix).toBe("my-project");
    expect(cfg.restNamespace).toBe("wpdev/v1");
  });

  test("turning exampleFeature off deletes all its owned files", async () => {
    // Seed: exampleFeature is on by default; create the three
    // owned files manually (mirroring the exampleFeature generator's
    // output). The removal must delete all of them.
    await seedProject(tmp, defaultFeatures());
    await fs.mkdir(path.join(tmp, "src/Modules/ExampleFeature/Rest"), {
      recursive: true,
    });
    await fs.mkdir(
      path.join(tmp, "src/Modules/ExampleFeature/assets/entries/__tests__"),
      { recursive: true },
    );
    await fs.mkdir(path.join(tmp, "tests/phpunit/Modules/ExampleFeature"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmp, "src/Modules/ExampleFeature/Module.php"),
      "<?php // Module body\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmp, "src/Modules/ExampleFeature/Rest/ItemsController.php"),
      "<?php // Controller body\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmp, "src/Modules/ExampleFeature/assets/entries/admin.ts"),
      "// admin entry\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(
        tmp,
        "src/Modules/ExampleFeature/assets/entries/__tests__/admin.test.ts",
      ),
      "test.todo('x');\n",
      "utf8",
    );
    await fs.writeFile(
      path.join(tmp, "tests/phpunit/Modules/ExampleFeature/ModuleTest.php"),
      "<?php // ModuleTest stub\n",
      "utf8",
    );

    const res = await removeFeature(tmp, "exampleFeature");
    expect(res.ok).toBe(true);
    expect(res.removed).toContain("src/Modules/ExampleFeature/Module.php");
    expect(res.removed).toContain(
      "src/Modules/ExampleFeature/Rest/ItemsController.php",
    );
    expect(res.removed).toContain(
      "src/Modules/ExampleFeature/assets/entries/admin.ts",
    );
    expect(res.removed).toContain(
      "tests/phpunit/Modules/ExampleFeature/ModuleTest.php",
    );
    expect(res.removed).toContain(
      "src/Modules/ExampleFeature/assets/entries/__tests__/admin.test.ts",
    );

    // All owned paths are gone.
    for (const rel of [
      "src/Modules/ExampleFeature/Module.php",
      "src/Modules/ExampleFeature/Rest/ItemsController.php",
      "src/Modules/ExampleFeature/assets/entries/admin.ts",
      "tests/phpunit/Modules/ExampleFeature/ModuleTest.php",
      "src/Modules/ExampleFeature/assets/entries/__tests__/admin.test.ts",
    ]) {
      await expect(fs.readFile(path.join(tmp, rel), "utf8")).rejects.toThrow(
        /ENOENT/,
      );
    }
  });

  test("removeFeature does not touch files outside the feature's owns", async () => {
    // Seed: husky on, the husky artifact present, AND a user file
    // OUTSIDE the husky owns list (e.g. src/index.ts the user
    // hand-wrote). The removal must delete only .husky/pre-commit
    // and leave the user file alone.
    await seedProject(tmp, defaultFeatures());
    await seedHuskyOn(tmp);
    const userFile = "src/some-user-file.ts";
    await fs.mkdir(path.join(tmp, "src"), { recursive: true });
    await fs.writeFile(path.join(tmp, userFile), "// user code\n", "utf8");

    await removeFeature(tmp, "husky");

    // User file untouched.
    const still = await fs.readFile(path.join(tmp, userFile), "utf8");
    expect(still).toBe("// user code\n");
  });

  /* -- guard: core is always-on -- */

  test("returns { ok:false, reason } when trying to remove the always-on core feature", async () => {
    await seedProject(tmp, defaultFeatures());

    const res = await removeFeature(tmp, "core");
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/core|always-on/i);
    expect(res.removed).toEqual([]);

    // Manifest unchanged.
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev-kit.json"), "utf8"),
    );
    expect(manifest.features).toEqual(defaultFeatures());
  });

  /* -- guard: unknown feature id -- */

  test("returns { ok:false, reason } for an unknown feature id", async () => {
    await seedProject(tmp, defaultFeatures());
    await seedHuskyOn(tmp);
    const huskyBefore = await fs.readFile(
      path.join(tmp, ".husky", "pre-commit"),
      "utf8",
    );

    const res = await removeFeature(tmp, "totallyMadeUpFeature");
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/not a known feature id|unknown|no generator/i);
    expect(res.removed).toEqual([]);

    // Nothing deleted: the husky file is still there with the
    // same body.
    const huskyAfter = await fs.readFile(
      path.join(tmp, ".husky", "pre-commit"),
      "utf8",
    );
    expect(huskyAfter).toBe(huskyBefore);
  });

  /* -- guard: project missing manifest -- */

  test("returns { ok:false, reason } on a project missing wpdev-kit.json", async () => {
    // Empty tmp — no manifest, no project.config.json.
    const res = await removeFeature(tmp, "husky");
    expect(res.ok).toBe(false);
    expect(res.reason).toBeDefined();
    expect(res.removed).toEqual([]);
    // Nothing was created in the tmp either.
    const entries = await fs.readdir(tmp);
    expect(entries).toEqual([]);
  });
});
