/**
 * @wpdev/create-wp-project — shared template strings + tplVars.
 *
 * Phase 21 refactor: the inline template constants and the
 * `tplVars` helper that used to live in `src/index.js` are moved
 * here so both the legacy `scaffoldProject` body AND the new
 * per-feature generators can share them. This is a pure move —
 * the contents are byte-for-byte identical to the previous
 * implementation (Phase 21.11 BC).
 *
 * The lazy-loaded templates (plugin-file.php.tpl, readme.txt.tpl)
 * stay lazy so the kit does not need to be installed alongside
 * the consumer's project; the inline strings are still inline.
 */

import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import {
  getDepVersions,
  CONSUMER_RUNTIME_WPDEV_PACKAGES,
  CONSUMER_BUILD_WPDEV_PACKAGES,
} from "../dep-versions.js";
import { deriveUiFramework } from "../derive-ui-framework.js";

/* -------------------------------------------------------------------- */
/* renderTemplate (also re-exported from src/index.js)                   */
/* -------------------------------------------------------------------- */

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

export function renderTemplate(tmpl, vars) {
  return tmpl.replace(TOKEN_RE, (full, key) => {
    if (
      Object.prototype.hasOwnProperty.call(vars, key) &&
      vars[key] !== undefined &&
      vars[key] !== null
    ) {
      return String(vars[key]);
    }
    return full; // leave unknown tokens verbatim so missing config is loud
  });
}

/* -------------------------------------------------------------------- */
/* tplVars — flat substitution token object                              */
/* -------------------------------------------------------------------- */

export function tplVars(answers, cfg) {
  return {
    ...answers,
    ...cfg,
    // {{slug_underscore}} for the PHP-side function names
    slug_underscore: answers.slug.replace(/-/g, "_"),
    depsHandle: (
      answers.depsBundle ||
      cfg.depsBundle ||
      `${answers.slug || cfg.slug}-deps.js`
    ).replace(/\.js$/, ""),
    // {{name}} / {{description}} / {{author}} / {{authorUri}} / {{pluginUri}}
    // — sensible defaults so the WP plugin header is always populated.
    name: cfg.globalName || answers.slug,
    description: `${answers.slug} — built on wp-starter-kit (WPDev) framework`,
    author: "wp-starter-kit scaffold",
    authorUri: "https://github.com/abolfazl-moeini/wp-plugin-starter-kit",
    pluginUri: "https://github.com/abolfazl-moeini/wp-plugin-starter-kit",
    // {{vendor}} — the PSR-4 root namespace used in generated module
    // namespace declarations (e.g. "namespace MyPlugin\\Modules\\...".
    // Derived from the consumer's globalName (PascalCase) or an
    // explicit answers.vendor override. The composer.json PSR-4 mapping
    // in buildComposerJson uses the same value for autoloading.
    vendor: answers.vendor || answers.globalName || "WPDev",
    vendorNamespaceLower: (
      answers.vendor ||
      answers.globalName ||
      answers.slug ||
      "wpsk"
    ).toLowerCase(),
    // {{frameworkNamespace}} — the WPDev framework namespace root, used
    // in `use` imports for framework classes (e.g.
    // "use WPDev\\Core\\ModuleInterface"). Always "WPDev" — the consumer's
    // composer.json resolves this through the wpdev/framework dependency.
    frameworkNamespace: "WPDev",
    vendorPrefixUpper: (cfg.vendorPrefix || "WpdevVendor").toUpperCase(),
    // Phase 23.A4: {{frameworkPath}} is the URL the consumer
    // composer.json's `repositories` entry points at for
    // wpdev/framework. The path is a single source of truth — the
    // scaffold accepts a `frameworkPath` option (and/or detects
    // one from a kit config); the default below is the
    // sibling-project relative path ("../packages/framework"),
    // which assumes the consumer lives next to a kit checkout
    // (the dev-mode path repo). The kit's own installer
    // (Phase 23.A6 release wiring) overrides this with the
    // real absolute path of the kit workspace.
    frameworkPath:
      (answers && answers.frameworkPath) || "../packages/framework",
    // {{frameworkVersion}} is the composer `require` constraint
    // for wpdev/framework. `*` is the canonical choice for a
    // path-repository-driven consumer (the path repo pins the
    // actual source). Pinned semver is the published-mode choice
    // — Phase 23.B (the JS half) will pass it through
    // `dep-versions.js`.
    frameworkVersion: (answers && answers.frameworkVersion) || "*",
    faultTolerancePath:
      (answers && answers.faultTolerancePath) ||
      "../packages/php-fault-tolerance",
  };
}

/* -------------------------------------------------------------------- */
/* packageJsonForAnswers                                                 */
/* -------------------------------------------------------------------- */

