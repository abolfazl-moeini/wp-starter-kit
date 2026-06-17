/**
 * Phase 21.3 / 21.4 — core generator.
 *
 * The "core" generator is always-on. It emits the files that
 * every wp-starter-kit consumer project has, regardless of which
 * features are turned on. The contracts locked here:
 *
 *  1. core.run(ctx) returns a contribution `{ files, dirs, deps, devDeps }`
 *     for a minimal valid ctx.
 *  2. The file set includes the golden BC list from plan §0.5:
 *     - project.config.json (with `features` key, dual-written
 *       after the generator runs by `syncFeaturesToConfig` —
 *       but the generator itself does NOT pre-stamp the key;
 *       it renders the template, and the scaffold applies the
 *       feature key in a separate step).
 *     - {slug}.php (the WordPress plugin bootstrap)
 *     - src/Core/{Plugin,ModuleInterface,ModuleLoader}.php
 *     - composer.json (PSR-4 + require php >= phpMinVersion)
 *     - README.md
 *     - .gitignore
 *     - readme.txt
 *     - build.config.json
 *  3. composer.json's PSR-4 namespace is derived from globalName
 *     (PascalCase → e.g. "MyProject"). The `require` block
 *     includes `php >= {phpMinVersion}`.
 *  4. tsconfig.json is included when js !== "none" and excluded
 *     when js === "none".
 *  5. package.json is included when js !== "none" and excluded
 *     when js === "none" (and husky is off — the scaffold's
 *     omit-when-js:none&&husky:off rule; the generator itself
 *     only knows about the js gate).
 *  6. project.config.json shape: every v2 field the legacy
 *     scaffold emitted (restNamespace, vendorPrefix,
 *     phpMinVersion, phpSourceVersion, batchEndpoint) is present.
 *
 * Tests run `core.run(ctx)` in isolation. They do not exercise
 * the scaffold wiring (that's Phase 21.12 / 21.13).
 */

import { describe, test, expect } from "@jest/globals";

import {
  run as coreRun,
  descriptor as coreDescriptor,
} from "../../packages/create-wp-project/src/generators/core.js";

/**
 * Build a minimal valid ctx for the core generator. Mirrors
 * what the scaffold will pass in Phase 21.13.
 */
function makeCtx(answers = {}, cfg = {}, features = {}) {
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
    restNamespace: "wpdev/v1",
    vendorPrefix: "WpdevVendor",
    phpMinVersion: "7.4",
    phpSourceVersion: "8.1",
    batchEndpoint: "/batch/v1",
    ...cfg,
  };
  const f = {
    js: "typescript",
    jsLib: "none",
    jsTest: "jest",
    phpMinVersion: "7.4",
    phpFramework: "none",
    phpTest: "phpunit",
    restBatch: "off",
    faultTolerance: "off",
    vendorScoping: "on",
    husky: "on",
    css: "none",
    blocks: "off",
    license: "gpl2",
    wpMinVersion: "6.0",
    exampleFeature: "on",
    i18n: "on",
    ...features,
  };
  return {
    answers: a,
    cfg: c,
    features: f,
  };
}

