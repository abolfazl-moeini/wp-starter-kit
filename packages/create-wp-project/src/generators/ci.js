/**
 * @wpdev/create-wp-project — CI workflow generator (Phase 26.4).
 *
 * Emits `.github/workflows/ci.yml` for the consumer when at least
 * one test runner is enabled (phpTest:phpunit and/or jsTest ≠ none).
 */

const TEMPLATE_CI = `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: "8.2"
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
        if: hashFiles('phpunit.xml') != ''
        run: vendor/bin/phpunit

      - name: Run JS tests
        if: hashFiles('package.json') != ''
        run: npm test
`;

export function run(ctx) {
  const hasPhp = ctx.features.phpTest === "phpunit";
  const hasJs =
    ctx.features.js !== "none" &&
    ctx.features.jsTest &&
    ctx.features.jsTest !== "none";
  if (!hasPhp && !hasJs) {
    return { files: {}, dirs: [], deps: {}, devDeps: {} };
  }
  return {
    files: {
      ".github/workflows/ci.yml": TEMPLATE_CI,
    },
    dirs: [".github/workflows"],
    deps: {},
    devDeps: {},
  };
}

export const descriptor = {
  id: "ci",
  feature: null,
  owns: [".github/workflows/ci.yml"],
  run,
};