export function packageJsonForAnswers(answers, features) {
  const uiFramework = deriveUiFramework(features, answers);
  const huskyOn = !features || features.husky !== "off";
  const projectType = answers.projectType || "plugin";
  const description =
    projectType === "theme"
      ? `${answers.slug} — WordPress theme built on wp-starter-kit`
      : `${answers.slug} — WordPress plugin built on wp-starter-kit`;
  // Phase 25.B / 25.C: the `js` feature variant changes which
  // build / lint / typecheck scripts make sense in package.json.
  // We pull it from the `features` arg (preferred) and fall back
  // to a `js` answer key (BC for callers that pass a merged
  // object) and then "typescript" (the pre-Phase-25 default).
  // Variants:
  //   - "typescript" → typecheck: "tsc --noEmit", lint:js includes .ts,.tsx
  //   - "pure"       → no typecheck (no TS), lint:js drops .ts,.tsx
  //   - "flow"       → typecheck: "flow", lint:js drops .ts,.tsx
  //                    (Flow types are stripped at bundle time; the
  //                    source files are .js with the // @flow pragma)
  //   - "none"       → no package.json at all (caller must gate on this;
  //                    this function is only reached when js !== "none")
  const jsVariant = (features && features.js) || answers.js || "typescript";
  const jsTestVariant =
    (features && features.jsTest) || answers.jsTest || "jest";

  // Phase 23.B4: read the kit's dep-versions registry and
  // surface the @wpdev/* framework packages to the consumer.
  // The 6 lib packages go in `dependencies` (runtime) and the
  // 2 build packages go in `devDependencies` (compile-time
  // tooling). Versions come from the kit's own workspace
  // package.json files (see `getDepVersions` /
  // `readKitPackageVersion` in dep-versions.js), so a single
  // `npm version patch` in any @wpdev/* package propagates
  // automatically to the next scaffold.
  //
  // The wrap `^X.Y.Z` matches npm's caret-range convention —
  // accepting future patch/minor versions on the same major.
  // The `dep-versions` test cross-checks that the registry
  // value is the right form.
  const kitVersions = getDepVersions();
  const versionOf = (name) => {
    const v = kitVersions.get(name);
    if (!v) return "*"; // graceful fallback if the dep is missing
    // If the registry already returns a range (e.g. "^0.1.0"
    // from the kit's devDeps), use it as-is. If it returns a
    // bare version (e.g. "0.1.0" from a workspace
    // package.json), wrap with a caret.
    return v.startsWith("^") || v === "*" || v.includes("npm:") ? v : `^${v}`;
  };

  const wpskDeps = Object.fromEntries(
    CONSUMER_RUNTIME_WPDEV_PACKAGES.map((name) => [name, versionOf(name)]),
  );
  const wpskDevDeps = Object.fromEntries(
    CONSUMER_BUILD_WPDEV_PACKAGES.map((name) => [name, versionOf(name)]),
  );

  return {
    name: "@" + answers.npmScope + "/" + answers.slug,
    version: "0.1.0",
    description,
    private: true,
    type: "module",
    scripts: scriptsForVariant(jsVariant, {
      build:
        "npm-run-all --parallel build:dependencies build:components build:styles build:assets",
      "build:dependencies": "wpdev-build-dependencies",
      "build:components": "wpdev-build-components",
      "build:styles": "wpdev-build-styles",
      "build:assets": "wpdev-build-assets",
      ...(huskyOn ? { prepare: "husky" } : {}),
      ...(jsTestVariant === "vitest"
        ? { test: "vitest run" }
        : jsTestVariant === "jest"
          ? { test: "jest" }
          : {}),
      typecheck: "tsc --noEmit",
      "lint:js": "eslint . --ext .js,.jsx,.ts,.tsx",
      "format:check":
        'prettier --check "**/*.{js,jsx,ts,tsx,json,md,yml,yaml,css}"',
      check: "wpdev-check",
    }),
    dependencies: {
      ...(uiFramework === "preact"
        ? {
            preact: "^10.19.3",
            "@preact/compat": "^18.3.2",
            "@preact/signals": "^2.9.1",
            "@wordpress/hooks": "^3.50.0",
            "@wordpress/dom-ready": "^3.50.0",
            // Aliases: code uses `react`/`react-dom` but Preact is installed.
            react: "npm:@preact/compat",
            "react-dom": "npm:@preact/compat",
          }
        : uiFramework === "react"
          ? {
              react: "^18.3.0",
              "react-dom": "^18.3.0",
              "@wordpress/hooks": "^3.50.0",
              "@wordpress/dom-ready": "^3.50.0",
            }
          : {
              "@wordpress/hooks": "^3.50.0",
              "@wordpress/dom-ready": "^3.50.0",
            }),
      // Phase 23.B4: the @wpdev/* framework packages, surfaced
      // so the consumer can `import { ... } from "@wpdev/hooks"`
      // at runtime. See header comment.
      ...wpskDeps,
    },
    devDependencies: {
      // Phase 23.B4: the @wpdev/* build tools. The consumer
      // uses them at scaffold/build time. `@wpdev/build`
      // bundles the dependency-extraction plugin as a
      // transitive dep, but we surface it explicitly so
      // the version is visible in the consumer's lockfile.
      ...wpskDevDeps,
      // Phase 25.C: the Flow variant adds `flow-bin` as a
      // devDep so the consumer can run `npm run typecheck:flow`
      // without an extra install step. We pin to the same
      // range the kit's own Flow tooling uses; the consumer
      // can override in their own package.json.
      ...(jsVariant === "flow" ? { "flow-bin": "^0.234.0" } : {}),
      ...(jsTestVariant === "vitest" ? { vitest: "^2.1.0" } : {}),
      ...(jsTestVariant === "jest"
        ? {
            jest: "^29.7.0",
            "@jest/globals": "^29.7.0",
            "babel-jest": "^29.7.0",
          }
        : {}),
    },
  };
}

