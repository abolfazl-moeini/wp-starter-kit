#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const scriptDirectory = path.dirname(new URL(import.meta.url).pathname);
const contentRoot = path.resolve(process.argv[2] || path.join(scriptDirectory, ".."));
const failures = [];

function parseVersion(value) {
  const match = String(value).match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function constraintAllowsLockedVersion(constraint, lockedVersion) {
  const locked = parseVersion(lockedVersion);
  if (!locked) return false;
  const exact = parseVersion(constraint);
  if (exact) return compareVersions(locked, exact) === 0;
  const caret = String(constraint).match(/^\^(\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!caret) return false;
  const lower = [Number(caret[1]), Number(caret[2]), Number(caret[3] || 0)];
  const upper = lower[0] > 0
    ? [lower[0] + 1, 0, 0]
    : (lower[1] > 0 ? [0, lower[1] + 1, 0] : [0, 0, lower[2] + 1]);
  return compareVersions(locked, lower) >= 0 && compareVersions(locked, upper) < 0;
}

function ignoresFailure(command) {
  return /(?:\|\||;)\s*(?::|true\b|exit\s+0\b|\/usr\/bin\/true\b)/.test(String(command));
}

function isInScopeConsumer(name) {
  return name !== "wpdev" && (/^(?:tavangary|wpdev|drm)-/.test(name) || /^tavangary/.test(name));
}

async function discoverConsumers() {
  const entries = await fs.readdir(path.join(contentRoot, "plugins"), { withFileTypes: true });
  const consumers = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !isInScopeConsumer(entry.name)) continue;
    const composerPath = path.join(contentRoot, "plugins", entry.name, "composer.json");
    try {
      const stat = await fs.lstat(composerPath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        failures.push(`${entry.name}: composer.json must be a regular non-symlink file`);
        continue;
      }
      consumers.push(entry.name);
    } catch (error) {
      if (error.code !== "ENOENT") failures.push(`${entry.name}: cannot inspect composer.json (${error.message})`);
      // Folders without Composer metadata are not Composer release consumers.
    }
  }
  return consumers.sort();
}

const consumers = await discoverConsumers();

for (const consumer of consumers) {
  const composerPath = path.join(contentRoot, "plugins", consumer, "composer.json");
  const lockPath = path.join(contentRoot, "plugins", consumer, "composer.lock");
  let lockMetadataSafe = true;
  try {
    const stat = await fs.lstat(lockPath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      failures.push(`${consumer}: composer.lock must be a regular non-symlink file`);
      lockMetadataSafe = false;
    }
  } catch (error) {
    lockMetadataSafe = false;
    failures.push(error.code === "ENOENT"
      ? `${consumer}: composer.lock is required for locked release staging`
      : `${consumer}: cannot inspect composer.lock (${error.message})`);
  }
  let composer;
  try {
    composer = JSON.parse(await fs.readFile(composerPath, "utf8"));
  } catch (error) {
    failures.push(`${consumer}: cannot read composer.json (${error.message})`);
    continue;
  }
  let lock;
  if (lockMetadataSafe) {
    try {
      lock = JSON.parse(await fs.readFile(lockPath, "utf8"));
    } catch (error) {
      failures.push(`${consumer}: composer.lock is not valid JSON (${error.message})`);
      lock = null;
    }
  } else {
    lock = null;
  }

  const scriptValues = (value) => Array.isArray(value) ? value : (typeof value === "string" ? [value] : []);
  const lifecycleScripts = new Map([
    ["post-install-cmd", scriptValues(composer.scripts?.["post-install-cmd"])],
    ["post-update-cmd", scriptValues(composer.scripts?.["post-update-cmd"])],
    ["scope:vendor", scriptValues(composer.scripts?.["scope:vendor"])],
  ]);
  for (const [lifecycle, commands] of lifecycleScripts) {
    if (!commands.some((command) => /\bvendor\/bin\/strauss\b/.test(String(command)))) {
      failures.push(`${consumer}: ${lifecycle} must invoke vendor/bin/strauss`);
    }
  }
  const scripts = [...lifecycleScripts.values()].flat();
  for (const script of scripts) {
    if (ignoresFailure(script)) {
      failures.push(`${consumer}: lifecycle command ignores failure: ${script}`);
    }
  }

  for (const [packageName, constraint] of Object.entries(composer.require || {})) {
    if (!/^wpdev\//i.test(packageName)) continue;
    const normalizedConstraint = String(constraint).trim();
    if (normalizedConstraint === "*") {
      failures.push(`${consumer}: unbounded ${packageName} constraint (*)`);
      continue;
    }
    const locked = [...(lock?.packages || []), ...(lock?.["packages-dev"] || [])].find(
      (packageEntry) => packageEntry?.name === packageName,
    );
    if (!locked?.version) {
      failures.push(`${consumer}: ${packageName} is required but missing from composer.lock`);
    } else if (!constraintAllowsLockedVersion(normalizedConstraint, locked.version)) {
      failures.push(`${consumer}: ${packageName} constraint ${normalizedConstraint} does not allow locked version ${locked.version}`);
    }
  }
}

const report = {
  schema: 1,
  generatedBy: "tools/validate-composer-release-policy.mjs",
  contentRoot,
  discoveredConsumers: consumers,
  status: failures.length === 0 ? "ready" : "blocked",
  failures,
  promotionRule: "Composer lifecycle, lock, and first-party constraint evidence must be ready before any assembler mutates a release candidate.",
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) {
  process.stderr.write(`Composer release policy failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exitCode = 1;
}
