/**
 * @wpsk/create-wp-project — kit-wide dep-version registry.
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
 * `wpsk update`. For a "^1.2.3" range the string is "^1.2.3";
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

/* -------------------------------------------------------------------- */
/* getDepVersions                                                          */
/* -------------------------------------------------------------------- */

let CACHED_REGISTRY = null;

/**
 * Return the kit's dep-version registry. A `Map<string,string>`
 * where the key is a package name (npm OR composer) and the
 * value is the pinned range the consumer project is expected
 * to have after `wpsk update`. The function is pure (no
 * side effects on the returned map — callers may mutate, but
 * the next call returns a fresh Map) and the result is
 * cached per process so the on-disk reads happen at most
 * once.
 *
 * @returns {Map<string,string>}
 */
export function getDepVersions() {
  if (CACHED_REGISTRY) return CACHED_REGISTRY;
  const m = new Map();
  for (const name of REQUIRED_JS_ENTRIES) {
    const v = readKitDevDep(name);
    if (v) m.set(name, v);
  }
  for (const name of REQUIRED_COMPOSER_ENTRIES) {
    const v = readKitComposerDep(name);
    if (v) m.set(name, v);
  }
  CACHED_REGISTRY = m;
  return m;
}
