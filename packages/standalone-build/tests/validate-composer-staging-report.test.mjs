import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const tool = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "..",
  "validate-composer-staging-report.mjs",
);

async function fixtureReport(overrides = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "staging-report-"));
  const straussBin = path.join(root, "vendor", "bin", "strauss");
  await fs.mkdir(path.join(root, "plugins", "tavangary-demo"), { recursive: true });
  await fs.mkdir(path.dirname(straussBin), { recursive: true });
  const straussBytes = "#!/usr/bin/env php\n";
  await fs.writeFile(straussBin, straussBytes);
  await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.json"), "{}");
  const lockBytes = "{}";
  await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.lock"), lockBytes);
  const report = {
    schema: 1,
    generatedBy: "tools/verify-composer-staging.mjs",
    straussBin,
    straussBinSha256: createHash("sha256").update(straussBytes).digest("hex"),
    discoveredConsumers: ["tavangary-demo"],
    requestedConsumers: [],
    scopeComplete: true,
    reports: [{
      consumer: "tavangary-demo",
      composerLockSha256: createHash("sha256").update(lockBytes).digest("hex"),
      command: "composer install --no-dev --no-scripts --no-plugins",
      status: "passed",
      error: null,
      autoloadFiles: [],
      devAutoloadFiles: [],
      strauss: {
        binary: straussBin,
        targetDirectory: "vendor-prefixed",
        namespacePrefix: "FixtureVendor",
        files: ["autoload.php"],
        devFiles: [],
        error: null,
      },
    }],
    ...overrides,
  };
  const reportPath = path.join(root, "staging.json");
  await fs.writeFile(reportPath, JSON.stringify(report));
  return { root, reportPath };
}

test("accepts complete staging evidence for the discovered locked scope", async () => {
  const { root, reportPath } = await fixtureReport();
  try {
    const result = spawnSync(process.execPath, [tool, root, reportPath], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /"status": "ready"/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects subset, failed consumer, and development files", async () => {
  const { root, reportPath } = await fixtureReport({
    requestedConsumers: ["tavangary-demo"],
    scopeComplete: false,
  });
  try {
    const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
    report.reports[0].status = "failed";
    report.reports[0].devAutoloadFiles = ["phpunit"];
    report.reports[0].strauss.devFiles = ["rector"];
    await fs.writeFile(reportPath, JSON.stringify(report));
    const result = spawnSync(process.execPath, [tool, root, reportPath], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /requestedConsumers must be empty/);
    assert.match(result.stdout, /scopeComplete must be true/);
    assert.match(result.stdout, /staging status is not passed/);
    assert.match(result.stdout, /development files/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects reports that omit Composer or Strauss execution evidence", async () => {
  const { root, reportPath } = await fixtureReport({
    generatedBy: "unknown-tool",
    straussBin: null,
    reports: [{ consumer: "tavangary-demo", status: "passed" }],
  });
  try {
    const result = spawnSync(process.execPath, [tool, root, reportPath], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /generatedBy must identify the staging verifier/);
    assert.match(result.stdout, /Strauss binary evidence is required/);
    assert.match(result.stdout, /Composer autoload evidence is incomplete/);
    assert.match(result.stdout, /locked Composer command evidence is incomplete/);
    assert.match(result.stdout, /Strauss execution evidence is incomplete/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects stale evidence after composer.lock bytes change", async () => {
  const { root, reportPath } = await fixtureReport();
  try {
    await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.lock"), "{\"changed\":true}");
    const result = spawnSync(process.execPath, [tool, root, reportPath], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /composer\.lock SHA-256 does not match current bytes/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects stale evidence after the pinned Strauss binary changes", async () => {
  const { root, reportPath } = await fixtureReport();
  try {
    await fs.writeFile(path.join(root, "vendor", "bin", "strauss"), "changed tool bytes");
    const result = spawnSync(process.execPath, [tool, root, reportPath], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /Strauss binary SHA-256 does not match current bytes/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects Composer evidence when current metadata is symlinked", async () => {
  const { root, reportPath } = await fixtureReport();
  try {
    const lockPath = path.join(root, "plugins", "tavangary-demo", "composer.lock");
    const outsideLock = path.join(root, "outside.lock");
    await fs.writeFile(outsideLock, "{}");
    await fs.unlink(lockPath);
    await fs.symlink(outsideLock, lockPath);
    const result = spawnSync(process.execPath, [tool, root, reportPath], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /composer\.lock must be a regular non-symlink file/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
