/**
 * Phase 25.A1 — js:none scaffold (PHP-only plugin).
 *
 * The `js` feature has four variants. Three are real (typescript,
 * pure, flow) and one is a no-op (`none`). When the consumer picks
 * `js: "none"`, the scaffold MUST produce a clean PHP-only project
 * — no JS build artifacts at all. The contracts locked here:
 *
 *  1. NO `assets/dependencies.{ts,js}` — the registry filter drops
 *     every `js:*` generator when `js === "none"`, so none of the
 *     TS/JS entry files are emitted.
 *  2. NO `tsconfig.json` — the core generator already gates the
 *     file on `js !== "none"` (core.js line 144).
 *  3. NO `package.json` in the cleanest case (`js:none && husky:off`)
 *     — the core gate drops it on `js === "none"`, and the scaffold
 *     explicitly deletes the file when `js:none && husky:off` (the
 *     "no Node toolchain to drive" rule).
 *  4. Core PHP bootstrap + `composer.json` STILL emitted — a
 *     PHP-only consumer is still a real WordPress plugin and must
 *     ship the plugin file (no src/Core framework copies in deps mode;
 *     ModuleLoader}.php, readme.txt, and composer.json.
 *  5. The CSS file (`assets/stylesheets/style.css`) is still
 *     emitted because CSS is a separate feature from JS — a
 *     PHP-only project may still want to ship styles.
 *
 * The tests below use both the registry + descriptor (unit-level)
 * and the end-to-end `scaffoldProject` (filesystem) path.
 *
 * Implementation note: the kit has a pre-existing circular import
 * between `core.js` and `../index.js` (core.js imports renderTemplate
 * from ../index.js; ../index.js imports generators which import
 * core.js). When a single test file pulls in BOTH `core.js`
 * directly AND `scaffoldProject` from `../index.js`, babel's
 * CommonJS transform resolves the cycle differently than raw ESM
 * and `getGenerators()` sees `core` as `undefined` in the
 * registry's `ALL` array. To avoid this, this test file does NOT
 * import `core.js` directly — it resolves the core descriptor via
 * `findGenerator("core")` from the registry.
 */

import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  getGenerators,
  listGenerators,
  findGenerator,
} from "../../packages/create-wp-project/src/generators/index.js";
import { scaffoldProject } from "../../packages/create-wp-project/src/index.js";

/* -------------------------------------------------------------------- */
/* Ctx builder (mirror of generators.js.test.js shape)                   */
/* -------------------------------------------------------------------- */

function makeCoreCtx(answers = {}, cfg = {}, features = {}) {
  const a = {
    slug: "my-project",
    npmScope: "myorg",
    globalName: "MyProject",
    localizeVar: "MyProjectLoc",
    textDomain: "my-project",
    hookPrefix: "my-project",
    depsBundle: "my-project-deps.js",
    phpFunctionPrefix: "myprj_",
    uiFramework: "preact",
    projectType: "plugin",
    ...answers,
  };
  const c = {
    slug: a.slug,
    globalName: a.globalName,
    localizeVar: a.localizeVar,
    textDomain: a.textDomain,
    hookPrefix: a.hookPrefix,
    npmScope: "@" + a.npmScope,
    depsBundle: a.depsBundle,
    phpFunctionPrefix: a.phpFunctionPrefix,
    uiFramework: a.uiFramework,
    projectType: a.projectType,
    restNamespace: "wpsk/v1",
    vendorPrefix: "WpskVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
    ...cfg,
  };
  // When js: none, the only safe sub-variants are jsLib: "none"
  // and jsTest: "none" (validateFeatureSet already enforces this).
  // We also force husky: "off" and the other "needs-js" toggles
  // off so the scaffold is a clean PHP-only plugin.
  const f = {
    js: "none",
    jsLib: "none",
    jsTest: "none",
    phpMinVersion: "7.4",
    phpFramework: "none",
    phpTest: "phpunit",
    restBatch: "off",
    faultTolerance: "off",
    vendorScoping: "on",
    husky: "off",
    css: "none",
    blocks: "off",
    license: "gpl2",
    wpMinVersion: "6.0",
    exampleFeature: "off",
    i18n: "off",
    ...features,
  };
  return { answers: a, cfg: c, features: f };
}

/* -------------------------------------------------------------------- */
/* Unit-level: core descriptor + registry filter                         */
/* -------------------------------------------------------------------- */