/**
 * Adjust the default package.json scripts block for a given
 * `js` feature variant. The `defaults` parameter is the
 * typescript-flavored block (the pre-Phase-25 default). The
 * returned object is the variant-flavored scripts block.
 *
 * Variant rules:
 *   - "typescript" → defaults unchanged (typecheck: "tsc --noEmit",
 *                    lint:js includes .ts,.tsx).
 *   - "pure"       → drop `typecheck` (no TS to check), drop
 *                    .ts,.tsx from lint:js.
 *   - "flow"       → replace `typecheck` with "flow" (the Flow
 *                    checker), drop .ts,.tsx from lint:js.
 *
 * The build:* scripts and the prepare / test / format:check /
 * check scripts are variant-agnostic — they live in the
 * `.ts`-flavored form because esbuild's `loader: { ".js": "jsx" }`
 * accepts both, and the format:check + check scripts don't
 * know about TS extensions (the `**\/*.{js,jsx,ts,tsx,...}`
 * pattern still matches JS-only trees).
 *
 * @param {string} variant  one of "typescript" | "pure" | "flow"
 * @param {Record<string,string>} defaults
 * @returns {Record<string,string>}
 */
function scriptsForVariant(variant, defaults) {
  if (variant === "typescript") {
    return { ...defaults };
  }
  if (variant === "pure") {
    // No typechecker at all (plain JS, no Flow, no TS). Lint
    // ext drops .ts,.tsx.
    const next = { ...defaults };
    delete next.typecheck;
    next["lint:js"] = "eslint . --ext .js,.jsx";
    return next;
  }
  if (variant === "flow") {
    // Flow typecheck. Lint ext drops .ts,.tsx.
    const next = { ...defaults };
    next.typecheck = "flow";
    next["lint:js"] = "eslint . --ext .js,.jsx";
    return next;
  }
  // Unknown variant → fall back to defaults (defensive).
  return { ...defaults };
}

/* -------------------------------------------------------------------- */
/* Lazy-loaded .tpl helpers                                              */
/* -------------------------------------------------------------------- */

/**
 * Resolve the absolute path of a file that ships next to this module.
 * Mirrors the helper that used to live in src/index.js — except that
 * the templates/ directory is the parent of generators/, so the
 * base path is the parent of __dirname (or, in CLI / jest contexts,
 * the cwd-relative `packages/create-wp-project/src`).
 */
function modulePath(relPath) {
  let here;
  if (typeof __dirname !== "undefined" && __dirname) {
    // __dirname = .../packages/create-wp-project/src/generators
    // we want .../packages/create-wp-project/src
    here = path.dirname(__dirname);
  } else if (
    process.argv[1] &&
    process.argv[1].endsWith("create-wp-project/src/index.js")
  ) {
    here = path.dirname(process.argv[1]);
  } else {
    here = path.join(process.cwd(), "packages/create-wp-project/src");
  }
  return path.join(here, relPath);
}

let PLUGIN_FILE_TEMPLATE = null;
let PLUGIN_FILE_TEMPLATE_LOADED = false;
export function loadPluginFileTemplate() {
  if (PLUGIN_FILE_TEMPLATE_LOADED) {
    return PLUGIN_FILE_TEMPLATE;
  }
  const tplPath = modulePath("templates/plugin/plugin-file.php.tpl");
  if (!existsSync(tplPath)) {
    throw new Error(
      "Plugin bootstrap template missing at " +
        tplPath +
        " — expected at packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl",
    );
  }
  PLUGIN_FILE_TEMPLATE = readFileSync(tplPath, "utf8");
  PLUGIN_FILE_TEMPLATE_LOADED = true;
  return PLUGIN_FILE_TEMPLATE;
}

let README_TXT_TEMPLATE = null;
let README_TXT_TEMPLATE_LOADED = false;
export function loadReadmeTxtTemplate() {
  if (README_TXT_TEMPLATE_LOADED) {
    return README_TXT_TEMPLATE;
  }
  const tplPath = modulePath("templates/plugin/readme.txt.tpl");
  if (!existsSync(tplPath)) {
    throw new Error(
      "readme.txt template missing at " +
        tplPath +
        " — expected at packages/create-wp-project/src/templates/plugin/readme.txt.tpl",
    );
  }
  README_TXT_TEMPLATE = readFileSync(tplPath, "utf8");
  README_TXT_TEMPLATE_LOADED = true;
  return README_TXT_TEMPLATE;
}

/* -------------------------------------------------------------------- */
/* Inline template strings (all moved from src/index.js verbatim)        */
/* -------------------------------------------------------------------- */

export const TEMPLATE_PROJECT_CONFIG = `{
  "slug": "{{slug}}",
  "globalName": "{{globalName}}",
  "localizeVar": "{{localizeVar}}",
  "textDomain": "{{textDomain}}",
  "hookPrefix": "{{hookPrefix}}",
  "npmScope": "{{npmScope}}",
  "depsBundle": "{{depsBundle}}",
  "phpFunctionPrefix": "{{phpFunctionPrefix}}",
  "uiFramework": "{{uiFramework}}",
  "projectType": "{{projectType}}",
  "restNamespace": "{{restNamespace}}",
  "vendorPrefix": "{{vendorPrefix}}",
  "phpMinVersion": "{{phpMinVersion}}",
  "phpSourceVersion": "{{phpSourceVersion}}",
  "batchEndpoint": "{{batchEndpoint}}"
}
`;

