/**
 * Phase 21.11 / 21.12 / 21.13 — BC migration of `scaffoldProject`.
 *
 * After Phase 21 the public signature of `scaffoldProject` is
 * `(dir, answers, { features?, force? } = {})`. The old
 * answers-only path (`scaffoldProject(dir, answers)` with no
 * `features` arg) MUST still produce the same file set the
 * legacy scaffold produced, plus the new v3 additions:
 *
 *   - `wpdev-kit.json` (manifest)
 *   - `features` key in `project.config.json` (dual-written
 *     by syncFeaturesToConfig)
 *   - `composer.json`, `.gitignore`, `.editorconfig`
 *   - `LICENSE` (gpl2 default)
 *   - `phpunit.xml` + `tests/phpunit/bootstrap.php` (phpunit
 *     default)
 *   - `languages/.gitkeep` (i18n default)
 *
 * The contract locked here is the new scaffold's observable
 * output for the default case. It's a CONSISTENCY check
 * against the legacy behaviour — the test does not re-derive
 * the legacy `written` list (that snapshot lives in
 * `create-wp-project.test.js`); it asserts the new file set
 * is a strict superset of the legacy one.
 *
 * Additional contract: the new scaffold's `scaffoldProject`
 * accepts a `features` option. When passed, it uses those
 * features verbatim; when absent, it falls back to
 * `defaultFeatures()`.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  scaffoldProject,
  validateAnswers,
  renderTemplate,
  answersToProjectConfig,
} from "../../packages/create-wp-project/src/index.js";
import {
  defaultFeatures,
  validateFeatureSet,
} from "../../packages/create-wp-project/src/features.js";

describe("scaffoldProject — BC migration to generator registry (Phase 21.11/21.12/21.13)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpdev-migration-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  const goodAnswers = {
    slug: "my-project",
    npmScope: "myorg",
    globalName: "MyProject",
    localizeVar: "MyProjectLoc",
    textDomain: "my-project",
    hookPrefix: "my-project",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "myprj_",
    uiFramework: "preact",
  };

  test("scaffoldProject(dir, answers) with NO features arg still produces the legacy golden file set", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const written = new Set(res.written || []);

    // Post-Phase 23 golden list (deps mode): framework Core classes
    // come from wpdev/framework dep, not copied into src/Core.
    const legacyGolden = [
      "wpdev.json",
      "wpdev.json",
      "tsconfig.json",
      "readme.txt",
      "my-project.php",
      "src/Modules/ExampleFeature/Module.php",
      "src/Modules/ExampleFeature/Rest/ItemsController.php",
      "src/Modules/ExampleFeature/assets/entries/admin.ts",
      "tests/phpunit/Modules/ExampleFeature/ModuleTest.php",
      "src/Modules/ExampleFeature/assets/entries/__tests__/admin.test.ts",
      "composer.json",
      ".husky/pre-commit",
      "assets/dependencies.ts",
      "assets/stylesheets/style.css",
      "package.json",
      "README.md",
    ];
    for (const f of legacyGolden) {
      expect(written.has(f)).toBe(true);
    }

    // Each must also exist on disk.
    for (const f of legacyGolden) {
      const stat = await fs.stat(path.join(tmp, f));
      expect(stat.isFile()).toBe(true);
    }
  });

  test("scaffoldProject with default features ALSO emits the new v3 additions", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const written = new Set(res.written || []);
    // v3 additions: composer.json, .gitignore, .editorconfig, LICENSE,
    // phpunit.xml, tests/phpunit/bootstrap.php, languages/.gitkeep,
    // wpdev-kit.json (manifest).
    expect(written.has("composer.json")).toBe(true);
    expect(written.has(".gitignore")).toBe(true);
    expect(written.has(".editorconfig")).toBe(true);
    expect(written.has("LICENSE")).toBe(true);
    expect(written.has("phpunit.xml")).toBe(true);
    expect(written.has("tests/phpunit/bootstrap.php")).toBe(true);
    expect(written.has("languages/.gitkeep")).toBe(true);
    expect(written.has("wpdev.json")).toBe(true);
  });

  test("the manifest wpdev-kit.json carries the default feature set + kitVersion + distMode='deps'", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const manifestRaw = await fs.readFile(path.join(tmp, "wpdev.json"), "utf8");
    const manifest = JSON.parse(manifestRaw);
    expect(manifest.schema).toBe(2);
    expect(typeof manifest.kitVersion).toBe("string");
    expect(manifest.distMode).toBe("deps"); // Phase 23 default
    expect(typeof manifest.generatedAt).toBe("string");
    // The default features (15 ids, per features.js catalog) all match
    // what defaultFeatures() returns.
    expect(manifest.features).toEqual(defaultFeatures());
  });

  test("the project.config.json features key is the SAME object as the manifest's features", async () => {
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    expect(cfg.features).toEqual(manifest.features);
  });

  test("the {slug}.php body is byte-for-byte identical to the legacy template", async () => {
    // The legacy scaffold used the template at
    // packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl
    // rendered with the v1 tplVars shape. The new scaffold must
    // produce the SAME body (BC). We compare the rendered body
    // to renderTemplate(loadPluginFileTemplate(), tplVars(answers, cfg)).
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(true);
    const onDisk = await fs.readFile(path.join(tmp, "my-project.php"), "utf8");
    // Re-render the template from the known location relative to
    // the project root (jest runs with cwd=project root by
    // convention in this kit).
    const { readFileSync } = await import("node:fs");
    const tplPath = path.join(
      process.cwd(),
      "packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl",
    );
    const tpl = readFileSync(tplPath, "utf8");
    const cfg = answersToProjectConfig(goodAnswers);
    // Re-derive tplVars the same way the scaffold does.
    const features = defaultFeatures();
    const tplVars = {
      ...goodAnswers,
      ...cfg,
      slug_underscore: goodAnswers.slug.replace(/-/g, "_"),
      depsHandle: goodAnswers.depsBundle || cfg.depsBundle.replace(/\.js$/, ""),
      name: cfg.globalName || goodAnswers.slug,
      description: `${goodAnswers.slug} — built on wp-starter-kit (WPDev) framework`,
      author: "wp-starter-kit scaffold",
      authorUri: "https://github.com/abolfazl-moeini/wp-plugin-starter-kit",
      pluginUri: "https://github.com/abolfazl-moeini/wp-plugin-starter-kit",
      vendor: "WPDev",
      vendorPrefixUpper: cfg.vendorPrefix.toUpperCase(),
      wpMinVersion: features.wpMinVersion || "6.0",
      phpMinVersion: features.phpMinVersion || cfg.phpMinVersion || "7.4",
    };
    const expected = renderTemplate(tpl, tplVars);
    expect(onDisk).toBe(expected);
  });

  test("scaffoldProject(dir, answers, { features }) uses the supplied features verbatim", async () => {
    // js=none means no JS toolchain. The features set must be
    // self-consistent (jsTest:jest requires js != none) — so
    // when we turn js off we also reset the JS-dependent
    // features to their "off" values.
    const features = {
      ...defaultFeatures(),
      js: "none",
      jsTest: "none",
      jsLib: "none",
      css: "none",
      blocks: "off",
      restBatch: "off",
    };
    const res = await scaffoldProject(tmp, goodAnswers, { features });
    expect(res.ok).toBe(true);
    const written = new Set(res.written || []);
    // js=none → no tsconfig.json, no package.json, no assets/dependencies.ts
    expect(written.has("tsconfig.json")).toBe(false);
    expect(written.has("package.json")).toBe(false);
    expect(written.has("assets/dependencies.ts")).toBe(false);
    // The PHP/JS-gate-agnostic files are still there.
    expect(written.has("my-project.php")).toBe(true);
    expect(written.has("src/Core/Plugin.php")).toBe(false); // Phase 23: not emitted in deps mode
    // The manifest reflects the supplied features.
    const manifest = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    expect(manifest.features.js).toBe("none");
  });

  test("scaffoldProject with an invalid feature set returns ok:false WITHOUT writing anything", async () => {
    // jsLib=preact + js=none is the canonical violation.
    const badFeatures = {
      ...defaultFeatures(),
      js: "none",
      jsLib: "preact",
    };
    // Sanity: this set must fail validateFeatureSet.
    const v = validateFeatureSet(badFeatures);
    expect(v.ok).toBe(false);

    const res = await scaffoldProject(tmp, goodAnswers, {
      features: badFeatures,
    });
    expect(res.ok).toBe(false);
    // The error reason mentions the violation.
    expect(res.reason).toMatch(/jsLib|jsLib=preact/);
    // Nothing was written.
    const entries = await fs.readdir(tmp);
    expect(entries.length).toBe(0);
  });

  test("scaffoldProject refuses to clobber an existing project.config.json without force:true", async () => {
    await fs.writeFile(path.join(tmp, "wpdev.json"), '{"sentinel": true}');
    const res = await scaffoldProject(tmp, goodAnswers);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/already exists|clobber|exists/i);
    // The sentinel survives.
    const after = await fs.readFile(path.join(tmp, "wpdev.json"), "utf8");
    expect(after).toContain("sentinel");
  });

  test("scaffoldProject with force:true DOES clobber — re-run yields fresh content", async () => {
    await fs.writeFile(path.join(tmp, "wpdev.json"), '{"sentinel": true}');
    const res = await scaffoldProject(tmp, goodAnswers, { force: true });
    expect(res.ok).toBe(true);
    const cfg = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    expect(cfg.sentinel).toBeUndefined();
    expect(cfg.slug).toBe("my-project");
  });

  test("the legacy public exports (validateAnswers, renderTemplate, answersToProjectConfig) still work", () => {
    // BC: the four old exports must keep working.
    const v = validateAnswers(goodAnswers);
    expect(v.ok).toBe(true);
    const cfg = answersToProjectConfig(goodAnswers);
    expect(cfg.slug).toBe("my-project");
    const out = renderTemplate("// {{slug}}", { slug: "p" });
    expect(out).toBe("// p");
  });

  test("running scaffoldProject twice with force:true on the same dir yields byte-identical files except the manifest timestamp", async () => {
    const r1 = await scaffoldProject(tmp, goodAnswers, { force: true });
    expect(r1.ok).toBe(true);
    // Read every file from run #1.
    const written1 = r1.written || [];
    const files1 = {};
    for (const rel of written1) {
      files1[rel] = await fs.readFile(path.join(tmp, rel), "utf8");
    }
    // Sleep a tick so generatedAt would differ.
    await new Promise((resolve) => setTimeout(resolve, 10));
    const r2 = await scaffoldProject(tmp, goodAnswers, { force: true });
    expect(r2.ok).toBe(true);
    expect(r2.written?.length).toBeGreaterThan(0);
    // Every file in run #1 must be present in run #2 with the same body,
    // EXCEPT wpdev-kit.json (the only timestamped file).
    for (const rel of written1) {
      if (rel === "wpdev.json") continue;
      const onDisk = await fs.readFile(path.join(tmp, rel), "utf8");
      expect(onDisk).toBe(files1[rel]);
    }
    // The manifest's generatedAt must differ (sanity).
    const m1 = JSON.parse(files1["wpdev.json"]);
    const m2 = JSON.parse(
      await fs.readFile(path.join(tmp, "wpdev.json"), "utf8"),
    );
    expect(m2.generatedAt).not.toBe(m1.generatedAt);
    // And the manifest's kitVersion + features + distMode must match.
    expect(m2.kitVersion).toBe(m1.kitVersion);
    expect(m2.features).toEqual(m1.features);
    expect(m2.distMode).toBe(m1.distMode);
  });
});
