/**
 * @wpdev/create-wp-project — kit-wide dep-version registry.
 *
 * Phase 24 of plan.v3.md (24.8 part 2). The engine needs a
 * single source of truth for "what package/composer versions
 * does THIS kit release expect in a consumer project". This
 * module IS that source.
 *
 * Two consumers in Phase 24:
 *  - `planUpdate(dir, toVersion)` reads the consumer's
 *    `package.json` + `composer.json`, diffs each dep against
 *    `getDepVersions()`, and reports the add / remove / bump
 *    deltas in a `depChanges` object.
 *  - `runMigrations` (future bump step) — uses the same map to
 *    patch the consumer's `package.json` / `composer.json` to
 *    match the kit's expectation after a version bump.
 *
 * The map is *the* registry. Adding a dep here without
 * updating the kit's own `package.json` / `composer.json` (or
 * vice-versa) is a contract bug. The depVersions test
 * (tests/packages/depVersions.test.js) cross-checks the four
 * canonical JS build-chain deps against the kit's own
 * package.json to catch that drift.
 *
 * The map values are the exact pinned-range strings the
 * consumer's JSON files should carry after a successful
 * `wpdev update`. For a "^1.2.3" range the string is "^1.2.3";
 * for an aliased dep like `react: "npm:@preact/compat"` the
 * string is the full alias spec. We don't normalise — the
 * comparison in `planUpdate` is a string-equality check, so
 * the registry and the consumer's package.json must agree
 * verbatim on the range. A future "loose" comparison mode is
 * a feature request, not a silent default.
 *
 * No I/O. No mutation. The function is pure and side-effect
 * free; the test depends on this to run in any order.
 */

import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";

/* -------------------------------------------------------------------- */
/* Static registry (authoritative)                                       */
/* -------------------------------------------------------------------- */

/**
 * Resolve a file path relative to this module's directory.
 * Mirrors the same __dirname / argv[1] / cwd pattern used
 * elsewhere in the kit. Needed because the registry below
 * reads the kit's own `package.json` and `composer.json` to
 * keep the JS chain in lock-step with what's actually
 * installed.
 */
function modulePath(...parts) {
  let here;
  if (typeof __dirname !== "undefined" && __dirname) {
    here = __dirname;
  } else if (
    process.argv[1] &&
    process.argv[1].endsWith("create-wp-project/src/dep-versions.js")
  ) {
    here = path.dirname(process.argv[1]);
  } else {
    here = path.join(process.cwd(), "packages/create-wp-project/src");
  }
  return path.join(here, ...parts);
}

/**
 * Read a dep range from the kit's own `package.json` (devDeps
 * first, then deps). Returns `null` when the dep isn't
 * declared — the caller decides whether `null` is an error
 * or "not in this kit".
 *
 * Reading from disk (instead of hard-coding the range here) is
 * the load-bearing trick: the kit's own `package.json` is the
 * single source of truth, and a future "bump typescript in
 * the kit" commit is the only edit that ever needs to land.
 * The depVersions test asserts this contract; the registry
 * below only adds deps that aren't in the kit's package.json
 * (composer deps, mostly).
 */