export const TEMPLATE_FUNCTIONS_PHP = `<?php
/**
 * Theme bootstrap for the {{slug}} WordPress theme.
 *
 * Scaffolded from wp-starter-kit. The project's own functions use the
 * {{phpFunctionPrefix}} (from project.config.json). Calls to the asset
 * helpers (enqueue, get_localize_data, asset_info, etc.) use the stable
 * framework names (wpdev_*) because wp-starter-kit ships a single
 * implementation of the PHP asset layer (in includes/asset-functions.php
 * or via the kit's Composer autoload). The helpers are intentionally not
 * re-prefixed per project to avoid code duplication and maintenance drift.
 *
 * --------------------------------------------------------------------------
 * DEPRECATION NOTICE (wp-starter-kit Phase 11)
 * --------------------------------------------------------------------------
 * This \`functions.php\` file is the legacy *theme* bootstrap. As of
 * Phase 11 every scaffolded project is plugin-first:
 *
 *   1. The primary bootstrap is \`{{slug}}.php\` (a real WordPress
 *      plugin file with Plugin Name/Version/Requires PHP/Text Domain
 *      headers, ABSPATH guard, vendor/autoload.php, and lifecycle
 *      hooks).
 *   2. \`functions.php\` is kept ONLY for projects that explicitly
 *      opt-in via \`projectType: 'theme'\` in project.config.json.
 *   3. New projects should NOT ship a \`functions.php\`. The file
 *      will be removed in the next major release.
 *
 * If you are reading this comment in a freshly-scaffolded plugin
 * project, please delete this file and rely on \`{{slug}}.php\`.
 */

if (!defined('{{slug_underscore}}_VERSION')) {
    define('{{slug_underscore}}_VERSION', '0.1.0');
}

add_action('after_setup_theme', '{{slug_underscore}}_setup');
function {{slug_underscore}}_setup(): void
{
    load_theme_textdomain('{{textDomain}}', get_template_directory() . '/languages');
}

add_action('wp_enqueue_scripts', '{{slug_underscore}}_enqueue_assets');
function {{slug_underscore}}_enqueue_assets(): void
{
    // Framework-provided asset helpers (always wpdev_* names). The
    // project's phpFunctionPrefix is used only for its own glue code.
    wpdev_enqueue_bundle_script('{{depsBundle}}');
    wpdev_enqueue_stylesheet('style.css');
    wp_localize_script(
        '{{depsHandle}}',
        '{{localizeVar}}',
        wpdev_get_localize_data()
    );
    wp_set_script_translations('{{depsHandle}}', '{{textDomain}}', get_template_directory() . '/assets/translations');
}
`;

/**
 * Phase 25.A2 — PHP-only theme bootstrap (js:none variant).
 *
 * Emitted by core.js when `projectType === "theme"` AND
 * `features.js === "none"`. The body is identical to
 * TEMPLATE_FUNCTIONS_PHP MINUS the `wpdev_enqueue_bundle_script()`
 * call and the `wp_localize_script()` / `wp_set_script_translations()`
 * calls — they reference a bundle that does not exist for a
 * PHP-only consumer. The stylesheet enqueue is preserved because
 * CSS is a separate feature from JS (a js:none project may still
 * want to ship style.css).
 *
 * BC: a "real" js variant (typescript/pure/flow) still emits
 * TEMPLATE_FUNCTIONS_PHP — this template is only used when
 * js === "none".
 */
export const TEMPLATE_FUNCTIONS_PHP_NO_JS = `<?php
/**
 * Theme bootstrap for the {{slug}} WordPress theme (PHP-only).
 *
 * Scaffolded from wp-starter-kit with js:none. The project is a
 * pure-PHP WordPress theme: no JS bundle, no esbuild, no Node
 * toolchain. The stylesheet enqueue is preserved (CSS is a
 * separate feature from JS), but the bundle-script and the
 * localize/translations hooks are omitted because they reference
 * a bundle that does not exist.
 *
 * --------------------------------------------------------------------------
 * DEPRECATION NOTICE (wp-starter-kit Phase 11)
 * --------------------------------------------------------------------------
 * This \`functions.php\` file is the legacy *theme* bootstrap. As of
 * Phase 11 every scaffolded project is plugin-first:
 *
 *   1. The primary bootstrap is \`{{slug}}.php\` (a real WordPress
 *      plugin file with Plugin Name/Version/Requires PHP/Text Domain
 *      headers, ABSPATH guard, vendor/autoload.php, and lifecycle
 *      hooks).
 *   2. \`functions.php\` is kept ONLY for projects that explicitly
 *      opt-in via \`projectType: 'theme'\` in project.config.json.
 *   3. New projects should NOT ship a \`functions.php\`. The file
 *      will be removed in the next major release.
 *
 * If you are reading this comment in a freshly-scaffolded plugin
 * project, please delete this file and rely on \`{{slug}}.php\`.
 */

if (!defined('{{slug_underscore}}_VERSION')) {
    define('{{slug_underscore}}_VERSION', '0.1.0');
}

add_action('after_setup_theme', '{{slug_underscore}}_setup');
function {{slug_underscore}}_setup(): void
{
    load_theme_textdomain('{{textDomain}}', get_template_directory() . '/languages');
}

add_action('wp_enqueue_scripts', '{{slug_underscore}}_enqueue_assets');
function {{slug_underscore}}_enqueue_assets(): void
{
    // PHP-only theme (js:none) — the stylesheet enqueue is
    // preserved (CSS ≠ JS), but the bundle enqueue is omitted
    // because the consumer has no JS bundle to load.
    wpdev_enqueue_stylesheet('style.css');
}
`;

