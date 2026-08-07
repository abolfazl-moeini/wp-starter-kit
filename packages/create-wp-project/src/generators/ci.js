/**
 * @wpdev/create-wp-project — CI workflow generator (Phase 26.4).
 *
 * Emits `.github/workflows/ci.yml` for the consumer when at least
 * one test runner is enabled (phpTest:phpunit, jsTest ≠ none,
 * and/or e2eTest:playwright).
 */

import { maxPhpVersion } from "../sync-php-min.js";

/**
 * PHP version for CI setup-php. Prefer authoring (phpSourceVersion) so
 * modern source parses; never below phpMinVersion.
 *
 * @param {object} ctx
 * @returns {string}
 */
export function resolveCiPhpVersion(ctx) {
  const features = ctx.features || {};
  const cfg = ctx.cfg || {};
  const vars = ctx.vars || {};
  const min =
    features.phpMinVersion || cfg.phpMinVersion || vars.phpMinVersion || "7.4";
  const source = cfg.phpSourceVersion || vars.phpSourceVersion || min;
  return maxPhpVersion(String(min), String(source));
}

function buildCiYml(hasUnit, hasE2e, phpVersion) {
  const php = phpVersion || "8.1";
  const unitJob = hasUnit
    ? `
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: "${php}"
          extensions: mbstring

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      - name: Install Composer dependencies
        run: composer install --prefer-dist --no-progress

      - name: Install npm dependencies
        run: npm ci

      - name: Run PHP tests
        if: hashFiles('phpunit.xml.dist') != ''
        run: vendor/bin/phpunit

      - name: Run JS tests
        if: hashFiles('package.json') != ''
        run: npm test
`
    : "";

  const e2eJob = hasE2e
    ? `
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm

      - name: Install npm dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e
`
    : "";

  return `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:${unitJob}${e2eJob}`;
}

export function run(ctx) {
  if (ctx.features.ci === "off") {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const hasPhp = ctx.features.phpTest === "phpunit";
  const hasJs =
    ctx.features.js !== "none" &&
    ctx.features.jsTest &&
    ctx.features.jsTest !== "none";
  const hasE2e = ctx.features.e2eTest === "playwright";
  if (!hasPhp && !hasJs && !hasE2e) {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  const phpVersion = resolveCiPhpVersion(ctx);
  return {
    files: {
      ".github/workflows/ci.yml": buildCiYml(
        hasPhp || hasJs,
        hasE2e,
        phpVersion,
      ),
    },
    dirs: [".github/workflows"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "ci",
  feature: "ci",
  owns: [".github/workflows/ci.yml"],
  run,
};