describe("core generator — always-on contribution (Phase 21.3/21.4)", () => {
  test("emits the BC golden file list for the default plugin feature set (deps mode: no framework copies)", () => {
    const out = coreRun(makeCtx());
    const files = Object.keys(out.files);
    // Phase 23: consumer gets framework from wpdev/framework dep; scaffold
    // only emits thin glue + user-owned src/Modules (when example on).
    // Core no longer writes src/Core/* (those live in the installed package).
    expect(files).toContain("project.config.json");
    expect(files).toContain("build.config.json");
    expect(files).toContain("readme.txt");
    expect(files).toContain("my-project.php"); // {slug}.php
    expect(files).not.toContain("src/Core/Plugin.php");
    expect(files).not.toContain("src/Core/ModuleInterface.php");
    expect(files).not.toContain("src/Core/ModuleLoader.php");
    expect(files).toContain("assets/stylesheets/style.css");
    expect(files).toContain("composer.json");
    expect(files).toContain("README.md");
    expect(files).toContain(".gitignore");
    expect(files).toContain(".editorconfig");
    // js !== "none" (default) → tsconfig.json + package.json.
    expect(files).toContain("tsconfig.json");
    expect(files).toContain("package.json");
  });

  test("emits {slug}.php with PHP plugin headers + Plugin::boot wiring (BC)", () => {
    const out = coreRun(makeCtx());
    const php = out.files["my-project.php"];
    // WordPress plugin file headers (Phase 11)
    expect(php).toMatch(/Plugin Name:/);
    expect(php).toMatch(/Version:/);
    expect(php).toMatch(/Requires PHP:/);
    expect(php).toMatch(/Text Domain:/);
    // ABSPATH guard + autoload + Plugin::boot
    expect(php).toMatch(/defined\s*\(\s*['"]ABSPATH['"]\s*\)/);
    expect(php).toMatch(/require_once.*vendor\/autoload\.php/);
    expect(php).toMatch(/WPDev\\Core\\Plugin::boot/);
  });

  // Phase 23: the WPSK\\Core framework classes are provided exclusively
  // by the "wpdev/framework" Composer dependency (see packages/framework/src/Core/*).
  // The scaffold never emits src/Core/*.php copies for consumer projects
  // (they would be dead files: consumer autoload only maps the user's
  // vendor ns to src/, and the dep satisfies the WPSK references from
  // the plugin bootstrap and user modules). These bodies are tested
  // in the framework package's own PHPUnit suite instead.
  test("does NOT emit src/Core/* framework sources (they come from wpdev/framework dep)", () => {
    const out = coreRun(makeCtx());
    expect(out.files["src/Core/Plugin.php"]).toBeUndefined();
    expect(out.files["src/Core/ModuleInterface.php"]).toBeUndefined();
    expect(out.files["src/Core/ModuleLoader.php"]).toBeUndefined();
  });

  test("emits project.config.json with every v2 default field", () => {
    const out = coreRun(makeCtx());
    const cfg = JSON.parse(out.files["project.config.json"]);
    expect(cfg).toEqual({
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
    });
  });

  test("emits composer.json with PSR-4 vendor → src/ and require php >= phpMinVersion", () => {
    const out = coreRun(
      makeCtx({}, { phpMinVersion: "8.1" }, { phpMinVersion: "8.1" }),
    );
    const composer = JSON.parse(out.files["composer.json"]);
    // Composer package name is lower-cased globalName / slug.
    expect(composer.name).toBe("myproject/my-project");
    // PSR-4 mapping: vendorNamespace (PascalCase of globalName) → src/
    expect(composer.autoload["psr-4"]).toBeDefined();
    const psr4 = composer.autoload["psr-4"];
    // At least one entry maps to "src/"
    const srcEntry = Object.values(psr4).find((v) => v === "src/");
    expect(srcEntry).toBeDefined();
    // The key is the vendor namespace (PascalCase, e.g. "MyProject\\")
    // — the trailing backslash is the PSR-4 namespace separator.
    const keys = Object.keys(psr4);
    expect(keys.some((k) => k.startsWith("MyProject"))).toBe(true);
    // require.php >= 8.1
    expect(composer.require.php).toBe(">=8.1");
  });

  test("emits composer.json with the right license field for each license variant", () => {
    const gpl2 = coreRun(makeCtx({}, {}, { license: "gpl2" }));
    const gpl3 = coreRun(makeCtx({}, {}, { license: "gpl3" }));
    const mit = coreRun(makeCtx({}, {}, { license: "mit" }));
    expect(JSON.parse(gpl2.files["composer.json"]).license).toBe(
      "GPL-2.0-or-later",
    );
    expect(JSON.parse(gpl3.files["composer.json"]).license).toBe(
      "GPL-3.0-or-later",
    );
    expect(JSON.parse(mit.files["composer.json"]).license).toBe("MIT");
  });

  test("emits package.json with @myorg scope and the preact react alias when uiFramework=preact", () => {
    const out = coreRun(makeCtx({ uiFramework: "preact" }));
    const pkg = JSON.parse(out.files["package.json"]);
    expect(pkg.name).toBe("@myorg/my-project");
    expect(pkg.dependencies.react).toBe("npm:@preact/compat");
    expect(pkg.dependencies["react-dom"]).toBe("npm:@preact/compat");
  });

  test("emits package.json WITHOUT the preact alias when uiFramework=react", () => {
    const out = coreRun(makeCtx({ uiFramework: "react" }));
    const pkg = JSON.parse(out.files["package.json"]);
    expect(pkg.dependencies.react).not.toBe("npm:@preact/compat");
  });

  test("emits tsconfig.json only when js !== 'none' (gate)", () => {
    const on = coreRun(makeCtx({}, {}, { js: "typescript" }));
    expect(on.files["tsconfig.json"]).toBeDefined();
    const none = coreRun(makeCtx({}, {}, { js: "none" }));
    expect(none.files["tsconfig.json"]).toBeUndefined();
  });

  test("emits package.json only when js !== 'none' (gate)", () => {
    const on = coreRun(makeCtx({}, {}, { js: "typescript" }));
    expect(on.files["package.json"]).toBeDefined();
    const none = coreRun(makeCtx({}, {}, { js: "none" }));
    expect(none.files["package.json"]).toBeUndefined();
  });

  test("emits readme.txt in WordPress.org plugin format", () => {
    const out = coreRun(makeCtx());
    const readme = out.files["readme.txt"];
    // WP.org plugin readme.txt has the documented header markers.
    expect(readme).toMatch(/===\s*[^=\n]+\s*===/); // plugin title
    expect(readme).toMatch(/Contributors:/);
    expect(readme).toMatch(/Tags:/);
    expect(readme).toMatch(/Requires at least:/);
    expect(readme).toMatch(/Tested up to:/);
    expect(readme).toMatch(/Stable tag:/);
    expect(readme).toMatch(/License:/);
  });

  test("emits build.config.json with the style entry-point list", () => {
    const out = coreRun(makeCtx());
    const cfg = JSON.parse(out.files["build.config.json"]);
    expect(cfg.styleEntryPoints).toEqual(
      expect.arrayContaining(["assets/stylesheets/style.css"]),
    );
  });

  test("emits assets/stylesheets/style.css as a real CSS body", () => {
    const out = coreRun(makeCtx());
    const css = out.files["assets/stylesheets/style.css"];
    expect(css).toMatch(/body\s*\{/);
  });

  test("emits functions.php (instead of {slug}.php) when projectType='theme'", () => {
    const out = coreRun(makeCtx({ projectType: "theme" }));
    expect(out.files["functions.php"]).toBeDefined();
    expect(out.files["my-project.php"]).toBeUndefined();
    const fn = out.files["functions.php"];
    // BC: theme bootstrap uses wpdev_* framework helpers + slug_underscore
    expect(fn).toMatch(/\bwpdev_enqueue_bundle_script\b/);
    expect(fn).toMatch(/\bwpdev_enqueue_stylesheet\b/);
    expect(fn).toMatch(/\bmy_project_setup\b/);
    expect(fn).toMatch(/\bmy_project_enqueue_assets\b/);
  });

  test("emits README.md with branding tokens substituted", () => {
    const out = coreRun(makeCtx());
    const readme = out.files["README.md"];
    expect(readme).toContain("my-project");
    expect(readme).toContain("MyProject");
    expect(readme).toContain("MyProjectLoc");
    expect(readme).toContain("myprj_");
  });

  test("emits .gitignore with the standard WordPress-plugin ignore list", () => {
    const out = coreRun(makeCtx());
    const gi = out.files[".gitignore"];
    expect(gi).toMatch(/node_modules\//);
    expect(gi).toMatch(/vendor\//);
    expect(gi).toMatch(/build\//);
    expect(gi).toMatch(/dist\//);
    expect(gi).toMatch(/\.DS_Store/);
  });

  test("emits .editorconfig with the standard 2-space indent + final-newline", () => {
    const out = coreRun(makeCtx());
    const ec = out.files[".editorconfig"];
    expect(ec).toMatch(/root\s*=\s*true/);
    expect(ec).toMatch(/indent_size\s*=\s*2/);
    expect(ec).toMatch(/insert_final_newline\s*=\s*true/);
  });

  test("the contribution is pure — calling run() twice with the same ctx yields the same files", () => {
    const ctx = makeCtx();
    const a = coreRun(ctx);
    const b = coreRun(ctx);
    expect(Object.keys(a.files).sort()).toEqual(Object.keys(b.files).sort());
    for (const k of Object.keys(a.files)) {
      expect(a.files[k]).toBe(b.files[k]);
    }
  });

  test("the contribution is a stable, non-empty file set (no undefined / null entries)", () => {
    const out = coreRun(makeCtx());
    for (const [rel, body] of Object.entries(out.files)) {
      expect(typeof rel).toBe("string");
      expect(rel.length).toBeGreaterThan(0);
      expect(typeof body).toBe("string");
      expect(body.length).toBeGreaterThan(0);
    }
  });
});

describe("core descriptor — registry shape (Phase 21.4)", () => {
  test("descriptor has the registry shape { id, feature, owns, run }", () => {
    expect(coreDescriptor.id).toBe("core");
    // core is always-on; feature is null (per the registry contract).
    expect(coreDescriptor.feature).toBeNull();
    expect(Array.isArray(coreDescriptor.owns)).toBe(true);
    expect(typeof coreDescriptor.run).toBe("function");
  });
});