export const TEMPLATE_DEPENDENCIES_TS = `/**
 * {{globalName}} — dependencies bundle entry (TypeScript).
 */

import { createHooks } from '@wordpress/hooks';
import domReady from '@wordpress/dom-ready';

export const hooks = createHooks();

export const table = { Tabulator: (window as Window & { Tabulator?: unknown }).Tabulator };

domReady(() => {
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-start',
    'theme',
    (_endpoint: string, options: { disableLoading?: boolean } = {}) => {
      if (!options?.disableLoading) {
        document.body.classList.add('is-loading');
      }
    }
  );
  hooks.addAction(
    '{{hookPrefix}}-request-ajax-done',
    'theme',
    (_endpoint: string, options: { disableLoading?: boolean } = {}) => {
      if (!options?.disableLoading) {
        document.body.classList.remove('is-loading');
      }
    }
  );
});
`;

export const TEMPLATE_STRAUSS_JSON = `{
  "target_directory": "vendor-prefixed",
  "namespace_prefix": "{{vendorPrefix}}",
  "classmap_prefix": "{{vendorPrefix}}_",
  "constant_prefix": "{{vendorPrefixUpper}}_",
  "delete_vendor_files": false,
  "exclude_from_prefix": {
    "namespaces": ["WPDev"],
    "file_patterns": []
  }
}
`;

/**
 * Phase 21 — vendorScoping generator overrides the WPDev exclusion
 * (plan §0.4.1). The CORE template keeps the WPDev exclusion (the
 * kit's own `strauss.json` does the same; local src/Core copies
 * still need the exclusion to scope correctly at release time
 * while Phase 23 lands). The vendorScoping generator (when ON)
 * emits a strauss.json WITHOUT the WPDev exclusion — that is the
 * template consumed by the `run()` of vendorScoping.js.
 */
export const TEMPLATE_STRAUSS_JSON_NO_WPDEV_EXCLUSION = `{
  "target_directory": "vendor-prefixed",
  "namespace_prefix": "{{vendorPrefix}}",
  "classmap_prefix": "{{vendorPrefix}}_",
  "constant_prefix": "{{vendorPrefixUpper}}_",
  "delete_vendor_files": false,
  "exclude_from_prefix": {
    "namespaces": [],
    "file_patterns": []
  }
}
`;

export const TEMPLATE_HUSKY_PRE_COMMIT = `#!/usr/bin/env sh

# Run lint-staged first (auto-fixes + prettier on staged files)
npx lint-staged

# Run related JS tests for staged files only (no full-suite fallback)
STAGED_JS=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx|js|jsx)$' || true)
if [ -n "$STAGED_JS" ]; then
  echo "$STAGED_JS" | xargs npx jest --bail --passWithNoTests --findRelatedTests
fi

# For staged PHP test files, run composer test with filter when practical
STAGED_PHP_TESTS=$(git diff --cached --name-only --diff-filter=ACM | grep -E 'Test\\.php$' || true)
if [ -n "$STAGED_PHP_TESTS" ]; then
  FILTER=$(echo "$STAGED_PHP_TESTS" | xargs -I{} basename {} .php | tr '\\n' '|' | sed 's/|$//')
  composer test -- --filter "$FILTER"
fi
`;

export const TEMPLATE_HUSKY_COMMIT_MSG = `#!/usr/bin/env sh

npx --no -- commitlint --edit "$1"
`;

export const TEMPLATE_COMMITLINT_CONFIG = `module.exports = {
  extends: ["@commitlint/config-conventional"],
};
`;

export const TEMPLATE_EXAMPLE_FEATURE_ITEMS_CONTROLLER = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature\\Rest;

use {{frameworkNamespace}}\\Support\\Auth\\CapabilityPolicy;
use {{frameworkNamespace}}\\Support\\Rest\\AllowBatch;
use {{frameworkNamespace}}\\Support\\Rest\\BatchResponse;
use {{frameworkNamespace}}\\Support\\Rest\\RestHandler;
use WP_REST_Request;
use WP_REST_Response;

final class ItemsController extends RestHandler implements AllowBatch
{
    public function rest_handler(WP_REST_Request $request): WP_REST_Response
    {
        $cacheKey = (string) ($request->get_param('cacheKey') ?? 'default');
        return BatchResponse::wrap(['items' => []], $cacheKey);
    }

    public function rest_permission(): bool
    {
        return CapabilityPolicy::can('read');
    }

    public function rest_end_point(): string
    {
        return 'items';
    }

    public function methods(): string
    {
        return 'POST';
    }

    public function allow_batch(): array
    {
        return ['v1' => true];
    }
}
`;

export const TEMPLATE_EXAMPLE_FEATURE_ADMIN_TS = `/**
 * ExampleFeature admin bundle entry.
 *
 * Hook examples (use __WPDEV_HOOK_PREFIX__ — never hardcode the prefix):
 *
 *   import { getHooks } from '@wpdev/hooks';
 *   const hooks = getHooks();
 *   hooks?.addAction(
 *     \`\${__WPDEV_HOOK_PREFIX__}-request-ajax-start\`,
 *     '@wpdev/example-feature',
 *     (endpoint, options = {}) => { ... },
 *   );
 *   hooks?.applyFilters(
 *     \`\${__WPDEV_HOOK_PREFIX__}.example-feature.validate\`,
 *     errors,
 *     formData,
 *   );
 */
import domReady from '@wordpress/dom-ready';