describe("js:none — core descriptor + registry filter (Phase 25.A1)", () => {
  test("core descriptor: does NOT claim any JS entry file (only tsconfig.json, conditionally)", () => {
    // Resolve the core descriptor via the registry (NOT a direct
    // import of core.js — see the file header note about the
    // circular import). A js:none consumer never sees any JS
    // entry, so core MUST NOT claim a JS file as its own.
    const core = findGenerator("core");
    expect(core).not.toBeNull();
    const owns = core.owns;
    const jsGlobs = owns.filter(
      (g) =>
        g.endsWith(".ts") ||
        g.endsWith(".js") ||
        g === ".flowconfig" ||
        g === "tsconfig.json",
    );
    // The only acceptable match: tsconfig.json — core owns it
    // conditionally. NO JS entry files, NO .flowconfig.
    const ok = jsGlobs.filter((g) => g === "tsconfig.json");
    expect(ok).toEqual(["tsconfig.json"]);
    const notAllowed = jsGlobs.filter((g) => g !== "tsconfig.json");
    expect(notAllowed).toEqual([]);
  });

  test("getGenerators({ js: 'none' }) does NOT enable any js:* descriptor", () => {
    const gens = getGenerators({ js: "none" });
    const ids = gens.map((g) => g.id);
    expect(ids).not.toContain("js:typescript");
    expect(ids).not.toContain("js:pure");
    expect(ids).not.toContain("js:flow");
  });

  test("getGenerators({ js: 'none' }) still includes core (always-on)", () => {
    const gens = getGenerators({ js: "none" });
    const ids = gens.map((g) => g.id);
    expect(ids).toContain("core");
  });

  test("js:none is the only variant with no js:* generator in the enabled list", () => {
    // Walk the four variants and confirm only "none" yields zero
    // js:* descriptors. This locks the registry contract.
    for (const variant of ["typescript", "pure", "flow", "none"]) {
      const ids = getGenerators({ js: variant }).map((g) => g.id);
      const jsIds = ids.filter((i) => i.startsWith("js:"));
      if (variant === "none") {
        expect(jsIds).toEqual([]);
      } else {
        expect(jsIds.length).toBe(1);
        expect(jsIds[0]).toBe(`js:${variant}`);
      }
    }
  });

  test("listGenerators() still includes the js:* descriptors (they exist in the catalog, just disabled)", () => {
    // Phase 22's `addFeature` looks up `js:*` by id+variant even
    // when the current feature set is `js:none`. The catalog must
    // still contain them.
    const all = listGenerators().map((g) => g.id);
    expect(all).toContain("js:typescript");
    expect(all).toContain("js:pure");
    expect(all).toContain("js:flow");
  });
});

/* -------------------------------------------------------------------- */
/* Unit-level: core.run() in isolation                                   */
/* -------------------------------------------------------------------- */

describe("js:none — core.run() output (Phase 25.A1)", () => {
  function getCoreRun() {
    const core = findGenerator("core");
    if (!core) throw new Error("core descriptor not found in registry");
    return core.run;
  }

  test("core.run() does NOT emit tsconfig.json when js=none", () => {
    const coreRun = getCoreRun();
    const out = coreRun(makeCoreCtx({}, {}, { js: "none" }));
    expect(out.files["tsconfig.json"]).toBeUndefined();
  });

  test("core.run() does NOT emit package.json when js=none", () => {
    const coreRun = getCoreRun();
    const out = coreRun(makeCoreCtx({}, {}, { js: "none" }));
    expect(out.files["package.json"]).toBeUndefined();
  });

  test("core.run() still emits the canonical PHP bootstrap set when js=none", () => {
    const coreRun = getCoreRun();
    const out = coreRun(makeCoreCtx({}, {}, { js: "none" }));
    const files = Object.keys(out.files);
    // Plugin bootstrap + core framework — must all be present.
    expect(files).toContain("my-project.php"); // {slug}.php
    // Phase 23 deps: no framework copies emitted regardless of js variant
    expect(files).not.toContain("src/Core/Plugin.php");
    expect(files).not.toContain("src/Core/ModuleInterface.php");
    expect(files).not.toContain("src/Core/ModuleLoader.php");
    // composer.json with the PSR-4 mapping.
    expect(files).toContain("composer.json");
    // The WordPress.org readme.
    expect(files).toContain("readme.txt");
  });

  test("core.run() still emits the CSS entry when js=none (CSS ≠ JS)", () => {
    const coreRun = getCoreRun();
    const out = coreRun(makeCoreCtx({}, {}, { js: "none" }));
    // CSS is owned by core, gated on the `css` feature, not on `js`.
    expect(out.files["assets/stylesheets/style.css"]).toBeDefined();
  });
});

