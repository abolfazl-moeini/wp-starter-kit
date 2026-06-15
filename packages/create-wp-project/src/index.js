/**
 * @wpsk/create-wp-project — minimal Node scaffold for a new wp-starter-kit
 * project (Phase 8).
 *
 * The mrlogistic approach was a Yeoman generator. The wp-starter-kit
 * version uses a tiny in-process Node script (no Plop/Yeoman dependency)
 * that:
 *
 *   1. Accepts an `ScaffoldAnswers` shape (slug, scope, globalName, ...).
 *   2. Validates the answers (`validateAnswers`).
 *   3. Renders each template with `{{token}}` substitution.
 *   4. Writes the output to a target directory.
 *
 * Usage (CLI):
 *   node packages/create-wp-project/src/index.js [target-dir]
 *
 * When called without args, the script reads answers from `WPSK_ANSWERS_JSON`
 * env var. When called from PHPUnit or another test, import the named
 * exports and drive `scaffoldProject()` directly.
 *
 * -----------------------------------------------------------------------
 * Phase 20 — Engine public API (Appendix C of plan.v3.md)
 * -----------------------------------------------------------------------
 * The CLI (plan.installer.md) and kit scripts depend on these named
 * exports. They are the *engine* surface; the rest of this file is
 * the legacy `scaffoldProject` and its answers-based template engine,
 * preserved verbatim for BC. The Phase 21+ work wires the
 * `scaffoldProject` body to the feature-aware generators — but the
 * Phase 20 work is purely additive: every new export lives in its
 * own module and is re-exported from this file via the block at
 * the bottom.
 */

import { promises as fs } from "node:fs";
import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";

// Phase 20 — feature model + manifest + validation + presets.
// Each lives in its own module so the boundary is testable in
// isolation; this file re-exports the public API.
import {
  getFeatureCatalog,
  defaultFeatures,
  validateFeatureSet,
} from "./features.js";
import {
  buildManifest,
  readManifest,
  writeManifest,
  syncFeaturesToConfig,
  DEFAULT_DIST_MODE,
} from "./manifest.js";
import { updateJsonFile } from "./json-utils.js";
import { getPresets, applyPreset } from "./presets.js";
// Phase 21 — generator registry. The scaffold runs the
// enabled generators and merges their contributions into the
// final write set. See src/generators/index.js for the
// dispatch table.
import { getGenerators } from "./generators/index.js";
import { tplVars as tplVarsFromGenerators } from "./generators/_templates.js";
// Phase 22 — additive feature mutations. The installer's
// `wpsk add <feature>` and `wpsk remove <feature>` commands
// call these directly. Both honor the same in-memory-then-write
// safety contract the scaffold path uses.
import { addFeature } from "./addFeature.js";
import { removeFeature } from "./removeFeature.js";

/* -------------------------------------------------------------------- */
/* Types                                                                */
/* -------------------------------------------------------------------- */

/**
 * @typedef {Object} ScaffoldAnswers
 * @property {string} slug
 * @property {string} npmScope       e.g. 'myorg' (no @)
 * @property {string} globalName     e.g. 'MyProject'
 * @property {string} [localizeVar]  e.g. 'MyProjectLoc' (inferred from globalName)
 * @property {string} textDomain
 * @property {string} hookPrefix
 * @property {string} [depsBundle]   e.g. 'my-project-deps.js' (inferred from slug)
 * @property {string} phpFunctionPrefix e.g. 'myprj_'
 * @property {'preact'|'react'} uiFramework
 * @property {'plugin'|'theme'} [projectType]  Phase 11: 'plugin' (default) emits
 *                                             `{slug}.php` as the primary
 *                                             bootstrap; 'theme' (legacy)
 *                                             emits `functions.php` and is
 *                                             kept for BC only.
 */

/* -------------------------------------------------------------------- */
/* validateAnswers                                                      */
/* -------------------------------------------------------------------- */

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
const SCOPE_RE = /^[a-z0-9][a-z0-9-]*$/; // npmScope is the part after '@'
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/; // JS identifier
const DOMAIN_RE = /^[a-z0-9][a-z0-9-]*$/; // text-domain / hook-prefix slug

