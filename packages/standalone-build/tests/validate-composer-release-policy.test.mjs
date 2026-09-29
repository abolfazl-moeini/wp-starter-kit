import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tool = path.resolve(__dirname, "..", "validate-composer-release-policy.mjs");
let fixtureRoot;

const inScope = [
  "drm-connector",
  "tavangary-core",
  "tavangary-theme-panel",
  "wpdev-analytics",
  "wpdev-crm",
  "wpdev-tickets",
  "wpdev-woo-persian",
];

before(async () => {
  fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "composer-policy-"));
  await fs.mkdir(path.join(fixtureRoot, "plugins"), { recursive: true });
  for (const consumer of [...inScope, "wpdev"]) {
    const pluginRoot = path.join(fixtureRoot, "plugins", consumer);
    await fs.mkdir(pluginRoot, { recursive: true });
    const failing = consumer.startsWith("wpdev-");
    await fs.writeFile(
      path.join(pluginRoot, "composer.json"),
      JSON.stringify({
        scripts: {
          "post-install-cmd": [`@php vendor/bin/strauss${failing ? " || true" : ""}`],
          "post-update-cmd": [`@php vendor/bin/strauss${failing ? " || true" : ""}`],
          "scope:vendor": "@php vendor/bin/strauss",
        },
        require: failing ? { "wpdev/framework": "*" } : {},
      }),
    );
  }
  const missingLockRoot = path.join(fixtureRoot, "plugins", "wpdev-future");
  await fs.mkdir(missingLockRoot, { recursive: true });
  await fs.writeFile(
    path.join(missingLockRoot, "composer.json"),
    JSON.stringify({ scripts: { "scope:vendor": "@php vendor/bin/strauss" } }),
  );
});

after(async () => {
  await fs.rm(fixtureRoot, { recursive: true, force: true });
});

test("discovers every in-scope Composer consumer and excludes standalone wpdev", () => {
  const result = spawnSync(process.execPath, [tool, fixtureRoot], {
    encoding: "utf8",
  });
  assert.equal(result.status, 1, "policy must fail on the fixture violations");
  for (const consumer of [
    "wpdev-analytics",
    "wpdev-crm",
    "wpdev-tickets",
    "wpdev-woo-persian",
  ]) {
    assert.match(result.stderr, new RegExp(`${consumer}: lifecycle command ignores failure`));
    assert.match(result.stderr, new RegExp(`${consumer}: unbounded wpdev/framework constraint`));
  }
  assert.doesNotMatch(result.stderr, /(^|\n)- wpdev: /);
  assert.match(result.stderr, /wpdev-future: composer\.lock is required/);
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "blocked");
  assert.ok(
    report.failures.some((failure) => failure.includes("wpdev-analytics: lifecycle command ignores failure")),
    "Composer policy failures must be machine-readable on stdout for the aggregate gate.",
  );
});

test("accepts bounded lock-backed first-party wpdev constraints", async () => {
  for (const consumer of [
    "wpdev-analytics",
    "wpdev-crm",
    "wpdev-tickets",
    "wpdev-woo-persian",
  ]) {
    const pluginRoot = path.join(fixtureRoot, "plugins", consumer);
    const composer = JSON.parse(await fs.readFile(path.join(pluginRoot, "composer.json"), "utf8"));
    composer.require["wpdev/framework"] = "1.0.0";
    composer.scripts["post-install-cmd"] = ["@php vendor/bin/strauss"];
    composer.scripts["post-update-cmd"] = ["@php vendor/bin/strauss"];
    await fs.writeFile(path.join(pluginRoot, "composer.json"), JSON.stringify(composer));
    await fs.writeFile(path.join(pluginRoot, "composer.lock"), JSON.stringify({ packages: [{ name: "wpdev/framework", version: "1.0.0" }] }));
  }
  for (const consumer of ["drm-connector", "tavangary-core", "tavangary-theme-panel"]) {
    const pluginRoot = path.join(fixtureRoot, "plugins", consumer);
    await fs.writeFile(path.join(pluginRoot, "composer.lock"), JSON.stringify({ packages: [] }));
  }
  await fs.writeFile(path.join(fixtureRoot, "plugins", "wpdev-future", "composer.lock"), JSON.stringify({ packages: [] }));
  const futureComposerPath = path.join(fixtureRoot, "plugins", "wpdev-future", "composer.json");
  const futureComposer = JSON.parse(await fs.readFile(futureComposerPath, "utf8"));
  futureComposer.scripts["post-install-cmd"] = "@php vendor/bin/strauss";
  futureComposer.scripts["post-update-cmd"] = "@php vendor/bin/strauss";
  await fs.writeFile(futureComposerPath, JSON.stringify(futureComposer));
  const result = spawnSync(process.execPath, [tool, fixtureRoot], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);

  const mismatchRoot = path.join(fixtureRoot, "plugins", "wpdev-analytics");
  await fs.writeFile(
    path.join(mismatchRoot, "composer.lock"),
    JSON.stringify({ packages: [{ name: "wpdev/framework", version: "1.1.0" }] }),
  );
  const mismatch = spawnSync(process.execPath, [tool, fixtureRoot], { encoding: "utf8" });
  assert.equal(mismatch.status, 1, "policy must reject a lock version that differs from an exact constraint");
  assert.match(mismatch.stderr, /wpdev-analytics: wpdev\/framework constraint 1\.0\.0 does not allow locked version 1\.1\.0/);
});

