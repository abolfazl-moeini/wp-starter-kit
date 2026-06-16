/**
 * Phase 25.G1 / 25.G2 — license generator.
 *
 * The `license` feature has three real variants (`gpl2`, `gpl3`,
 * `mit`). For every variant, the scaffold MUST emit:
 *
 *   - a `LICENSE` file at the project root with the canonical
 *     full text of the chosen license
 *   - a `composer.json` `"license"` field with the matching
 *     SPDX identifier (e.g. `GPL-2.0-or-later`, `GPL-3.0-or-later`,
 *     `MIT`) — the SPDX id is what WordPress.org / Packagist
 *     consume, so the LICENSE file body and the composer.json
 *     field MUST stay in lockstep.
 *
 * These contracts are locked here:
 *
 *  1. `license:gpl2`  → LICENSE body contains "GNU GENERAL PUBLIC
 *                        LICENSE" + "Version 2". The composer.json
 *                        `license` field (asserted in
 *                        `generators.core.test.js` line 212) is
 *                        "GPL-2.0-or-later" via `spdxForLicense`.
 *  2. `license:gpl3`  → LICENSE body contains "GNU GENERAL PUBLIC
 *                        LICENSE" + "Version 3". composer.json is
 *                        "GPL-3.0-or-later".
 *  3. `license:mit`   → LICENSE body contains "MIT License" +
 *                        "Permission is hereby granted". composer.json
 *                        is "MIT".
 *  4. `license:mit` (WordPress.org plugin context) emits a non-fatal
 *                        warning because WordPress.org requires GPL
 *                        compatibility. The scaffold still emits
 *                        MIT (we do not block) but the warning is
 *                        surfaced in `validateFeatureSet` so the
 *                        CLI can show it.
 *
 * Note on test scope: this test does NOT import `core.js` directly
 * (core.js is concurrently being modified by sibling phase-25
 * tasks). The composer.json license field is asserted at
 * `generators.core.test.js` line 212 — the lockstep guarantee
 * holds across both files because both are pure functions of
 * `features.license`. The LICENSE body test in this file is the
 * half that's only reachable through the license generator.
 */

import { describe, test, expect } from "@jest/globals";

import { run as licenseRun } from "../../packages/create-wp-project/src/generators/license.js";
import { validateFeatureSet } from "../../packages/create-wp-project/src/features.js";

/* -------------------------------------------------------------------- */
/* Test fixtures                                                         */
/* -------------------------------------------------------------------- */

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
    description: "A test plugin",
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
    description: a.description,
    vendorNamespace: "MyProject",
    frameworkPath: "../../packages/framework",
    frameworkVersion: "*@dev",
    ...cfg,
  };
  // Permissive default — every feature on EXCEPT the ones the test
  // wants to flip off. Tests pass only the features they want to
  // override via the `features` argument.
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
/* 25.G1 — license file body + composer.json SPDX id stay in lockstep   */
/* -------------------------------------------------------------------- */

describe("license generator (Phase 25.G1 — LICENSE body)", () => {
  test("license:gpl2 → LICENSE has GPL-2 text", () => {
    const out = licenseRun(makeCtx({}, {}, { license: "gpl2" }));
    expect(out.files["LICENSE"]).toBeDefined();
    // Body sanity: must contain the canonical GPL-2 phrasing.
    expect(out.files["LICENSE"]).toMatch(/GNU GENERAL PUBLIC LICENSE/i);
    expect(out.files["LICENSE"]).toMatch(/Version 2/);
    expect(out.files["LICENSE"]).toMatch(/Free Software Foundation/i);
  });

  test("license:gpl3 → LICENSE has GPL-3 text", () => {
    const out = licenseRun(makeCtx({}, {}, { license: "gpl3" }));
    expect(out.files["LICENSE"]).toBeDefined();
    expect(out.files["LICENSE"]).toMatch(/GNU GENERAL PUBLIC LICENSE/i);
    expect(out.files["LICENSE"]).toMatch(/Version 3/);
    expect(out.files["LICENSE"]).toMatch(/Free Software Foundation/i);
  });

  test("license:mit → LICENSE has MIT text", () => {
    const out = licenseRun(makeCtx({}, {}, { license: "mit" }));
    expect(out.files["LICENSE"]).toBeDefined();
    expect(out.files["LICENSE"]).toMatch(/MIT License/);
    expect(out.files["LICENSE"]).toMatch(
      /Permission is hereby granted, free of charge/i,
    );
  });
});

/* -------------------------------------------------------------------- */
/* 25.G2 — MIT + WordPress.org = non-fatal warning                       */
/* -------------------------------------------------------------------- */

describe("license validator (Phase 25.G2 — MIT + WordPress warning)", () => {
  test("validateFeatureSet surfaces a warning when license=mit is used with projectType:plugin (WordPress.org GPL constraint)", () => {
    // MIT is technically a valid SPDX license, but WordPress.org's
    // plugin directory requires GPL compatibility. We do NOT block
    // (a developer might intentionally ship MIT to .org-aware
    // projects with a GPL proxy), we WARN. The warning shape is:
    //   { ok: true, warnings: { license: "..." } } — note the
    //   `warnings` key (not `errors`).
    const features = {
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
      license: "mit",
      wpMinVersion: "6.0",
      exampleFeature: "on",
      i18n: "on",
      frontendStack: "none",
    };
    const result = validateFeatureSet(features);
    // The set itself is still valid (no errors); the warning is
    // advisory. The test is strict: the warning key MUST be
    // present, even if the set is otherwise clean.
    expect(result.ok).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings.license).toBeDefined();
    expect(result.warnings.license).toMatch(/MIT/i);
    expect(result.warnings.license).toMatch(/GPL|WordPress/i);
  });

  test("validateFeatureSet does NOT warn for license=gpl2 (GPL-compatible by default)", () => {
    const features = {
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
      frontendStack: "none",
    };
    const result = validateFeatureSet(features);
    expect(result.ok).toBe(true);
    // No license warning for the default (GPL-2 is already
    // GPL-compatible — no advisory to surface).
    if (result.warnings) {
      expect(result.warnings.license).toBeUndefined();
    }
  });
});