export function validateAnswers(a) {
  const errors = {};

  if (!a || typeof a !== "object") {
    return { ok: false, errors: { _root: "answers must be an object" } };
  }
  if (!a.slug || !SLUG_RE.test(a.slug)) {
    errors.slug = "slug must be lowercase kebab-case (a-z, 0-9, dashes)";
  }
  if (!a.npmScope || !SCOPE_RE.test(a.npmScope)) {
    errors.npmScope = "npmScope must be lowercase kebab-case (no @)";
  }
  if (!a.globalName || !IDENT_RE.test(a.globalName)) {
    errors.globalName = "globalName must be a valid JS identifier";
  }
  if (
    a.localizeVar !== undefined &&
    a.localizeVar !== "" &&
    !IDENT_RE.test(a.localizeVar)
  ) {
    errors.localizeVar = "localizeVar must be a valid JS identifier";
  }
  if (!a.textDomain || !DOMAIN_RE.test(a.textDomain)) {
    errors.textDomain = "textDomain must be lowercase kebab-case";
  }
  if (!a.hookPrefix || !DOMAIN_RE.test(a.hookPrefix)) {
    errors.hookPrefix = "hookPrefix must be lowercase kebab-case";
  }
  if (
    a.phpFunctionPrefix !== undefined &&
    a.phpFunctionPrefix !== "" &&
    !/^[a-z][a-z0-9_]*_$/.test(a.phpFunctionPrefix)
  ) {
    errors.phpFunctionPrefix =
      "phpFunctionPrefix must be lowercase letters/digits/underscores, ending with underscore";
  }
  if (a.uiFramework !== "preact" && a.uiFramework !== "react") {
    errors.uiFramework = 'uiFramework must be "preact" or "react"';
  }
  if (
    a.projectType !== undefined &&
    a.projectType !== "" &&
    a.projectType !== "plugin" &&
    a.projectType !== "theme"
  ) {
    errors.projectType =
      'projectType must be "plugin" or "theme" (default: "plugin")';
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

/* -------------------------------------------------------------------- */
/* answersToProjectConfig                                              */
/* -------------------------------------------------------------------- */

export function answersToProjectConfig(a) {
  const cfg = {
    slug: a.slug,
    globalName: a.globalName,
    localizeVar: a.localizeVar || a.globalName + "Loc",
    textDomain: a.textDomain,
    hookPrefix: a.hookPrefix,
    npmScope: "@" + a.npmScope,
    depsBundle: a.depsBundle || `${a.slug}-deps.js`,
    phpFunctionPrefix: a.phpFunctionPrefix || "wpsk_",
    uiFramework: a.uiFramework,
    projectType: a.projectType || "plugin",
    // Phase 11 v2 defaults — present in every scaffolded
    // project.config.json so consumers (readProjectConfig, REST
    // router, JS bundles) can rely on the keys without a follow-up
    // migration step. Override per-project by passing a non-default
    // value through answers (the renderer will use it).
    restNamespace: a.restNamespace || "wpsk/v1",
    vendorPrefix: a.vendorPrefix || "WpskVendor",
    phpMinVersion: a.phpMinVersion || "7.4",
    phpSourceVersion: a.phpSourceVersion || "8.1",
    batchEndpoint: a.batchEndpoint || "/batch/v1",
  };
  return cfg;
}

/* -------------------------------------------------------------------- */
/* renderTemplate                                                       */
/* -------------------------------------------------------------------- */

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/**
 * Kit version that the scaffold stamps into the manifest's
 * `kitVersion` field. The Phase 20+ manifest uses this to
 * detect when a project needs a migration. Read at module
 * load time from the package's own package.json so a release
 * of @wpsk/create-wp-project automatically advances the
 * version. Falls back to "0.0.0" if the package.json is
 * missing (e.g. when the test runner inlines the module).
 */
function readKitVersion() {
  try {
    const pkgPath = modulePath2("..", "package.json");
    if (!existsSync(pkgPath)) return "0.0.0";
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Resolve a path relative to this module's directory. Mirrors
 * the helper in src/generators/_templates.js — duplicated here
 * to avoid a circular import (the templates module re-uses
 * helpers from this file).
 */
function modulePath2(...parts) {
  let here;
  if (typeof __dirname !== "undefined" && __dirname) {
    here = __dirname;
  } else {
    here = path.join(process.cwd(), "packages/create-wp-project/src");
  }
  return path.join(here, ...parts);
}
const KIT_VERSION = readKitVersion();

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
/* Templates                                                            */
/* -------------------------------------------------------------------- */

const TEMPLATE_PROJECT_CONFIG = `{
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

const TEMPLATE_FUNCTIONS_PHP = `<?php
/**
 * Theme bootstrap for the {{slug}} WordPress theme.
 *
 * Scaffolded from wp-starter-kit. The project's own functions use the
 * {{phpFunctionPrefix}} (from project.config.json). Calls to the asset
 * helpers (enqueue, get_localize_data, asset_info, etc.) use the stable
 * framework names (wpsk_*) because wp-starter-kit ships a single
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
    // Framework-provided asset helpers (always wpsk_* names). The
    // project's phpFunctionPrefix is used only for its own glue code.
    wpsk_enqueue_bundle_script('{{depsBundle}}');
    wpsk_enqueue_stylesheet('style.css');
    wp_localize_script(
        '{{depsHandle}}',
        '{{localizeVar}}',
        wpsk_get_localize_data()
    );
    wp_set_script_translations('{{depsHandle}}', '{{textDomain}}', get_template_directory() . '/assets/translations');
}
`;

/**
 * Resolve the absolute path of a file that ships next to this module.
 *
 * Resolution order:
 *   1. `__dirname` (Babel-injected when Jest runs this file as CJS).
 *   2. `process.argv[1]` is the actual `index.js` file path. This is
 *      the case for `node packages/create-wp-project/src/index.js`
 *      (CLI invocation) and also for `node test-plugin-render.mjs`
 *      where the test script imports the module — argv[1] is the
 *      script that *was* invoked, not the imported module, so this
 *      branch may not apply. In that case we fall through to (3).
 *   3. `process.cwd()` plus the canonical `packages/create-wp-project/src/`
 *      suffix. This works for any environment where the user runs
 *      the script from the wp-starter-kit project root — which is
 *      the case for jest (working dir is project root) and for CLI
 *      users who follow the documented `node packages/...` recipe.
 *
 * @param {string} relPath  path relative to packages/create-wp-project/src/
 */
function modulePath(relPath) {
  let here;
  if (typeof __dirname !== "undefined" && __dirname) {
    here = __dirname;
  } else if (
    process.argv[1] &&
    process.argv[1].endsWith("create-wp-project/src/index.js")
  ) {
    here = path.dirname(process.argv[1]);
  } else {
    // cwd-relative fallback. Works for jest (cwd=project root) and
    // for ad-hoc node scripts that the user runs from the project root.
    here = path.join(process.cwd(), "packages/create-wp-project/src");
  }
  return path.join(here, relPath);
}

/**
 * Read the plugin-file template. The file lives alongside this script
 * under
 * `packages/create-wp-project/src/templates/plugin/plugin-file.php.tpl`
 * and is rendered with the same `{{token}}` substitution rules as
 * the inline templates. We read it lazily (on first scaffold) and
 * cache the result so subsequent scaffolds are O(1).
 */
let PLUGIN_FILE_TEMPLATE = null;
let PLUGIN_FILE_TEMPLATE_LOADED = false;
function loadPluginFileTemplate() {
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

// Aliases for template token → answer key
function tplVars(answers, cfg) {
  return {
    ...answers,
    ...cfg,
    // {{slug_underscore}} for the PHP-side function names
    slug_underscore: answers.slug.replace(/-/g, "_"),
    depsHandle: answers.depsBundle || cfg.depsBundle.replace(/\.js$/, ""),
    // {{name}} / {{description}} / {{author}} / {{authorUri}} / {{pluginUri}}
    // — sensible defaults so the WP plugin header is always populated.
    name: cfg.globalName || answers.slug,
    description: `${answers.slug} — built on wp-starter-kit (WPSK) framework`,
    author: "wp-starter-kit scaffold",
    authorUri: "https://github.com/abolfazl-moeini/wp-plugin-starter-kit",
    pluginUri: "https://github.com/abolfazl-moeini/wp-plugin-starter-kit",
    // {{vendor}} — the PSR-4 root namespace used in the example
    // feature module. Default to the kit's own WPSK namespace so the
    // stub compiles out of the box; consumers are expected to
    // override this via answers.vendor (e.g. MyOrg) in real projects.
    vendor: answers.vendor || "WPSK",
    vendorPrefixUpper: (cfg.vendorPrefix || "WpskVendor").toUpperCase(),
  };
}

const TEMPLATE_DEPENDENCIES_TS = `/**
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

const TEMPLATE_STRAUSS_JSON = `{
  "target_directory": "vendor-prefixed",
  "namespace_prefix": "{{vendorPrefix}}",
  "classmap_prefix": "{{vendorPrefix}}_",
  "constant_prefix": "{{vendorPrefixUpper}}_",
  "delete_vendor_files": true,
  "exclude_from_prefix": {
    "namespaces": ["WPSK"],
    "file_patterns": []
  }
}
`;

const TEMPLATE_HUSKY_PRE_COMMIT = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
`;

const TEMPLATE_EXAMPLE_FEATURE_ITEMS_CONTROLLER = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature\\Rest;

use {{vendor}}\\Support\\Auth\\CapabilityPolicy;
use {{vendor}}\\Support\\Rest\\AllowBatch;
use {{vendor}}\\Support\\Rest\\BatchResponse;
use {{vendor}}\\Support\\Rest\\RestHandler;
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

const TEMPLATE_EXAMPLE_FEATURE_ADMIN_TS = `import domReady from '@wordpress/dom-ready';

domReady(() => {
  const root = document.getElementById('{{slug}}-example-feature-admin');
  if (root) {
    root.textContent = 'ExampleFeature admin bundle loaded';
  }
});
`;

function packageJsonForAnswers(answers) {
  const preactAliases = answers.uiFramework === "preact";
  const projectType = answers.projectType || "plugin";
  const description =
    projectType === "theme"
      ? `${answers.slug} — WordPress theme built on wp-starter-kit`
      : `${answers.slug} — WordPress plugin built on wp-starter-kit`;
  return {
    name: "@" + answers.npmScope + "/" + answers.slug,
    version: "0.1.0",
    description,
    private: true,
    type: "module",
    scripts: {
      build:
        "npm-run-all --parallel build:dependencies build:components build:styles build:assets",
      "build:dependencies":
        "node core/packages/build/esbuild-dependencies-cli.js",
      "build:components": "node core/packages/build/esbuild-components-cli.js",
      "build:styles": "node core/packages/build/esbuild-styles-cli.js",
      "build:assets": "node build/build-assets.js",
      prepare: "husky install",
      test: "jest",
      typecheck: "tsc --noEmit",
      "lint:js": "eslint . --ext .js,.jsx,.ts,.tsx",
      "format:check":
        'prettier --check "**/*.{js,jsx,ts,tsx,json,md,yml,yaml,css}"',
      check: "node core/packages/utils/check-cli.js",
    },
    workspaces: ["core/packages/*", "packages/*"],
    dependencies: preactAliases
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
      : {
          react: "^18.3.0",
          "react-dom": "^18.3.0",
          "@wordpress/hooks": "^3.50.0",
          "@wordpress/dom-ready": "^3.50.0",
        },
  };
}

const TEMPLATE_BUILD_CONFIG = `{
  "assetMappings": [],
  "globalMappings": {},
  "styleEntryPoints": [
    "assets/stylesheets/style.css"
  ]
}
`;

const TEMPLATE_STYLESHEET = `/**
 * Default theme stylesheet for {{slug}}.
 * Hashed via \`npm run build:styles\` → style.asset.php companion.
 */
body {
  margin: 0;
}
`;

const TEMPLATE_README = `# {{slug}}

WordPress theme scaffolded from [wp-starter-kit](https://github.com/abolfazl-moeini/wp-plugin-starter-kit).

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
//
// The PHP templates below are the canonical wp-starter-kit core
// classes (Plugin, ModuleInterface, ModuleLoader). They are kept as
// inline template strings (instead of being read from the kit's
// filesystem at runtime) so the package is self-contained and does
// not require the kit to be physically installed alongside the
// consumer's project. The .tpl loading machinery is only used for
// the plugin bootstrap (which needs `{{token}}` substitution);
// the kit's own classes are static and do not need templating.

const TEMPLATE_CORE_PLUGIN_PHP = `<?php
declare(strict_types=1);

namespace WPSK\\Core;

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
            : 'wpsk';

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
            self::\$loader = new ModuleLoader('wpsk');
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

const TEMPLATE_CORE_MODULE_INTERFACE_PHP = `<?php
declare(strict_types=1);

namespace WPSK\\Core;

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

const TEMPLATE_CORE_MODULE_LOADER_PHP = `<?php
declare(strict_types=1);

namespace WPSK\\Core;

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
 * \`project.config.json\` (e.g. \`wpsk_module_loader\` for \`wpsk\`).
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

const TEMPLATE_EXAMPLE_FEATURE_MODULE_PHP = `<?php
declare(strict_types=1);

namespace {{vendor}}\\Modules\\ExampleFeature;

use {{vendor}}\\Core\\ModuleInterface;
use {{vendor}}\\Core\\Plugin;
use {{vendor}}\\Modules\\ExampleFeature\\Rest\\ItemsController;
use {{vendor}}\\Support\\Assets;
use {{vendor}}\\Support\\Rest\\RestSetup;

final class Module implements ModuleInterface
{
    public function get_slug(): string
    {
        return 'example-feature';
    }

    public function boot(): void
    {
        RestSetup::register(ItemsController::class);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function enqueue_admin_assets(): void
    {
        if (!function_exists('is_admin') || !is_admin()) {
            return;
        }
        Assets::enqueue_bundle_script(
            'example-feature-admin',
            'assets/bundles/ExampleFeature-admin.js'
        );
    }
}
`;

const TEMPLATE_TSCONFIG_JSON = `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "jsx": "react-jsx",
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

/**
 * Read the WordPress.org readme.txt template. The file lives alongside
 * the other plugin templates at
 * `packages/create-wp-project/src/templates/plugin/readme.txt.tpl`
 * and follows the same lazy-load + cache pattern as the plugin-file
 * bootstrap template (see `loadPluginFileTemplate`).
 *
 * The template is rendered with `{{token}}` substitution; the `vars`
 * passed in by `scaffoldProject` carry every placeholder the WP.org
 * format requires (`name`, `author`, `phpMinVersion`, `description`,
 * `pluginUri`, etc.).
 */
let README_TXT_TEMPLATE = null;
let README_TXT_TEMPLATE_LOADED = false;
function loadReadmeTxtTemplate() {
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
/* scaffoldProject                                                     */
/* -------------------------------------------------------------------- */

/**
 * @param {string} targetDir  absolute path where the project will be created.
 * @param {ScaffoldAnswers} answers
 * @param {Object} [options]
 * @param {Record<string,string>} [options.features]  Validated feature
 *    set; when absent, `defaultFeatures()` is used. Pre-Phase 21
 *    callers pass NO `options` at all — the answer-only call still
 *    works (BC: the default feature set produces the same file list
 *    the legacy scaffold produced).
 * @param {boolean} [options.force=false]  overwrite existing project
 *    files (project.config.json, src/Core/Plugin.php, etc.).
 *    Without --force the scaffold refuses to touch an existing
 *    project.
 * @returns {Promise<{ok: boolean, written?: string[], reason?: string}>}
 */
export async function scaffoldProject(targetDir, answers, options = {}) {
  // 1. Validate answers.
  const v = validateAnswers(answers);
  if (!v.ok) {
    return {
      ok: false,
      reason: "invalid answers: " + JSON.stringify(v.errors),
    };
  }

  // 2. Compute features. BC: absent options.features → defaults.
  const features = options.features || defaultFeatures();

  // 3. Validate the feature set. A violation must NOT write
  //    anything to disk (per the generator migration test).
  const fv = validateFeatureSet(features);
  if (!fv.ok) {
    const first = Object.entries(fv.errors)[0];
    return {
      ok: false,
      reason: `invalid feature set: ${first[0]}=${JSON.stringify(first[1])}`,
    };
  }

  // 4. Refuse to clobber an existing project unless --force is set.
  //    The sentinel is project.config.json — if it exists, the
  //    directory is treated as an existing project. Any other file
  //    the scaffold emits (src/Core/Plugin.php, etc.) is treated as
  //    a derivative of that sentinel and is protected by the same
  //    rule.
  if (!options.force) {
    try {
      await fs.access(path.join(targetDir, "project.config.json"));
      return {
        ok: false,
        reason: `project.config.json already exists at ${targetDir} — pass { force: true } to overwrite`,
      };
    } catch {
      /* good — does not exist */
    }
  }

  // 5. Build cfg + vars (the same way the legacy body did).
  const cfg = answersToProjectConfig(answers);
  const vars = tplVarsFromGenerators(answers, cfg);

  // 6. Run the registry. Each enabled generator contributes
  //    `files` (and optionally `dirs`, `deps`, `devDeps`). The
  //    core generator owns every always-on file; toggle
  //    generators contribute only when their gate is open. The
  //    final write set is the merge of all contributions, with
  //    later generators overwriting earlier ones on key
  //    collision (e.g. vendorScoping overrides core's
  //    strauss.json).
  const gens = getGenerators(features);
  const ctx = { answers, cfg, features, vars };
  const merged = { files: {}, dirs: [], deps: {}, devDeps: {} };
  for (const g of gens) {
    const out = g.run(ctx);
    if (out.files) Object.assign(merged.files, out.files);
    if (out.dirs) merged.dirs.push(...out.dirs);
    if (out.deps) Object.assign(merged.deps, out.deps);
    if (out.devDeps) Object.assign(merged.devDeps, out.devDeps);
  }

  // 7. Phase 21.13 — package.json is omitted ONLY when
  //    js === "none" AND husky === "off" (no Node toolchain
  //    to drive). The core generator already gates the file
  //    on `js !== "none"`; this is the extra husky-gate.
  if (
    features.js === "none" &&
    features.husky === "off" &&
    "package.json" in merged.files
  ) {
    delete merged.files["package.json"];
  }

  // 8. Write files. The order is the merge order (registry
  //    order) so two runs with the same feature set produce
  //    the same byte sequence (idempotency, Phase 21.9/10).
  const written = [];
  // Ensure every directory touched exists. The merged.dirs list
  // is defensive (we mkdir parents on each write anyway), but a
  // pre-pass keeps the file set tidy.
  for (const d of merged.dirs) {
    await fs.mkdir(path.join(targetDir, d), { recursive: true });
  }
  for (const [rel, content] of Object.entries(merged.files)) {
    const abs = path.join(targetDir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, "utf8");
    written.push(rel);
  }

  // 9. Write the manifest. The manifest's `features` object
  //    is the validated feature set; `kitVersion` is the kit's
  //    own version; `distMode` is "vendored" until Phase 23
  //    flips the default to "deps".
  const manifest = buildManifest({
    kitVersion: KIT_VERSION,
    features,
    distMode: DEFAULT_DIST_MODE,
  });
  await writeManifest(targetDir, manifest);
  // The manifest is part of the consumer's durable state — add
  // it to the `written` list so callers can assert the full
  // file set returned by scaffoldProject.
  if (!written.includes("wpsk-kit.json")) {
    written.push("wpsk-kit.json");
  }

  // 10. Dual-write `features` into project.config.json so
  //    pre-Phase 20 readers (the kit's PHP classes, the JS
  //    asset bundle) can answer "which features are on?"
  //    without discovering wpsk-kit.json.
  await syncFeaturesToConfig(targetDir, features);

  return { ok: true, written };
}

/* -------------------------------------------------------------------- */
/* CLI entry                                                            */
/* -------------------------------------------------------------------- */

function parseAnswersFromEnv() {
  const raw = process.env.WPSK_ANSWERS_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseAnswersFromArgs(argv) {
  // Lightweight flag parser: --slug=foo --scope=bar --global=MyProject ...
  // Plus --target=<dir>. For interactive use the user can pipe in JSON.
  const a = {};
  let target = null;
  for (const arg of argv) {
    if (arg.startsWith("--target=")) {
      target = arg.slice("--target=".length);
    } else if (arg.startsWith("--slug=")) a.slug = arg.slice("--slug=".length);
    else if (arg.startsWith("--scope="))
      a.npmScope = arg.slice("--scope=".length);
    else if (arg.startsWith("--global="))
      a.globalName = arg.slice("--global=".length);
    else if (arg.startsWith("--domain="))
      a.textDomain = arg.slice("--domain=".length);
    else if (arg.startsWith("--hook="))
      a.hookPrefix = arg.slice("--hook=".length);
    else if (arg.startsWith("--php="))
      a.phpFunctionPrefix = arg.slice("--php=".length);
    else if (arg.startsWith("--ui=")) a.uiFramework = arg.slice("--ui=".length);
    else if (arg.startsWith("--type="))
      a.projectType = arg.slice("--type=".length);
  }
  return { answers: a, target };
}

async function main() {
  const argv = process.argv.slice(2);
  const fromEnv = parseAnswersFromEnv();
  const fromArgs = parseAnswersFromArgs(argv);
  const answers = fromEnv || fromArgs.answers;
  const target = process.env.WPSK_TARGET || fromArgs.target || process.cwd();

  if (!answers || Object.keys(answers).length === 0) {
    process.stdout.write(
      "Usage: node packages/create-wp-project/src/index.js " +
        "[--target=<dir>] [--slug=<s> --scope=<s> --global=<s> --domain=<s> --hook=<s> --php=<s> --ui=preact|react --type=plugin|theme]\n" +
        "   or: WPSK_ANSWERS_JSON=<json> node packages/create-wp-project/src/index.js\n",
    );
    process.exit(2);
  }

  const res = await scaffoldProject(path.resolve(target), answers);
  if (!res.ok) {
    process.stderr.write(
      "Scaffold failed: " + (res.reason || "unknown") + "\n",
    );
    process.exit(1);
  }
  process.stdout.write(
    "Scaffold OK. Wrote: " + (res.written || []).join(", ") + "\n",
  );
}

// CLI detection: if this script was invoked directly (argv[1] is our file
// or our bin), run main(). jest passes the test file as argv[1], so the
// equality check is `endsWith` not `===`.
if (
  (process.argv[1] && process.argv[1].endsWith("create-wp-project")) ||
  (process.argv[1] &&
    process.argv[1].includes("create-wp-project/src/index.js"))
) {
  main().catch((e) => {
    process.stderr.write("Scaffold error: " + (e && e.message) + "\n");
    process.exit(1);
  });
}

/* -------------------------------------------------------------------- */
/* Phase 20 — Engine public API (Appendix C of plan.v3.md)             */
/* -------------------------------------------------------------------- */
//
// Re-export the feature-model, manifest, and preset surface from
// their dedicated modules. The legacy `scaffoldProject` /
// `validateAnswers` / `answersToProjectConfig` exports above
// remain unchanged (BC — pre-Phase 20 callers keep working).
//
// Locked by the engine-api surface area:
//   - getFeatureCatalog      features.js
//   - defaultFeatures        features.js
//   - validateFeatureSet     features.js
//   - getPresets             presets.js
//   - applyPreset            presets.js
//   - buildManifest          manifest.js
//   - readManifest           manifest.js
//   - writeManifest          manifest.js
//   - syncFeaturesToConfig   manifest.js
//   - updateJsonFile         json-utils.js
//
// Phase 22 exports (addFeature, removeFeature) — the installer's
// `wpsk add <feature>` and `wpsk remove <feature>` entry points.
// Both go through the same syncFeaturesToConfig contract as the
// scaffold path, so a consumer that calls them directly sees the
// same on-disk shape scaffoldProject produces.

export {
  getFeatureCatalog,
  defaultFeatures,
  validateFeatureSet,
  buildManifest,
  readManifest,
  writeManifest,
  syncFeaturesToConfig,
  updateJsonFile,
  getPresets,
  applyPreset,
  addFeature,
  removeFeature,
};
