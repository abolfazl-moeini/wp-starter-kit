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
import { resolveEngineSrcDir } from "../resolve-kit-paths.js";

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
    // {{slug_underscore}} for PHP function / class names (lowercase snake_case)
    slug_underscore: answers.slug.replace(/-/g, "_"),
    // {{slug_constant}} for define() constants — WordPress convention is UPPER_SNAKE
    // e.g. slug "my-project" → MY_PROJECT_VERSION, MY_PROJECT_PLUGIN_DIR
    slug_constant: answers.slug.replace(/-/g, "_").toUpperCase(),
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
      "wpdev"
    ).toLowerCase(),
    // {{frameworkNamespace}} — the WPDev framework namespace root, used
    // in `use` imports for framework classes (e.g.
    // "use WPDev\\Core\\ModuleInterface"). Always "WPDev" — the consumer's
    // composer.json resolves this through the wpdev/framework dependency.
    frameworkNamespace: "WPDev",
    vendorPrefixUpper: (cfg.vendorPrefix || "WpdevVendor").toUpperCase(),
    // Optional local path for kit-internal path-repo mode only.
    // Consumer projects do NOT get a default ../packages/* path —
    // that only works next to a monorepo checkout and breaks
    // real scaffolded plugins. Pass answers.frameworkPath /
    // options.frameworkPath explicitly when you need a path repo.
    frameworkPath: (answers && answers.frameworkPath) || "",
    // {{frameworkVersion}} is the composer `require` constraint
    // for wpdev/framework (Packagist / VCS). Default `*`.
    frameworkVersion: (answers && answers.frameworkVersion) || "*",
    faultTolerancePath: (answers && answers.faultTolerancePath) || "",
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

  const wpdevDeps = Object.fromEntries(
    CONSUMER_RUNTIME_WPDEV_PACKAGES.map((name) => [name, versionOf(name)]),
  );
  const wpdevDevDeps = Object.fromEntries(
    CONSUMER_BUILD_WPDEV_PACKAGES.map((name) => [name, versionOf(name)]),
  );

  const packageVendor = String(answers.npmScope || "")
    .replace(/^@/, "")
    .trim();
  return {
    // npm scoped name: @vendor/project  (Composer uses vendor/project)
    name: `@${packageVendor}/${answers.slug}`,
    version: "0.1.0",
    description,
    private: true,
    type: "module",
    // Local monorepo packages under packages/* (mirrors composer
    // path repo `packages/*` for PHP). Empty dir / PHP-only packages
    // are fine — npm only links subfolders that have package.json.
    workspaces: ["packages/*"],
    scripts: scriptsForVariant(jsVariant, {
      build:
        "npm-run-all --parallel build:dependencies build:components build:styles build:assets",
      "build:dependencies": "wpdev-build-dependencies",
      "build:components": "wpdev-build-components",
      "build:styles": "wpdev-build-styles",
      "build:assets": "wpdev-build-assets",
      // Build production assets, then package a clean dist/{slug}/ tree.
      // Source is never modified; packaging lives in dev/release/.
      release: "npm run build && node dev/release/prepare-release.js",
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
      ...wpdevDeps,
    },
    devDependencies: {
      // Phase 23.B4: the @wpdev/* build tools. The consumer
      // uses them at scaffold/build time. `@wpdev/build`
      // bundles the dependency-extraction plugin as a
      // transitive dep, but we surface it explicitly so
      // the version is visible in the consumer's lockfile.
      ...wpdevDevDeps,
      // Required by scripts.build (npm-run-all --parallel …).
      // Without this, `npm run build` / `npm run release` fail
      // with "npm-run-all: command not found" after a clean install.
      "npm-run-all": versionOf("npm-run-all"),
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
 * Template files live under create-wp-project/src/templates/.
 * Always use resolveEngineSrcDir from resolve-kit-paths (realpath +
 * package resolve + import.meta). Never invent cwd/packages/create-wp-project
 * — that breaks scaffolds outside the monorepo.
 */
function modulePath(relPath) {
  return path.join(resolveEngineSrcDir(), relPath);
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

export const TEMPLATE_FUNCTIONS_PHP = `<?php
/**
 * Theme bootstrap for the {{slug}} WordPress theme.
 *
 * Scaffolded from wp-starter-kit. The project's own functions use the
 * {{phpFunctionPrefix}} (from wpdev.json). Calls to the asset
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
 *      opt-in via \`projectType: 'theme'\` in wpdev.json.
 *   3. New projects should NOT ship a \`functions.php\`. The file
 *      will be removed in the next major release.
 *
 * If you are reading this comment in a freshly-scaffolded plugin
 * project, please delete this file and rely on \`{{slug}}.php\`.
 */

if (!defined('{{slug_constant}}_VERSION')) {
    define('{{slug_constant}}_VERSION', '0.1.0');
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
 *      opt-in via \`projectType: 'theme'\` in wpdev.json.
 *   3. New projects should NOT ship a \`functions.php\`. The file
 *      will be removed in the next major release.
 *
 * If you are reading this comment in a freshly-scaffolded plugin
 * project, please delete this file and rely on \`{{slug}}.php\`.
 */

if (!defined('{{slug_constant}}_VERSION')) {
    define('{{slug_constant}}_VERSION', '0.1.0');
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

export const TEMPLATE_EXAMPLE_FEATURE_ACCESS = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature\\Access;

use {{frameworkNamespace}}\\Support\\AccessManager\\BluePrint\\BluePrint;
use {{frameworkNamespace}}\\Support\\AccessManager\\UserAccess;

/**
 * Named access map for ExampleFeature (AccessManager).
 *
 * Prefer have_access() / CapabilityPolicy::access() over scattering
 * current_user_can() across the module. Declare every gate once here.
 *
 * Patterns:
 * - any()  — OR of capabilities
 * - all()  — AND of capabilities
 * - custom() — free-form callback
 * - Multiple describe() with the same id — OR of rule groups
 *
 * @see {{frameworkNamespace}}\\Support\\AccessManager\\UserAccess
 * @see {{frameworkNamespace}}\\Support\\Auth\\CapabilityPolicy::access()
 */
final class FeatureAccess extends UserAccess
{
    public const VIEW_ITEMS = 'view_items';
    public const EDIT_ITEMS = 'edit_items';
    public const PUBLISH_ITEMS = 'publish_items';
    public const MANAGE_FEATURE = 'manage_feature';

    protected function describe(BluePrint $blue_print): void
    {
        // any(): pass if user has at least one of these caps
        $blue_print->describe(self::VIEW_ITEMS)
            ->any('read', 'edit_posts');

        // Primary REST gate for mutating endpoints
        $blue_print->describe(self::EDIT_ITEMS)
            ->any('edit_posts');

        // all(): every listed cap is required
        $blue_print->describe(self::PUBLISH_ITEMS)
            ->all('edit_posts', 'publish_posts');

        // custom() + second describe() group = OR of rule groups
        $blue_print->describe(self::MANAGE_FEATURE)
            ->custom(static function (): bool {
                return current_user_can('manage_options');
            });

        $blue_print->describe(self::MANAGE_FEATURE)
            ->any('edit_others_posts');
    }
}
`;

export const TEMPLATE_EXAMPLE_FEATURE_VIEW = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature\\Templates;

use {{frameworkNamespace}}\\Support\\Templates\\Template;

/**
 * ExampleFeature template helpers — Template API usage.
 *
 * @see {{frameworkNamespace}}\\Support\\Templates\\Template
 * @see {{frameworkNamespace}}\\Support\\Templates\\set_template_variable()
 */
final class View
{
    public static function directory(): string
    {
        return __DIR__;
    }

    public static function render(string $template): string
    {
        return Template::render($template, self::directory());
    }

    public static function load(string $template): bool
    {
        return Template::load($template, self::directory());
    }

    public static function notice(string $message, string $type = 'info'): string
    {
        Template::set_variable('notice', [
            'message' => $message,
            'type'    => $type,
        ]);

        return self::render('status-notice.php');
    }

    /**
     * @param mixed $error
     */
    public static function messages($error): string
    {
        return Template::render_messages($error);
    }
}
`;

export const TEMPLATE_EXAMPLE_FEATURE_STATUS_NOTICE = `<?php
/**
 * ExampleFeature sample partial — reads vars via Template APIs.
 *
 * @package {{vendor}}\\Modules\\ExampleFeature
 */

use function {{frameworkNamespace}}\\Support\\Templates\\get_template_variable;

$notice = get_template_variable('notice');
if (!is_array($notice)) {
    return;
}

$message = isset($notice['message']) ? (string) $notice['message'] : '';
$type = isset($notice['type']) ? (string) $notice['type'] : 'info';
$type_class = preg_replace('/[^a-z0-9_-]/i', '', $type) ?: 'info';
?>
<div class="wpdev-example-notice wpdev-example-notice--<?php echo esc_attr($type_class); ?>" role="status">
	<p><?php echo esc_html($message); ?></p>
</div>
`;

export const TEMPLATE_EXAMPLE_FEATURE_ITEMS_CONTROLLER = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature\\Rest;

use {{vendor}}\\Modules\\ExampleFeature\\Access\\FeatureAccess;
use {{vendor}}\\Modules\\ExampleFeature\\Templates\\View;
use {{frameworkNamespace}}\\Support\\Auth\\CapabilityPolicy;
use {{frameworkNamespace}}\\Support\\Rest\\AllowBatch;
use {{frameworkNamespace}}\\Support\\Rest\\BatchResponse;
use {{frameworkNamespace}}\\Support\\Rest\\RestHandler;
use WP_REST_Request;
use WP_REST_Response;

/**
 * Demo REST handler. Permissions use AccessManager (FeatureAccess),
 * not ad-hoc current_user_can() — see Access/FeatureAccess.php.
 * HTML fragments use Template APIs via Templates/View.php.
 */
final class ItemsController extends RestHandler implements AllowBatch
{
    public function rest_handler(WP_REST_Request $request): WP_REST_Response
    {
        $cacheKey = (string) ($request->get_param('cacheKey') ?? 'default');
        $noticeHtml = View::notice('Example items loaded', 'success');
        return BatchResponse::wrap(
            [
                'items'  => [],
                'notice' => $noticeHtml,
            ],
            $cacheKey
        );
    }

    public function rest_permission(): bool
    {
        // Prefer named AccessManager rules over CapabilityPolicy::can().
        return CapabilityPolicy::access(
            new FeatureAccess(),
            FeatureAccess::EDIT_ITEMS
        );
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

use {{vendor}}\\Modules\\ExampleFeature\\Module;
use {{vendor}}\\Tests\\TestCases\\PluginBaseTestCase;

/**
 * TDD stub — extend with behavior tests as you implement ExampleFeature.
 */
final class ModuleTest extends PluginBaseTestCase
{
    /** @test */
    public function itShouldExposeExampleFeatureSlug(): void
    {
        $module = new Module();
        $this->assertSame('example-feature', $module->get_slug(), 'Example feature slug must stay stable');
        $this->assertMatchesRegularExpression(
            '/^[a-z][a-z0-9-]*$/',
            $module->get_slug(),
            'Slug must be kebab-case'
        );
    }

    /** @test */
    public function itShouldBootForRestRegistrationOutsideAdmin(): void
    {
        $module = new Module();
        // AbstractModule defaults should_boot() to true so RestSetup runs
        // on public API requests; admin-only logic stays inside boot().
        $this->assertTrue(
            method_exists($module, 'should_boot') ? $module->should_boot() : true,
            'ExampleFeature must not skip boot solely because the request is not admin'
        );
    }
}
`;

export const TEMPLATE_EXAMPLE_FEATURE_ADMIN_TEST_TS = `import { describe, test } from '@jest/globals';

describe('ExampleFeature admin entry', () => {
  test.todo('implement feature behavior');
});
`;

export const TEMPLATE_WPDEV_JSON = `{
  "schema": 2,
  "kitVersion": "{{kitVersion}}",
  "distMode": "deps",
  "slug": "{{slug}}",
  "globalName": "{{globalName}}",
  "localizeVar": "{{localizeVar}}",
  "textDomain": "{{textDomain}}",
  "hookPrefix": "{{hookPrefix}}",
  "npmScope": "{{npmScope}}",
  "depsBundle": "{{depsBundle}}",
  "phpFunctionPrefix": "{{phpFunctionPrefix}}",
  "uiFramework": "{{uiFramework}}",
  "restNamespace": "{{restNamespace}}",
  "vendorPrefix": "{{vendorPrefix}}",
  "phpMinVersion": "{{phpMinVersion}}",
  "phpSourceVersion": "{{phpSourceVersion}}",
  "batchEndpoint": "{{batchEndpoint}}",
  "features": {},
  "build": {
    "assetMappings": [],
    "globalMappings": {},
    "styleEntryPoints": [
      "assets/stylesheets/style.css"
    ]
  }
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

## Branding (all from \`wpdev.json\`)

- vendor / org (package + composer): \`{{npmScope}}\`
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

## Production release package

Build assets and produce a clean installable tree under \`dist/{{slug}}/\`
(source is not modified):

\`\`\`
npm run release
# or, PHP-only packaging after a prior build:
composer release:dist
\`\`\`

The dist tree hardens \`composer.json\` (PHP platform, path-repo
\`symlink: false\`), runs \`composer install --no-dev\`, then strips
dev-only files (\`tests/\`, \`docs/\`, \`packages/\`, \`node_modules/\`,
\`package.json\`, agent docs, hidden dirs, …).

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
 *    (\`wpdev.json\` in the plugin root).
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
     * Override path for \`wpdev.json\`. Resolved at boot
     * time and cached for the rest of the request.
     */
    private static ?string \$configPath = null;

    /**
     * Parsed contents of \`wpdev.json\`.
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
     *                                wpdev.json location.
     *                                Production code lets this be
     *                                null and the file is resolved
     *                                from the plugin root.
     *
     * @throws \\RuntimeException when wpdev.json cannot be
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

        // Priority 11: boot() is usually hooked at plugins_loaded@10; same
        // priority would never fire. Never also register on init (double boot).
        if (function_exists('add_action')) {
            \\add_action('plugins_loaded', [self::class, 'on_plugins_loaded'], 11, 0);
        }
        if (
            function_exists('did_action')
            && did_action('plugins_loaded')
            && function_exists('doing_action')
            && !\\doing_action('plugins_loaded')
        ) {
            self::on_plugins_loaded();
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
                sprintf('wpdev.json not found at %s', \$path)
            );
        }

        \$raw = file_get_contents(\$path);
        if (\$raw === false) {
            throw new \\RuntimeException(
                sprintf('Failed to read wpdev.json at %s', \$path)
            );
        }

        \$decoded = json_decode(\$raw, true);
        if (!is_array(\$decoded)) {
            throw new \\RuntimeException(
                sprintf('wpdev.json at %s did not decode as an object/array', \$path)
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
        return \$pluginRoot . '/wpdev.json';
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
 * \`wpdev.json\` (e.g. \`wpdev_module_loader\` for \`wpdev\`).
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

export const TEMPLATE_EXAMPLE_FEATURE_DEFERRED_SETUP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature\\Queue;

use {{frameworkNamespace}}\\Support\\Queue\\DeferredCall;

/**
 * Canonical DeferredCall examples for the starter kit.
 *
 * Patterns (from queue-utils DefferCallTest):
 * 1. Queue before the hook fires → callback runs on do_action (params only).
 * 2. merge_hook_params → fixed params first, then args from do_action(...).
 * 3. queue() / can_queue() return false when the hook already fired → run now.
 *
 * @see {{frameworkNamespace}}\\Support\\Queue\\DeferredCall
 */
final class DeferredSetup
{
    public const READY_HOOK = 'wpdev_example_feature_ready';
    public const SYNC_HOOK = 'wpdev_example_feature_sync';

    public static function boot(): void
    {
        // Pattern 1: fixed params only
        DeferredCall::queue(self::READY_HOOK, [
            'callback' => [self::class, 'on_ready'],
            'params'   => [
                [
                    'module' => 'example-feature',
                    'phase'  => 'ready',
                ],
            ],
            'priority' => 10,
        ]);

        // Pattern 2: merge do_action() args after params
        DeferredCall::queue(self::SYNC_HOOK, [
            'callback'          => [self::class, 'on_sync'],
            'params'            => [
                [
                    'source' => 'example-feature',
                ],
            ],
            'merge_hook_params' => true,
            'priority'          => 10,
        ]);

        // Demo fires — in production, another component usually fires these.
        if (function_exists('do_action')) {
            do_action(self::READY_HOOK);
            do_action(self::SYNC_HOOK, 1, 2, 3);
        }
    }

    /**
     * Pattern 3: queue for $hook, or run immediately if it already fired.
     */
    public static function queue_or_run(string $hook, callable $callback, int $priority = 10): void
    {
        $queued = DeferredCall::queue($hook, [
            'callback' => $callback,
            'priority' => $priority,
        ]);

        if (!$queued) {
            $callback();
        }
    }

    /**
     * @param array{module?: string, phase?: string} $context
     */
    public static function on_ready(array $context): void
    {
        if (function_exists('do_action')) {
            do_action('wpdev_example_feature_deferred_ready', $context);
        }
    }

    /**
     * @param array{source?: string} $context
     * @param mixed                  ...$hookArgs
     */
    public static function on_sync(array $context, ...$hookArgs): void
    {
        if (function_exists('do_action')) {
            do_action('wpdev_example_feature_deferred_sync', $context, $hookArgs);
        }
    }
}
`;

export const TEMPLATE_EXAMPLE_FEATURE_STATUS_COMMAND = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature\\Cli;

use {{frameworkNamespace}}\\Support\\WpCli\\Command;

/**
 * Example WP-CLI command.
 *
 *   wp wpdev example-status
 *   wp wpdev example-status --format=json
 *
 * @see {{frameworkNamespace}}\\Support\\WpCli\\CliSetup
 */
final class StatusCommand extends Command
{
    public function name(): string
    {
        return 'wpdev example-status';
    }

    public function description(): string
    {
        return 'Print ExampleFeature status (WP-CLI demo).';
    }

    public function synopsis(): array
    {
        return [
            [
                'type'        => 'assoc',
                'name'        => 'format',
                'description' => 'Output format: text or json.',
                'optional'    => true,
                'default'     => 'text',
                'options'     => ['text', 'json'],
            ],
        ];
    }

    public function handle(array $args, array $assoc_args): void
    {
        $payload = [
            'module'  => 'example-feature',
            'status'  => 'ok',
            'message' => 'ExampleFeature is loaded',
        ];

        $format = isset($assoc_args['format']) ? (string) $assoc_args['format'] : 'text';

        if ($format === 'json') {
            $this->log((string) wp_json_encode($payload));
            $this->success('Status printed as JSON');
            return;
        }

        $this->log('Module:  ' . $payload['module']);
        $this->log('Status:  ' . $payload['status']);
        $this->log('Message: ' . $payload['message']);
        $this->success('ExampleFeature status OK');
    }
}
`;

export const TEMPLATE_EXAMPLE_FEATURE_MODULE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature;

use {{frameworkNamespace}}\\Core\\AbstractModule;
use {{vendor}}\\Modules\\ExampleFeature\\Cli\\StatusCommand;
use {{vendor}}\\Modules\\ExampleFeature\\Queue\\DeferredSetup;
use {{vendor}}\\Modules\\ExampleFeature\\Rest\\ItemsController;
use {{frameworkNamespace}}\\Support\\Assets;
use {{frameworkNamespace}}\\Support\\Rest\\RestSetup;
use {{frameworkNamespace}}\\Support\\WpCli\\CliSetup;

final class Module extends AbstractModule
{
    public function get_slug(): string
    {
        return 'example-feature';
    }

    public function boot(): void
    {
        // Always register REST via framework RestSetup (public API + batch).
        // Do not call register_rest_route() here — RestSetup owns that.
        RestSetup::register(ItemsController::class);

        // WP-CLI: class-based command — see Cli/StatusCommand.php.
        // Do not call WP_CLI::add_command() here — CliSetup owns that.
        CliSetup::register(StatusCommand::class);

        // DeferredCall demo — see Queue/DeferredSetup.php (queue-utils patterns).
        DeferredSetup::boot();

        if (!function_exists('is_admin') || !is_admin()) {
            return;
        }

        // Pattern 3: queue admin assets, or run now if admin_init already fired.
        DeferredSetup::queue_or_run('admin_init', [$this, 'register_admin_assets']);
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
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@wpdev/polaris-stack": ["src/polaris/index.ts"],
      "@wpdev/polaris-stack/*": ["src/polaris/*"]
    }
  },
  "include": ["assets/**/*", "src/**/*", "core/**/*", "packages/**/*"],
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
  const phpMin = vars.phpMinVersion || "7.4";
  const excludeNamespaces = vars.vendorScopingOn === false ? ["WPDev"] : [];
  // Composer package name: vendor/project (same vendor as package.json scope).
  const packageVendor = String(
    vars.packageVendor ||
      vars.npmScope ||
      vars.vendorNamespaceLower ||
      vars.slug ||
      "",
  )
    .replace(/^@/, "")
    .trim();
  // Kit module framework (Plugin / ModuleLoader / Support) is NOT a
  // Composer package install — sources live at packages/framework/
  // (copied at scaffold or replaced with a git submodule). Autoload only.
  const payload = {
    name: `${packageVendor}/${vars.slug}`,
    description:
      vars.description ||
      `${vars.slug} — built on wp-starter-kit (WPDev) framework`,
    type: "wordpress-plugin",
    license: vars.licenseId || "GPL-2.0-or-later",
    require: {
      php: `>=${phpMin}`,
    },
    autoload: {
      "psr-4": {
        [`${vars.vendorNamespace}\\`]: "src/",
        // Kit module runtime (not Composer "wpdev/framework" package).
        "WPDev\\": "packages/framework/src/",
      },
    },
    scripts: {
      // Strauss only when there are Composer packages to prefix (feature
      // generators may add packages later). Empty whitelist = no-op.
      "post-install-cmd": ["@php vendor/bin/strauss || true"],
      "post-update-cmd": ["@php vendor/bin/strauss || true"],
      "scope:vendor": "@php vendor/bin/strauss",
      // Production package under dist/{slug}/ (source tree untouched).
      "release:dist": "node dev/release/prepare-release.js",
    },
    config: {
      // Runtime PHP is enforced in the plugin bootstrap (not Composer).
      "platform-check": false,
      platform: {
        php: phpMin,
      },
    },
    extra: {
      strauss: {
        target_directory: "vendor-prefixed",
        namespace_prefix: vendorPrefix,
        classmap_prefix: `${vendorPrefix}_`,
        constant_prefix: `${vendorPrefix.toUpperCase()}_`,
        delete_vendor_files: false,
        include_modified_files: false,
        // No kit-core package — only real Composer deps (e.g. fault-tolerance).
        packages: [],
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

# Docker PHPUnit generated local files
tests/docker-phpunit/.env
tests/docker-phpunit/wp-tests-config.php
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