/* -------------------------------------------------------------------- */
/* End-to-end: scaffoldProject (filesystem)                              */
/* -------------------------------------------------------------------- */

describe("js:none — end-to-end scaffold (Phase 25.A1)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-jsnone-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  const phpOnlyAnswers = {
    slug: "my-php-plugin",
    npmScope: "myorg",
    globalName: "MyPhpPlugin",
    localizeVar: "MyPhpPluginLoc",
    textDomain: "my-php-plugin",
    hookPrefix: "my-php-plugin",
    depsBundle: "my-php-plugin-deps.js",
    phpFunctionPrefix: "myphp_",
    uiFramework: "preact",
    projectType: "plugin",
  };

  const phpOnlyFeatures = {
    js: "none",
    jsLib: "none",
    jsTest: "none",
    phpMinVersion: "7.4",
    phpFramework: "none",
    phpTest: "phpunit",
    restBatch: "off",
    faultTolerance: "off",
    vendorScoping: "on",
    husky: "off",
    css: "none",
    blocks: "off",
    license: "gpl2",
    wpMinVersion: "6.0",
    exampleFeature: "off",
    i18n: "off",
  };

  test("writes NO assets/dependencies.{ts,js} (the JS dir contents)", async () => {
    const res = await scaffoldProject(tmp, phpOnlyAnswers, {
      features: phpOnlyFeatures,
    });
    expect(res.ok).toBe(true);
    // The JS entry must not exist.
    await expect(
      fs.access(path.join(tmp, "assets", "dependencies.ts")),
    ).rejects.toThrow();
    await expect(
      fs.access(path.join(tmp, "assets", "dependencies.js")),
    ).rejects.toThrow();
  });

  test("writes NO tsconfig.json", async () => {
    const res = await scaffoldProject(tmp, phpOnlyAnswers, {
      features: phpOnlyFeatures,
    });
    expect(res.ok).toBe(true);
    await expect(fs.access(path.join(tmp, "tsconfig.json"))).rejects.toThrow();
  });

  test("writes NO package.json (clean PHP-only: js:none && husky:off)", async () => {
    const res = await scaffoldProject(tmp, phpOnlyAnswers, {
      features: phpOnlyFeatures,
    });
    expect(res.ok).toBe(true);
    await expect(fs.access(path.join(tmp, "package.json"))).rejects.toThrow();
  });

  test("writes NO .flowconfig", async () => {
    const res = await scaffoldProject(tmp, phpOnlyAnswers, {
      features: phpOnlyFeatures,
    });
    expect(res.ok).toBe(true);
    await expect(fs.access(path.join(tmp, ".flowconfig"))).rejects.toThrow();
  });

  test("writes NO .husky/ directory (husky:off)", async () => {
    const res = await scaffoldProject(tmp, phpOnlyAnswers, {
      features: phpOnlyFeatures,
    });
    expect(res.ok).toBe(true);
    await expect(fs.access(path.join(tmp, ".husky"))).rejects.toThrow();
  });

  test("STILL writes the canonical PHP bootstrap + composer.json", async () => {
    const res = await scaffoldProject(tmp, phpOnlyAnswers, {
      features: phpOnlyFeatures,
    });
    expect(res.ok).toBe(true);
    // The plugin bootstrap (references WPSK\\Core from the dep).
    const pluginPhp = await fs.readFile(
      path.join(tmp, "my-php-plugin.php"),
      "utf8",
    );
    expect(pluginPhp).toMatch(/Plugin Name:/);
    expect(pluginPhp).toMatch(/WPSK\\Core\\Plugin::boot/);
    // Phase 23: core framework sources are NOT written (provided by dep).
    await expect(
      fs.access(path.join(tmp, "src", "Core", "ModuleInterface.php")),
    ).rejects.toThrow();
    // The composer.json with the PSR-4 mapping.
    const composer = JSON.parse(
      await fs.readFile(path.join(tmp, "composer.json"), "utf8"),
    );
    expect(composer.autoload["psr-4"]).toBeDefined();
    expect(Object.values(composer.autoload["psr-4"])).toContain("src/");
  });

  test("written[] list contains NO JS-related paths", async () => {
    const res = await scaffoldProject(tmp, phpOnlyAnswers, {
      features: phpOnlyFeatures,
    });
    expect(res.ok).toBe(true);
    // No JS entry file, no tsconfig, no package.json, no flowconfig.
    expect(res.written).not.toContain("assets/dependencies.ts");
    expect(res.written).not.toContain("assets/dependencies.js");
    expect(res.written).not.toContain("tsconfig.json");
    expect(res.written).not.toContain("package.json");
    expect(res.written).not.toContain(".flowconfig");
  });
});