test("rejects lifecycle fallback when Composer script is a string", async () => {
  const pluginRoot = path.join(fixtureRoot, "plugins", "drm-connector");
  const composer = JSON.parse(await fs.readFile(path.join(pluginRoot, "composer.json"), "utf8"));
  composer.scripts["post-install-cmd"] = "@php vendor/bin/strauss || true";
  composer.scripts["post-update-cmd"] = "@php vendor/bin/strauss || true";
  await fs.writeFile(path.join(pluginRoot, "composer.json"), JSON.stringify(composer));
  const result = spawnSync(process.execPath, [tool, fixtureRoot], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /drm-connector: lifecycle command ignores failure/);
});

test("requires Strauss in every release lifecycle entry", async () => {
  const pluginRoot = path.join(fixtureRoot, "plugins", "tavangary-theme-panel");
  const composer = JSON.parse(await fs.readFile(path.join(pluginRoot, "composer.json"), "utf8"));
  delete composer.scripts["post-update-cmd"];
  composer.scripts["scope:vendor"] = "@php tools/not-strauss.php";
  await fs.writeFile(path.join(pluginRoot, "composer.json"), JSON.stringify(composer));
  const result = spawnSync(process.execPath, [tool, fixtureRoot], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /tavangary-theme-panel: post-update-cmd must invoke vendor\/bin\/strauss/);
  assert.match(result.stderr, /tavangary-theme-panel: scope:vendor must invoke vendor\/bin\/strauss/);
});

test("rejects a bounded first-party constraint that excludes the locked version", async () => {
  const pluginRoot = path.join(fixtureRoot, "plugins", "wpdev-crm");
  const composer = JSON.parse(await fs.readFile(path.join(pluginRoot, "composer.json"), "utf8"));
  composer.require["wpdev/framework"] = "^2.0";
  await fs.writeFile(path.join(pluginRoot, "composer.json"), JSON.stringify(composer));
  const result = spawnSync(process.execPath, [tool, fixtureRoot], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /wpdev-crm: wpdev\/framework constraint \^2\.0 does not allow locked version 1\.0\.0/);
});

test("rejects symlinked Composer metadata", async () => {
  const pluginRoot = path.join(fixtureRoot, "plugins", "wpdev-linked");
  await fs.mkdir(pluginRoot, { recursive: true });
  const externalComposer = path.join(fixtureRoot, "linked-composer.json");
  const externalLock = path.join(fixtureRoot, "linked-composer.lock");
  await fs.writeFile(externalComposer, JSON.stringify({ scripts: {
    "post-install-cmd": "@php vendor/bin/strauss",
    "post-update-cmd": "@php vendor/bin/strauss",
    "scope:vendor": "@php vendor/bin/strauss",
  } }));
  await fs.writeFile(externalLock, JSON.stringify({ packages: [] }));
  await fs.symlink(externalComposer, path.join(pluginRoot, "composer.json"));
  await fs.symlink(externalLock, path.join(pluginRoot, "composer.lock"));
  const result = spawnSync(process.execPath, [tool, fixtureRoot], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /wpdev-linked: composer\.json must be a regular non-symlink file/);
});

test("rejects shell success fallbacks other than double-pipe true", async () => {
  const pluginRoot = path.join(fixtureRoot, "plugins", "wpdev-tickets");
  const composer = JSON.parse(await fs.readFile(path.join(pluginRoot, "composer.json"), "utf8"));
  composer.scripts["scope:vendor"] = "@php vendor/bin/strauss; true";
  await fs.writeFile(path.join(pluginRoot, "composer.json"), JSON.stringify(composer));
  const result = spawnSync(process.execPath, [tool, fixtureRoot], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /wpdev-tickets: lifecycle command ignores failure/);
});
