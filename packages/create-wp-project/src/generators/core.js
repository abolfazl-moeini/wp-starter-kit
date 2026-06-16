/**
 * @wpsk/create-wp-project — core generator (Phase 21).
 *
 * The "core" generator is always-on. It emits the files that
 * every wp-starter-kit consumer project has, regardless of which
 * features are turned on:
 *
 *   - project.config.json (with a `features` key, dual-written to
 *     wpsk-kit.json by `syncFeaturesToConfig` + `writeManifest`
 *     after the generator runs)
 *   - {slug}.php   (the WordPress plugin bootstrap) — plugin mode
 *   - src/Core/{Plugin,ModuleInterface,ModuleLoader}.php
 *   - wpsk-kit.json  (manifest, written by the scaffold AFTER the
 *     generator runs — NOT by the generator itself)
 *   - composer.json (PSR-4 vendor namespace → src/, php >= phpMinVersion)
 *   - package.json (with JS build scripts + devDeps when js ≠ none
 *     OR husky is on; see Phase 21.13 — the file is omitted only
 *     when js === "none" AND husky === "off", in which case the
 *     consumer has no Node toolchain to drive)
 *   - README.md, .gitignore, .editorconfig, readme.txt, build.config.json
 *   - tsconfig.json (only when js !== "none" — gated by the registry;
 *     core itself does NOT emit it when js is none, so a php-only
 *     project never sees a tsconfig.json file)
 *
 * The generator signature is the documented one for Phase 21:
 *   run(ctx) -> { files, dirs, deps, devDeps }
 * The scaffold calls `run()` and merges `files` into the final
 * write set, in registry order.
 *
 * The templates are inherited verbatim from the legacy `scaffoldProject`
 * body (packages/create-wp-project/src/index.js) — we keep the same
 * template strings so the BC file list is byte-identical (Phase 21.11).
 */

import { renderTemplate } from "../index.js";
import { tplVars as legacyTplVars } from "./_templateVars.js";
import {
  TEMPLATE_PROJECT_CONFIG,
  TEMPLATE_FUNCTIONS_PHP,
  TEMPLATE_FUNCTIONS_PHP_NO_JS,
  TEMPLATE_DEPENDENCIES_TS,
  TEMPLATE_STRAUSS_JSON,
  TEMPLATE_HUSKY_PRE_COMMIT,
  TEMPLATE_EXAMPLE_FEATURE_ITEMS_CONTROLLER,
  TEMPLATE_EXAMPLE_FEATURE_ADMIN_TS,
  TEMPLATE_BUILD_CONFIG,
  TEMPLATE_STYLESHEET,
  TEMPLATE_README,
  TEMPLATE_CORE_PLUGIN_PHP,
  TEMPLATE_CORE_MODULE_INTERFACE_PHP,
  TEMPLATE_CORE_MODULE_LOADER_PHP,
  TEMPLATE_EXAMPLE_FEATURE_MODULE_PHP,
  TEMPLATE_TSCONFIG_JSON,
  TEMPLATE_COMPOSER_JSON,
  TEMPLATE_GITIGNORE,
  TEMPLATE_EDITORCONFIG,
  loadPluginFileTemplate,
  loadReadmeTxtTemplate,
  packageJsonForAnswers,
} from "./_templates.js";

/**
 * Run the core generator. Always returns a contribution (core
 * runs for every feature set). The shape is:
 *
 *   {
 *     files:  Record<relPath, string>   // written by the scaffold
 *     dirs:   string[]                   // created before write (defensive)
 *     deps:   Record<npmPkg, version>    // informational only — Phase 22 reads these
 *     devDeps:Record<npmPkg, version>    // informational only
 *   }
 *
 * @param {Object} ctx
 * @param {Object} ctx.answers  the ScaffoldAnswers
 * @param {Object} ctx.cfg      the answersToProjectConfig() result
 * @param {Object} ctx.features the validated feature set
 * @param {Object} ctx.vars     pre-built tplVars (legacy alias)
 */