/* -------------------------------------------------------------------- */
/* 25.A2 GREEN — theme-mode enqueue guard                                */
/* -------------------------------------------------------------------- */

describe("js:none — theme-mode PHP enqueue guard (Phase 25.A2)", () => {
  let tmp;
  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "wpsk-jsnone-theme-"));
  });
  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  const themeAnswers = {
    slug: "my-php-theme",
    npmScope: "myorg",
    globalName: "MyPhpTheme",
    localizeVar: "MyPhpThemeLoc",
    textDomain: "my-php-theme",
    hookPrefix: "my-php-theme",
    depsBundle: "my-php-theme-deps.js",
    phpFunctionPrefix: "myth_",
    uiFramework: "preact",
    projectType: "theme",
  };

  const phpOnlyThemeFeatures = {
    js: "none",
    jsLib: "none",
    jsTest: "none",
    phpMinVersion: "7.4",
    phpFramework: "none",
    phpTest: "phpunit",
    restBatch: "off",
    faultTolerance: "off",
    vendorScoping: "on",
    husky: "off",
    css: "none",
    blocks: "off",
    license: "gpl2",
    wpMinVersion: "6.0",
    exampleFeature: "off",
    i18n: "off",
  };

  test("functions.php (theme bootstrap) does NOT enqueue the missing JS bundle when js=none", async () => {
    // Phase 25.A2: a js:none theme has no bundle to enqueue.
    // The wpsk_enqueue_bundle_script() helper checks file_exists()
    // at runtime, but emitting the call site is still misleading
    // for a PHP-only project. The theme bootstrap must either
    // omit the enqueue OR guard it behind a js !== "none" check.
    const res = await scaffoldProject(tmp, themeAnswers, {
      features: phpOnlyThemeFeatures,
    });
    expect(res.ok).toBe(true);
    const fn = await fs.readFile(path.join(tmp, "functions.php"), "utf8");
    // The unconditional enqueue line must not be present.
    // We accept either:
    //   (a) the line is omitted entirely, OR
    //   (b) the call is wrapped in a `if (/* js !== "none" */) { ... }` guard.
    const hasUnconditionalEnqueue =
      /wpsk_enqueue_bundle_script\(\s*['"]my-php-theme-deps\.js['"]\s*\)/.test(
        fn,
      );
    if (hasUnconditionalEnqueue) {
      // If the call IS present, it must be inside a conditional
      // (e.g. `if (...) { wpsk_enqueue_bundle_script(...); }`).
      // The test fails if the call is at the top level of the
      // enqueue_assets() function.
      const unguarded =
        /function\s+\w+_enqueue_assets[^{]*\{[^}]*wpsk_enqueue_bundle_script\s*\(\s*['"]my-php-theme-deps\.js['"]\s*\)/s.test(
          fn,
        );
      expect(unguarded).toBe(false);
    }
  });

  test("functions.php still ships the stylesheet enqueue when js=none (CSS ≠ JS)", async () => {
    // The stylesheet enqueue is JS-independent — a PHP-only theme
    // can still ship its style.css. This guards against an
    // over-eager fix that strips the whole enqueue_assets() body.
    const res = await scaffoldProject(tmp, themeAnswers, {
      features: phpOnlyThemeFeatures,
    });
    expect(res.ok).toBe(true);
    const fn = await fs.readFile(path.join(tmp, "functions.php"), "utf8");
    expect(fn).toMatch(/wpsk_enqueue_stylesheet\(['"]style\.css['"]\)/);
  });
});