domReady(() => {
  const root = document.getElementById('{{slug}}-example-feature-admin');
  if (root) {
    root.textContent = 'ExampleFeature admin bundle loaded';
  }
});
`;

export const TEMPLATE_EXAMPLE_FEATURE_MODULE_TEST_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Tests\\Modules\\ExampleFeature;

use PHPUnit\\Framework\\TestCase;
use {{vendor}}\\Modules\\ExampleFeature\\Module;

/**
 * TDD stub — extend with behavior tests as you implement ExampleFeature.
 */
final class ModuleTest extends TestCase
{
    public function test_slug_is_non_empty_kebab_case(): void
    {
        $module = new Module();
        $this->assertNotEmpty($module->get_slug());
        $this->assertMatchesRegularExpression('/^[a-z][a-z0-9-]*$/', $module->get_slug());
    }
}
`;

export const TEMPLATE_EXAMPLE_FEATURE_ADMIN_TEST_TS = `import { describe, test } from '@jest/globals';

describe('ExampleFeature admin entry', () => {
  test.todo('implement feature behavior');
});
`;

export const TEMPLATE_BUILD_CONFIG = `{
  "assetMappings": [],
  "globalMappings": {},
  "styleEntryPoints": [
    "assets/stylesheets/style.css"
  ]
}
`;

export const TEMPLATE_STYLESHEET = `/**
 * Default theme stylesheet for {{slug}}.
 * Hashed via \`npm run build:styles\` → style.asset.php companion.
 */

body {
  margin: 0;
}
`;

export const TEMPLATE_README = `# {{slug}}

WordPress plugin scaffolded from [wp-starter-kit](https://github.com/abolfazl-moeini/wp-plugin-starter-kit).

## Branding (all from \`project.config.json\`)

- npm scope: \`{{npmScope}}\`
- Global JS name: \`{{globalName}}\`
- Localize var: \`{{localizeVar}}\`
- Text domain: \`{{textDomain}}\`
- Hook prefix: \`{{hookPrefix}}\`
- PHP function prefix: \`{{phpFunctionPrefix}}\`
- UI framework: \`{{uiFramework}}\`

## Development

\`\`\`
npm install
npm run build
npm test
\`\`\`

See the parent starter docs in \`node_modules/wp-starter-kit/README.md\` (if linked) or https://github.com/abolfazl-moeini/wp-plugin-starter-kit.
`;

/* -------------------------------------------------------------------- */
/* Phase 11 — Core, Modules, tsconfig, readme.txt                       */
/* -------------------------------------------------------------------- */

export const TEMPLATE_CORE_PLUGIN_PHP = `<?php
declare(strict_types=1);

namespace WPDev\\Core;

/**
 * Static facade for the wp-starter-kit plugin.
 *
 * Responsibilities:
 *  - Locate and cache the project configuration JSON
 *    (\`project.config.json\` in the plugin root).
 *  - Hold a single {@see ModuleLoader} instance for the lifetime of
 *    the request / CLI run / unit test.
 *  - Hook into WordPress at \`plugins_loaded\` (or \`init\` if the
 *    earlier hook is unavailable) at priority 10.
 *  - Fire the \`{\$hookPrefix}_plugin_loaded\` action so feature
 *    modules and third-party code can run after the plugin is up.
 *
 * The class is intentionally theme-agnostic: every path it
 * resolves is anchored to the *plugin* root (the directory that
 * contains this file's parent's parent), never to the active
 * theme directory.
 */
final class Plugin
{
    /**
     * Singleton instance. \`null\` until {@see Plugin::boot()} runs.
     */
    private static ?self \$instance = null;

    /**
     * Module loader that owns every registered feature module.
     */
    private static ?ModuleLoader \$loader = null;

    /**
     * Override path for \`project.config.json\`. Resolved at boot
     * time and cached for the rest of the request.
     */
    private static ?string \$configPath = null;

    /**
     * Parsed contents of \`project.config.json\`.
     *
     * @var array<string,mixed>|null
     */
    private static ?array \$configCache = null;

    /**
     * The hook name fired by {@see Plugin::boot()}. Stored on the
     * instance so tests can observe what would have been passed to
     * \`do_action()\` without having to spy on the global WordPress
     * function (which is a no-op in the project's test bootstrap).
     */
    private static ?string \$lastHook = null;

    /**
     * Whether {@see Plugin::boot()} has run in this process.
     */
    private static bool \$booted = false;

    /**
     * Disable instantiation — the class is used statically.
     */
    private function __construct()
    {
    }

    /**
     * Boot the plugin.
     *
     * Idempotent: a second call is a no-op. When the test bootstrap
     * provides \`add_action()\` and \`do_action()\` shims, the loader
     * is wired into WordPress; otherwise the loader is initialised
     * and the \`plugin_loaded\` hook is recorded for later inspection.
     *
     * @param string|null \$configPath Optional override for the
     *                                project.config.json location.
     *                                Production code lets this be
     *                                null and the file is resolved
     *                                from the plugin root.
     *
     * @throws \\RuntimeException when project.config.json cannot be
     *                           located or read.
     */
    public static function boot(?string \$configPath = null): void
    {
        if (self::\$booted) {
            return;
        }

        \$config = self::config(\$configPath);
        \$hookPrefix = isset(\$config['hookPrefix']) && is_string(\$config['hookPrefix'])
            ? \$config['hookPrefix']
            : 'wpdev';

        if (\$configPath !== null) {
            self::\$configCache = \$config;
        }

        self::\$loader = new ModuleLoader(\$hookPrefix);
        self::\$instance = new self();
        self::\$booted = true;
        self::\$lastHook = \$hookPrefix . '_plugin_loaded';

        if (function_exists('add_action')) {
            \\add_action('plugins_loaded', [self::class, 'on_plugins_loaded'], 10, 0);
            \\add_action('init', [self::class, 'on_plugins_loaded'], 10, 0);
        }

        if (function_exists('do_action')) {
            \\do_action(self::\$lastHook);
        }
    }

    public static function on_plugins_loaded(): void
    {
        if (self::\$loader === null) {
            return;
        }
        self::\$loader->boot_all();
    }

    public static function loader(): ModuleLoader
    {
        if (self::\$loader === null) {
            self::\$loader = new ModuleLoader('wpdev');
        }
        return self::\$loader;
    }

    public static function config(?string \$overridePath = null): array
    {
        if (self::\$configCache !== null && \$overridePath === null) {
            return self::\$configCache;
        }

        \$path = \$overridePath ?? self::resolveDefaultConfigPath();

        if (!is_file(\$path) || !is_readable(\$path)) {
            throw new \\RuntimeException(
                sprintf('project.config.json not found at %s', \$path)
            );
        }

        \$raw = file_get_contents(\$path);
        if (\$raw === false) {
            throw new \\RuntimeException(
                sprintf('Failed to read project.config.json at %s', \$path)
            );
        }

        \$decoded = json_decode(\$raw, true);
        if (!is_array(\$decoded)) {
            throw new \\RuntimeException(
                sprintf('project.config.json at %s did not decode as an object/array', \$path)
            );
        }

        if (\$overridePath === null) {
            self::\$configCache = \$decoded;
        }
        return \$decoded;
    }

    public static function is_booted(): bool
    {
        return self::\$booted;
    }

    public static function last_loaded_hook(): ?string
    {
        return self::\$lastHook;
    }

    public static function loaded_config(): array
    {
        return self::\$configCache ?? [];
    }

    public static function reset_for_tests(): void
    {
        self::\$instance = null;
        self::\$loader = null;
        self::\$configPath = null;
        self::\$configCache = null;
        self::\$lastHook = null;
        self::\$booted = false;
    }

    private static function resolveDefaultConfigPath(): string
    {
        if (self::\$configPath !== null) {
            return self::\$configPath;
        }
        \$pluginRoot = dirname(__DIR__, 2);
        return \$pluginRoot . '/project.config.json';
    }
}
`;