export function run(ctx) {
  const { answers, cfg, features, vars } = ctx;
  // Defensive: tplVars can be built by the caller OR by the legacy
  // helper. The contract is the same — it returns a flat object of
  // substitution tokens for `{{token}}` placeholders.
  const tpl = vars || legacyTplVars(answers, cfg);
  const files = {};
  const dirs = [];

  // 1. project.config.json — branded via cfg + the v2 fields
  //    (restNamespace, vendorPrefix, phpMinVersion, …) and the
  //    v3 `features` key. The Phase 20 syncFeaturesToConfig()
  //    helper is the one that writes `features` into the existing
  //    project.config.json after this generator runs.
  files["project.config.json"] = renderTemplate(TEMPLATE_PROJECT_CONFIG, tpl);

  // 2. {slug}.php (or functions.php for legacy theme mode)
  const isPlugin = (cfg.projectType || "plugin") === "plugin";
  const phpBootstrapRel = isPlugin ? `${answers.slug}.php` : "functions.php";
  // Phase 25.A2: when the theme is PHP-only (js === "none"), emit a
  // minimal functions.php that OMITS the JS bundle enqueue
  // (wpsk_enqueue_bundle_script + wp_localize_script +
  // wp_set_script_translations) because the consumer has no bundle
  // to load. The stylesheet enqueue is preserved (CSS is a
  // separate feature from JS).
  const isPhpOnlyTheme = !isPlugin && features.js === "none";
  files[phpBootstrapRel] = isPlugin
    ? renderTemplate(loadPluginFileTemplate(), tpl)
    : isPhpOnlyTheme
      ? renderTemplate(TEMPLATE_FUNCTIONS_PHP_NO_JS, tpl)
      : renderTemplate(TEMPLATE_FUNCTIONS_PHP, tpl);
  dirs.push("src/Core");

  // 3. src/Core/{Plugin,ModuleInterface,ModuleLoader}.php — moved
  //    from the legacy inline template strings. Body is byte-for-byte
  //    identical to the previous scaffoldProject output (Phase 21.11 BC).
  files["src/Core/Plugin.php"] = TEMPLATE_CORE_PLUGIN_PHP;
  files["src/Core/ModuleInterface.php"] = TEMPLATE_CORE_MODULE_INTERFACE_PHP;
  files["src/Core/ModuleLoader.php"] = TEMPLATE_CORE_MODULE_LOADER_PHP;

  // 4. readme.txt (WordPress.org plugin format)
  files["readme.txt"] = renderTemplate(loadReadmeTxtTemplate(), tpl);

  // 5. build.config.json + assets/stylesheets/style.css (the CSS
  //    entry point is also referenced by build.config.json)
  files["build.config.json"] = renderTemplate(TEMPLATE_BUILD_CONFIG, tpl);
  files["assets/stylesheets/style.css"] = renderTemplate(
    TEMPLATE_STYLESHEET,
    tpl,
  );
  dirs.push("assets/stylesheets");

  // 6. composer.json — Phase 21.13: PSR-4 vendor → src/,
  //    require php >= phpMinVersion. Vendor namespace derived from
  //    globalName (PascalCase, e.g. "MyPlugin"). license field is
  //    overwritten by the `license` generator when present, but the
  //    default here is "GPL-2.0-or-later" to match the kit's
  //    WordPress.org default.
  files["composer.json"] = renderTemplate(TEMPLATE_COMPOSER_JSON, {
    ...tpl,
    vendorNamespace: deriveVendorNamespace(answers.globalName),
    licenseId: spdxForLicense(features.license || "gpl2"),
  });

  // 7. README.md — the kit's default README scaffold
  files["README.md"] = renderTemplate(TEMPLATE_README, tpl);

  // 8. .gitignore + .editorconfig — minimal but useful defaults
  files[".gitignore"] = renderTemplate(TEMPLATE_GITIGNORE, tpl);
  files[".editorconfig"] = renderTemplate(TEMPLATE_EDITORCONFIG, tpl);

  // 9. tsconfig.json — ONLY when js === "typescript". The core
  //    generator owns this file (it lives at the project root)
  //    but the registry gate makes it conditional. A php-only
  //    consumer (js:none) never sees a tsconfig.json. A
  //    pure-JS consumer (js:pure) also does not — there is no
  //    TypeScript compiler in play. A Flow consumer (js:flow)
  //    likewise — Flow replaces TypeScript as the type-checker.
  //    (Phase 25.B / 25.C narrowing of the gate.)
  if (features.js === "typescript") {
    files["tsconfig.json"] = TEMPLATE_TSCONFIG_JSON;
  }

  // 10. package.json — always emitted by core when the registry gate
  //     is open. The Phase 21.13 omit-when-js:none&&husky:off rule
  //     is enforced by the SCAFFOLD, not by this generator, so the
  //     generator's job here is just to render the JSON. (We mark
  //     the contribution as `omittable: true` so the scaffold can
  //     drop it cleanly when both gates are off.)
  //
  //     Phase 25.B / 25.C: pass the variant-aware `features` to
  //     `packageJsonForAnswers` so the typecheck / lint:js scripts
  //     match the chosen js variant. The default (js:typescript)
  //     is unchanged from Phase 23 — the `features` arg is the
  //     same one the engine validated upstream.
  if (features.js && features.js !== "none") {
    files["package.json"] =
      JSON.stringify(packageJsonForAnswers(answers, features), null, 2) +
      "\n";
  } else if (features.husky === "on") {
    // husky is on but js is none — still emit a minimal package.json
    // (the husky generator needs a `prepare: "husky install"` script).
    // This is delegated to the husky generator itself; the core does
    // not emit a duplicate.
  }

  return {
    files,
    dirs,
    deps: {},
    devDeps: {},
  };
}