function readKitDevDep(name) {
  const pkgPath = modulePath("..", "..", "..", "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return (
      (pkg.devDependencies && pkg.devDependencies[name]) ||
      (pkg.dependencies && pkg.dependencies[name]) ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Read a dep range from the kit's own `composer.json`
 * (require first, then require-dev). Returns `null` if the dep
 * isn't declared. Same rationale as `readKitDevDep`: composer
 * is a one-line read away, so we don't maintain a duplicate
 * range string in this file.
 */
function readKitComposerDep(name) {
  const composerPath = modulePath("..", "..", "..", "composer.json");
  if (!existsSync(composerPath)) return null;
  try {
    const composer = JSON.parse(readFileSync(composerPath, "utf8"));
    return (
      (composer["require-dev"] && composer["require-dev"][name]) ||
      (composer.require && composer.require[name]) ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Map an npm package name to the workspace directory that
 * contains it. The kit uses npm workspaces with two roots:
 * `packages/*` (the @wpdev/* lib packages) and `core/packages/*`
 * (the @wpdev/* build tools, plus the internal @core/utils).
 *
 * Only the entries we expect to be `@wpdev/*`-scoped live here —
 * non-workspace deps are read from the kit's own `package.json`
 * via `readKitDevDep` (or `readKitComposerDep` for composer).
 *
 * The mapping is hard-coded because the kit's workspace layout
 * is itself hard-coded in the root `package.json`; if a new
 * workspace package is added, the entry is added here in the
 * same commit. The depVersions test (and the per-package
 * `publishable.test.js`) cross-check that all shippable
 * packages ARE present in the registry.
 *
 * @param {string} name
 * @returns {string|null}  relative path from kit root, or null
 *                          if the name is not a known workspace
 *                          package.
 */
function workspaceDirFor(name) {
  // The lib packages + 2 build packages. The basenames match
  // the npm scope: `@wpdev/<basename>`. Libs live in
  // `packages/<basename>/` and build tools in
  // `core/packages/<basename>/`.
  const LIBS = [
    "hooks",
    "utils",
    "rest-utils",
    "html-utils",
    "fetch",
    "translation",
  ];
  const BUILD_TOOLS = ["build", "dependency-extraction-esbuild-plugin"];
  const m = name.match(/^@wpdev\/(.+)$/);
  if (!m) return null;
  const base = m[1];
  if (LIBS.includes(base)) return path.join("packages", base);
  if (BUILD_TOOLS.includes(base)) return path.join("core/packages", base);
  return null;
}

/**
 * Read a workspace package's `version` field from its own
 * `package.json`. Returns the version string (e.g. "0.1.0")
 * or `null` if the workspace directory or `version` field is
 * missing. This is how the @wpdev/* entries land in the
 * registry: the kit's own workspace package files are the
 * source of truth for the framework's own versions.
 *
 * The returned string is the exact `version` from the
 * package.json — e.g. "0.1.0", not "^0.1.0". The scaffold
 * wraps it with a caret ("^0.1.0") for the consumer's
 * `package.json` because that's the npm convention for
 * accepting future patch/minor versions of the same major.
 * See `getDepVersions()` consumer code for the wrap.
 */
function readKitPackageVersion(name) {
  const relDir = workspaceDirFor(name);
  if (!relDir) return null;
  const pkgPath = modulePath("..", "..", "..", relDir, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof pkg.version === "string" && pkg.version.length > 0
      ? pkg.version
      : null;
  } catch {
    return null;
  }
}

/**
 * The registry. Built lazily on first call (not at module
 * load) so the file-system reads don't happen in test
 * environments where the kit's package.json may be missing.
 * The result is a `Map<string,string>` keyed by dep name
 * (npm OR composer), with the value being the pinned range
 * the kit expects.
 *
 * The list is split into two groups for readability:
 *
 *  - JS/TS/build chain — read live from the kit's package.json
 *    so the registry auto-tracks any future bump. The
 *    depVersions test cross-checks four canonical entries
 *    (typescript, jest, esbuild, preact).
 *
 *  - Composer (PHP) chain — read live from the kit's
 *    composer.json. The composer deps are less likely to
 *    drift month-to-month, but reading live is the same
 *    pattern and removes the need to maintain a second list
 *    of pinned ranges.
 *
 *  - Aliased JS deps (e.g. `react: "npm:@preact/compat"`)
 *    live in the kit's `dependencies`, not devDependencies.
 *    `readKitDevDep` checks both — see above.
 */
const REQUIRED_JS_ENTRIES = [
  // JS/TS/build core
  "typescript",
  "jest",
  "esbuild",
  "preact",
  // JS build plugins / runners
  "babel-jest",
  // UI / compat aliases
  "react",
  "react-dom",
  "@preact/compat",
  "@preact/signals",
  // WordPress packages used in the scaffolded projects
  "@wordpress/hooks",
  "@wordpress/dom-ready",
  // Linting / formatting
  "eslint",
  "prettier",
  // Dev runner
  "npm-run-all",
  "husky",
  "lint-staged",
  "@babel/core",
  "@babel/preset-env",
  "@babel/preset-typescript",
];

/**
 * Runtime @wpdev/* packages the scaffold and `wpdev add js` emit in
 * consumer `package.json → dependencies`. Single source of truth —
 * `_templates.js` imports this list so the generator and update planner
 * stay aligned. `@wpdev/fetch` is intentionally absent: batch fetch
 * lives in `@wpdev/rest-utils/fetch` (see TASK-22b); the fetch package
 * is a deprecated BC shim only.
 */
export const CONSUMER_RUNTIME_WPDEV_PACKAGES = [
  "@wpdev/hooks",
  "@wpdev/utils",
  "@wpdev/rest-utils",
  "@wpdev/html-utils",
  "@wpdev/translation",
];

/**
 * Build-time @wpdev/* packages emitted in consumer `devDependencies`.
 */
export const CONSUMER_BUILD_WPDEV_PACKAGES = [
  "@wpdev/build",
  "@wpdev/dependency-extraction-esbuild-plugin",
];

/**
 * The list of shippable @wpdev/* package names whose versions
 * are read live from the kit's own workspace package.json
 * files (see `readKitPackageVersion` above). Consumer scaffold
 * lists use CONSUMER_* constants above; the registry also tracks
 * deprecated shims so `planUpdate` can report removals.
 */
const REQUIRED_WPDEV_PACKAGES = [
  ...CONSUMER_RUNTIME_WPDEV_PACKAGES,
  ...CONSUMER_BUILD_WPDEV_PACKAGES,
];

const REQUIRED_COMPOSER_ENTRIES = [
  // PHP test + static analysis
  "phpunit/phpunit",
  "szepeviktor/phpstan-wordpress",
  "phpstan/extension-installer",
  "phpcompatibility/php-compatibility",
  "wp-coding-standards/wpcs",
  "dealerdirect/phpcodesniffer-composer-installer",
  "php-stubs/wordpress-stubs",
  // Rector + Strauss release tooling
  "rector/rector",
  "brianhenryie/strauss",
  "laminas/laminas-code",
  // WP-CLI for the smoke harness
  "wp-cli/wp-cli-bundle",
  // Process runner for PHPUnit
  "symfony/process",
];

/**
 * Read the vendored WPDev Admin Framework version from
 * `packages/wpdev-framework/constants.php` (`WPDEV_VERSION`).
 *
 * @returns {string|null}
 */
export function readWpdevFrameworkVersion() {
  const constantsPath = modulePath(
    "..",
    "..",
    "wpdev-framework",
    "constants.php",
  );
  if (!existsSync(constantsPath)) {
    return null;
  }
  const raw = readFileSync(constantsPath, "utf8");
  const match = raw.match(
    /define\s*\(\s*['"]WPDEV_VERSION['"]\s*,\s*['"]([^'"]+)['"]\s*\)/,
  );
  return match ? match[1] : null;
}

/* -------------------------------------------------------------------- */
/* getDepVersions                                                          */
/* -------------------------------------------------------------------- */

let CACHED_REGISTRY = null;

/**
 * Return the kit's dep-version registry. A `Map<string,string>`
 * where the key is a package name (npm OR composer) and the
 * value is the pinned range the consumer project is expected
 * to have after `wpdev update`. The on-disk reads are cached
 * per process so they happen at most once, but every call
 * returns a fresh `Map` copy — callers may mutate their copy
 * without corrupting the cache or affecting later callers.
 *
 * @returns {Map<string,string>}
 */
export function getDepVersions() {
  if (!CACHED_REGISTRY) {
    const m = new Map();
    for (const name of REQUIRED_JS_ENTRIES) {
      const v = readKitDevDep(name);
      if (v) m.set(name, v);
    }
    for (const name of REQUIRED_WPDEV_PACKAGES) {
      const v = readKitPackageVersion(name);
      if (v) m.set(name, v);
    }
    for (const name of REQUIRED_COMPOSER_ENTRIES) {
      const v = readKitComposerDep(name);
      if (v) m.set(name, v);
    }
    const fw = readWpdevFrameworkVersion();
    if (fw) {
      m.set("wpdevFramework", fw);
    }
    CACHED_REGISTRY = m;
  }
  return new Map(CACHED_REGISTRY);
}