export const TEMPLATE_CORE_MODULE_INTERFACE_PHP = `<?php
declare(strict_types=1);

namespace WPDev\\Core;

/**
 * Contract every pluggable feature module must implement.
 *
 * The wp-starter-kit is structured around small, isolated feature
 * modules (e.g. an "example-feature", a "rest-api" module, a
 * "frontend-bundle" module). Each module decides its own slug
 * (used as the lookup key inside {@see ModuleLoader}) and a single
 * {@see ModuleInterface::boot()} entry point that the loader calls
 * exactly once after registration.
 *
 * The interface intentionally has no dependencies on WordPress so a
 * module can be unit-tested in isolation. WordPress integration
 * (action / filter registration) happens *inside* boot(), not on
 * the contract.
 */
interface ModuleInterface
{
    /**
     * Run the module's startup logic.
     *
     * Called by {@see ModuleLoader::boot_all()} after the module has
     * been registered. Implementations should be idempotent at the
     * call-site level — the loader does not promise to invoke
     * boot() only once if the caller calls boot_all() more than
     * once.
     */
    public function boot(): void;

    /**
     * Return the unique slug used to register and look up the module
     * inside the {@see ModuleLoader}. Slugs must be stable across
     * versions because they are part of the public contract.
     */
    public function get_slug(): string;
}
`;

export const TEMPLATE_CORE_MODULE_LOADER_PHP = `<?php
declare(strict_types=1);

namespace WPDev\\Core;

/**
 * In-memory registry and boot orchestrator for {@see ModuleInterface}
 * implementations.
 *
 * Modules are registered by slug with {@see ModuleLoader::register()};
 * nothing happens until {@see ModuleLoader::boot_all()} is invoked,
 * keeping module side effects out of the autoloader / files-load
 * phase. Boot order is the order of registration — no priority system
 * is needed at the module level because the loader only knows about
 * a single phase.
 *
 * Extensibility hooks (filter / action) follow the project's
 * \`{\$hookPrefix}_*\` naming convention. The \`hookPrefix\` is supplied
 * at construction time and is typically read from
 * \`project.config.json\` (e.g. \`wpdev_module_loader\` for \`wpdev\`).
 */
final class ModuleLoader
{
    /**
     * Registered modules keyed by slug, in registration order.
     *
     * @var array<string, ModuleInterface>
     */
    private array \$modules = [];

    private string \$hookPrefix;

    public function __construct(string \$hookPrefix)
    {
        \$this->hookPrefix = \$hookPrefix;
    }

    public function register(ModuleInterface \$module): void
    {
        \$slug = \$module->get_slug();
        if (\$slug === '') {
            throw new \\InvalidArgumentException(
                'Module slug must be a non-empty string'
            );
        }
        if (isset(\$this->modules[\$slug])) {
            throw new \\InvalidArgumentException(
                sprintf(
                    "Module with slug '%s' is already registered",
                    \$slug
                )
            );
        }

        \$this->modules[\$slug] = \$module;
    }

    public function boot_all(): void
    {
        \$this->modules = \$this->filter_modules(\$this->modules);

        foreach (\$this->modules as \$module) {
            \$module->boot();
        }

        \$this->fire_loaded_action();
    }

    public function get(string \$slug): ?ModuleInterface
    {
        return \$this->modules[\$slug] ?? null;
    }

    public function has(string \$slug): bool
    {
        return isset(\$this->modules[\$slug]);
    }

    /**
     * @return array<string, ModuleInterface>
     */
    public function all(): array
    {
        return \$this->modules;
    }

    private function filter_modules(array \$modules): array
    {
        if (!function_exists('apply_filters')) {
            return \$modules;
        }

        \$filtered = \\apply_filters(
            \$this->hookPrefix . '_module_loader',
            \$this
        );

        if (\$filtered instanceof self) {
            return \$filtered->modules;
        }

        return \$modules;
    }

    private function fire_loaded_action(): void
    {
        if (!function_exists('do_action')) {
            return;
        }

        \\do_action(\$this->hookPrefix . '_modules_loaded');
    }
}
`;

