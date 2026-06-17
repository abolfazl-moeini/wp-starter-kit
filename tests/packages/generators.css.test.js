/**
 * Phase 25.H1 / 25.H2 — CSS variant generators.
 *
 * The `css` feature has four variants:
 *
 *   - `css:none`     No CSS build step. The consumer relies on the
 *                    core-emitted `assets/stylesheets/style.css`
 *                    and writes hand-authored CSS only. css.js
 *                    returns NO files (and no devDeps) for this
 *                    variant. The registry filter already drops
 *                    css.js when css=none (defence in depth in
 *                    the generator as well).
 *   - `css:sass`     dart-sass build pipeline. Emits a `.sassrc`
 *                    config (include paths + output style) and
 *                    adds `sass` (dart-sass) to devDependencies.
 *                    The esbuild sass plugin is configured via
 *                    core's `build.config.json` (Phase 25.A area,
 *                    out of scope here).
 *   - `css:tailwind` Tailwind CSS — a utility-first framework that
 *                    compiles through PostCSS. Emits BOTH
 *                    `tailwind.config.js` (Tailwind's content
 *                    config) AND `postcss.config.js` (the PostCSS
 *                    pipeline that drives Tailwind). Adds
 *                    `tailwindcss`, `postcss`, and `autoprefixer`
 *                    to devDependencies.
 *   - `css:postcss`  Plain PostCSS pipeline. Emits
 *                    `postcss.config.js` with the autoprefixer
 *                    plugin. Adds `postcss` and `autoprefixer`
 *                    to devDependencies.
 *
 * The `css !== "none"` variants all require `js !== "none"` (a
 * css build pipeline needs a JS-driven bundler). The registry
 * filter enforces this; the generator's early-return is defence
 * in depth — tested explicitly here.
 *
 * Three contracts are locked in this file:
 *
 *  1. Each non-none variant emits the expected files + devDeps.
 *     Body sanity-checks assert the configs are syntactically
 *     parseable (Tailwind's `export default`, PostCSS's
 *     `export default`, sassrc's `outputStyle`).
 *  2. `css=none` emits nothing — the consumer relies on
 *     core's plain `style.css`.
 *  3. `css=tailwind` emits BOTH `tailwind.config.js` AND
 *     `postcss.config.js` (Tailwind is a PostCSS plugin, the
 *     pipeline config is required).
 */

import { describe, test, expect } from "@jest/globals";

import { run as cssRun } from "../../packages/create-wp-project/src/generators/css.js";

/* -------------------------------------------------------------------- */
/* Test fixtures                                                         */
/* -------------------------------------------------------------------- */

function makeCtx(features = {}) {
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
  return { answers: a, cfg: c, features: f, vars: c };
}

/* -------------------------------------------------------------------- */
/* 25.H1 — per-variant file + devDep contract                            */
/* -------------------------------------------------------------------- */

describe("css generator (Phase 25.H1 — per-variant file + devDep contract)", () => {
  test("css:sass → .sassrc (dart-sass) + sass devDep", () => {
    const out = cssRun(makeCtx({ css: "sass", js: "typescript" }));
    expect(out.files[".sassrc"]).toBeDefined();
    // .sassrc body sanity: must be valid JSON with outputStyle
    expect(() => JSON.parse(out.files[".sassrc"])).not.toThrow();
    const rc = JSON.parse(out.files[".sassrc"]);
    expect(rc.outputStyle).toBeDefined();
    expect(Array.isArray(rc.includePaths)).toBe(true);
    // dart-sass npm dep
    expect(out.devDeps.sass).toBeDefined();
    // No esbuild-sass plugin dep on the generator's side (that's
    // build.config.json's job — out of scope for css.js).
    expect(out.devDeps["esbuild-sass"]).toBeUndefined();
  });

  test("css:tailwind → tailwind.config.js AND postcss.config.js + tailwindcss/postcss/autoprefixer devDeps", () => {
    const out = cssRun(makeCtx({ css: "tailwind", js: "typescript" }));
    // BOTH configs required: Tailwind is a PostCSS plugin, the
    // consumer needs the PostCSS pipeline to compile Tailwind.
    expect(out.files["tailwind.config.js"]).toBeDefined();
    expect(out.files["postcss.config.js"]).toBeDefined();
    // Body sanity: tailwind config uses `export default`
    expect(out.files["tailwind.config.js"]).toMatch(/export default/);
    expect(out.files["tailwind.config.js"]).toMatch(/content:/);
    // Body sanity: postcss config uses `export default` and lists
    // tailwindcss + autoprefixer as plugins
    expect(out.files["postcss.config.js"]).toMatch(/export default/);
    expect(out.files["postcss.config.js"]).toMatch(/tailwindcss/);
    expect(out.files["postcss.config.js"]).toMatch(/autoprefixer/);
    // All three deps present
    expect(out.devDeps.tailwindcss).toBeDefined();
    expect(out.devDeps.postcss).toBeDefined();
    expect(out.devDeps.autoprefixer).toBeDefined();
  });

  test("css:postcss → postcss.config.js with autoprefixer + postcss/autoprefixer devDeps", () => {
    const out = cssRun(makeCtx({ css: "postcss", js: "typescript" }));
    expect(out.files["postcss.config.js"]).toBeDefined();
    // Body sanity: must declare autoprefixer
    expect(out.files["postcss.config.js"]).toMatch(/export default/);
    expect(out.files["postcss.config.js"]).toMatch(/autoprefixer/);
    // No tailwind dep (plain PostCSS pipeline)
    expect(out.devDeps.tailwindcss).toBeUndefined();
    // Plain PostCSS deps
    expect(out.devDeps.postcss).toBeDefined();
    expect(out.devDeps.autoprefixer).toBeDefined();
  });

  test("css:none → emits NO files (consumer relies on core's plain style.css)", () => {
    const out = cssRun(makeCtx({ css: "none", js: "typescript" }));
    expect(Object.keys(out.files)).toEqual([]);
    // No devDeps either — there's no build step
    expect(Object.keys(out.devDeps)).toEqual([]);
  });
});

/* -------------------------------------------------------------------- */
/* 25.H2 — defence in depth: css=non-none + js=none → nothing            */
/* -------------------------------------------------------------------- */

describe("css generator (Phase 25.H2 — gate enforcement)", () => {
  test("css:sass + js:none → emits nothing (registry gate + defence in depth)", () => {
    // The registry filter drops css.js when js=none, but the
    // generator's own early-return is the second line of defence.
    // The Phase 25 plan §25.H1 explicitly states: "All non-none
    // require js ≠ none."
    const out = cssRun(makeCtx({ css: "sass", js: "none" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("css:tailwind + js:none → emits nothing", () => {
    const out = cssRun(makeCtx({ css: "tailwind", js: "none" }));
    expect(Object.keys(out.files)).toEqual([]);
  });

  test("css:postcss + js:none → emits nothing", () => {
    const out = cssRun(makeCtx({ css: "postcss", js: "none" }));
    expect(Object.keys(out.files)).toEqual([]);
  });
});
