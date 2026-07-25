/**
 * @wpdev/create-wp-project — core generator (Phase 21).
 *
 * The "core" generator is always-on. It emits the files that
 * every wp-starter-kit consumer project has, regardless of which
 * features are turned on:
 *
 *   - wpdev.json (merged config + kit metadata + build section)
 *   - {slug}.php   (the WordPress plugin bootstrap) — plugin mode
 *   - src/Core/{Plugin,ModuleInterface,ModuleLoader}.php
 *   - composer.json (PSR-4 vendor namespace → src/, php >= phpMinVersion)
 *   - package.json (with JS build scripts + devDeps when js ≠ none
 *     OR husky is on; see Phase 21.13 — the file is omitted only
 *     when js === "none" AND husky === "off", in which case the
 *     consumer has no Node toolchain to drive)
 *   - README.md, .gitignore, .editorconfig, readme.txt
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

import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { deriveUiFramework } from "../derive-ui-framework.js";
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";
import {
  renderTemplate,
  tplVars as legacyTplVars,
  TEMPLATE_WPDEV_JSON,
  TEMPLATE_FUNCTIONS_PHP,
  TEMPLATE_FUNCTIONS_PHP_NO_JS,
  TEMPLATE_STYLESHEET,
  TEMPLATE_README,
  TEMPLATE_TSCONFIG_JSON,
  TEMPLATE_GITIGNORE,
  TEMPLATE_PRETTIERIGNORE,
  TEMPLATE_EDITORCONFIG,
  loadPluginFileTemplate,
  loadReadmeTxtTemplate,
  packageJsonForAnswers,
  buildComposerJson,
} from "./_templates.js";
import { frameworkPackageFiles } from "./_framework-template.js";
import { consumerWpdevJsPackageFiles } from "./_wpdev-js-packages-template.js";
import { buildWpdevDependencyNoticeBlock } from "./phpFramework.js";

function loadReleaseScript(name) {
  const full = path.join(resolveEngineSrcDir(), "release", name);
  if (!existsSync(full)) {
    throw new Error(`Release script missing at ${full}`);
  }
  return readFileSync(full, "utf8");
}

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
  const baseTpl = vars || legacyTplVars(answers, cfg);
  const tpl = {
    ...baseTpl,
    wpMinVersion: features.wpMinVersion || "6.0",
    phpMinVersion: features.phpMinVersion || cfg.phpMinVersion || "7.4",
    // WP 6.5+ dependency header when host needs WPDev Admin Framework.
    requiresPluginsHeader:
      features.phpFramework === "wpdev" ? "\n * Requires Plugins: wpdev" : "",
    // Soft-dep admin notice when WPDev Admin Framework is not active.
    // Empty string when phpFramework is not wpdev (placeholder must expand cleanly).
    wpdevDependencyCheck:
      features.phpFramework === "wpdev"
        ? buildWpdevDependencyNoticeBlock({
            slug_underscore:
              baseTpl.slug_underscore ||
              String(answers.slug || cfg.slug || "my_plugin").replace(
                /-/g,
                "_",
              ),
            textDomain:
              baseTpl.textDomain || answers.textDomain || cfg.textDomain,
            name: baseTpl.name || answers.name || answers.slug || cfg.slug,
            slug: answers.slug || cfg.slug,
          })
        : "",
  };
  const files = {};
  const dirs = [];

  // 1. wpdev.json (merged config) template. The scaffold's writeManifest
  //    call after generators will overwrite with full branding + features + build.
  //    This emission is a fallback for bypass paths.
  files["wpdev.json"] = renderTemplate(TEMPLATE_WPDEV_JSON, {
    ...tpl,
    kitVersion: tpl.kitVersion || "0.0.0",
  });

  // 2. {slug}.php (or functions.php for legacy theme mode)
  const isPlugin = (cfg.projectType || "plugin") === "plugin";
  const phpBootstrapRel = isPlugin ? `${answers.slug}.php` : "functions.php";
  // Phase 25.A2: when the theme is PHP-only (js === "none"), emit a
  // minimal functions.php that OMITS the JS bundle enqueue
  // (wpdev_enqueue_bundle_script + wp_localize_script +
  // wp_set_script_translations) because the consumer has no bundle
  // to load. The stylesheet enqueue is preserved (CSS is a
  // separate feature from JS).
  const isPhpOnlyTheme = !isPlugin && features.js === "none";
  files[phpBootstrapRel] = isPlugin
    ? renderTemplate(loadPluginFileTemplate(), tpl)
    : isPhpOnlyTheme
      ? renderTemplate(TEMPLATE_FUNCTIONS_PHP_NO_JS, tpl)
      : renderTemplate(TEMPLATE_FUNCTIONS_PHP, tpl);
  // 3. (Phase 23) Framework sources (Plugin/ModuleInterface/ModuleLoader)
  //    are NO LONGER emitted into the consumer. They are supplied by
  //    the "wpdev/framework" Composer dep (see buildComposerJson require
  //    + path repo). The consumer's src/ only contains its own modules
  //    (under its vendor ns). Emitting copies would produce unloaded
  //    dead code (consumer composer.json never registers a WPDev\\ psr-4
  //    pointing at src/Core).
  //    The three TEMPLATE_CORE_* strings are retained in _templates.js
  //    only for historical reference / potential explicit "vendored"
  //    reconstruction in migrations.

  // 3b. Kit module framework sources under packages/framework/
  //     (not a Composer package). Autoload: WPDev\\ → packages/framework/src/
  const FRAMEWORK_PREFIX = "packages/framework/";
  for (const [rel, body] of Object.entries(frameworkPackageFiles())) {
    files[`${FRAMEWORK_PREFIX}${rel}`] = body;
  }
  dirs.push("packages/framework");

  // 3c. Vendor unpublished @wpdev/* (and @core/utils) into packages/*
  //     so npm workspaces resolve them — they are not on the public registry.
  //     Only when the project has a JS toolchain (package.json lists those deps).
  if (features.js && features.js !== "none") {
    for (const [rel, body] of Object.entries(consumerWpdevJsPackageFiles())) {
      files[rel] = body;
      const top = rel.split("/").slice(0, 2).join("/");
      if (top.startsWith("packages/") && !dirs.includes(top)) {
        dirs.push(top);
      }
    }
  }

  // 4. readme.txt (WordPress.org plugin format)
  files["readme.txt"] = renderTemplate(loadReadmeTxtTemplate(), tpl);

  // 5. assets/stylesheets/style.css (build config lives inside wpdev.json now)
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
  files["composer.json"] = buildComposerJson({
    ...tpl,
    vendorNamespace: deriveVendorNamespace(answers.globalName),
    // vendor/project — same org as package.json @vendor/project
    packageVendor: String(answers.npmScope || cfg.npmScope || "")
      .replace(/^@/, "")
      .trim(),
    npmScope: answers.npmScope || cfg.npmScope,
    licenseId: spdxForLicense(features.license || "gpl2"),
    vendorScopingOn: features.vendorScoping === "on",
  });

  // 7. README.md — the kit's default README scaffold
  files["README.md"] = renderTemplate(TEMPLATE_README, tpl);

  // 8. .gitignore + .editorconfig — minimal but useful defaults
  files[".gitignore"] = renderTemplate(TEMPLATE_GITIGNORE, tpl);
  files[".editorconfig"] = renderTemplate(TEMPLATE_EDITORCONFIG, tpl);
  // Keep prettier from rewriting esbuild output under assets/bundles/.
  if (features.husky === "on" || (features.js && features.js !== "none")) {
    files[".prettierignore"] = TEMPLATE_PRETTIERIGNORE;
  }

  // 9. tsconfig.json — ONLY when js === "typescript". The core
  //    generator owns this file (it lives at the project root)
  //    but the registry gate makes it conditional. A php-only
  //    consumer (js:none) never sees a tsconfig.json. A
  //    pure-JS consumer (js:pure) also does not — there is no
  //    TypeScript compiler in play. A Flow consumer (js:flow)
  //    likewise — Flow replaces TypeScript as the type-checker.
  //    (Phase 25.B / 25.C narrowing of the gate.)
  if (features.js === "typescript") {
    const uiFramework = deriveUiFramework(features, answers) || "preact";
    files["tsconfig.json"] = renderTemplate(TEMPLATE_TSCONFIG_JSON, {
      ...tpl,
      jsxImportSource: uiFramework === "react" ? "react" : "preact",
    });
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
      JSON.stringify(packageJsonForAnswers(answers, features), null, 2) + "\n";
  } else if (features.husky === "on") {
    // husky is on but js is none — still emit a minimal package.json
    // (the husky generator needs a `prepare: "husky"` script).
    // This is delegated to the husky generator itself; the core does
    // not emit a duplicate.
  }

  // 11. Production release packager — always emitted so every
  //     consumer can run `npm run release` / `composer release:dist`
  //     and get a clean dist/{slug}/ tree without touching source.
  files["dev/release/prepare-release.js"] =
    loadReleaseScript("prepare-release.js");
  files["dev/release/prepareComposer.js"] =
    loadReleaseScript("prepareComposer.js");
  dirs.push("dev/release");

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
    return "WPDev";
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
 *  - `tsconfig.json` and `package.json` are emitted by core
 *    (the latter is gated on `js !== "none"`). No other generator
 *    claims these — `js:typescript` only writes `assets/dependencies.ts`.
 *  - Framework sources (src/Core/**) are deliberately NOT owned or
 *    emitted by core in deps mode (Phase 23); see buildComposerJson
 *    which requires "wpdev/framework". Legacy copies cleaned by migration.
 */
export const descriptor = {
  id: "core",
  feature: null,
  owns: [
    "wpdev.json",
    "composer.json",
    "readme.txt",
    "README.md",
    ".gitignore",
    ".prettierignore",
    ".editorconfig",
    "tsconfig.json",
    "package.json",
    "assets/stylesheets/**",
    "dev/release/**",
    "packages/framework/**",
    "packages/hooks/**",
    "packages/utils/**",
    "packages/rest-utils/**",
    "packages/html-utils/**",
    "packages/translation/**",
    "packages/build/**",
    "packages/dependency-extraction-esbuild-plugin/**",
    "packages/core-utils/**",
    "*.php", // the plugin or theme bootstrap at the project root
    // Kit module runtime: packages/framework (PSR-4, not Composer package).
    // JS @wpdev/* + @core/utils: vendored under packages/* for npm workspaces.
  ],
  run,
};