export const TEMPLATE_EXAMPLE_FEATURE_MODULE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature;

use {{frameworkNamespace}}\\Core\\AbstractModule;
use {{vendor}}\\Modules\\ExampleFeature\\Rest\\ItemsController;
use {{frameworkNamespace}}\\Support\\Assets;
use {{frameworkNamespace}}\\Support\\Rest\\RestSetup;

final class Module extends AbstractModule
{
    public function get_slug(): string
    {
        return 'example-feature';
    }

    public function should_boot(): bool
    {
        return function_exists('is_admin') && is_admin();
    }

    public function boot(): void
    {
        RestSetup::register(ItemsController::class);

        add_action('admin_init', [$this, 'register_admin_assets']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function register_admin_assets(): void
    {
        Assets::register_bundle_script(
            'example-feature-admin',
            'assets/bundles/ExampleFeature-admin.js'
        );
    }

    public function enqueue_admin_assets(string $hook): void
    {
        if ($hook !== 'toplevel_page_example-feature') {
            return;
        }

        Assets::enqueue_bundle_script('example-feature-admin');
    }
}
`;

export const TEMPLATE_TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "jsx": "react-jsx",
    "jsxImportSource": "{{jsxImportSource}}",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["assets/**/*", "core/**/*", "packages/**/*"],
  "exclude": ["node_modules", "vendor", "build", "dist"]
}
`;

/* -------------------------------------------------------------------- */
/* Phase 21 — new template strings (composer.json, .gitignore, .editorconfig) */
/* -------------------------------------------------------------------- */

/**
 * Build consumer composer.json. Strauss reads config from
 * composer.json `extra/strauss` (not the standalone strauss.json).
 */
export function buildComposerJson(vars) {
  const vendorPrefix = vars.vendorPrefix || "WpdevVendor";
  const excludeNamespaces = vars.vendorScopingOn === false ? ["WPDev"] : [];
  const payload = {
    name: `${vars.vendorNamespaceLower || vars.slug}/${vars.slug}`,
    description:
      vars.description ||
      `${vars.slug} — built on wp-starter-kit (WPDev) framework`,
    type: "wordpress-plugin",
    license: vars.licenseId || "GPL-2.0-or-later",
    repositories: [
      {
        type: "path",
        url: vars.frameworkPath || "../packages/framework",
        options: { symlink: true },
      },
    ],
    require: {
      php: `>=${vars.phpMinVersion || "7.4"}`,
      "wpdev/framework": vars.frameworkVersion || "*",
    },
    autoload: {
      "psr-4": {
        [`${vars.vendorNamespace}\\`]: "src/",
      },
    },
    scripts: {
      "post-install-cmd": ["@php vendor/bin/strauss"],
      "post-update-cmd": ["@php vendor/bin/strauss"],
      "scope:vendor": "@php vendor/bin/strauss",
    },
    extra: {
      strauss: {
        target_directory: "vendor-prefixed",
        namespace_prefix: vendorPrefix,
        classmap_prefix: `${vendorPrefix}_`,
        constant_prefix: `${vendorPrefix.toUpperCase()}_`,
        delete_vendor_files: false,
        include_modified_files: false,
        packages: ["wpdev/framework"],
        exclude_from_prefix: {
          namespaces: excludeNamespaces,
          file_patterns: [],
        },
        exclude_from_copy: {
          namespaces: [],
          file_patterns: [],
        },
      },
    },
  };
  return JSON.stringify(payload, null, 2) + "\n";
}

/**
 * .gitignore — minimal sane defaults. The kit does not decide for
 * the consumer whether to ignore .DS_Store / Thumbs.db / vendor/;
 * these are the de-facto WordPress plugin defaults. Consumers can
 * add to the file after scaffold; `addFeature` will not touch it
 * (it lives in `core.owns` per Phase 22).
 */
export const TEMPLATE_GITIGNORE = `# wp-starter-kit default .gitignore
# Editor / OS noise
.DS_Store
Thumbs.db
.idea/
.vscode/

# Build artifacts
node_modules/
vendor/
build/
dist/
vendor-prefixed/

# Env
.env
.env.local
`;

export const TEMPLATE_EDITORCONFIG = `# wp-starter-kit default .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[*.php]
indent_size = 4
`;
