import { test } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tool = path.join(path.dirname(new URL(import.meta.url).pathname), "..", "verify-composer-staging.mjs");

test("rejects unknown and traversal consumer subsets before staging", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "composer-staging-path-"));
  try {
    await fs.mkdir(path.join(root, "plugins", "tavangary-demo"), { recursive: true });
    await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.json"), "{}");
    await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.lock"), "{}");
    for (const consumer of ["../outside", "tavangary-unknown", "tavangary-demo", "tavangary-demo"]) {
      const args = consumer === "tavangary-demo"
        ? [tool, root, consumer, consumer]
        : [tool, root, consumer];
      const result = spawnSync(process.execPath, args, { encoding: "utf8" });
      assert.equal(result.status, 2, `${consumer}: ${result.stderr}`);
      assert.match(result.stderr, /consumer subset must contain unique discovered consumers/);
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects a symlinked Strauss build tool before staging", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "composer-staging-strauss-"));
  try {
    await fs.mkdir(path.join(root, "plugins", "tavangary-demo"), { recursive: true });
    await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.json"), "{}");
    await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.lock"), "{}");
    const target = path.join(root, "strauss-real");
    const link = path.join(root, "strauss-link");
    await fs.writeFile(target, "#!/usr/bin/env php\n");
    await fs.symlink(target, link);
    const result = spawnSync(process.execPath, [tool, root, `--strauss-bin=${link}`], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /Invalid Strauss binary: symbolic links are not accepted/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("requires an explicit pinned Strauss tool before staging", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "composer-staging-no-strauss-"));
  try {
    await fs.mkdir(path.join(root, "plugins", "tavangary-demo"), { recursive: true });
    await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.json"), "{}");
    await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.lock"), "{}");
    const result = spawnSync(process.execPath, [tool, root], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /A pinned --strauss-bin is required/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("fails before staging when a discovered Composer consumer has no lockfile", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "composer-staging-no-lock-"));
  try {
    await fs.mkdir(path.join(root, "plugins", "tavangary-demo"), { recursive: true });
    await fs.writeFile(path.join(root, "plugins", "tavangary-demo", "composer.json"), "{}");
    const strauss = path.join(root, "strauss");
    await fs.writeFile(strauss, "#!/usr/bin/env php\n");
    const result = spawnSync(process.execPath, [tool, root, `--strauss-bin=${strauss}`], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /tavangary-demo: composer\.lock is required for staging/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects symlinked Composer metadata before staging", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "composer-staging-metadata-link-"));
  try {
    const pluginRoot = path.join(root, "plugins", "tavangary-demo");
    await fs.mkdir(pluginRoot, { recursive: true });
    await fs.writeFile(path.join(pluginRoot, "composer.json"), "{}");
    const outsideLock = path.join(root, "outside.lock");
    await fs.writeFile(outsideLock, "{}");
    await fs.symlink(outsideLock, path.join(pluginRoot, "composer.lock"));
    const strauss = path.join(root, "strauss");
    await fs.writeFile(strauss, "#!/usr/bin/env php\n");
    const result = spawnSync(process.execPath, [tool, root, `--strauss-bin=${strauss}`], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /tavangary-demo: composer\.lock must be a regular non-symlink file/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("emits failed evidence instead of crashing when Composer has no autoload_files map", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "composer-staging-autoload-map-"));
  try {
    const pluginRoot = path.join(root, "plugins", "tavangary-demo");
    await fs.mkdir(pluginRoot, { recursive: true });
    await fs.writeFile(path.join(pluginRoot, "composer.json"), "{}");
    await fs.writeFile(path.join(pluginRoot, "composer.lock"), "{}");
    const strauss = path.join(root, "strauss");
    await fs.writeFile(strauss, "<?php exit(0);\n");
    const result = spawnSync(process.execPath, [tool, root, `--strauss-bin=${strauss}`], { encoding: "utf8" });
    assert.equal(result.status, 1, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.reports[0].status, "failed");
    assert.match(report.reports[0].error, /Composer did not create autoload_files\.php/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test("rejects a symlink inside a staging source before Composer runs", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "composer-staging-source-link-"));
  try {
    const pluginRoot = path.join(root, "plugins", "tavangary-demo");
    await fs.mkdir(pluginRoot, { recursive: true });
    await fs.writeFile(path.join(pluginRoot, "composer.json"), "{}");
    await fs.writeFile(path.join(pluginRoot, "composer.lock"), "{}");
    const outside = path.join(root, "outside.php");
    await fs.writeFile(outside, "<?php\n");
    await fs.symlink(outside, path.join(pluginRoot, "linked.php"));
    const strauss = path.join(root, "strauss");
    await fs.writeFile(strauss, "<?php exit(0);\n");
    const result = spawnSync(process.execPath, [tool, root, `--strauss-bin=${strauss}`], { encoding: "utf8" });
    assert.equal(result.status, 1, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.reports[0].status, "failed");
    assert.match(report.reports[0].error, /staging source contains symbolic link: linked\.php/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
