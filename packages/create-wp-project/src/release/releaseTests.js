/**
 * Pre-dist test gate helpers for prepare-release.js.
 *
 * Default: run enabled unit + e2e suites before any dist mutation.
 * Bypass: --skip-tests or WPDEV_SKIP_TESTS=1|true.
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as path from "node:path";

/**
 * @param {{ skipTests?: boolean }} opts
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean}
 */
export function shouldSkipReleaseTests(opts = {}, env = process.env) {
  if (opts.skipTests) return true;
  const raw = String(env.WPDEV_SKIP_TESTS || "")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * @param {string} root
 * @returns {{ features: Record<string,string>|null, pkg: object|null, composer: object|null }}
 */
export function loadReleaseTestContext(root) {
  let features = null;
  const wpdevPath = path.join(root, "wpdev.json");
  const legacyPath = path.join(root, "project.config.json");
  const configPath = existsSync(wpdevPath)
    ? wpdevPath
    : existsSync(legacyPath)
      ? legacyPath
      : null;
  if (configPath) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf8"));
      if (raw && typeof raw.features === "object" && raw.features) {
        features = { ...raw.features };
      }
    } catch {
      features = null;
    }
  }

  let pkg = null;
  const pkgPath = path.join(root, "package.json");
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    } catch {
      pkg = null;
    }
  }

  let composer = null;
  const composerPath = path.join(root, "composer.json");
  if (existsSync(composerPath)) {
    try {
      composer = JSON.parse(readFileSync(composerPath, "utf8"));
    } catch {
      composer = null;
    }
  }

  return { features, pkg, composer };
}

/**
 * @param {object|null} pkg
 * @param {string} name
 * @returns {boolean}
 */
function hasNpmScript(pkg, name) {
  return Boolean(pkg && pkg.scripts && typeof pkg.scripts[name] === "string");
}

/**
 * @param {object|null} composer
 * @returns {boolean}
 */
function hasComposerTest(composer) {
  return Boolean(
    composer && composer.scripts && typeof composer.scripts.test === "string",
  );
}

/**
 * Resolve which suites to run. Features win when present; otherwise
 * fall back to discovering scripts on disk.
 *
 * When a feature is ON but the script is missing, throws.
 *
 * @param {Record<string,string>|null|undefined} features
 * @param {object|null} pkg
 * @param {object|null} composer
 * @returns {{ id: string, label: string, command: string, args: string[] }[]}
 */
export function resolveReleaseTestPlan(features, pkg, composer) {
  /** @type {{ id: string, label: string, command: string, args: string[] }[]} */
  const plan = [];
  const hasFeatures =
    features &&
    typeof features === "object" &&
    Object.keys(features).length > 0;

  if (hasFeatures) {
    if (features.phpTest === "phpunit") {
      if (!hasComposerTest(composer)) {
        throw new Error(
          'features.phpTest=phpunit but composer.json has no "scripts.test" — add `composer test` or set phpTest=none',
        );
      }
      plan.push({
        id: "phpunit",
        label: "PHPUnit (composer test)",
        command: "composer",
        args: ["test"],
      });
    }

    if (features.jsTest === "jest" || features.jsTest === "vitest") {
      if (!hasNpmScript(pkg, "test")) {
        throw new Error(
          `features.jsTest=${features.jsTest} but package.json has no "scripts.test" — add \`npm test\` or set jsTest=none`,
        );
      }
      plan.push({
        id: "js",
        label: `JS unit (npm test / ${features.jsTest})`,
        command: "npm",
        args: ["test"],
      });
    }

    if (features.e2eTest === "playwright") {
      if (!hasNpmScript(pkg, "test:e2e")) {
        throw new Error(
          'features.e2eTest=playwright but package.json has no "scripts.test:e2e" — add `npm run test:e2e` or set e2eTest=none',
        );
      }
      plan.push({
        id: "e2e",
        label: "Playwright E2E (npm run test:e2e)",
        command: "npm",
        args: ["run", "test:e2e"],
      });
    }

    return plan;
  }

  // Legacy / no features block: discover scripts only.
  if (hasComposerTest(composer)) {
    plan.push({
      id: "phpunit",
      label: "PHPUnit (composer test)",
      command: "composer",
      args: ["test"],
    });
  }
  if (hasNpmScript(pkg, "test")) {
    plan.push({
      id: "js",
      label: "JS unit (npm test)",
      command: "npm",
      args: ["test"],
    });
  }
  if (hasNpmScript(pkg, "test:e2e")) {
    plan.push({
      id: "e2e",
      label: "Playwright E2E (npm run test:e2e)",
      command: "npm",
      args: ["run", "test:e2e"],
    });
  }
  return plan;
}

/**
 * @param {string} root
 * @param {{ id: string, label: string, command: string, args: string[] }[]} plan
 * @param {{ spawn?: typeof spawnSync, log?: (msg: string) => void }} [hooks]
 */
export function runReleaseTests(root, plan, hooks = {}) {
  const spawn = hooks.spawn || spawnSync;
  const log = hooks.log || ((msg) => process.stderr.write(`${msg}\n`));

  for (const step of plan) {
    log(`release: running ${step.label}…`);
    const result = spawn(step.command, step.args, {
      cwd: root,
      encoding: "utf8",
      shell: process.platform === "win32",
      env: process.env,
      stdio: "inherit",
    });
    const status =
      result && typeof result.status === "number" ? result.status : 1;
    if (status !== 0) {
      throw new Error(
        `Release blocked: ${step.label} failed (exit ${status}). Fix tests or pass --skip-tests / WPDEV_SKIP_TESTS=1 to bypass.`,
      );
    }
    log(`release: ${step.label} passed`);
  }
}

/**
 * Gate entry used by prepareRelease. No-op when skip or empty plan.
 *
 * @param {string} root
 * @param {{ skipTests?: boolean }} opts
 * @param {{ spawn?: typeof spawnSync, log?: (msg: string) => void, env?: NodeJS.ProcessEnv }} [hooks]
 */
export function gateReleaseTests(root, opts = {}, hooks = {}) {
  const env = hooks.env || process.env;
  if (shouldSkipReleaseTests(opts, env)) {
    const log = hooks.log || ((msg) => process.stderr.write(`${msg}\n`));
    log(
      "Skipping release tests (--skip-tests / WPDEV_SKIP_TESTS). Dist will be built without verifying suites.",
    );
    return { skipped: true, plan: [] };
  }

  const { features, pkg, composer } = loadReleaseTestContext(root);
  const plan = resolveReleaseTestPlan(features, pkg, composer);
  if (plan.length === 0) {
    return { skipped: false, plan };
  }
  runReleaseTests(root, plan, hooks);
  return { skipped: false, plan };
}