/* -------------------------------------------------------------------- */
/* Vendor namespace derivation                                           */
/* -------------------------------------------------------------------- */

/**
 * Derive a PSR-4 vendor namespace root from the `globalName` answer.
 *
 * `globalName` is a JS identifier (per `validateAnswers`), so the
 * PascalCase form is already correct. We strip any leading/trailing
 * whitespace defensively (the answer validator should already have
 * rejected whitespace) and emit e.g. "MyPlugin".
 *
 * @param {string} globalName
 * @returns {string}
 */
function deriveVendorNamespace(globalName) {
  if (typeof globalName !== "string" || globalName.length === 0) {
    return "WPSK";
  }
  return globalName.trim();
}

/**
 * Map a license variant to an SPDX license identifier. The Phase 25.G
 * generator will write the LICENSE file body; here we just expose the
 * SPDX id so the composer.json `license` field matches the LICENSE
 * file header.
 *
 * @param {string} licenseVariant
 * @returns {string}
 */
function spdxForLicense(licenseVariant) {
  switch (licenseVariant) {
    case "gpl3":
      return "GPL-3.0-or-later";
    case "mit":
      return "MIT";
    case "gpl2":
    default:
      return "GPL-2.0-or-later";
  }
}

/* -------------------------------------------------------------------- */
/* Generator descriptor (Phase 21 / 22 shared shape)                    */
/* -------------------------------------------------------------------- */

/**
 * Generator descriptor registered with the registry. `feature` is
 * null for the always-on core. `owns` is the canonical list of
 * paths / globs the core generator may create or overwrite —
 * Phase 22's `addFeature` / `removeFeature` use this list as the
 * additive-safety boundary (a generator in additive mode may
 * only touch files matched by its own `owns` globs).
 *
 * Notes on the globs:
 *  - `*.php` at the project root covers the plugin bootstrap
 *    (`{slug}.php`) and the legacy theme bootstrap (`functions.php`).
 *    The generator writes ONE of them at runtime based on
 *    `cfg.projectType`; the glob covers both because the engine
 *    does not know the slug ahead of time.
 *  - `src/Core/**` covers the kit's framework copies. The
 *    `restBatch` / `exampleFeature` / `blocks` generators own
 *    their own subtrees of `src/Modules/**` and never touch
 *    `src/Core/**`.
 *  - `tsconfig.json` and `package.json` are emitted by core
 *    (the latter is gated on `js !== "none"`). No other generator
 *    claims these — `js:typescript` only writes `assets/dependencies.ts`.
 */
export const descriptor = {
  id: "core",
  feature: null,
  owns: [
    "project.config.json",
    "composer.json",
    "readme.txt",
    "build.config.json",
    "README.md",
    ".gitignore",
    ".editorconfig",
    "tsconfig.json",
    "package.json",
    "src/Core/**",
    "assets/stylesheets/**",
    "*.php", // the plugin or theme bootstrap at the project root
  ],
  run,
};
